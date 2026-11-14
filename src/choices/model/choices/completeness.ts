import { multiclassSkillKey, pointsRemaining } from '@vault/derive/builderDraft.js'
import { abilityBonusResolved } from '@vault/derive/featAbilities.js'
import { featureOptionsFor, withoutFeatureOptions } from '@vault/derive/featureOptions.js'
import { FIGHTING_STYLE_TYPE } from '@vault/derive/fightingStyles.js'
import { choicesComplete, originFeatSpec } from '@vault/derive/originFeatChoices.js'
import { additionalSpellsComplete } from '@vault/derive/additionalSpells.js'

import type { ClassFence, ToolChoice } from '../../../compendium'
import { additionalSpellsAnswer, additionalSpellsKey } from '../../../characterModel'
import { improvementsComplete } from '../companion'
import { subclassLevel, type BuilderDraft } from '../draft'

import type { FeatureRow, ClassContext, ChoiceKind, LevelItem, FeatData, OpenChoice } from './types'
import { asRecord, asList } from './shared'
import { classSkillChoices, multiclassSkillChoices } from './skills'
import { featContext, originFeatComplete } from './feats'
import { invocationCountAt, invocationsComplete } from './invocations'
import { featureRows, additionalSpellsFeature, itemLabel } from './features'
import { masteryCountAt } from './masteries'
import { optionalFeatureCount, optionalFeaturePicks } from './optionalFeatures'
import { languagesComplete, TOOL_CHOICE_LABEL, toolChoiceComplete } from './languagesAndTools'
import { type CasterCaps, spellsComplete } from './spells'

// The controller: which questions the draft asks, and which are answered.
// One module of the builder's choices (MYDND-197); index.ts says what the folder is.

/**
 * Every feature that asks a question, for every class in the draft, up to that
 * class's level — the Features step's list.
 *
 * Mirrors `LevelProgressionAccordions` at `fromLevel = 1`. A feature that asks
 * nothing is left out: the pane is ~380px and the sheet already lists features;
 * the step is for answering.
 */
/**
 * The Champion's level 7 feature says "another Fighting Style feat of your
 * choice" in prose and carries no `choices`, so it is known by name, as Weapon
 * Mastery is (MYDND-171).
 */
const ADDITIONAL_FIGHTING_STYLE = 'Additional Fighting Style'

export function levelItems(draft: BuilderDraft, contexts: readonly ClassContext[]): LevelItem[] {
  const items: LevelItem[] = []
  for (const ctx of contexts) {
    const cls = draft.classes[ctx.index]
    if (!cls?.id || !ctx.source) continue
    const level = cls.level ?? 1
    const classRows = featureRows(ctx.source.row.id, ctx.source.fence?.features)
    const subRows = ctx.subclassId && ctx.subclassFence ? featureRows(ctx.subclassId, ctx.subclassFence.features) : []
    const masteries = masteryCountAt(ctx.source.fence, ctx.subclassFence, level)
    const invocations = invocationCountAt(ctx.source, level)

    const push = (rows: FeatureRow[], isSubclass: boolean) => {
      for (const f of withoutFeatureOptions(rows)) {
        if (f.level > level) continue
        const type = typeof f.choices?.type === 'string' ? f.choices.type : null
        let kind: ChoiceKind | null = null
        let options: FeatureRow[] = []
        if (f.name === 'Weapon Mastery' && masteries > 0) kind = 'mastery'
        else if (type === 'invocations') kind = invocations > 0 ? 'invocations' : null
        else if (type === 'optional_features') {
          kind = optionalFeatureCount(f.choices, level) > 0 ? 'optional_features' : null
        } else if (type === 'feature_option') {
          options = featureOptionsFor(rows, f.name)
          // Storm Soul follows Storm Aura's pick (MYDND-181): not a second
          // question. The bake answers it from the first (`followedChoices`).
          kind = options.length > 0 && !f.choices?.follows ? 'feature_option' : null
        } else if (type === FIGHTING_STYLE_TYPE || f.name === ADDITIONAL_FIGHTING_STYLE) kind = 'fighting_style'
        else if (
          type === 'skill' ||
          type === 'expertise' ||
          type === 'asi' ||
          type === 'boon' ||
          type === 'familiar' ||
          type === 'metamagic' ||
          type === 'spell_choice'
        ) {
          kind = type
        }
        if (kind) items.push({ classIndex: ctx.index, className: cls.name ?? '', level: f.level, isSubclass, feature: f, kind, options })
      }
    }
    push(classRows, false)
    push(subRows, true)
    // Spells outside the caps that a pick names (MYDND-183): one question per
    // class or subclass note, not per feature, because `additionalSpells` is
    // the row's and names no feature.
    const spellbook = Boolean(ctx.source.fence?.data?.spellbook)
    const extra = (ownerId: string, ownerName: string, data: Record<string, unknown> | undefined, rows: FeatureRow[], isSubclass: boolean) => {
      const feature = additionalSpellsFeature(ownerId, ownerName, data, rows, level, draft.featureChoices[additionalSpellsKey(ownerId)], spellbook)
      if (feature) items.push({ classIndex: ctx.index, className: cls.name ?? '', level: feature.level, isSubclass, feature, kind: 'additional_spells', options: [] })
    }
    extra(ctx.source.row.id, ctx.source.row.name, ctx.source.fence?.data, classRows, false)
    if (ctx.subclassId && ctx.subclassFence) extra(ctx.subclassId, ctx.subclassFence.name, ctx.subclassFence.data, subRows, true)
  }
  return items.sort((a, b) => a.classIndex - b.classIndex || a.level - b.level)
}

// --- Completeness -------------------------------------------------------------

/**
 * Whether a feature's question has a full answer — `featureIncomplete` from
 * `LevelProgressionAccordions`, inverted.
 *
 * `feats` are the picked feats with their fences: a half-feat's +1 is unresolved
 * until its ability is named, and only the fence knows whether it asks.
 */
export function itemComplete(
  item: LevelItem,
  draft: BuilderDraft,
  {
    feats,
    masteryCount,
    invocationCount,
    classLevel,
  }: {
    feats: readonly FeatData[]
    masteryCount: number
    invocationCount: number
    /** The item's class level to judge by, when it is not the draft's — a level up's new one. */
    classLevel?: number
  },
): boolean {
  const answer = draft.featureChoices[item.feature.id]
  const choice = asRecord(answer)
  const choices: Record<string, unknown> = item.feature.choices ?? {}
  switch (item.kind) {
    case 'mastery':
      return asList(draft.masteredWeapons).length >= masteryCount
    case 'skill':
      return asList(answer).filter(Boolean).length >= Number(choices.count ?? 1)
    case 'expertise':
      return asList(choice?.skills).filter(Boolean).length >= Number(choices.count ?? 2)
    case 'asi':
    case 'boon':
      if (choice?.type === 'score') return Boolean(choice.first && choice.second)
      if (choice?.type === 'feat' || choice?.type === 'boon') {
        return (
          Boolean(choice.featId) &&
          abilityBonusResolved(feats.find(f => f.id === choice.featId) ?? null, (choice.abilityBonus as string) ?? null) &&
          // Magic Initiate's spells, Skilled's picks: asked wherever the feat is taken (MYDND-175).
          choicesComplete(originFeatSpec(choice.featName), choice.choices, featContext(draft, item, classLevel))
        )
      }
      return false
    case 'familiar':
      // The companion, and every improvement slot its Tamer's level gives
      // (MYDND-126) — the web builder asks only for the companion.
      return (
        Boolean(choice?.monsterId) &&
        improvementsComplete(choice?.improvements, classLevel ?? draft.classes[item.classIndex]?.level ?? 1)
      )
    case 'invocations':
      return invocationsComplete(choice?.invocations, invocationCount)
    case 'metamagic':
      return asList(choice?.metamagic).length >= Number(choices.count ?? 2)
    case 'feature_option':
      return Boolean(choice?.optionId)
    case 'optional_features':
      return (
        optionalFeaturePicks(answer).length >=
        optionalFeatureCount(choices, classLevel ?? draft.classes[item.classIndex]?.level ?? 1)
      )
    case 'fighting_style':
      // Blessed and Druidic Warrior ask two cantrips (MYDND-182).
      return (
        Boolean(choice?.featId) &&
        choicesComplete(originFeatSpec(choice?.featName), choice?.choices, featContext(draft, item, classLevel))
      )
    case 'spell_choice':
      return asList(choice?.spells).filter(Boolean).length >= asList(choices.spellLevels).length
    case 'additional_spells':
      return additionalSpellsComplete(
        asList(choices.additionalSpells),
        classLevel ?? draft.classes[item.classIndex]?.level ?? 1,
        additionalSpellsAnswer(answer),
        { spellbook: choices.spellbook === true },
      )
  }
}

/**
 * Every question the draft has left open, each with the step it belongs to
 * (MYDND-155). The step is carried rather than read back out of the text: the
 * list was plain strings sorted by a ` spells$` regex, so an origin feat's
 * choices were sent to Features, and counted against it, when Background asks them.
 */
export function openChoicesOf({
  items,
  draft,
  feats,
  masteryCount,
  invocationCount,
  casters,
  fences = [],
  subclassCount = () => 0,
  background = null,
}: {
  items: readonly LevelItem[]
  draft: BuilderDraft
  feats: readonly FeatData[]
  masteryCount: number
  invocationCount: (classIndex: number) => number
  casters: ReadonlyArray<{ name: string; caps: CasterCaps }>
  /** Every class's fence, by `draft.classes` index: what its skill pick is read from. */
  fences?: ReadonlyArray<ClassFence | null>
  /** How many subclasses the vault offers a class row, so an empty shelf is not a question. */
  subclassCount?: (classIndex: number) => number
  background?: { toolChoices?: readonly ToolChoice[] } | null
}): OpenChoice[] {
  return [
    ...classOpenChoices(draft, fences, subclassCount),
    ...items
      .filter(i => !itemComplete(i, draft, { feats, masteryCount, invocationCount: invocationCount(i.classIndex) }))
      .map((i): OpenChoice => ({ text: itemLabel(i, draft), step: 'features' })),
    ...(originFeatComplete(draft.originFeat)
      ? []
      : [{ text: `${draft.originFeat?.name ?? 'Origin feat'} choices`, step: 'background' as const }]),
    ...abilityOpenChoices(draft),
    ...(background?.toolChoices ?? [])
      .filter(c => !toolChoiceComplete(draft, c))
      .map((c): OpenChoice => ({ text: TOOL_CHOICE_LABEL[c.category], step: 'background' })),
    ...(languagesComplete(draft) ? [] : [{ text: 'Languages', step: 'background' as const }]),
    ...casters
      .filter(c => !spellsComplete(draft, c.caps))
      .map((c): OpenChoice => ({ text: `${c.name} spells`, step: 'spells' })),
  ]
}

/**
 * What the Class step leaves open (MYDND-175): its skill picks and a subclass the
 * level has reached. Neither gates a save, so `stepProblems` never saw them, and
 * the step showed a tick with both blank.
 */
function classOpenChoices(
  draft: BuilderDraft,
  fences: ReadonlyArray<ClassFence | null>,
  subclassCount: (classIndex: number) => number,
): OpenChoice[] {
  return draft.classes.flatMap((cls, i): OpenChoice[] => {
    if (!cls.id) return []
    const fence = fences[i] ?? null
    const who = cls.name ?? `Class ${i + 1}`
    const skills = i === 0 ? classSkillChoices(fence) : multiclassSkillChoices(fence)
    const picked = i === 0 ? draft.skillProficiencies : asList(draft.featureChoices[multiclassSkillKey(cls.id)])
    return [
      ...(skills && picked.filter(Boolean).length < skills.count
        ? [{ text: `${who} skill proficiencies`, step: 'class' as const }]
        : []),
      ...(!cls.subclass && subclassCount(i) > 0 && cls.level >= subclassLevel(fence)
        ? [{ text: `${who} subclass`, step: 'class' as const }]
        : []),
    ]
  })
}

/**
 * Point-buy points still to spend (MYDND-175). A legal character may leave some
 * unspent, so it stays a question and not one of `stepProblems`' gates, but the
 * all-8s start is not an answered step.
 */
function abilityOpenChoices(draft: BuilderDraft): OpenChoice[] {
  if (draft.abilityMethod !== 'pointbuy') return []
  const left = pointsRemaining(draft)
  return left > 0 ? [{ text: `${left} ability point${left === 1 ? '' : 's'} left to spend`, step: 'abilities' }] : []
}
