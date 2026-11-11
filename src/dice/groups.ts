/**
 * Splitting a formula into the groups `rollEngine.js` works in, and back again.
 *
 * **No `obsidian` import, not even a type one** — same rule as `formula.ts`, so
 * this lands in the `logic` Vitest project and every parse is exercised in plain
 * Node. The half that needs the host `App` is `roller.ts`.
 *
 * The engine's input is `[{ count, sides, damageType? }]` plus a flat
 * `modifier`; Atlas' input is a string. This is the seam between them, and it
 * exists because the engine has to be the thing that owns advantage: it appends
 * one extra d20 *group* and applies keep-highest to the faces, where `useRoll`
 * used to fire the whole formula twice and compare totals.
 *
 * Both give the same number for `1d20+5`. They stop agreeing the moment
 * anything reads the dice rather than the total — `dropped`, an intervention, or
 * a log that shows the faces — which is the whole reason for this phase.
 */

export interface DiceTerm {
  count: number
  sides: number
  damageType?: string | null
}

export interface ParsedFormula {
  dice: DiceTerm[]
  modifier: number
}

/**
 * `3d6+1d4+2` → three terms and a modifier.
 *
 * Deliberately narrow: it reads `NdS` terms and signed integer constants, and
 * nothing else. Anything it does not understand is **dropped from the dice and
 * kept out of the modifier**, so an unparsed formula under-reports rather than
 * inventing dice — and `isRollable` below is what callers use to avoid rolling
 * one at all.
 */
export function parseFormula(formula: string, damageType?: string | null): ParsedFormula {
  const text = String(formula ?? '').replace(/\s+/g, '')
  const dice: DiceTerm[] = []
  let modifier = 0

  // One pass over signed chunks, so `1d8-1` and `-1d4` both read correctly.
  const token = /([+-]?)(\d*)d(\d+)|([+-]?\d+)(?![d\d])/gi
  let m: RegExpExecArray | null
  while ((m = token.exec(text)) !== null) {
    if (m[3] !== undefined) {
      const sign = m[1] === '-' ? -1 : 1
      const count = m[2] === '' ? 1 : parseInt(m[2], 10)
      const sides = parseInt(m[3], 10)
      if (count > 0 && sides > 0) {
        // A negative dice term is not a negative die — it is a term subtracted
        // from the total, which the engine has no representation for. Rolling
        // it as positive would silently flip the sign, so it is skipped and the
        // formula is reported as not rollable.
        if (sign > 0) dice.push({ count, sides, damageType: damageType ?? null })
      }
      continue
    }
    const n = parseInt(m[4], 10)
    if (Number.isFinite(n)) modifier += n
  }

  return { dice, modifier }
}

/**
 * Whether `parseFormula` read the whole of it.
 *
 * Reconstructing the formula and comparing is the only honest check: a partial
 * parse looks exactly like a complete one from the outside, and rolling it
 * would quietly drop a term. Compared on the *value*, not the spelling, so
 * `1d8+5` and `+5+1d8` both pass.
 */
export function isRollable(formula: string): boolean {
  const text = String(formula ?? '').replace(/\s+/g, '')
  if (text === '') return false
  const { dice, modifier } = parseFormula(text)
  if (dice.length === 0) return false

  // Everything the tokeniser consumed, put back and measured against the input.
  const consumed = text.replace(/([+-]?)(\d*)d(\d+)|([+-]?\d+)(?![d\d])/gi, '')
  if (consumed !== '') return false

  // A term dropped for being negative leaves the lengths disagreeing.
  const termCount = (text.match(/\d*d\d+/gi) ?? []).length
  return dice.length === termCount && Number.isFinite(modifier)
}

/**
 * `1d20+15` — engine groups and the flat modifier, as one formula for Atlas.
 *
 * **The modifier goes to Atlas** (MYDND-75). It used to be held back — every
 * call was dice only — so the scene's dice popup read `4` for a Persuasion
 * check whose total was 19, and the player had nowhere on the table to see the
 * number that counted. Atlas keeps constants in `modifiers` and out of `rolls`,
 * so sending one changes the total it shows and not the faces read back.
 */
export function atlasFormula(groups: readonly { qty: number; sides: number }[], modifier = 0): string {
  return describeDice(
    groups.map(g => ({ count: g.qty, sides: g.sides })),
    modifier,
  )
}

/** `1d8+1d6+3`, for a label. The engine's groups, written back as a formula. */
export function describeDice(dice: DiceTerm[], modifier = 0): string {
  const terms = dice.map(d => `${d.count}d${d.sides}`).join('+')
  if (modifier === 0) return terms
  // The sign is the separator here, so the modifier is appended rather than
  // joined — joining would give `1d20++7`.
  return `${terms}${modifier > 0 ? '+' : '-'}${Math.abs(modifier)}`
}
