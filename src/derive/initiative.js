// @ts-check
// Initiative order for an encounter.
//
// Pure: the tracker owns the list and the persistence, this owns the rules. The
// die roll is injected so a test can pin an order instead of hoping for one.

export const D20 = () => Math.floor(Math.random() * 20) + 1

// A combatant is `{ id, name, initiative, dexMod, ... }`. Anything else the
// tracker wants to carry (hit points, a monster id, a token) rides along
// untouched — this module only ever reads the three fields above.
/**
 * @param {number} [dexMod]
 * @param {() => number} [roll]
 * @returns {number}
 */
export function rollInitiative(dexMod = 0, roll = D20) {
  return roll() + dexMod
}

// PHB 2024 breaks an initiative tie in favour of the higher Dexterity, and
// leaves a tie beyond that to the table. Sorting by name last is not a rule,
// but it makes the order stable — without it React reshuffles equal rows on
// every re-render and the GM loses their place.
/**
 * @template {{ initiative?: number | null, dexMod?: number | null, name?: unknown }} T
 * @param {readonly T[] | null | undefined} combatants
 * @returns {T[]}
 */
export function sortCombatants(combatants) {
  return [...(combatants ?? [])].sort((a, b) =>
    (b.initiative ?? 0) - (a.initiative ?? 0)
    || (b.dexMod ?? 0) - (a.dexMod ?? 0)
    || String(a.name ?? '').localeCompare(String(b.name ?? '')),
  )
}

// Advancing the turn. Wrapping past the last combatant starts a new round,
// which is the only place `round` ever changes.
/**
 * Where the turn pointer stands, and how many combatants it walks.
 *
 * @typedef {{ turnIndex?: number, round?: number, count?: number | null }} TurnPosition
 */

/**
 * @param {TurnPosition} position
 * @returns {{ turnIndex: number, round: number }}
 */
export function nextTurn({ turnIndex = 0, round = 1, count }) {
  if (!count) return { turnIndex: 0, round }
  const next = turnIndex + 1
  return next >= count
    ? { turnIndex: 0, round: round + 1 }
    : { turnIndex: next, round }
}

// Stepping back, for the GM who advanced one too many. Round 1's first turn is
// the floor: there is no round 0, and rolling back into one would be a worse
// answer than refusing.
/**
 * @param {TurnPosition} position
 * @returns {{ turnIndex: number, round: number }}
 */
export function previousTurn({ turnIndex = 0, round = 1, count }) {
  if (!count) return { turnIndex: 0, round }
  if (turnIndex > 0) return { turnIndex: turnIndex - 1, round }
  if (round <= 1) return { turnIndex: 0, round: 1 }
  return { turnIndex: count - 1, round: round - 1 }
}

// Removing a combatant mid-encounter has to move the turn pointer with it, or
// the highlight silently jumps to whoever shifted into that slot.
//
//   * someone before the current turn leaves → the pointer shifts down one;
//   * the current combatant leaves → the pointer stays, so it lands on whoever
//     was next, which is what "it dies, play continues" means;
//   * removing the last one while it is their turn wraps to the top, without
//     advancing the round — no full round elapsed.
/**
 * @template {{ id?: unknown }} T
 * @param {T[]} combatants
 * @param {unknown} id
 * @param {number} turnIndex
 * @returns {{ combatants: T[], turnIndex: number }}
 */
export function removeCombatant(combatants, id, turnIndex) {
  const index = combatants.findIndex(c => c.id === id)
  if (index === -1) return { combatants, turnIndex }
  const next = combatants.filter(c => c.id !== id)
  if (next.length === 0) return { combatants: next, turnIndex: 0 }
  let nextTurnIndex = turnIndex
  if (index < turnIndex) nextTurnIndex = turnIndex - 1
  if (nextTurnIndex >= next.length) nextTurnIndex = 0
  return { combatants: next, turnIndex: nextTurnIndex }
}

// Damage and healing clamp at 0 and at the combatant's maximum. Temporary hit
// points soak damage first and are spent before real ones, which is the part a
// GM tracking this on paper most often gets wrong.
/**
 * @template {{ hp?: number | null, tempHp?: number | null }} T
 * @param {T} combatant
 * @param {number} amount
 * @returns {T}
 */
export function applyDamage(combatant, amount) {
  if (amount <= 0) return combatant
  const temp = combatant.tempHp ?? 0
  const absorbed = Math.min(temp, amount)
  return {
    ...combatant,
    tempHp: temp - absorbed,
    hp: Math.max(0, (combatant.hp ?? 0) - (amount - absorbed)),
  }
}

/**
 * @template {{ hp?: number | null, maxHp?: number | null }} T
 * @param {T} combatant
 * @param {number} amount
 * @returns {T}
 */
export function applyHealing(combatant, amount) {
  if (amount <= 0) return combatant
  const max = combatant.maxHp ?? 0
  const healed = (combatant.hp ?? 0) + amount
  return { ...combatant, hp: max > 0 ? Math.min(max, healed) : healed }
}
