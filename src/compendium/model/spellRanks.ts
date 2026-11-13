/**
 * A spell's dice at a higher rank or character tier (MYDND-49): the arithmetic
 * the book states, over a spell note's derived keys alone. Fireball's 8d6 plus
 * 1d6 per slot level above 3rd is 10d6 at 5th; Fire Bolt is 2d10 from character
 * level 5.
 *
 * Apart from `characterModel/model/spells/spellDice.ts`, which adds what a character brings to the
 * roll, so the catalogs' display kit can show a spell's ladder without reaching
 * up into character code (MYDND-200).
 */

const DICE = /^(\d+)d(\d+)(.*)$/

/**
 * `base` plus `step` for every rank above `level`. Same die: the counts add
 * (8d6 + 2×1d6 → 10d6, keeping any flat bonus on the end). A different die is
 * appended (`3d8+2d6`), which is how the book reads too.
 */
export function diceAtRank(base: string, step: string | null, level: number, rank: number): string {
  const extra = Math.max(0, rank - level)
  if (!step || extra === 0) return base
  const b = DICE.exec(base)
  const s = DICE.exec(step)
  if (!s) return base
  const stepCount = parseInt(s[1], 10) * extra
  if (b && b[2] === s[2] && s[3] === '') return `${parseInt(b[1], 10) + stepCount}d${b[2]}${b[3]}`
  return `${base}+${stepCount}d${s[2]}`
}

/** The tier a character level falls in: 1–4, 5–10, 11–16, 17+. */
export function cantripTier(characterLevel: number): number {
  return characterLevel >= 17 ? 3 : characterLevel >= 11 ? 2 : characterLevel >= 5 ? 1 : 0
}
