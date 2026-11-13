/**
 * Turning a sheet number into something Atlas can roll.
 *
 * Its own module, with **no `obsidian` import of any kind** — not even a type
 * one — so it lands in the `logic` Vitest project and is exercised in plain
 * Node. `atlas.ts` next door needs the host `App` and cannot be.
 */

/**
 * `1d20+7` from a modifier, or the dice expression itself when it already has
 * dice in it.
 *
 * The two inputs are a sheet modifier (`7`, `-1`, `+3`) and a damage or feature
 * expression (`1d8+5`, `7d6`). A modifier gets a d20 put in front of it because
 * that is the roll it describes; an expression is already complete and is
 * passed through.
 *
 * **Never emit keep-highest notation.** Atlas' parser sums every dice term it
 * finds, so `2d20kh1` rolls two d20s and adds them. Advantage is two separate
 * labelled rolls — see `atlas.ts`.
 */
export function toFormula(expr: string | number): string {
  const s = String(expr).replace(/\s+/g, '')
  return /\d*d\d+/i.test(s) ? s : `1d20${s.startsWith('+') || s.startsWith('-') ? s : `+${s}`}`
}
