import type { Sheet } from '../sheet/sheet'
import type { CastCost } from '../vitals'

/**
 * Boon of Spell Recall's Free Casting (MYDND-274): "Whenever you cast a spell
 * with a level 1–4 spell slot, roll 1d4. If the number you roll is the same as
 * the slot's level, the slot isn't expended."
 *
 * Read by the feat's name, the one part of the sheet that says it is held: no
 * effect type describes a slot that may not be spent, and the boon's note
 * carries none. SRD 5.2.1 and the 2024 book spell the name alike.
 */
export const SPELL_RECALL = 'Boon of Spell Recall'

/** The slot's rank when this cast earns the 1d4, else null. */
export function freeCastingRank(sheet: Pick<Sheet, 'feats'>, cost: CastCost): number | null {
  const rank = cost.slot?.rank
  if (typeof rank !== 'number' || rank < 1 || rank > 4) return null
  const held = (sheet.feats ?? []).some(name => name.trim().toLowerCase() === SPELL_RECALL.toLowerCase())
  return held ? rank : null
}

/**
 * The cast as it is paid once the 1d4 is read: no slot on a match, so the
 * spend and the refund are not two writes. Everything else it cost stays, and
 * a concentration spell still starts.
 */
export function afterFreeCasting(cost: CastCost, rolled: number | null): CastCost {
  if (!cost.slot || rolled !== cost.slot.rank) return cost
  const rest = { ...cost }
  delete rest.slot
  return rest
}
