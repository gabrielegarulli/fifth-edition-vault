import { cantripTier, diceAtRank } from '../../../compendium'
import type { SpellRow } from '../../../compendium'
import type { SheetSpellDamageBonus, SheetSpellPush } from '../sheet/sheet'

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
 */
export function spellRoll(
  row: Pick<SpellRow, 'level' | 'damageDice' | 'healDice' | 'healMod' | 'upcastDice' | 'cantripDice' | 'damageTypes'>,
  {
    rank,
    characterLevel,
    spellMod,
    damageBonus = 0,
  }: { rank: number; characterLevel: number; spellMod: number; damageBonus?: number },
): SpellRoll | null {
  const damageType = row.damageTypes[0] ?? null
  if (row.level <= 0) {
    const tiered = row.cantripDice.length > 0 ? row.cantripDice[cantripTier(characterLevel)] : row.damageDice
    // `""` is a tier that adds nothing — True Strike at level 1.
    return tiered ? { formula: `${tiered}${signed(damageBonus)}`, kind: 'damage', damageType } : null
  }
  if (row.damageDice) {
    const dice = diceAtRank(row.damageDice, row.upcastDice, row.level, rank)
    return { formula: `${dice}${signed(damageBonus)}`, kind: 'damage', damageType }
  }
  if (row.healDice) {
    const dice = diceAtRank(row.healDice, row.upcastDice, row.level, rank)
    return { formula: `${dice}${row.healMod ? signed(spellMod) : ''}`, kind: 'heal', damageType: null }
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

/** How far a hit with this spell pushes, or null. Matched as `spellDamageBonus` is. */
export function spellPushFeet(
  pushes: readonly SheetSpellPush[] | undefined,
  name: string,
  id: string | null | undefined,
): number | null {
  return pushes?.find(p => p.id === id || p.name === name)?.feet ?? null
}
