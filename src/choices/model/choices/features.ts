import { featPickLabels } from '@vault/derive/originFeatChoices.js'
import {
  additionalSpellAlternatives,
  additionalSpellPicks,
  additionalSpellsAsk,
} from '@vault/derive/additionalSpells.js'
import { ABILITY_FULL } from '@vault/derive/speciesChoices.js'

import type { FenceFeature } from '../../../compendium'
import { additionalSpellsAnswer, additionalSpellsKey, additionalSpellsOf, featureId } from '../../../characterModel'
import type { BuilderDraft } from '../draft'

import type { FeatureRow, LevelItem } from './types'
import { asRecord, asList } from './shared'
import { SKILL_NAME } from './skills'
import type { InvocationPick } from './invocations'

// Fence features as rows, and what a saved answer picked.
// One module of the builder's choices (MYDND-197); index.ts says what the folder is.

// --- Feature rows -------------------------------------------------------------

/** Every feature a fence carries, options included, keyed the way the bake keys it. */
export function featureRows(ownerId: string, features: readonly FenceFeature[] | undefined): FeatureRow[] {
  return (features ?? [])
    .filter(f => typeof f?.name === 'string' && typeof f?.level === 'number')
    .map(f => ({
      id: featureId(ownerId, f),
      name: f.name,
      level: f.level,
      description: f.description ?? null,
      choices: f.choices ?? null,
      data: { ...(f.data ?? {}) },
    }))
}

/**
 * The question a note's `additionalSpells` asks at a class level, as a feature
 * row, or null when it asks nothing (MYDND-183).
 *
 * Its id is `additionalSpellsKey(ownerId)`, where the answer is kept. Its level
 * is the latest level that brought a pick or the alternative, so a level up
 * that adds a Savant's spell lists it as that level's question. Its name is the
 * feature that grants the spells: the one at the first such level whose text
 * speaks of spells (Magical Discoveries, Abjuration Savant, Circle of the Land
 * Spells), never the subclass's own opening entry, and `<owner> spells` when
 * none does. `spellbook` is whether the class keeps one: a Savant's picks are
 * written into it, so they are never cantrips (derive's `additionalSpellPicks`).
 */
export function additionalSpellsFeature(
  ownerId: string,
  ownerName: string,
  data: Record<string, unknown> | null | undefined,
  rows: readonly FeatureRow[],
  classLevel: number,
  answer: unknown,
  spellbook = false,
): FeatureRow | null {
  const blocks = additionalSpellsOf(data) as object[]
  const block = additionalSpellsAnswer(answer)?.block ?? null
  if (blocks.length === 0 || !additionalSpellsAsk(blocks, classLevel, block, { spellbook })) return null
  const levels = [
    ...(additionalSpellAlternatives(blocks) as Array<{ level: number }>).map(a => a.level),
    ...(additionalSpellPicks(blocks, classLevel, block, { spellbook }) as Array<{ level: number }>).map(p => p.level),
  ].filter(l => l <= classLevel)
  const first = Math.min(...levels)
  const named = rows.find(
    r => r.level === first && !r.data?.optionOf && r.name !== ownerName && /\bspells?\b/i.test(r.description ?? ''),
  )
  return {
    id: additionalSpellsKey(ownerId),
    name: named?.name ?? `${ownerName} spells`,
    level: Math.max(...levels),
    description: named?.description ?? null,
    choices: { type: 'additional_spells', additionalSpells: blocks, owner: ownerName, spellbook },
    data: {},
  }
}

/**
 * What a saved answer picked, by name, for the sheet's feature list (MYDND-181).
 * D&D Beyond characters carry `feature_picks`; a Vault character's picks are its
 * `featureChoices`, which nothing showed. Empty for an answer that names nothing.
 */
export function choicePicks(answer: unknown): string[] {
  if (Array.isArray(answer)) return answer.filter((s): s is string => typeof s === 'string').map(s => SKILL_NAME[s] ?? s)
  const c = asRecord(answer)
  if (!c) return []
  const names = (list: unknown) =>
    (asList(list) as Array<{ name?: unknown } | null>).map(p => p?.name).filter((n): n is string => typeof n === 'string')
  switch (c.type) {
    case 'feature_option':
      return typeof c.optionName === 'string' ? [c.optionName] : []
    case 'optional_features':
      return names(c.picks)
    case 'metamagic':
      return names(c.metamagic)
    case 'invocations':
      return (asList(c.invocations) as InvocationPick[]).map(p => (p?.target?.name ? `${p.name} (${p.target.name})` : p?.name)).filter(Boolean)
    case 'feat':
    case 'boon': {
      if (typeof c.featName !== 'string') return []
      // What the feat was taken for (MYDND-182): Elemental Adept bakes nothing,
      // so its damage type is said here or nowhere.
      const picks = featPickLabels(c.featName, c.choices)
      return [picks.length > 0 ? `${c.featName} (${picks.join(', ')})` : c.featName]
    }
    case 'score':
      return [c.first, c.second].filter((k): k is string => typeof k === 'string').map(k => `+1 ${ABILITY_FULL[k] ?? k}`)
    case 'expertise':
      return (asList(c.skills) as string[]).filter(Boolean).map(s => SKILL_NAME[s] ?? s)
    case 'spell_choice':
      return (asList(c.spells) as Array<{ spellName?: unknown } | null>).map(s => s?.spellName).filter((n): n is string => typeof n === 'string')
    case 'additional_spells': {
      const answer = additionalSpellsAnswer(c)
      const spells = Object.values(answer?.picks ?? {})
        .flatMap(list => asList(list) as Array<{ spellName?: unknown } | null>)
        .map(s => s?.spellName)
        .filter((n): n is string => typeof n === 'string')
      return [...(answer?.block ? [answer.block] : []), ...spells]
    }
    default:
      return []
  }
}

/**
 * What a feature's section is called, once the draft has answered it (MYDND-175).
 * An Ability Score Improvement spent on a feat is that feat, and calling it an
 * improvement misnames the choice: the note's name stands only for the scores.
 */
export function featureTitle(item: LevelItem, draft: BuilderDraft): string {
  const choice = asRecord(draft.featureChoices[item.feature.id])
  if (item.kind !== 'asi' || choice?.type !== 'feat') return item.feature.name
  return typeof choice.featName === 'string' && choice.featName ? `Feat: ${choice.featName}` : 'Feat'
}

/** A short label for an item, as the open-choices list names it. */
export function itemLabel(item: LevelItem, draft?: BuilderDraft): string {
  return `${item.className} ${item.level}: ${draft ? featureTitle(item, draft) : item.feature.name}`
}
