// How an ability score takes its increases — VAULT-262 (MYDND-181).
//
// "You can't increase an ability score above 20" unless the increase itself
// says otherwise: an Epic Boon goes to 30, Primal Champion and Body and Mind to
// 25. Before this, every sum in the library added the increases blindly, and the
// `max` that `featToEffects` carefully kept on a feat's resolved bonus was read
// by nothing — a Barbarian at Strength 20 who took another +2 was baked at 22.
//
// Three rules, each one a case that went wrong without it:
//
// 1. **Each increase has its own cap**, `max` when it names one and 20 when it
//    does not. A blanket 20 would clamp Primal Champion's 25 and every boon.
// 2. **An increase never lowers a score.** A score already past the cap stays
//    where it is: a character converted from D&D Beyond arrives with its finals
//    as its base, and a Manual of Bodily Health may have put one there. The cap
//    limits what an increase can *add*, never what the character has.
// 3. **The lower caps go first.** Applied in the order they were written, a
//    boon's +1 could take a score from 19 to 20 and then leave the ASI's +1 with
//    nowhere to go — a point lost that the rules let you keep at 21. Sorting by
//    cap spends each increase where it is allowed to land.
//
// A negative amount (a curse, a drain) is not an increase, and is applied as is.

/** The cap an increase has when it names none. */
export const ABILITY_SCORE_CAP = 20

/**
 * `score` after `increases`, each `{ amount, max? }`, held to its own maximum.
 *
 * @param {number} score
 * @param {Array<{ amount?: number, max?: number | null }>} increases
 * @returns {number}
 */
export function withIncreases(score, increases = []) {
  const list = (increases ?? []).filter(i => Number.isFinite(Number(i?.amount)) && Number(i.amount) !== 0)
  const capOf = i => (Number.isFinite(Number(i.max)) && i.max != null ? Number(i.max) : ABILITY_SCORE_CAP)
  let out = score
  for (const i of list.filter(i => Number(i.amount) < 0)) out += Number(i.amount)
  for (const i of list.filter(i => Number(i.amount) > 0).sort((a, b) => capOf(a) - capOf(b))) {
    out = Math.max(out, Math.min(out + Number(i.amount), capOf(i)))
  }
  return out
}

/**
 * How many points of `increases` the cap swallowed: what the sum would have
 * been, less what `withIncreases` gives. The builder says so rather than let a
 * player spend an Ability Score Improvement on nothing.
 */
export function increasesLost(score, increases = []) {
  const raw = (increases ?? []).reduce((sum, i) => sum + (Number(i?.amount) > 0 ? Number(i.amount) : 0), 0)
  const negatives = (increases ?? []).reduce((sum, i) => sum + (Number(i?.amount) < 0 ? Number(i.amount) : 0), 0)
  return Math.max(0, score + negatives + raw - withIncreases(score, increases))
}
