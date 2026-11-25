import type { Sheet, SheetSpellcasting } from '../sheet/sheet'

/**
 * The spellcasting line a granted spell casts off, when its grant names an
 * ability (MYDND-274): Magic Initiate's "Intelligence, Wisdom, or Charisma is
 * your spellcasting ability for this feat's spells", and Fey Touched's +1.
 *
 * **Worked out on read, from the sheet's current scores**, not projected: a
 * worn item that raises the score moves it, as it moves the class's line.
 * Whatever the class's line adds beyond the ability and the Proficiency Bonus
 * (an item's +1 to spell attacks) is carried over, so two lines on one sheet
 * never disagree about the bonus. With no class line, it is the rule's own
 * `8 + PB + mod` and `PB + mod`.
 *
 * Null when the grant names no ability, or one the sheet has no score for:
 * then the spell casts off the class's line, as before.
 */
export function grantCasting(sheet: Pick<Sheet, 'abilities' | 'proficiency_bonus' | 'spellcasting'>, ability: string | null | undefined): SheetSpellcasting | null {
  if (!ability) return null
  const label = ability.toUpperCase()
  const score = (sheet.abilities ?? []).find(a => a.label === label)
  if (!score) return null
  const pb = sheet.proficiency_bonus ?? 2
  const line = sheet.spellcasting
  const attackExtra = line ? line.attack - line.mod - pb : 0
  const dcExtra = line ? line.dc - line.mod - pb - 8 : 0
  return { ability: label, mod: score.mod, attack: pb + score.mod + attackExtra, dc: 8 + pb + score.mod + dcExtra }
}
