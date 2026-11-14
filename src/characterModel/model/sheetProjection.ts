import { deriveCharacterSheet } from '@vault/derive/deriveCharacterSheet.js'
import { itemBenefitsApply } from '@vault/derive/itemBenefits.js'
import { deriveWeaponActions } from '@vault/derive/weaponActions.js'

import type { Sheet, SheetAttack } from './sheet/sheet'
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
}

/** `deriveCharacterSheet`'s answers this file reads. */
interface DerivedEquipment {
  ac: number
  weaponActions: WeaponAction[]
  unarmedStrike: UnarmedStrike | null
  scores: ScoreLines
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
  weaponCtx: { weapon: { itemType?: string; data?: { mastery?: unknown } } }
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
): Promise<Sheet> {
  const invText = extractFence(noteText, INVENTORY_FENCE)
  const vaultJson = sheet.vault_bake ? readVaultCharacterFromNote(noteText) : null
  if (!invText && !vaultJson) return sheet
  const inventory = parseInventory(invText)
  const catalogs = await preloadCatalogs(inventory.items, source, fallback)
  return projectSheetWithInventory(sheet, inventory, catalogs, {
    vaultJson,
    activeEffects: extractVitalsFromNote(noteText).activeEffects,
  })
}

export function projectSheetWithInventory(
  sheet: Sheet,
  inventory: CharacterInventory,
  catalogs?: InventoryCatalogs,
  ctx: OverlayContext = {},
): Sheet {
  const worn = equippedRows(inventory, catalogs)
  const others = (Array.isArray(sheet.attacks) ? sheet.attacks : []).filter(a => a.source !== 'item')

  if (ctx.vaultJson && sheet.vault_bake) {
    const derived = deriveVault(ctx.vaultJson, sheet.vault_bake, worn, ctx.activeEffects ?? [])
    sheet.ac = derived.ac
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
      ...derived.weaponActions.flatMap(a => toAttacks(a, worn, ctx.vaultJson?.masteredWeapons)),
      ...(derived.unarmedStrike ? [unarmedAttack(derived.unarmedStrike)] : []),
    ]
    return sheet
  }

  const ac = ddbAc(sheet, worn)
  if (ac !== null) sheet.ac = ac

  const actions = deriveWeaponActions(
    { abilityScores: abilityMods(sheet), pb: sheet.proficiency_bonus ?? 2 },
    worn,
    [],
  ) as WeaponAction[]
  const attacks = Array.isArray(sheet.attacks) ? [...sheet.attacks] : []
  for (const line of actions.flatMap(a => toAttacks(a, worn))) {
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
    {},
  ) as Derived & Omit<DerivedEquipment, 'scores'>
  return {
    ac: derived.ac,
    weaponActions: derived.weaponActions ?? [],
    unarmedStrike: derived.unarmedStrike ?? null,
    scores: scoreLines(json, derived),
  }
}

const ARMOR_TYPES = new Set(['Light Armor', 'Medium Armor', 'Heavy Armor'])

/**
 * A D&D Beyond character's AC under its local loadout, or null to keep D&D
 * Beyond's. Armour sets the base from its own note (`ac: 16`) by `vaultAc`'s
 * three rules; a shield adds its `ac` (2 by default); an item's `ac_bonus`
 * effect adds while the item is licensed. Without armour the base is D&D
 * Beyond's number, as it always was.
 */
function ddbAc(sheet: Sheet, worn: EquippedRow[]): number | null {
  const dex = sheet.abilities.find(a => a.label === 'DEX')?.mod ?? 0
  const armor = worn.find(r => ARMOR_TYPES.has(r.content_item?.item_type ?? ''))
  const shield = worn.find(r => r.content_item?.item_type === 'Shield')
  const shieldBonus = shield ? Number(shield.content_item?.data?.ac ?? 2) : 0
  const bonus = worn
    .filter(r => itemBenefitsApply(r, {}))
    .flatMap(r => (Array.isArray(r.magic_item?.data?.effects) ? (r.magic_item.data.effects as Array<Record<string, unknown>>) : []))
    .filter(e => e?.type === 'ac_bonus' && (!e.requires || (e.requires === 'armor' && !!armor)))
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
  if (a.weaponCtx?.weapon?.data?.mastery !== 'push') return false
  const ids = [row?.content_item?.id, row?.base_content_item?.id, row?.magic_item?.base_item?.id]
  // A hand-edited fence can say anything here, and this runs in a render.
  return Array.isArray(mastered) && mastered.some(m => ids.includes(m?.id))
}

function toAttacks(a: WeaponAction, worn: EquippedRow[], mastered: MasteredWeapon[] = []): SheetAttack[] {
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
  const line: SheetAttack = {
    name: a.offHand ? `${name} (off-hand)` : name,
    source: 'item',
    equipped: !row?.loadout_slot || HANDS.has(String(row.loadout_slot)),
    range: a.weaponCtx?.weapon?.itemType === 'Ranged Weapon' ? 'ranged' : 'melee',
    activation: a.actionKind === 'bonus_action' ? 'bonus action' : 'action',
    attack: a.attackBonus,
    damage: damage?.formula ?? null,
    damageType: damage?.type ?? null,
    properties,
    ...(pushesWith(a, row, mastered) ? { push: PUSH_MASTERY_FEET } : {}),
  }
  const twoHanded = parseDamageToken(a.dmgToken2)
  return twoHanded
    ? [line, { ...line, name: `${name} (two-handed)`, damage: twoHanded.formula, damageType: twoHanded.type }]
    : [line]
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
