// An ability's modifier, and how a modifier is written: +3, −1. Every sheet,
// the bestiary and the GM pages use both; out of `ddb/derive` (MYDND-197),
// which still re-exports them, because nothing here is D&D Beyond's.

/** Ability modifier from a score. The one piece of D&D maths that never changes. */
export function abilityMod(score: number | null | undefined): number {
  return Math.floor(((score ?? 10) - 10) / 2)
}

/** `+3` / `-1` / `+0`, as a sheet prints a modifier. */
export function fmtMod(n: number): string {
  return n >= 0 ? `+${n}` : String(n)
}
