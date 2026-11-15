// @ts-check
// Is this character proficient with this weapon, trained in this armour?
//
// VAULT-102. The answer has **three** values, and that is the whole point of the
// module: `weaponActions.js` used to add `+PB` unconditionally, which is not the
// app declining to answer — it is the app answering *yes* for a Wizard holding a
// greatsword. Replacing a hardcoded yes with a hardcoded no would be worse, so
// every path that cannot establish the answer returns `'unknown'` and the caller
// leaves the number where it was.
//
// ## Where the four unknowns come from
//
//   1. **An unauthored class.** `classProficiencyBaseline().authored` is false
//      when a class row's `startingProficiencies` were never imported, and
//      `classMulticlassProfs()` returns null for a class with no multiclass
//      entry. Either poisons the *whole* union — a character is one creature and
//      their proficiencies are one set, so a gap in any class is a gap in the
//      answer. VAULT-102's migration cleared the eleven live cases, but homebrew
//      classes will keep arriving unauthored and this rule is what protects them.
//   2. **A character who has never been re-synced.** `json.proficiencyBaseline`
//      is baked, so a character saved before this shipped has no baseline at all.
//      Absent reads as unknown, which means the deploy takes nobody's `+PB` away
//      until their sheet has actually been re-derived.
//   3. **An unresolvable grant.** `normaliseProficiencyList` preserves what it
//      cannot place rather than dropping it — the Rogue's "martial weapons that
//      have the Finesse or Light property" is an OR and the predicate is an AND.
//      A preserved string that names a tier makes that tier unknown; see
//      `poisonedBy` below, which is the least obvious rule here.
//   4. **A weapon with no category.** `resolveWeaponData` returns
//      `category: null` when a magic weapon's base cannot be resolved, and the
//      tier is exactly what the question is asked against.
//
// The armour half lives here in full because it needs no predicate machinery:
// `content_item.item_type` is `Light Armor` / `Medium Armor` / `Heavy Armor` /
// `Shield`, which is `ARMOR_TRAINING_CATEGORIES` one-to-one. The weapon half's
// final step is `weaponProficiency` in `weaponActions.js`, next to the
// `weaponMatches` predicate walker it needs — importing that back into this file
// would be a cycle, and the predicate is weapon-shaped rather than
// proficiency-shaped anyway.

import { ARMOR_TRAINING_CATEGORIES, WEAPON_PROFICIENCY_CATEGORIES } from './effects.js'

/** @typedef {import('./effects.js').Effect} Effect */
/** @typedef {import('./effects.js').WeaponPredicate} WeaponPredicate */
/** @typedef {{ category: string, weapon: WeaponPredicate | null, source: string | null }} WeaponGrant */
/**
 * `character.json.proficiencyBaseline`, as `flattenResolvedEffects` bakes it.
 *
 * @typedef {{ authored?: boolean | null, unresolved?: { weapons?: string[] | null, armor?: string[] | null } | null }} ProficiencyBaseline
 */
/**
 * @typedef {{
 *   weapons: WeaponGrant[],
 *   armor: string[],
 *   manualWeapons: string[],
 *   manualArmor: string[],
 *   unresolvedWeapons: string[],
 *   unresolvedArmor: string[],
 *   known: boolean,
 * }} ResolvedProficiencies
 */

/** @type {Readonly<Record<string, string>>} */
const ARMOR_ITEM_TYPES = {
  'light armor': 'light',
  'medium armor': 'medium',
  'heavy armor': 'heavy',
  'shield': 'shield',
}

/**
 * `content_item.item_type` → the `armor_training` category, or null.
 *
 * @param {string | null | undefined} itemType
 * @returns {string | null}
 */
export function armorCategoryOf(itemType) {
  return ARMOR_ITEM_TYPES[(itemType ?? '').trim().toLowerCase()] ?? null
}

// Loose singularisation, enough to match 'shields' to 'shield' and 'chakrams' to
// 'chakram'. Deliberately not a stemmer: these strings are book prose and the
// only job here is to stop a plural reading as a different word.
/** @param {string} word */
function singular(word) {
  return word.endsWith('s') ? word.slice(0, -1) : word
}

/**
 * @param {string | null | undefined} text
 * @returns {string[]}
 */
function normalisedWords(text) {
  return (text ?? '')
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter(Boolean)
    .map(singular)
}

/**
 * Does an unresolved grant string bear on this weapon or armour?
 *
 * Two ways it can, and both are the difference between an honest unknown and a
 * confident wrong "no":
 *
 * - **It names the tier.** Slugger's Creed grants "Martial weapons that lack the
 *   Two-Handed property", which no predicate can express because `weaponMatches`
 *   has no negation. The string names `martial`, so every martial weapon this
 *   character holds is unknown rather than refused.
 * - **It names the weapon.** The Alchemist is granted a "Bomb", the Musketeer
 *   "Bayonets", the Bender "chakrams" — single items, not categories, and no
 *   vocabulary will ever hold them. Matching the item's own name keeps the
 *   grant alive for exactly the weapon it was about.
 *
 * @param {readonly string[] | null | undefined} unresolved preserved strings the normaliser could not place
 * @param {readonly (string | null | undefined)[] | null | undefined} terms the tier and, for a weapon, its name
 */
export function poisonedBy(unresolved, terms) {
  const wanted = (terms ?? []).filter(Boolean).map(normalisedWords).filter(w => w.length > 0)
  if (wanted.length === 0) return false
  return (unresolved ?? []).some(entry => {
    const haystack = normalisedWords(entry)
    return wanted.some(seq => containsSequence(haystack, seq))
  })
}

// Whole words, in order — not a substring test. 'Bayonets' normalises to the
// single word 'bayonet', and a weapon called 'Net' would match it under
// `includes`. That errs toward unknown, which is the safe direction, but it is
// still the wrong answer for the wrong reason.
/**
 * @param {readonly string[]} words
 * @param {readonly string[]} seq
 */
function containsSequence(words, seq) {
  for (let i = 0; i + seq.length <= words.length; i += 1) {
    if (seq.every((word, j) => words[i + j] === word)) return true
  }
  return false
}

/**
 * A character's whole proficiency set, from every source at once.
 *
 * - `baseline`: `character.json.proficiencyBaseline`, baked by
 *   `flattenResolvedEffects`. Absent means unknown, never means "nothing".
 * - `effects`: the gated effect list — `weapon_proficiency` and
 *   `armor_training` from class rows, feats and subclass features alike, all
 *   arriving by the same path so no source is privileged.
 * - `overrides`: `vault_state.proficiencyOverrides`, a GM's answer for a reason
 *   the app cannot see. Grants only; it never takes away.
 *
 * @param {{
 *   baseline?: ProficiencyBaseline | null,
 *   effects?: readonly (Effect | null | undefined)[] | null,
 *   overrides?: { weapons?: readonly string[] | null, armor?: readonly string[] | null } | null,
 * }} [args]
 * @returns {ResolvedProficiencies}
 */
export function resolveProficiencies({ baseline, effects, overrides } = {}) {
  /** @type {WeaponGrant[]} */
  const weapons = []
  /** @type {string[]} */
  const armor = []

  for (const e of effects ?? []) {
    const category = e?.category
    if (e?.type === 'weapon_proficiency' && category && WEAPON_PROFICIENCY_CATEGORIES.includes(category)) {
      weapons.push({ category, weapon: e.weapon ?? null, source: e.source ?? null })
    } else if (e?.type === 'armor_training' && category && ARMOR_TRAINING_CATEGORIES.includes(category)) {
      armor.push(category)
    }
  }

  // An override is an unpredicated grant of the whole tier, because a GM saying
  // "he is proficient with martial weapons" is not narrowing anything — if they
  // wanted one weapon they would not be reaching for this.
  const manualWeapons = (overrides?.weapons ?? []).filter(c => WEAPON_PROFICIENCY_CATEGORIES.includes(c))
  const manualArmor = (overrides?.armor ?? []).filter(c => ARMOR_TRAINING_CATEGORIES.includes(c))
  for (const category of manualWeapons) weapons.push({ category, weapon: null, source: 'GM override' })
  armor.push(...manualArmor)

  return {
    weapons,
    armor: [...new Set(armor)],
    manualWeapons,
    manualArmor,
    unresolvedWeapons: baseline?.unresolved?.weapons ?? [],
    unresolvedArmor: baseline?.unresolved?.armor ?? [],
    // `=== true` on purpose: an absent baseline and an unauthored one are the
    // same answer, and neither is `false`-y by accident.
    known: baseline?.authored === true,
  }
}

/**
 * Is the character trained in this piece of armour?
 *
 * A GM override answers even when the baseline is unknown — that is the point of
 * it. Everything else defers to `known`.
 *
 * @param {ResolvedProficiencies | null | undefined} resolved from `resolveProficiencies`
 * @param {string | null | undefined} itemType a `content_item.item_type`
 * @returns {'yes'|'no'|'unknown'}
 */
export function armorProficiency(resolved, itemType) {
  const category = armorCategoryOf(itemType)
  if (!category) return 'unknown'
  if (resolved?.manualArmor?.includes(category)) return 'yes'
  if (!resolved?.known) return 'unknown'
  if (resolved.armor.includes(category)) return 'yes'
  if (poisonedBy(resolved.unresolvedArmor, [category])) return 'unknown'
  return 'no'
}

/**
 * The equipped armour and shields this character is **confidently** untrained in
 * — VAULT-154, the consequence half of the armour side.
 *
 * **`'unknown'` is not in the list, and that is the whole contract.** It is the
 * same call `deriveWeaponActions` makes when it withholds `+PB` on a `'no'` and
 * on nothing else, and it matters more here: the weapon side's wrong answer
 * costs a number, where this one costs Disadvantage on every Strength and
 * Dexterity roll a character makes plus their entire spell list. Eleven homebrew
 * classes have empty `startingProficiencies` and any character saved
 * before VAULT-102 has no baseline at all, so a boolean read of this question
 * would cripple every Warmage in the game for a data-entry reason and present
 * it as a rules answer.
 *
 * Reads `content_item.item_type` off the same equipped rows `vaultArmorState`
 * does, so "worn" and "trained in what is worn" cannot disagree about which
 * pieces are on the character.
 *
 * @param {ResolvedProficiencies | null | undefined} resolved from `resolveProficiencies`
 * @param {readonly ({ id?: unknown, content_item?: { item_type?: string | null, name?: string | null } | null } | null | undefined)[] | null} [equippedItems] inventory rows, `content_item` embedded
 * @returns {{id: unknown, name: string | null | undefined, category: string | null}[]} empty when there is
 *   nothing to penalise, which is the overwhelmingly common case
 */
export function unproficientArmor(resolved, equippedItems = []) {
  /** @type {{id: unknown, name: string | null | undefined, category: string | null}[]} */
  const out = []
  for (const row of equippedItems ?? []) {
    const itemType = row?.content_item?.item_type
    if (!armorCategoryOf(itemType)) continue
    if (armorProficiency(resolved, itemType) !== 'no') continue
    out.push({
      id: row?.id ?? null,
      // The item's own name, because that is what the player took off the shelf
      // — "Unproficient armour (Plate)" is actionable where "heavy" is a tier
      // they never chose by that word.
      name: row?.content_item?.name ?? itemType,
      // The tier the refusal was decided on, and the only thing a GM override
      // can be written against. Same role `weaponCategory` plays on an attack
      // row, and what makes the refusal fixable rather than only a complaint.
      category: armorCategoryOf(itemType),
    })
  }
  return out
}
