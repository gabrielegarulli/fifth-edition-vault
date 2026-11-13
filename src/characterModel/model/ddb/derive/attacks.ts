import type { DdbAction, DdbItemDefinition, DdbPayload } from '../payload'
import type { SheetAttack, SheetFeatureDie } from '../../sheet/sheet'

import { abilityMod, fmtMod } from '../../sheet/abilityMod'
import { STAT_IDS, flattenModifiers, proficiencyBonus, getAbilityScore, flattenActions } from './shared'

// Weapon attacks, action attacks and the dice a feature rolls.
// One file of the D&D Beyond derivation (MYDND-197); index.ts says what it is and why it is kept.

/**
 * A weapon's `+N`, from the item's own granted modifiers. A `+1 Longsword`
 * carries it as a `bonus`/`magic` modifier rather than in its name.
 */
function weaponMagicBonus(def: DdbItemDefinition | null | undefined): number {
  let n = 0
  for (const m of def?.grantedModifiers || []) {
    if (!m) continue
    if (
      String(m.type ?? '').toLowerCase() === 'bonus' &&
      String(m.subType ?? '').toLowerCase() === 'magic' &&
      typeof m.value === 'number'
    ) {
      n += m.value
    }
  }
  return n
}

/**
 * Whether an inventory row is a weapon. `filterType === 'Weapon'` is the clean
 * signal, but magic weapons sometimes arrive filed as something else, so a
 * damage dice plus an attack type counts too. Every item in a payload *has*
 * these keys — they are null on non-weapons, which is why this tests values.
 */
function isWeapon(def: DdbItemDefinition | null | undefined): boolean {
  if (!def) return false
  if (def.filterType === 'Weapon') return true
  return !!(def.damage && def.damage.diceString && def.attackType)
}

/** `'Crossbow, Hand'` → `'crossbow-hand'`, the spelling a proficiency modifier uses. */
const weaponSlug = (s: string | null | undefined): string =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/**
 * Whether the character is proficient with a weapon (MYDND-139).
 *
 * Resolved the way D&D Beyond states it: `categoryId` 1 is simple and 2 is
 * martial, and a `proficiency` modifier names either the category
 * (`simple-weapons`, `martial-weapons`) or the weapon's type (`longsword`,
 * `crossbow-hand`). Measured 2026-11-02 on the 25 public Disposable Heroes
 * payloads, 93 weapons: every one carries a `categoryId` and a `type`.
 *
 * **Assumed where the payload cannot say**: no proficiency modifier at all (only
 * a synthetic or broken payload), or a weapon with neither field. Before this,
 * proficiency was assumed for every weapon.
 */
function weaponProficient(def: DdbItemDefinition, proficiencies: ReadonlySet<string>): boolean {
  if (proficiencies.size === 0) return true
  if (def.categoryId == null && !def.type) return true
  if (def.categoryId === 1 && proficiencies.has('simple-weapons')) return true
  if (def.categoryId === 2 && proficiencies.has('martial-weapons')) return true
  return proficiencies.has(weaponSlug(def.type))
}

/**
 * Weapon attacks as rollable lines.
 *
 * Proficiency is resolved against the payload's proficiency modifiers
 * (`weaponProficient`), and a Versatile weapon gets a second line for two hands,
 * as a Vault weapon does (`characterModel/model/sheetProjection.ts`). Both MYDND-139, which
 * checked them against the armed characters in the 25 public Disposable Heroes
 * payloads; until then this ran only against hand-built items. An attack that
 * looks wrong is editable in the fence.
 */
export function buildAttacks(payload: DdbPayload): SheetAttack[] {
  const pb = proficiencyBonus(payload)
  const str = abilityMod(getAbilityScore(payload, STAT_IDS.STR))
  const dex = abilityMod(getAbilityScore(payload, STAT_IDS.DEX))
  const proficiencies = new Set(
    flattenModifiers(payload)
      .filter(m => String(m.type ?? '').toLowerCase() === 'proficiency')
      .map(m => String(m.subType ?? '').toLowerCase()),
  )
  const out: SheetAttack[] = []

  for (const item of Array.isArray(payload?.inventory) ? payload.inventory : []) {
    const def = item?.definition
    if (!isWeapon(def) || !def) continue

    const props = (def.properties || []).map(p => String(p?.name || '').toLowerCase())
    const ranged = def.attackType === 2
    const finesse = props.includes('finesse')
    // Finesse takes the better of the two; a ranged weapon takes Dexterity.
    const ability = ranged ? dex : finesse ? Math.max(str, dex) : str
    const magic = weaponMagicBonus(def)

    const dice = def.damage?.diceString || null
    const damageMod = ability + magic
    const line: SheetAttack = {
      name: def.name || 'Weapon',
      source: 'item',
      equipped: !!item?.equipped,
      range: ranged ? 'ranged' : 'melee',
      attack: ability + (weaponProficient(def, proficiencies) ? pb : 0) + magic,
      damage: dice ? `${dice}${damageMod ? fmtMod(damageMod) : ''}` : null,
      damageType: def.damageType || null,
      properties: (def.properties || []).map(p => p?.name || '').filter(Boolean),
    }
    out.push(line)

    // The two-handed dice, only when they are dice: `notes` is free text.
    const twoHanded = (def.properties || []).find(p => String(p?.name || '').toLowerCase() === 'versatile')?.notes?.trim()
    if (twoHanded && /^\d+d\d+$/i.test(twoHanded)) {
      out.push({ ...line, name: `${line.name} (two-handed)`, damage: `${twoHanded}${damageMod ? fmtMod(damageMod) : ''}` })
    }
  }

  // Equipped first, then alphabetical — the ones in hand are the ones rolled.
  out.sort((a, b) => Number(b.equipped) - Number(a.equipped) || a.name.localeCompare(b.name))
  return out
}

/**
 * DDB's `activation.activationType`, for the three values confirmed against the
 * rules on a real payload: Psychic Blades' main attack and Psionic Power are
 * `1`, Cunning Action / Nimble Escape / the off-hand blade are `3`, Uncanny
 * Dodge is `4`. The rest (`2` and `8`, seen on Sneak Attack, its Cunning Strike
 * riders and Fury of the Small) are deliberately *not* guessed — an unlabelled
 * action beats one labelled wrongly.
 */
const ACTIVATION_LABELS: Record<number, string> = { 1: 'action', 3: 'bonus action', 4: 'reaction' }

/**
 * Whether an action is something you roll to hit with.
 *
 * **Not `displayAsAttack`.** That flag is true on Sneak Attack and on all three
 * Psionic Power entries, none of which involve an attack roll — trusting it puts
 * damage-only features in the attack list with a nonsense to-hit. A real attack
 * states both a range *and* the ability it is made with.
 */
function isActionAttack(action: DdbAction | null | undefined): boolean {
  return !!(action && action.attackTypeRange != null && typeof action.abilityModifierStatId === 'number')
}

/**
 * Attacks granted by a class, species or feat feature rather than by an item —
 * a Soulknife's Psychic Blades, a Monk's unarmed strike. Without this, a
 * character who owns no weapon appears to have no way to attack, which is wrong
 * for both characters tested.
 *
 * Proficiency here is **stated** (`isProficient`) rather than assumed as it must
 * be for inventory weapons, and `fixedToHit` overrides the sum when DDB has one.
 */
export function buildActionAttacks(payload: DdbPayload): SheetAttack[] {
  const pb = proficiencyBonus(payload)
  const out: SheetAttack[] = []

  for (const action of flattenActions(payload)) {
    if (!isActionAttack(action)) continue

    const ability = abilityMod(getAbilityScore(payload, action.abilityModifierStatId as number))
    const attack =
      typeof action.fixedToHit === 'number' ? action.fixedToHit : ability + (action.isProficient ? pb : 0)

    const dice = action.dice || {}
    const flat = ability + (typeof dice.fixedValue === 'number' ? dice.fixedValue : 0)
    const activationType = action.activation?.activationType
    const reach = typeof action.range?.range === 'number' ? action.range.range : null

    out.push({
      name: action.name || 'Attack',
      source: 'feature',
      equipped: true,
      activation: (typeof activationType === 'number' ? ACTIVATION_LABELS[activationType] : null) || null,
      range: reach ? `${reach} ft` : null,
      attack,
      damage: dice.diceString ? `${dice.diceString}${flat ? fmtMod(flat) : ''}` : null,
      // Only a `damageTypeId` is given and the payload carries no lookup for it,
      // so the type is omitted rather than guessed from the number.
      damageType: null,
      properties: [],
    })
  }
  return out
}

/**
 * Features whose dice you roll without rolling to hit — Sneak Attack's 7d6, a
 * Psionic Energy die. Worth their own click: a rogue rolls sneak attack most
 * turns, and it is the biggest handful of dice on the sheet.
 */
export function buildFeatureDice(payload: DdbPayload): SheetFeatureDie[] {
  const seen = new Set<string>()
  const out: SheetFeatureDie[] = []

  for (const action of flattenActions(payload)) {
    if (isActionAttack(action)) continue
    const dice = action.dice || {}
    if (!dice.diceString) continue

    const name = action.name || 'Feature'
    const key = `${name}|${dice.diceString}`
    if (seen.has(key)) continue
    seen.add(key)

    const activationType = action.activation?.activationType
    out.push({
      name,
      formula: dice.diceString,
      activation: (typeof activationType === 'number' ? ACTIVATION_LABELS[activationType] : null) || null,
    })
  }
  return out
}
