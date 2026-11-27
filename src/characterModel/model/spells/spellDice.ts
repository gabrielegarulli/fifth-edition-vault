import { cantripTier, diceAtRank } from '../../../compendium'
import type { SpellRow } from '../../../compendium'
import type { SheetSpellDamageBonus, SheetSpellPush, SheetSpellRider } from '../sheet/sheet'

/**
 * What a spell rolls when it is cast at a given rank (MYDND-49).
 *
 * The dice are the spell note's derived keys (`damage_dice`, `heal_dice`,
 * `upcast_dice`, `cantrip_dice`), written by the spell exporter. The rank and
 * tier arithmetic is `compendium/model/spellRanks.ts` (MYDND-200); this file
 * adds what the character brings: the spellcasting modifier, an invocation's
 * bonus, a push.
 */

/** `+5`, `-1`, or nothing for 0: a flat amount on the end of a formula. */
const signed = (n: number): string => (n === 0 ? '' : `${n > 0 ? '+' : '-'}${Math.abs(n)}`)

export interface SpellRoll {
  formula: string
  kind: 'damage' | 'heal'
  /** The first damage type, for the dice engine's `damageType` predicate. */
  damageType: string | null
}

/**
 * The roll a cast makes, or null for a spell that rolls nothing (Haste) or a
 * note exported before the keys existed.
 *
 * @param rank the slot rank cast at; 0 for a cantrip
 * @param characterLevel for a cantrip's tier
 * @param spellMod the caster's spellcasting modifier, which a heal like Cure
 *   Wounds adds
 * @param damageBonus a flat amount on each damage roll, Agonizing Blast's
 *   (MYDND-178). Added to the formula, so `criticalFormula` leaves it undoubled
 *   and each of Eldritch Blast's beams adds it.
 * @param healBonus a flat amount on a heal, Disciple of Life's (MYDND-285)
 */
export function spellRoll(
  row: Pick<SpellRow, 'level' | 'damageDice' | 'healDice' | 'healMod' | 'upcastDice' | 'cantripDice' | 'damageTypes'> &
    Partial<Pick<SpellRow, 'upcastEvery'>>,
  {
    rank,
    characterLevel,
    spellMod,
    damageBonus = 0,
    healBonus = 0,
  }: { rank: number; characterLevel: number; spellMod: number; damageBonus?: number; healBonus?: number },
): SpellRoll | null {
  const damageType = row.damageTypes[0] ?? null
  if (row.level <= 0) {
    const tiered = row.cantripDice.length > 0 ? row.cantripDice[cantripTier(characterLevel)] : row.damageDice
    // `""` is a tier that adds nothing — True Strike at level 1.
    return tiered ? { formula: `${tiered}${signed(damageBonus)}`, kind: 'damage', damageType } : null
  }
  if (row.damageDice) {
    const dice = diceAtRank(row.damageDice, row.upcastDice, row.level, rank, row.upcastEvery)
    return { formula: `${dice}${signed(damageBonus)}`, kind: 'damage', damageType }
  }
  if (row.healDice) {
    const dice = diceAtRank(row.healDice, row.upcastDice, row.level, rank, row.upcastEvery)
    return { formula: `${dice}${signed((row.healMod ? spellMod : 0) + healBonus)}`, kind: 'heal', damageType: null }
  }
  return null
}

/** What a feature adds to this spell's damage. A name matches too: another edition's note. */
export function spellDamageBonus(
  bonuses: readonly SheetSpellDamageBonus[] | undefined,
  name: string,
  id: string | null | undefined,
): number {
  return bonuses?.find(b => b.id === id || b.name === name)?.bonus ?? 0
}

/** What a subclass's riders add to this spell (MYDND-285). */
export interface SpellRiderAmounts {
  /** On each damage roll, as `spellDamageBonus`'s amount is. */
  damage: number
  /** On a heal cast at `rank`; `slot` false for a cantrip or a ritual. */
  heal: (rank: number, slot: boolean) => number
}

const NO_RIDERS: SpellRiderAmounts = { damage: 0, heal: () => 0 }

/**
 * Which of `sheet.spell_riders` this spell meets, and what they add. Read off
 * the spell's note: its school, its damage types, its class lists. Two riders
 * on one spell both add (a Draconic Sorcerer/Celestial Warlock's fire spell).
 */
export function spellRiderBonus(
  riders: readonly SheetSpellRider[] | undefined,
  row: Pick<SpellRow, 'school' | 'damageTypes' | 'classes'> | null | undefined,
): SpellRiderAmounts {
  if (!row || !riders?.length) return NO_RIDERS
  const lower = (xs: readonly string[] | null | undefined) => (xs ?? []).map(x => String(x).toLowerCase())
  const types = lower(row.damageTypes)
  const lists = lower(row.classes)
  const school = String(row.school ?? '').toLowerCase()
  const met = riders.filter(
    r =>
      (!r.schools?.length || r.schools.includes(school)) &&
      (!r.damage_types?.length || r.damage_types.some(t => types.includes(t))) &&
      (!r.list || lists.includes(r.list.toLowerCase())),
  )
  const damage = met.filter(r => r.kind === 'damage').reduce((n, r) => n + r.bonus, 0)
  const heals = met.filter(r => r.kind === 'heal')
  return {
    damage,
    heal: (rank, slot) =>
      heals.filter(r => slot || !r.slot_only).reduce((n, r) => n + r.bonus + (r.plus_rank ? rank : 0), 0),
  }
}

/** How far a hit with this spell pushes, or null. Matched as `spellDamageBonus` is. */
export function spellPushFeet(
  pushes: readonly SheetSpellPush[] | undefined,
  name: string,
  id: string | null | undefined,
): number | null {
  return pushes?.find(p => p.id === id || p.name === name)?.feet ?? null
}
