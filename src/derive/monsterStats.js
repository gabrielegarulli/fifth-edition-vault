// @ts-check
import { abilityMod } from './dnd5e.js'

// Reading the numbers off a `content_monster` payload.
//
// The 5e.tools shape these were imported from is inconsistent in ways that
// matter: AC is sometimes a bare number, sometimes an array, sometimes an array
// of objects carrying the source of the armour. Wild Shape and the encounter
// tracker both need these, and getting the shape wrong shows a blank stat
// rather than failing, so the rule is stated once here.

/**
 * A `content_monster` payload (or a statblock fence), as far as these read it.
 * Each field is in one of several 5e.tools shapes, so none is promised.
 *
 * @typedef {{ ac?: unknown, hp?: unknown, dex?: unknown, speed?: unknown }} MonsterData
 */

/**
 * @param {MonsterData | null | undefined} data
 * @returns {number | null}
 */
export function monsterAc(data) {
  /** @type {unknown} */
  const entry = Array.isArray(data?.ac) ? data.ac[0] : data?.ac
  if (typeof entry === 'number') return entry
  // Otherwise `{ ac, from }`, trusted to carry a number as before.
  return /** @type {{ ac?: number | null } | null | undefined} */ (entry)?.ac ?? null
}

// `hp.average` is the number a GM runs the monster on; `hp.formula` is there to
// roll it instead, which the tracker offers.
/**
 * @param {MonsterData | null | undefined} data
 * @returns {number | null}
 */
export function monsterHp(data) {
  const hp = data?.hp
  if (typeof hp === 'number') return hp
  return /** @type {{ average?: number | null } | null | undefined} */ (hp)?.average ?? null
}

/**
 * @param {MonsterData | null | undefined} data
 * @returns {string | null}
 */
export function monsterHpFormula(data) {
  return /** @type {{ formula?: string | null } | null | undefined} */ (data?.hp)?.formula ?? null
}

// Ability scores on a monster payload are scores, not modifiers.
/**
 * @param {MonsterData | null | undefined} data
 * @returns {number}
 */
export function monsterDexMod(data) {
  const dex = data?.dex
  return typeof dex === 'number' ? abilityMod(dex) : 0
}

// Speeds, as display strings plus the walk speed as a number — the same split
// the character sheet needs, since the sheet's Speed is one number and the
// panel's is a list.
/**
 * @param {MonsterData | null | undefined} data
 * @returns {{ speeds: string[], walkSpeed: number | null }}
 */
export function monsterSpeeds(data) {
  /** @param {unknown} v */
  const numberOf = v => /** @type {{ number?: unknown } | null | undefined} */ (v)?.number
  /** @type {[string, number][]} */
  const entries = Object.entries(/** @type {Record<string, unknown>} */ (data?.speed ?? {}))
    .filter(([, v]) => typeof v === 'number' || typeof numberOf(v) === 'number')
    .map(([key, v]) => [key, /** @type {number} */ (typeof v === 'number' ? v : numberOf(v))])
  const walk = entries.find(([key]) => key === 'walk')
  return {
    speeds: entries.map(([key, n]) => `${key} ${n} ft.`),
    walkSpeed: walk ? walk[1] : null,
  }
}
