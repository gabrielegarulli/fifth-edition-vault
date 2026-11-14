import { choicesComplete, originFeatSpec, proficiencyBonusAt } from '@vault/derive/originFeatChoices.js'

import type { FeatRow } from '../../../compendium'
import type { BuilderDraft } from '../draft'

import type { LevelItem } from './types'
import { asRecord, asList } from './shared'

// Feats: the origin feat, the ASI feat, fighting styles, feats taken twice.
// One module of the builder's choices (MYDND-197); index.ts says what the folder is.

/**
 * What a feat's own questions are judged against (MYDND-182): the Proficiency
 * Bonus at the character's total level, which is Ritual Caster's count. A level
 * up judges at the new level (`classLevel` for the item's class), so a bonus that
 * grows re-asks the feat, as a new invocation slot does.
 */
export function featContext(draft: BuilderDraft, item?: LevelItem, classLevel?: number): { proficiencyBonus: number } {
  const total = draft.classes.reduce(
    (sum, c, i) => sum + (c.id ? (item && classLevel !== undefined && i === item.classIndex ? classLevel : (c.level ?? 1)) : 0),
    0,
  )
  return { proficiencyBonus: proficiencyBonusAt(Math.max(1, total)) }
}

// --- Feats taken more than once -----------------------------------------------

/** Where the origin feat's spell list counts in `spellListsTaken`. */
export const ORIGIN_FEAT_OWNER = 'origin'

/** The owner of a feat taken through a slot of a feature's invocations. */
export const invocationOwner = (featureId: string, slot: number) => `${featureId}#${slot}`

/**
 * The spell lists Magic Initiate has already drawn on, leaving out `owner`'s own
 * (MYDND-175). The feat may repeat, but "you must choose a different spell list
 * each time"; only the origin feat could hold one before it could be taken twice.
 */
export function spellListsTaken(draft: BuilderDraft, owner: string): string[] {
  const held: Array<[string, unknown]> = [[ORIGIN_FEAT_OWNER, draft.originFeat?.choices]]
  for (const [key, answer] of Object.entries(draft.featureChoices)) {
    const choice = asRecord(answer)
    if (choice?.type === 'feat') held.push([key, choice.choices])
    if (choice?.type === 'invocations') {
      asList(choice.invocations).forEach((p, i) => held.push([invocationOwner(key, i), asRecord(p)?.choices]))
    }
  }
  return held.flatMap(([who, choices]) => {
    const list = asRecord(choices)?.spellList
    return who !== owner && typeof list === 'string' ? [list] : []
  })
}

// --- Origin feat --------------------------------------------------------------

/** Whether the origin feat's sub-questions (Magic Initiate's cantrips…) are answered. */
export function originFeatComplete(originFeat: BuilderDraft['originFeat']): boolean {
  if (!originFeat) return true
  return choicesComplete(originFeatSpec(originFeat.name), originFeat.choices) as boolean
}

// --- Feats --------------------------------------------------------------------

/**
 * The note that restates the class feature as a feat (MYDND-155). Its fence
 * models nothing (`modelled_count: 0`), so taken as a feat it changed no score
 * and spent the slot: an Ability Score Improvement raises scores through its
 * own "Ability scores" mode. Left out of what is offered, never out of what a
 * saved character holds.
 */
export function isAsiFeat(feat: { name: string }): boolean {
  return feat.name === 'Ability Score Improvement'
}

// --- Fighting styles ----------------------------------------------------------

/**
 * Feat rows as `fightingStyleOptions` reads them: with `prerequisite` as the
 * web app's predicate tree rather than the note's display string.
 *
 * Only the class a replacement style belongs to is rebuilt — `{ all: [{ class }] }`
 * from the note's flat `prerequisite_class` (MYDND-31), because that is the one
 * predicate `replacementOwner` looks for. Every other feat gets `null`, which
 * `fightingStyleOptions` already reads as "no owning class". The returned rows
 * keep their identity fields, so a pick still names the note.
 */
export function fightingStyleFeats<T extends Pick<FeatRow, 'prerequisiteClass'>>(feats: readonly T[]) {
  return feats.map(f => ({
    ...f,
    prerequisite: f.prerequisiteClass ? { all: [{ class: f.prerequisiteClass }] } : null,
  }))
}
