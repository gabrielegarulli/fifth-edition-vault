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

const DAMAGE_RANK = { vulnerability: 1, resistance: 2, immunity: 3 }
const CONDITION_RANK = { condition_active: 1, condition_immunity: 2 }

// `{ value → { type, sources, stored } }` at the highest rank each value reaches.
function collapse(entries, rank) {
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

function tag(list, stored) {
  return (list ?? []).map(d => ({ ...d, stored }))
}

/**
 * @param defenses `vault_state.defenses`
 * @param grants   `resolveDefenseGrants(...)`
 * @returns `{ immunity, resistance, vulnerability }`, each an array of
 *   `{ value, sources, stored }` in the caller's own vocabulary order once it
 *   filters its list against them.
 */
export function damageSections(defenses, grants) {
  const best = collapse([...tag(defenses, true), ...tag(grants, false)], DAMAGE_RANK)
  const out = { immunity: [], resistance: [], vulnerability: [] }
  for (const [value, { type, sources, stored }] of best) {
    out[type].push({ value, sources, stored })
  }
  return out
}

/**
 * The conditions half. Two tiers rather than three: a condition is one the
 * character is currently suffering, or one they cannot be given.
 *
 * @returns `{ active, immunity }` of `{ value, sources, stored }`
 */
export function conditionSections(defenses, grants) {
  const best = collapse([...tag(defenses, true), ...tag(grants, false)], CONDITION_RANK)
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
 */
export function setDefense(defenses, value, type) {
  return [...(defenses ?? []).filter(d => d.value !== value), { type, value }]
}

/** Withdraw the player's own entry. Any grant on the same value survives. */
export function clearDefense(defenses, value) {
  return (defenses ?? []).filter(d => d.value !== value)
}
