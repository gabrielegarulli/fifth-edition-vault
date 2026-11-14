// @ts-check
// Spellbook rules for classes that keep one (the Wizard, in PHB 2024).
//
// Most classes prepare spells straight from their class list, so the spells
// they have chosen ARE their prepared spells and one collection is enough.
// A spellbook class has two: the book it writes spells into, and the smaller
// set it prepares from that book. The Vault models this by keeping
// `spells.known` as the collection — the book, for a spellbook class — and
// adding `spells.prepared`, a list of ids naming the subset.
//
// Classes are told apart by `content_class.data.spellbook`, which carries the
// book's growth rule: `{ initial, perLevel }`.

// Spells the book holds at a class level: `initial` at level 1 and `perLevel`
// more per level after that. Null when the class keeps no spellbook.
//
// This is the number gained from levelling alone. A Wizard can also copy
// spells found in the world, so the count is a target the sheet displays
// rather than a limit it enforces.
/**
 * A class's spellbook config, `content_class.data.spellbook`.
 *
 * @typedef {{ initial?: number | null, perLevel?: number | null, ritualAdept?: boolean | null }} SpellbookConfig
 */

/**
 * @param {SpellbookConfig | null | undefined} config
 * @param {number | null | undefined} classLevel
 * @returns {number | null}
 */
export function spellbookCapacity(config, classLevel) {
  if (!config || !classLevel || classLevel < 1) return null
  return (config.initial ?? 0) + (config.perLevel ?? 0) * (classLevel - 1)
}

// The ids of the spells that are actually prepared.
//
// Without a spellbook every known spell is prepared, which keeps every
// existing character — none of which carry a `prepared` list — behaving
// exactly as before. With a spellbook nothing is prepared until the player
// says so, because a fresh book holds more spells than its owner can prepare.
/**
 * @param {{ known?: unknown, prepared?: unknown } | null | undefined} spells
 * @param {unknown} hasSpellbook
 * @returns {Set<string>}
 */
export function preparedIdSet(spells, hasSpellbook) {
  /** @type {readonly { id: string }[]} */
  const known = Array.isArray(spells?.known) ? spells.known : []
  if (!hasSpellbook) return new Set(known.map(s => s.id))
  /** @type {readonly string[]} */
  const prepared = Array.isArray(spells?.prepared) ? spells.prepared : []
  return new Set(prepared)
}

// Rituals are castable straight from the book without being prepared, so a
// spell that looks unusable may still be usable. Only true for classes whose
// spellbook config sets `ritualAdept`.
/**
 * @param {SpellbookConfig | null | undefined} config
 * @param {{ data?: { ritual?: boolean | null } | null } | null | undefined} spell
 */
export function castableUnprepared(config, spell) {
  return !!(config?.ritualAdept && spell?.data?.ritual)
}
