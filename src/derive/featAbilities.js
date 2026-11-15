// @ts-check
// Which abilities a feat can raise, read from its effects — VAULT-83.
//
// This replaces `data.ability`, a display string the catalog held in two
// dialects (`"Str/Dex +1"` on 141 rows, `"Dexterity"` on 52) that **did not
// agree with the prose**: only 118 of the first group and 23 of the second
// actually granted an increase. `FeatsPage` filtered by substring against it, so
// the 43 rows reading `"Any +1"` matched no ability chip at all and the 106
// blank ones matched nothing ever — 149 of 299 feats were invisible to a filter
// that looked like it worked.
//
// The `ability_score_choice` effect is the authored fact instead, parsed from
// the Ability Score Increase benefit's own sentence. A feat with no such effect
// grants no increase, and says so by returning an empty list rather than by
// being absent from a filter.

import { effectsOfType } from './effects.js'

/** @typedef {import('./effects.js').Effect} Effect */
/**
 * A `content_feat` row, or its fence: `data` is a note's, so its effects are
 * trusted to be effects as they always were.
 *
 * @typedef {{ data?: Readonly<Record<string, unknown>> | null }} FeatRowLike
 */

/** @type {Readonly<Record<string, string>>} */
const LABELS = { str: 'Str', dex: 'Dex', con: 'Con', int: 'Int', wis: 'Wis', cha: 'Cha' }

const ABILITY_COUNT = Object.keys(LABELS).length

/**
 * Every effect a feat carries, from benefits[] and the legacy flat array alike.
 *
 * @param {FeatRowLike | null | undefined} feat
 * @returns {Effect[]}
 */
function featEffects(feat) {
  const flat = /** @type {readonly Effect[]} */ (feat?.data?.effects ?? [])
  const benefits = /** @type {readonly { effects?: readonly Effect[] | null }[]} */ (feat?.data?.benefits ?? [])
  const fromBenefits = benefits.flatMap(b => b.effects ?? [])
  return [...flat, ...fromBenefits]
}

/**
 * The ability slugs this feat lets a player raise, in `LABELS` order.
 *
 * @param {FeatRowLike | null | undefined} feat
 * @returns {string[]} empty when the feat grants no ability increase
 */
export function featAbilityOptions(feat) {
  /** @type {Set<string>} */
  const options = new Set()
  for (const effect of effectsOfType(featEffects(feat), 'ability_score_choice')) {
    for (const option of effect.options ?? []) {
      if (option in LABELS) options.add(option)
    }
  }
  return Object.keys(LABELS).filter(a => options.has(a))
}

/**
 * True when this feat can raise `ability` (a slug: 'str', 'dex', …).
 *
 * @param {FeatRowLike | null | undefined} feat
 * @param {string} ability
 */
export function featRaisesAbility(feat, ability) {
  return featAbilityOptions(feat).includes(ability)
}

/**
 * The ability increase this feat asks a player to resolve — VAULT-166.
 *
 * `featAbilityOptions` answers the catalog's question ("which abilities can this
 * feat raise?") and merges across every effect, because a filter chip wants the
 * union. A *picker* asks a narrower one — "what am I resolving, and how far can
 * it go?" — and needs the `amount` and `max` that only live on the effect
 * itself. `max` is the fact a picker cannot do without: an ordinary feat caps at
 * 20 and an Epic Boon at 30, so a cap check that hardcodes either one is wrong
 * for 37 rows or 101 of them.
 *
 * The `amount`/`max` are taken from the first `ability_score_choice` effect.
 * Every one of the 138 catalog rows carrying one carries exactly one (checked
 * 2026-09-16), and `featToEffects` resolves a single stored `abilityBonus`
 * against all of them anyway, so a homebrew row with two has no coherent answer
 * to give a picker in the first place.
 *
 * @param {FeatRowLike | null | undefined} feat a `content_feat` row
 * @returns {{options: string[], amount: number, max: number|null}|null}
 *   null when the feat grants no increase — the common case for origin feats
 */
export function featAbilityChoice(feat) {
  const options = featAbilityOptions(feat)
  if (options.length === 0) return null
  const [effect] = effectsOfType(featEffects(feat), 'ability_score_choice')
  // An `ability_score_choice` amount is a number in every feat; the grammar's
  // objects are for bonuses, and every caller adds this one to a score.
  return { options, amount: /** @type {number} */ (effect?.amount ?? 1), max: effect?.max ?? null }
}

/**
 * Whether this feat's ability increase has everything it needs to resolve.
 *
 * Lives beside `featAbilityChoice` rather than in the picker because the
 * builder's incomplete-outline needs the same answer the picker does, and two
 * copies of "is this resolved?" would drift apart the first time one of them was
 * taught something.
 *
 * True for a feat that grants no increase, and for one offering exactly one
 * ability — neither has a question outstanding.
 *
 * @param {FeatRowLike | null | undefined} feat
 * @param {string | null | undefined} abilityBonus
 * @returns {boolean}
 */
export function abilityBonusResolved(feat, abilityBonus) {
  const choice = featAbilityChoice(feat)
  if (!choice || choice.options.length === 1) return true
  return choice.options.includes(abilityBonus ?? '')
}

/**
 * The chip text for a feat's ability increase, or null when it grants none.
 *
 * All six reads "Any" rather than listing them, which is what the catalog's own
 * prose says ("one ability score of your choice") and what the old display
 * string said too.
 *
 * @param {FeatRowLike | null | undefined} feat
 * @returns {string | null}
 */
export function formatFeatAbilities(feat) {
  const options = featAbilityOptions(feat)
  if (options.length === 0) return null
  if (options.length === ABILITY_COUNT) return 'Any +1'
  return `${options.map(a => LABELS[a]).join('/')} +1`
}
