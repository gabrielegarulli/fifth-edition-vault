// The 2024 DMG's encounter budget: how much monster XP a party can face at a
// chosen difficulty (VAULT-255).
//
// The 2014 rules multiplied the monsters' XP by how many there were. **The 2024
// rules dropped the multiplier**, so a budget is only the sum of each
// character's row, and spending it is only the sum of the monsters' XP. Nothing
// here weighs a monster by its company.

export const DIFFICULTIES = ['low', 'moderate', 'high']

// "XP Budget per Character", 2024 DMG — checked row by row against 5e.tools'
// `book-xdmg.json`. Indexed by level − 1.
const XP_BUDGET_PER_CHARACTER = [
  [50, 75, 100],
  [100, 150, 200],
  [150, 225, 400],
  [250, 375, 500],
  [500, 750, 1100],
  [600, 1000, 1400],
  [750, 1300, 1700],
  [1000, 1700, 2100],
  [1300, 2000, 2600],
  [1600, 2300, 3100],
  [1900, 2900, 4100],
  [2200, 3700, 4700],
  [2600, 4200, 5400],
  [2900, 4900, 6200],
  [3300, 5400, 7800],
  [3800, 6100, 9800],
  [4500, 7200, 11700],
  [5000, 8700, 14200],
  [5500, 10700, 17200],
  [6400, 13200, 22000],
]

/**
 * One character's share of the budget, or null for a level the table does not
 * have. A level is an integer from 1 to 20; anything else is not a character
 * the table can price, and pricing it as level 1 would understate the fight.
 */
export function characterBudget(level, difficulty) {
  const column = DIFFICULTIES.indexOf(difficulty)
  if (column === -1 || !Number.isInteger(level) || level < 1 || level > 20) return null
  return XP_BUDGET_PER_CHARACTER[level - 1][column]
}

/**
 * The party's budget: each character's row, summed. A character whose level
 * cannot be priced is left out rather than zeroing the whole party, and
 * `priced` says how many were counted so a caller can say so.
 */
export function partyBudget(levels, difficulty) {
  let xp = 0
  let priced = 0
  for (const level of levels ?? []) {
    const share = characterBudget(level, difficulty)
    if (share === null) continue
    xp += share
    priced += 1
  }
  return { xp, priced }
}

/**
 * What the chosen monsters cost: `xp × count`, summed. A monster with no XP
 * costs nothing rather than poisoning the sum with NaN; a count defaults to 1.
 */
export function encounterXp(monsters) {
  let total = 0
  for (const m of monsters ?? []) {
    const xp = Number.isFinite(m?.xp) ? m.xp : 0
    const count = Number.isInteger(m?.count) && m.count > 0 ? m.count : 1
    total += xp * count
  }
  return total
}

/**
 * Where a monster of `xp` would leave the budget if added: `left` is what
 * remains after it (never negative), `over` is by how much it overshoots
 * (0 when it fits). `fits` is true at exactly the budget — spending all of it
 * is the point of having one.
 */
export function budgetStanding(budget, spent, xp = 0) {
  const after = spent + xp
  return {
    fits: after <= budget,
    left: Math.max(0, budget - after),
    over: Math.max(0, after - budget),
  }
}
