import { ABILITY_SCORE_CAP, increasesLost } from '@vault/derive/abilityIncreases.js'
import { effectiveScore, multiclassPrereqsMet, scoreIncreases, uncappedScore } from '@vault/derive/builderDraft.js'
import { ABILITY_FULL } from '@vault/derive/speciesChoices.js'

import { ABILITY_KEYS, type AbilityKey, type BuilderDraft } from '../draft'

import type { FeatData } from './types'

// Ability scores: effective scores, the cap, multiclass prerequisites.
// One module of the builder's choices (MYDND-197); index.ts says what the folder is.

// --- Multiclass ---------------------------------------------------------------

export function effectiveScores(draft: BuilderDraft, feats: readonly FeatData[]): Record<AbilityKey, number> {
  return Object.fromEntries(ABILITY_KEYS.map(k => [k, effectiveScore(draft, k, [...feats])])) as Record<
    AbilityKey,
    number
  >
}

/**
 * The sum an increase picker tests its cap against: every increase, before the
 * cap (VAULT-262). A picker subtracts its own pick and asks whether the rest
 * already reaches 20; against the capped score, 20 with the pick's own +1 inside
 * reads as 19, and the picker would offer an ability the +1 cannot raise.
 */
export function uncappedScores(draft: BuilderDraft, feats: readonly FeatData[]): Record<AbilityKey, number> {
  return Object.fromEntries(ABILITY_KEYS.map(k => [k, uncappedScore(draft, k, [...feats])])) as Record<
    AbilityKey,
    number
  >
}

/** What an increase may raise a score to when it names no maximum of its own. */
export { ABILITY_SCORE_CAP }

export interface ScoreOverCap {
  ability: AbilityKey
  /** The score the character has: the increases held to their maximums. */
  score: number
  /** The points of increase the maximum swallowed. */
  lost: number
}

/**
 * The increases a score cannot take (MYDND-155, MYDND-181) — a warning, because
 * an open question never gates a save.
 *
 * Since VAULT-262 `@vault/derive` holds every increase to its own maximum, 20
 * unless it names another, so a score is never baked past it: what is left to
 * say is that a point was spent on nothing. An Epic Boon's +1 to 30 is lost only
 * past 30, and a base already over 20 (a D&D Beyond conversion's finals, a
 * Manual's) is never lowered, both by derive's rule.
 *
 * `AsiPicker`'s `atCap` cannot catch these: Features comes before Background
 * and Abilities, so at pick time the base scores are not set yet (a standard
 * array starts at 0).
 */
export function scoresOverCap(draft: BuilderDraft, feats: readonly FeatData[]): ScoreOverCap[] {
  return ABILITY_KEYS.flatMap(ability => {
    const base = draft.abilityScores[ability] ?? 8
    const lost = increasesLost(base, scoreIncreases(draft, ability, [...feats]))
    return lost > 0 ? [{ ability, lost, score: effectiveScore(draft, ability, [...feats]) }] : []
  })
}

/** How the warning reads, the same in the sidebar, on Abilities and on Review. */
export function scoreOverCapText({ ability, score, lost }: ScoreOverCap): string {
  const name = ABILITY_FULL[ability] ?? ability
  return `${name} stops at ${score}: ${lost} point${lost === 1 ? '' : 's'} of increase ${lost === 1 ? 'is' : 'are'} lost`
}

/** Whether the scores allow taking `className` as an extra class. Homebrew always may. */
export function prereqsMet(draft: BuilderDraft, className: string, feats: readonly FeatData[]): boolean {
  return multiclassPrereqsMet(effectiveScores(draft, feats), className)
}
