// @ts-check
// The right panel's sections, out of the two lists that feed them: the defences
// the player has set by hand (`vault_state.defenses`) and the ones a feature,
// species or magic item grants (`resolveDefenseGrants`).
//
// Pure, and separate from the panel, because the interesting part is not the
// chips — it is the collapsing rule below, and that is worth a unit test.
//
// **A damage type appears in exactly one section.** Resistance and immunity to
// fire is just immunity to fire; rendering both would put the same word twice in
// one column and imply the sheet is doing something with the weaker one. So each
// value is ranked and shown at its highest tier, which is the same precedence the
// icon grid this replaced used to cycle through.
//
// **`stored` is what makes a chip removable.** A granted defence has no toggle to
// turn off — the feature granting it is the thing to change — so the chip says
// where it came from instead. A value that is both stored *and* granted keeps its
// remove affordance, because the stored half is still the player's to withdraw;
// the chip then simply stays, now sourced.

/**
 * A defence, stored or granted: what it is, to what, and (when granted) whence.
 *
 * @typedef {{ type: string, value: string, source?: string | null }} Defense
 */
/** @typedef {Defense & { stored: boolean }} TaggedDefense */
/** @typedef {{ value: string, sources: string[], stored: boolean }} SectionEntry */
/** @typedef {{ type: string, sources: string[], stored: boolean }} Winner */

/** @type {Readonly<Record<string, number>>} */
const DAMAGE_RANK = { vulnerability: 1, resistance: 2, immunity: 3 }
/** @type {Readonly<Record<string, number>>} */
const CONDITION_RANK = { condition_active: 1, condition_immunity: 2 }

/**
 * `{ value → { type, sources, stored } }` at the highest rank each value reaches.
 *
 * @param {readonly TaggedDefense[]} entries
 * @param {Readonly<Record<string, number>>} rank
 * @returns {Map<string, Winner>}
 */
function collapse(entries, rank) {
  /** @type {Map<string, Winner>} */
  const best = new Map()
  for (const entry of entries) {
    const tier = rank[entry.type]
    if (!tier) continue
    const current = best.get(entry.value)
    if (!current || tier > rank[current.type]) {
      best.set(entry.value, { type: entry.type, sources: [], stored: false })
    }
  }
  // A second pass for provenance, so a source named against a tier that lost is
  // not attributed to the tier that won.
  for (const entry of entries) {
    const winner = best.get(entry.value)
    if (!winner || winner.type !== entry.type) continue
    if (entry.stored) winner.stored = true
    if (entry.source && !winner.sources.includes(entry.source)) winner.sources.push(entry.source)
  }
  return best
}

/**
 * @param {readonly Defense[] | null | undefined} list
 * @param {boolean} stored
 * @returns {TaggedDefense[]}
 */
function tag(list, stored) {
  return (list ?? []).map(d => ({ ...d, stored }))
}

/**
 * @param {readonly Defense[] | null | undefined} defenses `vault_state.defenses`
 * @param {readonly Defense[] | null | undefined} grants   `resolveDefenseGrants(...)`
 * @returns {{ immunity: SectionEntry[], resistance: SectionEntry[], vulnerability: SectionEntry[] }}
 *   each in the caller's own vocabulary order once it filters its list against them.
 */
export function damageSections(defenses, grants) {
  const best = collapse([...tag(defenses, true), ...tag(grants, false)], DAMAGE_RANK)
  /** @type {{ immunity: SectionEntry[], resistance: SectionEntry[], vulnerability: SectionEntry[] }} */
  const out = { immunity: [], resistance: [], vulnerability: [] }
  for (const [value, { type, sources, stored }] of best) {
    // `collapse` kept only the types DAMAGE_RANK ranks, which are these three.
    out[/** @type {'immunity' | 'resistance' | 'vulnerability'} */ (type)].push({ value, sources, stored })
  }
  return out
}

/**
 * The conditions half. Two tiers rather than three: a condition is one the
 * character is currently suffering, or one they cannot be given.
 *
 * @param {readonly Defense[] | null | undefined} defenses
 * @param {readonly Defense[] | null | undefined} grants
 * @returns {{ active: SectionEntry[], immunity: SectionEntry[] }}
 */
export function conditionSections(defenses, grants) {
  const best = collapse([...tag(defenses, true), ...tag(grants, false)], CONDITION_RANK)
  /** @type {{ active: SectionEntry[], immunity: SectionEntry[] }} */
  const out = { active: [], immunity: [] }
  for (const [value, { type, sources, stored }] of best) {
    out[type === 'condition_immunity' ? 'immunity' : 'active'].push({ value, sources, stored })
  }
  return out
}

/**
 * Add a defence, or replace whatever the player had stored for that value.
 *
 * One entry per value is the invariant the icon grid also held: the stored list is
 * the player's single answer for a damage type, and two answers in it would make
 * the collapsing rule above depend on array order.
 *
 * @param {readonly Defense[] | null | undefined} defenses
 * @param {string} value
 * @param {string} type
 * @returns {Defense[]}
 */
export function setDefense(defenses, value, type) {
  return [...(defenses ?? []).filter(d => d.value !== value), { type, value }]
}

/**
 * Withdraw the player's own entry. Any grant on the same value survives.
 *
 * @param {readonly Defense[] | null | undefined} defenses
 * @param {string} value
 * @returns {Defense[]}
 */
export function clearDefense(defenses, value) {
  return (defenses ?? []).filter(d => d.value !== value)
}
