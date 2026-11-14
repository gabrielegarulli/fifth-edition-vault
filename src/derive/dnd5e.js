// @ts-check
// D&D 5e (2024) game constants shared across the app.

export const PROF_BY_LEVEL = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6]

// Point buy: cumulative point cost to reach each ability score (max 15 before bonuses).
/** @type {Readonly<Record<number, number>>} */
export const POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }
export const POINT_BUY_BUDGET = 27

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8]

// The six abilities, spelled out. Lives here rather than in `vaultDerive.js`
// because `effects.js` needs them to phrase an effect and cannot import from
// there — `vaultDerive` imports `effects`, not the other way round.
// `VAULT_ABILITY_FULL` is this map, re-exported under its established name.
/** @type {Readonly<Record<string, string>>} */
export const ABILITY_FULL_NAMES = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
}

/**
 * @param {number | null | undefined} score
 * @returns {number}
 */
export function abilityMod(score) {
  return Math.floor(((score ?? 10) - 10) / 2)
}

/**
 * @param {number} n
 * @returns {string}
 */
export function fmtMod(n) { return n >= 0 ? `+${n}` : String(n) }

/**
 * @overload
 * @param {string} s
 * @returns {string}
 */
/**
 * @template T
 * @overload
 * @param {T} s
 * @returns {T}
 */
/**
 * @param {unknown} s
 * @returns {unknown}
 */
export function capitalize(s) {
  return typeof s === 'string' ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

/** @type {Readonly<Record<number, string>>} */
const CR_DISPLAY = { 0: '0', 0.125: '1/8', 0.25: '1/4', 0.5: '1/2' }
/**
 * @param {number | null | undefined} cr
 * @returns {string}
 */
export function formatCR(cr) {
  if (cr == null) return '—'
  return CR_DISPLAY[cr] ?? String(Number.isInteger(cr) ? cr : cr)
}
