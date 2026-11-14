// @ts-check
// How a feat reads on screen — VAULT-86.
//
// The catalog row and the detail drawer both have to answer the same three
// questions about a feat, and answer them identically: how many benefits does it
// have, how many of those does the app actually compute, and what state is any
// one benefit in. Two copies of that arithmetic is how the drawer comes to say
// "2 on your sheet" over a list showing three effect blocks.
//
// **The three states are derived, never stored.** `content_feat` has no state
// column; it has `effects`, `reviewed` and `adjudication`, and the state is what
// those three mean together. See docs/design/feats-benefits-handoff.md.

import { isActivated, readEnvelope } from './effects.js'
import { ABILITY_FULL_NAMES } from './dnd5e.js'

/** @typedef {import('./effects.js').Effect} Effect */
/**
 * One `prerequisite` predicate, as Ruling 10 writes them. Authored, so a value
 * may be any shape; each is read the way it was before.
 *
 * @typedef {{
 *   level?: number | string | null,
 *   class?: string | null,
 *   ability?: Readonly<Record<string, number | string>> | null,
 *   species?: unknown,
 *   feat?: unknown,
 *   proficiency?: string | null,
 *   spellcasting?: string | null,
 *   campaign?: unknown,
 *   background?: unknown,
 *   feature?: unknown,
 * }} Predicate
 */
/**
 * One of a feat's `benefits[]`.
 *
 * @typedef {{ key?: string | null, name?: string | null, effects?: readonly Effect[] | null, reviewed?: boolean | null, adjudication?: string | null, [field: string]: unknown }} Benefit
 */
/**
 * A `content_feat` row: `prerequisite` the structured tree, `data` the note's.
 *
 * @typedef {{ prerequisite?: unknown, data?: Readonly<Record<string, unknown>> | null }} FeatRowLike
 */
/** @typedef {{ total: number, modelled: number, ruledProse: number, unseen: number }} BenefitCounts */

/** @type {readonly string[]} */
export const BENEFIT_STATES = Object.freeze(['modelled', 'ruled_prose', 'unseen'])

/** @type {Readonly<Record<string, string>>} */
export const FEAT_KIND_LABELS = Object.freeze({
  general: 'General feat',
  origin: 'Origin feat',
  epic_boon: 'Epic boon',
  fighting_style: 'Fighting style',
})

// The same four kinds without the noun, for a filter row already headed "Kind".
// `General feat 123` under a `Kind` label says "feat" twice.
/** @type {Readonly<Record<string, string>>} */
export const FEAT_KIND_SHORT_LABELS = Object.freeze({
  general: 'General',
  origin: 'Origin',
  epic_boon: 'Epic boon',
  fighting_style: 'Fighting style',
})

/**
 * @param {Readonly<Record<string, string>>} labels
 * @param {string | null | undefined} kind
 * @returns {string | null}
 */
function kindLabel(labels, kind) {
  if (!kind) return null
  // An unmapped kind shows itself rather than defaulting to the commonest one —
  // a new code is how a book announces a kind nobody has ruled on yet.
  return labels[kind] ?? kind.replace(/_/g, ' ')
}

/**
 * A feat's kind as a label, for the row under a feat's name.
 *
 * @param {string | null | undefined} kind
 */
export function featKindLabel(kind) {
  return kindLabel(FEAT_KIND_LABELS, kind)
}

/**
 * A feat's kind as a filter-pill label.
 *
 * @param {string | null | undefined} kind
 */
export function featKindShortLabel(kind) {
  return kindLabel(FEAT_KIND_SHORT_LABELS, kind)
}

/**
 * A tag as a label — `legacy_2014` reads `legacy 2014`, which is the design's copy.
 *
 * @param {unknown} tag
 * @returns {string}
 */
export function featTagLabel(tag) {
  return typeof tag === 'string' ? tag.replace(/_/g, ' ') : ''
}

// One predicate of Ruling 10's prerequisite grammar as text.
//
// **Every kind `@vault/derive/prerequisiteParser.js` can emit has to be
// answered here**, and the test file pins that. `formatPrerequisite` drops what
// this returns null for, so a predicate with no branch does not show up as a
// gap — it shows up as a prerequisite quietly missing one of its conditions,
// on the chip a player reads to decide whether they qualify (VAULT-148).
/**
 * @param {unknown} raw
 * @returns {string | null}
 */
function predicateText(raw) {
  if (!raw || typeof raw !== 'object') return null
  const predicate = /** @type {Predicate} */ (raw)
  // A level carrying a class is one statement, not two: "Level 1 Fighter". The
  // level branch has to come first, so it also has to handle the class itself.
  if (predicate.level) {
    const level = String(predicate.level)
    return predicate.class ? `Level ${level} ${predicate.class}` : `Level ${level}`
  }
  if (predicate.ability) {
    const parts = Object.entries(predicate.ability)
      .map(([slug, score]) => `${ABILITY_FULL_NAMES[slug] ?? slug} ${String(score)}`)
    return parts.length > 0 ? parts.join(' or ') : null
  }
  if (predicate.class) return predicate.class
  if (predicate.species) return listText(predicate.species)
  if (predicate.feat) return listText(predicate.feat)
  if (predicate.proficiency) return `Proficiency with ${predicate.proficiency}`
  // Not a synonym for `true`: the 2020 flag means a Spellcasting *or Pact
  // Magic* feature, and a bare "Spellcasting" reads as shutting a warlock out.
  if (predicate.spellcasting) {
    return predicate.spellcasting === 'pact' ? 'Spellcasting or Pact Magic' : 'Spellcasting'
  }
  if (predicate.campaign) return listText(predicate.campaign)
  if (predicate.background) return `${listText(predicate.background)} background`
  if (predicate.feature) return listText(predicate.feature)
  return null
}

// Several predicates hold either one name or a choice of them — `Elf` against
// `Half-Elf or Half-Orc or Human`. Both spellings are accepted so the parser
// never has to wrap a single value in an array to be rendered.
/**
 * @param {unknown} value
 * @returns {string | null}
 */
function listText(value) {
  if (typeof value === 'string') return value || null
  if (Array.isArray(value)) {
    const parts = /** @type {readonly unknown[]} */ (value).filter(/** @returns {v is string} */ v => typeof v === 'string' && v !== '')
    return parts.length > 0 ? parts.join(' or ') : null
  }
  return null
}

/**
 * A feat's prerequisite as one chip's worth of text.
 *
 * **The structured column wins where it exists, and the original prose is shown
 * everywhere else** — Ruling 10: a prerequisite parsed out of prose is a guess
 * until someone reviews it, and until then the book's own words are the honest
 * thing to print. Today that is 106 of 291 feats, and it has to look correct.
 *
 * Displayed, never enforced: nothing here decides whether a pick is legal.
 *
 * @param {FeatRowLike | null | undefined} feat
 * @returns {string | null}
 */
export function formatPrerequisite(feat) {
  const structured = feat?.prerequisite
  if (structured && typeof structured === 'object') {
    const tree = /** @type {{ all?: unknown, any?: unknown }} */ (structured)
    const all = Array.isArray(tree.all) ? /** @type {readonly unknown[]} */ (tree.all) : null
    const any = Array.isArray(tree.any) ? /** @type {readonly unknown[]} */ (tree.any) : null
    const parts = (all ?? any ?? []).map(predicateText).filter(/** @returns {p is string} */ p => Boolean(p))
    if (parts.length > 0) return parts.join(all ? ' · ' : ' or ')
  }
  const prose = feat?.data?.prerequisite
  return typeof prose === 'string' && prose.trim() ? prose.trim() : null
}

/**
 * Two lines of the catalog row's 200px prerequisite column, in characters.
 *
 * VAULT-94 budgeted the column against a 55-character worst case and that
 * arithmetic was right — ~30 characters to a line at the chip's 0.8125rem, so
 * 55 wraps to two lines and stops. What stopped being true is that 55 was the
 * catalog maximum: VAULT-109 unflattened the alternative prerequisites and the
 * longest is now 147 (Cantrip Combatant), which wraps to six.
 *
 * So the budget survives as a *threshold* rather than a maximum — past it the
 * row clamps and discloses instead of growing.
 */
const PREREQUISITE_TWO_LINE_BUDGET = 60

/**
 * Whether a prerequisite is too long for the catalog row to print in full.
 *
 * A character count, not a measurement — it cannot know the rendered width, and
 * deliberately does not try. It only has to be right about the handful of
 * prerequisites that are obviously past two lines; three of 291 are, and every
 * other feat keeps rendering exactly as it did (VAULT-163).
 *
 * @param {unknown} text
 * @returns {boolean}
 */
export function prerequisiteNeedsDisclosure(text) {
  return typeof text === 'string' && text.length > PREREQUISITE_TWO_LINE_BUDGET
}

/**
 * The benefits array, always an array.
 *
 * @param {FeatRowLike | null | undefined} feat
 * @returns {Benefit[]}
 */
export function featBenefits(feat) {
  const benefits = feat?.data?.benefits
  return Array.isArray(benefits) ? /** @type {Benefit[]} */ (benefits) : []
}

/**
 * Which of the three states a benefit is in.
 *
 * ```
 * modelled     effects.length > 0
 * ruled_prose  no effects, reviewed, adjudication === 'table'
 * unseen       anything else
 * ```
 *
 * **A reviewed benefit with a missing or unrecognised `adjudication` reads as
 * unseen, not as either answer** (VAULT-84). `modelled` would claim a number is
 * being computed when nothing says so, and `table` would silently record a gap
 * as a decision — the precise failure the column exists to prevent.
 *
 * @param {Benefit | null | undefined} benefit
 * @returns {'modelled' | 'ruled_prose' | 'unseen'}
 */
export function benefitState(benefit) {
  if ((benefit?.effects ?? []).length > 0) return 'modelled'
  if (benefit?.reviewed && benefit?.adjudication === 'table') return 'ruled_prose'
  return 'unseen'
}

/**
 * Whether a benefit is switched on and off rather than always running.
 *
 * Per-benefit, never per-feat: a feat with a permanent ability increase and a
 * 1-minute buff is one activatable benefit out of two, not an activatable feat.
 *
 * @param {Benefit | null | undefined} benefit
 * @returns {boolean}
 */
export function benefitIsActivatable(benefit) {
  return (benefit?.effects ?? []).some(isActivated)
}

/**
 * The duration and trigger a benefit prints, from the first effect that names
 * one. **Both are reminders and neither is ever detected or counted down**
 * (Ruling 8) — they are strings on their way to a `<Typography>`.
 *
 * @param {Benefit | null | undefined} benefit
 * @returns {{ duration: string | null, trigger: string | null }}
 */
export function benefitReminders(benefit) {
  /** @type {string | null} */
  let duration = null
  /** @type {string | null} */
  let trigger = null
  for (const effect of benefit?.effects ?? []) {
    const envelope = readEnvelope(effect)
    duration ??= envelope.duration
    trigger ??= envelope.trigger
  }
  return { duration, trigger }
}

/**
 * `{ total, modelled, ruledProse, unseen }` for one feat.
 *
 * @param {FeatRowLike | null | undefined} feat
 * @returns {BenefitCounts}
 */
export function featBenefitCounts(feat) {
  const counts = { total: 0, modelled: 0, ruledProse: 0, unseen: 0 }
  for (const benefit of featBenefits(feat)) {
    counts.total += 1
    const state = benefitState(benefit)
    if (state === 'modelled') counts.modelled += 1
    else if (state === 'ruled_prose') counts.ruledProse += 1
    else counts.unseen += 1
  }
  return counts
}

/**
 * `3 benefits` · `1 benefit` · `No benefits` — the catalog row's first line.
 *
 * @param {number | null | undefined} total
 * @returns {string}
 */
export function formatBenefitCount(total) {
  if (!total) return 'No benefits'
  return `${total} benefit${total === 1 ? '' : 's'}`
}

/**
 * `2 on your sheet` · `nothing modelled` — the catalog row's second line.
 *
 * **Lowercase, in the same slot and the same colour as the count it replaces.**
 * A feat with nothing modelled is the *common* case, not an error: no icon, no
 * colour, no parentheses. Null when the feat has no benefits at all, because
 * "No benefits · nothing modelled" says the same nothing twice.
 *
 * @param {BenefitCounts | null | undefined} counts
 * @returns {string | null}
 */
export function formatModelledCount(counts) {
  if (!counts?.total) return null
  return counts.modelled > 0 ? `${counts.modelled} on your sheet` : 'nothing modelled'
}

/**
 * `4 benefits · 2 on your sheet` — the drawer header, and the same string the row uses.
 *
 * @param {FeatRowLike | null | undefined} feat
 * @returns {string}
 */
export function formatBenefitSummary(feat) {
  const counts = featBenefitCounts(feat)
  const modelled = formatModelledCount(counts)
  return [formatBenefitCount(counts.total), modelled].filter(Boolean).join(' · ')
}
