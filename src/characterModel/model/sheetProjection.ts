// The loadout overlay: what a character wears, laid over its sheet on every read.
import { resolveDefenseGrants } from '@vault/derive/defenseGrants.js'
import { deriveCharacterSheet } from '@vault/derive/deriveCharacterSheet.js'
import { itemBenefitsApply } from '@vault/derive/itemBenefits.js'
import { acBonusApplies, vaultArmorPenaltyEffects } from '@vault/derive/vaultDerive.js'
import { deriveWeaponActions } from '@vault/derive/weaponActions.js'

import { parseCast } from '../../compendium'
import type { AttackSwing, Sheet, SheetAttack, SheetDefense, SheetItemCast } from './sheet/sheet'
import { equippedRows, preloadCatalogs, type EquippedRow, type ItemDataSource } from './sheet/equipment'
import { INVENTORY_FENCE, parseInventory, type CharacterInventory, type InventoryCatalogs } from './inventory'
import { extractVitalsFromNote } from './vitals'
import { readVaultCharacterFromNote, type VaultCharacterJson } from './vaultCharacter/fence'
import { scoreLines, vaultStateFor, type Derived, type ScoreLines } from './vaultCharacter/project'
import { spellDamageBonuses } from './vaultCharacter/spellDamage'
import { spellPushes } from './vaultCharacter/spellPush'
import { extractFence } from '../../platform'

/**
 * What is worn, laid over a sheet on every read (MYDND-37): its AC and its
 * weapon lines.
 *
 * **The arithmetic is `@vault/derive`'s since MYDND-57.** Before, this file
 * carried its own tables: twelve armours and forty weapons by name, matched by
 * substring, with 1d8 for anything it did not know, a weapon "ranged" when its
 * slug said "bow", proficiency always added, and +1 AC for any item whose id
 * contained "protection" or "warding". Now the item notes supply the data
 * (`preloadCatalogs`) and the library does the rest:
 *
 * - **A Vault character** with a `vault_bake` is handed to `deriveCharacterSheet`
 *   again, this time with what it is wearing — the web sheet's own call. AC,
 *   every weapon line (proficiency, Fighting Styles, the two-handed versatile
 *   line, off-hand Light attacks, the untrained-armour penalty) and Unarmed
 *   Strike come from there and *replace* what the projection wrote. So, since
 *   MYDND-108, do the ability scores and everything that follows from them
 *   (`scoreLines`): a worn Headband of Intellect sets INT 19, an Amulet of
 *   Health CON 19 and with it the hit point maximum. What a pick adds to a
 *   spell's damage (MYDND-178) follows those scores, so it is worked out here too.
 * - **A D&D Beyond character** already has D&D Beyond's AC and attacks. Its local
 *   loadout adds `deriveWeaponActions` lines for what it holds, with proficiency
 *   unknown (and so added, as D&D Beyond would), and changes AC only when it
 *   wears armour, a shield or an AC-granting item — the same scope as before,
 *   now read from the armour's own note.
 *
 * Modifies the sheet in place and returns it.
 */

export interface OverlayContext {
  /** The note's ` ```vault-character ` json — present for a Vault character. */
  vaultJson?: VaultCharacterJson | null
  /** `vault-vitals`' switched-on benefits, so Rage's damage reaches a swing. */
  activeEffects?: readonly string[]
  /**
   * The active campaign's loadout system (MYDND-278): the slot, not `equipped`,
   * puts an item on the sheet, and an item's benefits need the slot rather than
   * attunement. Off when no campaign says so, which is the old behaviour.
   */
  loadoutSystem?: boolean
}

/** `deriveCharacterSheet`'s answers this file reads. */
interface DerivedEquipment {
  ac: number
  speed: number | null
  speeds?: Record<string, number>
  weaponActions: WeaponAction[]
  unarmedStrike: UnarmedStrike | null
  scores: ScoreLines
  senses: Array<{ sense: string; range: number; source?: string | null }>
  armorPenalty: { items?: Array<{ name?: string | null }> } | null
}

interface WeaponAction {
  id: string
  name: string
  actionKind: string
  offHand: boolean
  attackBonus: number
  proficient: 'yes' | 'no' | 'unknown'
  disadvantage: boolean
  disadvantageSources: string[]
  dmgToken: string | null
  dmgToken2: string | null
  extraDamageTokens: string[]
  props: string[]
  weaponCtx: WeaponCtx
  /** The versatile line's grip, when there is one: `twoHanded: true`. */
  weaponCtx2?: WeaponCtx | null
}

interface WeaponCtx {
  weapon: {
    name?: string
    itemType?: string
    category?: string | null
    data?: { mastery?: unknown; properties?: unknown; range?: unknown }
  }
  twoHanded?: boolean
  sole?: boolean
  ability?: string | null
  offHand?: boolean
}

/**
 * What a dice intervention's `weapon` predicate needs of a line (MYDND-274),
 * and nothing else: the catalog row stays behind.
 */
function swingOf(ctx: WeaponCtx | null | undefined): AttackSwing | undefined {
  const weapon = ctx?.weapon
  if (!weapon) return undefined
  const properties = Array.isArray(weapon.data?.properties)
    ? (weapon.data.properties as unknown[]).filter((p): p is string => typeof p === 'string')
    : []
  return {
    weapon: {
      ...(weapon.name ? { name: weapon.name } : {}),
      itemType: weapon.itemType ?? null,
      category: weapon.category ?? null,
      data: { properties },
    },
    twoHanded: !!ctx.twoHanded,
    sole: !!ctx.sole,
    ability: ctx.ability ?? null,
    ...(ctx.offHand ? { offHand: true } : {}),
  }
}

type MasteredWeapon = NonNullable<VaultCharacterJson['masteredWeapons']>[number]

interface UnarmedStrike {
  name: string
  attackBonus: number
  dmgToken: string | null
  dmgFlat: number | null
  damageType: string | null
}

/**
 * The overlay as every reader of a note applies it: the note's inventory, its
 * Vault choices and switched-on benefits, and the worn items' notes, read first.
 *
 * A Vault character is overlaid even with no ` ```vault-inventory `: it fights
 * unarmed, and Unarmed Strike is a line the web sheet always shows.
 */
export async function overlayNote(
  sheet: Sheet,
  noteText: string,
  source: ItemDataSource | null | undefined,
  fallback?: InventoryCatalogs,
  opts: { loadoutSystem?: boolean } = {},
): Promise<Sheet> {
  const invText = extractFence(noteText, INVENTORY_FENCE)
  const vaultJson = sheet.vault_bake ? readVaultCharacterFromNote(noteText) : null
  if (!invText && !vaultJson) return sheet
  const inventory = parseInventory(invText)
  const catalogs = await preloadCatalogs(inventory.items, source, fallback)
  return projectSheetWithInventory(sheet, inventory, catalogs, {
    vaultJson,
    activeEffects: extractVitalsFromNote(noteText).activeEffects,
    loadoutSystem: opts.loadoutSystem,
  })
}

export function projectSheetWithInventory(
  sheet: Sheet,
  inventory: CharacterInventory,
  catalogs?: InventoryCatalogs,
  ctx: OverlayContext = {},
): Sheet {
  const opts = { loadoutSystem: !!ctx.loadoutSystem }
  const worn = equippedRows(inventory, catalogs, opts)
  sheet.item_casts = itemCasts(worn, opts)
  const others = (Array.isArray(sheet.attacks) ? sheet.attacks : []).filter(a => a.source !== 'item')
  sheet.worn_defenses = wornDefenses(worn, opts)

  if (ctx.vaultJson && sheet.vault_bake) {
    const derived = deriveVault(ctx.vaultJson, sheet.vault_bake, worn, ctx.activeEffects ?? [], opts)
    sheet.worn_effects = wornRollEffects(worn, opts, derived.armorPenalty)
    // A worn item's `sense` (Goggles of Night) is in `derived.senses`; the
    // projection's were worked out with nothing worn (MYDND-278).
    sheet.senses = derived.senses.map(s => ({ name: s.sense, range: s.range, source: s.source ?? null }))
    sheet.ac = derived.ac
    // `deriveCharacterSheet` counts a worn item's `speed` effect; the
    // projection's own numbers were worked out with nothing worn (MYDND-239).
    if (typeof derived.speed === 'number') sheet.speed = derived.speed
    if (derived.speeds) sheet.speeds = derived.speeds
    const { hpMax, ...scores } = derived.scores
    Object.assign(sheet, scores)
    sheet.spell_damage_bonuses = spellDamageBonuses(ctx.vaultJson, scores.abilities)
    sheet.spell_pushes = spellPushes(ctx.vaultJson)
    // The projection writes `current` equal to the maximum, and the vitals
    // overlay, applied after this one, derives `current` from damage. A raised
    // maximum moves `current` with it, so a note with no vitals yet does not
    // read as hurt.
    const was = sheet.hp?.max
    if (sheet.hp && typeof was === 'number' && hpMax !== was) {
      sheet.hp = { ...sheet.hp, max: hpMax, current: Math.max(0, (sheet.hp.current ?? was) + hpMax - was) }
    }
    sheet.attacks = [
      ...others.filter(a => a.name !== 'Unarmed Strike'),
      ...derived.weaponActions.flatMap(a => toAttacks(a, worn, ctx.vaultJson?.masteredWeapons, inventory.items)),
      ...(derived.unarmedStrike ? [unarmedAttack(derived.unarmedStrike)] : []),
    ]
    return sheet
  }

  const ac = ddbAc(sheet, worn, opts)
  if (ac !== null) sheet.ac = ac
  sheet.worn_effects = wornRollEffects(worn, opts, null)
  sheet.senses = withWornSenses(sheet.senses, sheet.worn_effects)

  const actions = deriveWeaponActions(
    {
      abilityScores: abilityMods(sheet),
      pb: sheet.proficiency_bonus ?? 2,
      itemEffectsApply: (item: Parameters<typeof itemBenefitsApply>[0]) => itemBenefitsApply(item, opts),
    },
    worn,
    [],
  ) as WeaponAction[]
  const attacks = Array.isArray(sheet.attacks) ? [...sheet.attacks] : []
  for (const line of actions.flatMap(a => toAttacks(a, worn, [], inventory.items))) {
    // A weapon D&D Beyond already lists by that name is the same weapon: the
    // local line replaces it rather than doubling it.
    const at = attacks.findIndex(a => a.name.toLowerCase() === line.name.toLowerCase())
    if (at >= 0) attacks[at] = line
    else attacks.push(line)
  }
  sheet.attacks = attacks
  return sheet
}

function deriveVault(
  json: VaultCharacterJson,
  bake: NonNullable<Sheet['vault_bake']>,
  worn: EquippedRow[],
  activeEffects: readonly string[],
  opts: { loadoutSystem?: boolean },
): DerivedEquipment {
  const derived = deriveCharacterSheet(
    {
      source: 'vault',
      json: { ...json, resolvedEffects: bake.effects, proficiencyBaseline: bake.proficiency_baseline },
      // The projection's `maxBonus` too, or a converted character's maximum
      // would drop by D&D Beyond's `bonusHitPoints` on every read.
      vault_state: { ...vaultStateFor(json), activeEffects: [...activeEffects] },
    },
    worn,
    opts,
  ) as Derived & Omit<DerivedEquipment, 'scores'>
  return {
    ac: derived.ac,
    speed: derived.speed,
    speeds: derived.speeds,
    weaponActions: derived.weaponActions ?? [],
    unarmedStrike: derived.unarmedStrike ?? null,
    scores: scoreLines(json, derived),
    senses: derived.senses ?? [],
    armorPenalty: derived.armorPenalty ?? null,
  }
}

/**
 * The defences the worn items grant (MYDND-239), by `resolveDefenseGrants` —
 * the Defences tab's own resolver, given only the worn rows here, because this
 * is the one place that has them. Its `itemBenefitsApply` gate is the one
 * `ddbAc` and `deriveCharacterSheet` apply, so the tab and the AC agree about
 * whether an item counts.
 */
function wornDefenses(worn: EquippedRow[], opts: { loadoutSystem?: boolean }): SheetDefense[] {
  return (resolveDefenseGrants({ equippedItems: worn, loadoutSystem: opts.loadoutSystem }) as SheetDefense[]).map(g => ({
    type: g.type,
    value: g.value,
    source: g.source ?? null,
  }))
}

const ARMOR_TYPES = new Set(['Light Armor', 'Medium Armor', 'Heavy Armor'])

/**
 * A D&D Beyond character's AC under its local loadout, or null to keep D&D
 * Beyond's. Armour sets the base from its own note (`ac: 16`) by `vaultAc`'s
 * three rules; a shield adds its `ac` (2 by default); an item's `ac_bonus`
 * effect adds while the item is licensed. Without armour the base is D&D
 * Beyond's number, as it always was.
 */
function ddbAc(sheet: Sheet, worn: EquippedRow[], opts: { loadoutSystem?: boolean }): number | null {
  const dex = sheet.abilities.find(a => a.label === 'DEX')?.mod ?? 0
  const armor = worn.find(r => ARMOR_TYPES.has(r.content_item?.item_type ?? ''))
  const shield = worn.find(r => r.content_item?.item_type === 'Shield')
  const shieldBonus = shield ? Number(shield.content_item?.data?.ac ?? 2) : 0
  const bonus = worn
    .filter(r => itemBenefitsApply(r, opts))
    .flatMap(r => (Array.isArray(r.magic_item?.data?.effects) ? (r.magic_item.data.effects as Array<Record<string, unknown>>) : []))
    .filter(e => e?.type === 'ac_bonus' && acBonusApplies(e.requires, !!armor, !!shield))
    .reduce((sum, e) => sum + Number(e.amount ?? 0), 0)

  if (armor) {
    const type = armor.content_item!.item_type
    const base = Number(armor.content_item!.data?.ac ?? 10)
    const dexPart = type === 'Light Armor' ? dex : type === 'Medium Armor' ? Math.min(dex, 2) : 0
    return base + dexPart + shieldBonus + bonus
  }
  if (shieldBonus === 0 && bonus === 0) return null
  const unarmored = typeof sheet.ac === 'number' && sheet.ac > 0 ? sheet.ac : 10 + dex
  return unarmored + shieldBonus + bonus
}

/**
 * What the worn items do to a roll's mode, as effects `rollModes` reads
 * (MYDND-278): the licensed items' own (Boots of Elvenkind's Stealth
 * advantage, Sentinel Shield's initiative), the unproficient-armour penalty
 * `deriveCharacterSheet` worked out, and armour's Stealth disadvantage.
 *
 * The sheet fed `rollModes` from feats, baked features and declared effects
 * only, so none of these marked a roll. Laid over on read, never in a fence.
 * Each is enveloped (`sourceKind`, `sourceFeatureId`) as a declared effect is.
 */
function wornRollEffects(
  worn: EquippedRow[],
  opts: { loadoutSystem?: boolean },
  penalty: DerivedEquipment['armorPenalty'],
): Record<string, unknown>[] {
  const own = worn
    .filter(r => itemBenefitsApply(r, opts))
    .flatMap(r => {
      const effects = Array.isArray(r.magic_item?.data?.effects) ? (r.magic_item.data.effects as Record<string, unknown>[]) : []
      const source = r.magic_item?.name ?? 'An item'
      return effects.map(e => ({ ...e, source, sourceKind: 'item', sourceFeatureId: r.id }))
    })
  const armour = penalty?.items?.length
    ? (vaultArmorPenaltyEffects(penalty.items) as Record<string, unknown>[]).map(e => ({
        ...e,
        sourceKind: 'item',
        sourceFeatureId: 'armor-penalty',
      }))
    : []
  const stealth = worn
    .filter(r => ARMOR_TYPES.has(r.content_item?.item_type ?? '') && !!r.content_item?.data?.stealth)
    .map(r => ({
      type: 'ability_check_disadvantage',
      ability: 'dex',
      skill: 'stealth',
      source: r.content_item?.name ?? 'Armour',
      sourceKind: 'item',
      sourceFeatureId: `${r.id}:stealth`,
    }))
  return [...own, ...armour, ...stealth]
}

/**
 * The spells the worn items cast (MYDND-278), for the Spells tab. Only an item
 * whose benefits apply — attuned, or slotted under the loadout system — since
 * casting from it is one of them.
 */
function itemCasts(worn: EquippedRow[], opts: { loadoutSystem?: boolean }): SheetItemCast[] {
  return worn
    .filter(r => itemBenefitsApply(r, opts) && (r.magic_item?.casts?.length ?? 0) > 0)
    .flatMap(r =>
      (r.magic_item?.casts ?? []).map(text => {
        const cast = parseCast(text)
        return {
          key: `${r.id}:${cast.name}`,
          itemId: r.id,
          item: (typeof r.custom_name === 'string' && r.custom_name) || r.magic_item?.name || 'Item',
          name: cast.name,
          cost: cast.cost,
          charges: cast.charges,
          maxCharges: r.magic_item?.charges ?? null,
          used: Number(r.charges_used ?? 0) || 0,
        }
      }),
    )
}

/**
 * A D&D Beyond sheet's senses with the worn items' laid over (MYDND-278): the
 * longer range wins, as `vaultSenses` decides for a Vault character.
 */
function withWornSenses(senses: Sheet['senses'], effects: readonly Record<string, unknown>[]): Sheet['senses'] {
  const out = new Map((senses ?? []).map(s => [s.name.toLowerCase(), s]))
  for (const e of effects) {
    if (e.type !== 'sense') continue
    const name = typeof e.sense === 'string' ? e.sense.trim() : ''
    const range = Number(e.range)
    if (!name || !Number.isFinite(range) || range <= 0) continue
    const was = out.get(name.toLowerCase())
    if (!was || range > was.range) {
      out.set(name.toLowerCase(), { name: was?.name ?? name, range, source: typeof e.source === 'string' ? e.source : null })
    }
  }
  return out.size === 0 ? senses : [...out.values()]
}

function abilityMods(sheet: Sheet): Array<{ key: string; mod: number }> {
  return sheet.abilities.map(a => ({ key: a.label.toLowerCase(), mod: a.mod }))
}

/** `[1d8+3, damage, slashing]` — `damageToken`'s shape — as formula and type. */
export function parseDamageToken(token: string | null | undefined): { formula: string; type: string | null } | null {
  const m = /^\[([^,\]]+), damage(?:, ([^\]]+))?\]$/.exec(token ?? '')
  return m ? { formula: m[1].trim(), type: m[2]?.trim() ?? null } : null
}

const HANDS = new Set(['main_hand', 'off_hand'])

/** The rule's own number: "up to 10 feet straight away". */
const PUSH_MASTERY_FEET = 10

/**
 * Whether this character has the Push mastery on this weapon (MYDND-179).
 *
 * The mastery is the weapon's and the pick is the character's, and a pick names
 * the base weapon: a +1 Pike is mastered by whoever mastered the Pike.
 */
function pushesWith(a: WeaponAction, row: EquippedRow | undefined, mastered: MasteredWeapon[]): boolean {
  return masteryOf(a, row, mastered) === 'push'
}

/**
 * The weapon's mastery property, when this character has mastered the weapon
 * (MYDND-278); null otherwise. A pick names the base weapon, as for Push.
 */
function masteryOf(a: WeaponAction, row: EquippedRow | undefined, mastered: MasteredWeapon[]): string | null {
  const mastery = a.weaponCtx?.weapon?.data?.mastery
  if (typeof mastery !== 'string' || !mastery) return null
  const ids = [row?.content_item?.id, row?.base_content_item?.id, row?.magic_item?.base_item?.id]
  // A hand-edited fence can say anything here, and this runs in a render.
  return Array.isArray(mastered) && mastered.some(m => ids.includes(m?.id)) ? mastery.toLowerCase() : null
}

/**
 * Where a weapon reaches, in feet (MYDND-278): `150/600 ft` for a bow, `melee
 * or 20/60 ft` for a thrown dagger, `melee, reach 10 ft` for a glaive. The line
 * said only `melee` or `ranged`.
 */
export function weaponRange(itemType: string | null | undefined, range: unknown, props: readonly string[]): string {
  const r = range && typeof range === 'object' ? (range as { normal?: unknown; long?: unknown }) : null
  const normal = Number(r?.normal)
  const long = Number(r?.long)
  const feet = Number.isFinite(normal) && normal > 0 ? `${normal}${Number.isFinite(long) && long > 0 ? `/${long}` : ''} ft` : null
  if (itemType === 'Ranged Weapon') return feet ?? 'ranged'
  const reach = props.some(p => /^reach\b/i.test(p))
  const thrown = props.some(p => /^thrown\b/i.test(p))
  if (thrown && feet) return `melee or ${feet}`
  return reach ? 'melee, reach 10 ft' : 'melee'
}

/** The ammunition each launcher fires, by a word in its name (MYDND-278). */
const AMMUNITION: ReadonlyArray<[RegExp, RegExp, string]> = [
  [/crossbow/i, /\bbolts?\b/i, 'bolts'],
  [/\bbow\b|longbow|shortbow/i, /\barrows?\b/i, 'arrows'],
  [/sling/i, /\bbullets?\b/i, 'bullets'],
  [/blowgun/i, /\bneedles?\b/i, 'needles'],
  [/musket|pistol|rifle|firearm/i, /\bbullets?\b/i, 'bullets'],
]

/**
 * How much of a launcher's ammunition the character carries (MYDND-278), by
 * name across every inventory row: `Arrows (20)` and a +1 Arrow both count.
 */
export function ammunitionFor(
  weaponName: string,
  props: readonly string[],
  inventory: readonly { name?: string | null; custom_name?: string | null; quantity?: number }[],
): { name: string; quantity: number } | null {
  if (!props.some(p => /^ammunition\b/i.test(p))) return null
  const kind = AMMUNITION.find(([launcher]) => launcher.test(weaponName))
  if (!kind) return null
  const quantity = inventory
    .filter(it => kind[1].test(`${it.custom_name ?? ''} ${it.name ?? ''}`))
    .reduce((sum, it) => sum + (Number.isFinite(it.quantity) ? Number(it.quantity) : 1), 0)
  return { name: kind[2], quantity }
}

function toAttacks(
  a: WeaponAction,
  worn: EquippedRow[],
  mastered: MasteredWeapon[] = [],
  inventory: CharacterInventory['items'] = [],
): SheetAttack[] {
  const rowId = a.offHand ? a.id.replace(/:off-hand$/, '') : a.id
  const row = worn.find(r => r.id === rowId)
  const name = (typeof row?.custom_name === 'string' && row.custom_name) || a.name
  const damage = parseDamageToken(a.dmgToken)
  const extras = (a.extraDamageTokens ?? []).map(parseDamageToken).filter(Boolean) as Array<{ formula: string; type: string | null }>
  const properties = [
    ...(a.props ?? []),
    ...extras.map(x => `+${x.formula}${x.type ? ` ${x.type}` : ''}`),
    ...(a.proficient === 'no' ? ['Not proficient'] : []),
    ...(a.disadvantage ? a.disadvantageSources.map(s => `Disadvantage: ${s}`) : []),
  ]
  const mastery = masteryOf(a, row, mastered)
  // Nick (MYDND-278): the Light property's extra attack is part of the Attack
  // action rather than a Bonus Action, with the weapon that has it.
  const nick = a.offHand && mastery === 'nick'
  const ammo = ammunitionFor(a.weaponCtx?.weapon?.name ?? a.name, a.props ?? [], inventory)
  const line: SheetAttack = {
    name: a.offHand ? `${name} (off-hand)` : name,
    source: 'item',
    equipped: !row?.loadout_slot || HANDS.has(String(row.loadout_slot)),
    range: weaponRange(a.weaponCtx?.weapon?.itemType, a.weaponCtx?.weapon?.data?.range, a.props ?? []),
    activation: a.actionKind === 'bonus_action' && !nick ? 'bonus action' : 'action',
    attack: a.attackBonus,
    damage: damage?.formula ?? null,
    damageType: damage?.type ?? null,
    properties,
    ...(pushesWith(a, row, mastered) ? { push: PUSH_MASTERY_FEET } : {}),
    ...(mastery ? { mastery } : {}),
    ...(extras.length > 0 ? { extraDamage: extras } : {}),
    ...(a.disadvantage && a.disadvantageSources.length > 0 ? { disadvantage: [...a.disadvantageSources] } : {}),
    ...(ammo ? { ammo } : {}),
  }
  const swing = swingOf(a.weaponCtx)
  if (swing) line.swing = swing
  const twoHanded = parseDamageToken(a.dmgToken2)
  if (!twoHanded) return [line]
  const swing2 = swingOf(a.weaponCtx2)
  const held = { ...line, name: `${name} (two-handed)`, damage: twoHanded.formula, damageType: twoHanded.type }
  if (swing2) held.swing = swing2
  else delete held.swing
  return [line, held]
}

function unarmedAttack(u: UnarmedStrike): SheetAttack {
  const damage = parseDamageToken(u.dmgToken)
  return {
    name: u.name,
    source: 'feature',
    equipped: true,
    range: 'melee',
    activation: 'action',
    attack: u.attackBonus,
    // A bare Unarmed Strike is a flat 1 + Strength, not a roll.
    damage: damage?.formula ?? (u.dmgFlat != null ? String(u.dmgFlat) : null),
    damageType: (damage?.type ?? u.damageType ?? null)?.toLowerCase() ?? null,
    properties: [],
  }
}
