import { capitalize } from './dnd5e.js'

/**
 * `resolveProficiencies().weapons` as chip labels.
 *
 * **The tier is the proficiency; `weapon` is a predicate that narrows it, and it
 * is an object.** `normaliseWeaponProficiency` resolves a catalog string into
 * `{ category }` for a whole tier and `{ category, weapon: {…} }` for a narrowed
 * one — `{ category: 'ranged' }` for "martial ranged weapons",
 * `{ property: 'light' }` for "martial weapons that have the Light property".
 * There is no spelling of it that is a weapon's *name*, which is what the first
 * version of the sheet's proficiency chips assumed: rendering `w.weapon` put a
 * bare object into React and took the whole page down with "Objects are not valid
 * as a React child" on every Monk, Rogue, Bard and Druid in the game.
 *
 * **An unnarrowed grant swallows its narrowed siblings.** A character with
 * "martial weapons" *and* "martial weapons that have the Light property" is
 * proficient with martial weapons; listing the second beside the first would
 * imply the Light ones were a separate, smaller permission.
 *
 * @param {Array<{category: string, weapon?: object|null}>} weapons
 * @returns {string[]} one label per distinct grant, tier order preserved
 */
export function weaponProficiencyLabels(weapons = []) {
  const byCategory = new Map()

  for (const entry of weapons) {
    if (!entry?.category) continue
    if (!byCategory.has(entry.category)) byCategory.set(entry.category, { whole: false, narrowed: [] })
    const group = byCategory.get(entry.category)
    const predicate = describePredicate(entry.weapon)
    if (predicate === null) group.whole = true
    else if (!group.narrowed.includes(predicate)) group.narrowed.push(predicate)
  }

  const labels = []
  for (const [category, { whole, narrowed }] of byCategory) {
    const tier = capitalize(category)
    if (whole || narrowed.length === 0) labels.push(tier)
    else labels.push(...narrowed.map(p => `${tier} (${p})`))
  }
  return labels
}

// The predicate in words. `weaponMatches` ANDs every key, so several keys is a
// conjunction and reads as one; an empty object is no narrowing at all and is
// treated as the whole tier, because that is what it matches.
function describePredicate(weapon) {
  if (!weapon || typeof weapon !== 'object') return null
  const parts = Object.entries(weapon)
    .filter(([, value]) => typeof value === 'string' && value.length > 0)
    .map(([key, value]) => (key === 'property' ? `${value} property` : value))
  return parts.length === 0 ? null : parts.join(', ')
}
