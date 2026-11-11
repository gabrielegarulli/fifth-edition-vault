import { ABILITY_SCORE_CAP, increasesLost } from '@vault/derive/abilityIncreases.js'
import {
  effectiveScore,
  multiclassPrereqsMet,
  multiclassSkillKey,
  pointsRemaining,
  scoreIncreases,
  uncappedScore,
} from '@vault/derive/builderDraft.js'
import { getCasterCaps, isClassCaster, isSpellSelectionComplete, subclassCasting } from '@vault/derive/builderSpellCaps.js'
import { cleanColLabel, invocationsAtLevel, tableVal } from '@vault/derive/classTable.js'
import { abilityBonusResolved } from '@vault/derive/featAbilities.js'
import { featureOptionsFor, withoutFeatureOptions } from '@vault/derive/featureOptions.js'
import { FIGHTING_STYLE_TYPE } from '@vault/derive/fightingStyles.js'
import { choicesComplete, featPickLabels, originFeatSpec, proficiencyBonusAt } from '@vault/derive/originFeatChoices.js'
import {
  additionalSpellAlternatives,
  additionalSpellPicks,
  additionalSpellsAsk,
  additionalSpellsComplete,
} from '@vault/derive/additionalSpells.js'
import { ABILITY_FULL } from '@vault/derive/speciesChoices.js'
import { grantsFor, resolveStartingEquipment } from '@vault/derive/startingEquipment.js'
import { resolveToolSlug, toolSlugsIn } from '@vault/derive/tools.js'
import { VAULT_SKILLS, vaultBonusCantrips, vaultSpellListAccess } from '@vault/derive/vaultDerive.js'

import { baseClassName, type ClassFence, type FenceFeature, type SubclassFence } from '../content/classes'
import type { FeatRow } from '../content/feats'
import { packContentsFrom } from '../content/items'
import type { SpellRow } from '../content/spells'
import type { LineageFence, ToolChoice } from '../content/lineage'
import { slotMapFor } from '../spells/slots'
import { additionalSpellsAnswer, additionalSpellsKey, additionalSpellsOf } from '../vaultCharacter/additionalSpells'
import { featureId } from '../vaultCharacter/bake'
import { improvementsComplete } from './companion'
import { ABILITY_KEYS, classData, subclassLevel, type AbilityKey, type BuilderDraft, type ClassSource, type StepKey } from './draft'

/**
 * The Character Builder's choices (MYDND-29) — the pure half.
 *
 * MYDND-24 built the stepper; this module is what decides which questions each
 * class, subclass, level and feat asks, and whether they have been answered.
 * As there, **no rule is re-derived**: the counts, eligibility and resolution
 * all come from `@vault/derive` — the web builder's own modules, moved into the
 * shared library by VAULT-241. What lives here is only:
 *
 * - **Fence features as `content_*_feature` rows.** The web builder keys
 *   `featureChoices` by a row's uuid; a fence feature has none, so it is keyed
 *   by `featureId` — the *same* id the bake stamps on the feature's effects
 *   (`vaultCharacter/bake.ts`). One id on both sides is the whole contract: a
 *   choice saved here is the choice the bake finds.
 * - **The web components' inline logic, collected.** `LevelProgressionAccordions`
 *   decides which picker a feature gets and whether it is complete inside JSX;
 *   both answers are here as functions, so they are testable without a DOM.
 * - **Note-to-row adapters** for items, the shape `startingEquipment.js` reads.
 *
 * Nothing here imports `obsidian` or React, so it runs in the `logic` project.
 */

// --- Feature rows -------------------------------------------------------------

/** One fence feature as the web builder's `classFeatures` row. */
export interface FeatureRow {
  id: string
  name: string
  level: number
  description: string | null
  choices: FenceFeature['choices'] | null
  data: { optionOf?: string; [k: string]: unknown }
}

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

/** What the builder has loaded for one class row of the draft. */
export interface ClassContext {
  index: number
  source: ClassSource | null
  subclassId: string | null
  subclassFence: SubclassFence | null
}

/**
 * The kinds of question a feature can ask — `LevelProgressionAccordions`'s
 * `show*Picker` flags, as one value. The subclass pick is not here: the Class
 * step asks it, at the level the class's own fence names (MYDND-24).
 */
export type ChoiceKind =
  | 'skill'
  | 'expertise'
  | 'asi'
  | 'boon'
  | 'familiar'
  | 'invocations'
  | 'metamagic'
  | 'spell_choice'
  | 'fighting_style'
  | 'feature_option'
  | 'optional_features'
  | 'mastery'
  | 'additional_spells'

export interface LevelItem {
  classIndex: number
  className: string
  level: number
  isSubclass: boolean
  feature: FeatureRow
  kind: ChoiceKind
  /** The rows a `feature_option` picks from; empty for every other kind. */
  options: FeatureRow[]
}

/**
 * How many weapons a class (and its subclass) masters at a level — the web
 * builder's `getMasteryCountAtLevel`: the class's `weaponMasteryProgression`
 * when it has one, else a `Weapon Mastery` column in its table.
 */
export function masteryCountAt(
  fence: ClassFence | null,
  subclassFence: SubclassFence | null,
  level: number,
): number {
  const prog = fence?.data?.weaponMasteryProgression
  if (Array.isArray(prog)) {
    const sub = subclassFence?.data?.weaponMasteryProgression
    return Number(prog[level - 1] ?? 0) + (Array.isArray(sub) ? Number(sub[level - 1] ?? 0) : 0)
  }
  const groups = (fence?.data?.classTableGroups ?? []) as Array<{ colLabels?: string[]; rows?: unknown[][] }>
  for (const group of groups) {
    if (!Array.isArray(group.rows)) continue
    const ci = group.colLabels?.findIndex(l => cleanColLabel(l) === 'Weapon Mastery') ?? -1
    if (ci < 0) continue
    const n = parseInt(String(tableVal(group.rows[level - 1]?.[ci]) ?? '0'), 10)
    return Number.isNaN(n) ? 0 : n
  }
  return masteryCountFromText(fence, level)
}

/**
 * How many weapons the whole draft masters: the most any one class row grants
 * at its level. One pool, since `masteredWeapons` is one list.
 */
export function masteryCountFor(draft: BuilderDraft, contexts: readonly ClassContext[]): number {
  return Math.max(
    0,
    ...contexts.map(c => masteryCountAt(c.source?.fence ?? null, c.subclassFence, draft.classes[c.index]?.level ?? 1)),
  )
}

const COUNT_WORDS: Record<string, number> ={ one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 }

function masteryCountFromText(fence: ClassFence | null, level: number): number {
  const feature = (fence?.features ?? []).find(f => f?.name === 'Weapon Mastery' && typeof f.level === 'number' && f.level <= level)
  const said = /mastery properties of (\w+) kinds?\b/i.exec(String(feature?.description ?? ''))?.[1]?.toLowerCase()
  if (!said) return 0
  return COUNT_WORDS[said] ?? (Number.parseInt(said, 10) || 0)
}

/**
 * Eldritch Invocation slots at a level, from the class table.
 *
 * Both spellings of the column count: the 2024 table says `Invocations`, the
 * 2014 one `Invocations Known`. The plugin read both itself from MYDND-29;
 * VAULT-243 moved that rule into `@vault/derive`'s `invocationsAtLevel`.
 */
export function invocationCountAt(source: ClassSource | null, level: number): number {
  return source ? invocationsAtLevel(classData(source), level) : 0
}

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
      for (const f of withoutFeatureOptions(rows) as FeatureRow[]) {
        if (f.level > level) continue
        const type = typeof f.choices?.type === 'string' ? f.choices.type : null
        let kind: ChoiceKind | null = null
        let options: FeatureRow[] = []
        if (f.name === 'Weapon Mastery' && masteries > 0) kind = 'mastery'
        else if (type === 'invocations') kind = invocations > 0 ? 'invocations' : null
        else if (type === 'optional_features') {
          kind = optionalFeatureCount(f.choices, level) > 0 ? 'optional_features' : null
        } else if (type === 'feature_option') {
          options = featureOptionsFor(rows, f.name) as FeatureRow[]
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

// --- Completeness -------------------------------------------------------------

/** A feat row with its fence as `data` — what `featAbilities.js` reads. */
export interface FeatData {
  id: string
  name: string
  source: string | null
  kind?: string | null
  tags?: string[]
  data: Record<string, unknown>
}

interface Answered {
  type?: string
  [k: string]: unknown
}

const asRecord = (v: unknown): Answered | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Answered) : null
const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

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
          (choicesComplete(originFeatSpec(choice.featName as string), choice.choices, featContext(draft, item, classLevel)) as boolean)
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
        (choicesComplete(originFeatSpec(choice?.featName as string), choice?.choices, featContext(draft, item, classLevel)) as boolean)
      )
    case 'spell_choice':
      return asList(choice?.spells).filter(Boolean).length >= asList(choices.spellLevels).length
    case 'additional_spells':
      return additionalSpellsComplete(
        asList(choices.additionalSpells) as object[],
        classLevel ?? draft.classes[item.classIndex]?.level ?? 1,
        additionalSpellsAnswer(answer),
        { spellbook: choices.spellbook === true },
      ) as boolean
  }
}

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
  return { proficiencyBonus: proficiencyBonusAt(Math.max(1, total)) as number }
}

// --- Optional features: maneuvers, runes, arcane shots (MYDND-181) -------------

/** One option of an `optional_features` choice, as the fence writes it. */
export interface OptionalFeatureOption {
  name: string
  description?: string
  minLevel?: number
}

/**
 * How many a subclass's optional-feature choice has the character know at a
 * class level: the largest total its `progression` reaches by then — Battle
 * Master `{ 3: 3, 7: 5, 10: 7, 15: 9 }` is 5 at level 9. One question that grows,
 * as invocations do, because the 2024 Battle Master has no feature at 7, 10 or 15
 * to hang the extra picks on.
 */
export function optionalFeatureCount(choices: Record<string, unknown> | null | undefined, level: number): number {
  const progression = asRecord(choices?.progression) ?? {}
  return Object.entries(progression)
    .filter(([at]) => Number(at) <= level)
    .reduce((most, [, n]) => Math.max(most, Number(n) || 0), 0)
}

/** The options a choice offers at a level: an option with a higher `minLevel` waits. */
export function optionalFeatureOptions(choices: Record<string, unknown> | null | undefined, level: number): OptionalFeatureOption[] {
  return (asList(choices?.options) as OptionalFeatureOption[]).filter(
    o => typeof o?.name === 'string' && (o.minLevel ?? 1) <= level,
  )
}

/**
 * The options the choice gives without asking — Four Elements' Elemental
 * Attunement. They count toward the total, as the book's "you know Elemental
 * Attunement and one other" does.
 */
export function requiredOptionalFeatures(choices: Record<string, unknown> | null | undefined): string[] {
  return (asList(choices?.required) as unknown[]).filter((n): n is string => typeof n === 'string')
}

/** The names an answer holds, required ones first. */
export function optionalFeaturePicks(answer: unknown): string[] {
  return (asList(asRecord(answer)?.picks) as Array<{ name?: unknown }>)
    .map(p => p?.name)
    .filter((n): n is string => typeof n === 'string' && n.length > 0)
}

/**
 * The answer an `optional_features` question stores: each pick with its text, so
 * the sheet can show it without reading the subclass note, as metamagic and
 * invocations are stored. The required options are always in it.
 */
export function optionalFeatureAnswer(
  item: Pick<LevelItem, 'feature'>,
  names: readonly string[],
): { type: 'optional_features'; label: string; picks: OptionalFeatureOption[] } {
  const choices: Record<string, unknown> = item.feature.choices ?? {}
  const all = asList(choices.options) as OptionalFeatureOption[]
  const wanted = [...new Set([...requiredOptionalFeatures(choices), ...names.filter(Boolean)])]
  return {
    type: 'optional_features',
    label: typeof choices.name === 'string' ? choices.name : item.feature.name,
    // A required option is kept by name even when the list lacks it, or the
    // question could never be complete.
    picks: wanted.flatMap(n => {
      const o = all.find(x => x.name === n)
      if (o) return [{ name: o.name, description: o.description }]
      return requiredOptionalFeatures(choices).includes(n) ? [{ name: n }] : []
    }),
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
      const picks = featPickLabels(c.featName, c.choices) as string[]
      return [picks.length > 0 ? `${c.featName} (${picks.join(', ')})` : c.featName]
    }
    case 'score':
      return [c.first, c.second].filter((k): k is string => typeof k === 'string').map(k => `+1 ${(ABILITY_FULL as Record<string, string>)[k] ?? k}`)
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

/** A question still open, and the step that asks it — never a gate. */
export interface OpenChoice {
  text: string
  step: StepKey
}

// --- Languages and background tools (MYDND-171) ---------------------------------

/** The SRD's Standard Languages table, less Common, which every character knows. */
export const STANDARD_LANGUAGES = [
  'Common Sign Language',
  'Draconic',
  'Dwarvish',
  'Elvish',
  'Giant',
  'Gnomish',
  'Goblin',
  'Halfling',
  'Orc',
] as const

/** "Common plus two languages you roll or choose from the Standard Languages table." */
export const LANGUAGE_PICKS = 2

export function languagesComplete(draft: BuilderDraft): boolean {
  return (draft.languages ?? []).filter(Boolean).length >= LANGUAGE_PICKS
}

export function withLanguagePick(draft: BuilderDraft, slot: number, language: string): BuilderDraft {
  const languages = Array.from({ length: LANGUAGE_PICKS }, (_, i) => draft.languages?.[i] ?? '')
  languages[slot] = language
  return { ...draft, languages }
}

export const TOOL_CHOICE_LABEL: Record<ToolChoice['category'], string> = {
  gaming: 'Gaming set',
  artisan: "Artisan's tools",
  instrument: 'Musical instrument',
}

export const toolSlugsOf = (category: ToolChoice['category']): string[] => toolSlugsIn(category) as string[]

/** The picks of one kind, among everything the draft holds. */
export function toolPicksIn(draft: BuilderDraft, category: ToolChoice['category']): string[] {
  const slugs = new Set(toolSlugsOf(category))
  return (draft.backgroundTools ?? []).filter(t => slugs.has(t))
}

export function withToolPick(draft: BuilderDraft, category: ToolChoice['category'], slot: number, slug: string): BuilderDraft {
  const picks = toolPicksIn(draft, category)
  const others = (draft.backgroundTools ?? []).filter(t => !picks.includes(t))
  picks[slot] = slug
  return { ...draft, backgroundTools: [...others, ...picks.filter(Boolean)] }
}

export function toolChoiceComplete(draft: BuilderDraft, { category, count }: ToolChoice): boolean {
  return toolPicksIn(draft, category).length >= count
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
  invocationCount(classIndex: number): number
  casters: ReadonlyArray<{ name: string; caps: CasterCaps }>
  /** Every class's fence, by `draft.classes` index: what its skill pick is read from. */
  fences?: ReadonlyArray<ClassFence | null>
  /** How many subclasses the vault offers a class row, so an empty shelf is not a question. */
  subclassCount?(classIndex: number): number
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
  const left = pointsRemaining(draft) as number
  return left > 0 ? [{ text: `${left} ability point${left === 1 ? '' : 's'} left to spend`, step: 'abilities' }] : []
}

// --- Invocations --------------------------------------------------------------

export interface InvocationOption {
  name: string
  description?: string
  minLevel?: number
  requires?: string
  repeatable?: boolean
  /** The exporter's note on which cantrip the invocation names. */
  cantripNote?: string
}

export type InvocationTargetKind = 'cantrip' | 'origin_feat'

export interface InvocationTarget {
  kind: InvocationTargetKind
  id: string
  name: string
  source?: string | null
}

/** A picked invocation: the option as saved, and what it was pointed at. */
export interface InvocationPick extends InvocationOption {
  target?: InvocationTarget | null
  /** An Origin feat's own answers, when `target` is a feat that asks (Magic Initiate). */
  choices?: unknown
}

/**
 * What a repeatable invocation is pointed at (MYDND-175). The rule that lets
 * Agonizing Blast repeat is "choose a different eligible cantrip" each time, so
 * the repeat means nothing until it names one. Lessons of the First Ones says the
 * same of an Origin feat. A repeatable option naming neither asks nothing.
 */
export function invocationTargetKind(option: InvocationOption): InvocationTargetKind | null {
  if (!option.repeatable) return null
  if (option.cantripNote) return 'cantrip'
  return /\bOrigin feat\b/i.test(option.description ?? '') ? 'origin_feat' : null
}

/**
 * What an invocation may be pointed at. Cantrips are the class's damaging ones,
 * and Eldritch Spear's must reach 10 feet. Whether the character knows the cantrip
 * is not asked here: Spells comes after Features, so at this point it knows none.
 */
export function invocationTargets(
  option: InvocationOption,
  { cantrips, originFeats }: {
    cantrips: readonly Pick<SpellRow, 'id' | 'name' | 'level' | 'range' | 'damageTypes' | 'damageDice'>[]
    originFeats: ReadonlyArray<{ id: string; name: string; source: string | null }>
  },
): InvocationTarget[] {
  const kind = invocationTargetKind(option)
  if (kind === 'origin_feat') return originFeats.map(f => ({ kind, id: f.id, name: f.name, source: f.source }))
  if (kind !== 'cantrip') return []
  const reaches = /range of 10\+ feet/i.test(option.description ?? '')
  return cantrips
    .filter(s => s.level === 0 && (s.damageTypes.length > 0 || Boolean(s.damageDice)))
    .filter(s => !reaches || Number.parseInt(s.range ?? '', 10) >= 10)
    .map(s => ({ kind, id: s.id, name: s.name }))
}

/**
 * Whether a slot may take an option, given what the other slots hold. A repeat
 * needs a target left to name: `targetCount` is the size of the option's pool.
 */
export function invocationOffered(
  option: InvocationOption,
  picks: readonly InvocationPick[],
  slot: number,
  level: number,
  targetCount: number,
): boolean {
  const others = picks.filter((_, i) => i !== slot)
  const taken = others.filter(p => p.name === option.name).length
  if ((option.minLevel ?? 1) > level) return false
  if (option.requires && !others.some(p => p.name === option.requires)) return false
  if (!option.repeatable) return taken === 0
  return !invocationTargetKind(option) || taken < targetCount
}

/** Picks whose prerequisite is gone, dropped: Eldritch Smite can't outlive Pact of the Blade. */
export function keepingPrerequisites(picks: readonly InvocationPick[]): InvocationPick[] {
  const names = new Set(picks.map(p => p.name))
  const kept = picks.filter(p => !p.requires || names.has(p.requires))
  return kept.length === picks.length ? [...kept] : keepingPrerequisites(kept)
}

/** Every slot filled, and every pick that asks a follow-up answered. */
export function invocationsComplete(value: unknown, count: number): boolean {
  const picks = asList(value) as InvocationPick[]
  return (
    picks.length >= count &&
    picks.every(p => {
      if (!invocationTargetKind(p)) return true
      if (!p.target) return false
      return p.target.kind !== 'origin_feat' || (choicesComplete(originFeatSpec(p.target.name), p.choices) as boolean)
    })
  )
}

/** The pacts among an invocation list: the SRD has no Pact Boon feature, so they are options here. */
export function isPactInvocation(option: InvocationOption): boolean {
  return /^Pact of\b/i.test(option.name)
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

// --- Skills -------------------------------------------------------------------

export const SKILL_NAME: Record<string, string> = Object.fromEntries(
  (VAULT_SKILLS as Array<{ slug: string; name: string }>).map(s => [s.slug, s.name]),
)
export const ALL_SKILLS: string[] = (VAULT_SKILLS as Array<{ slug: string }>).map(s => s.slug)

/** `{ count, options }` — what a class's skill pick offers. */
export interface SkillChoices {
  count: number
  options: string[]
}

const asSkillChoices = (v: unknown): SkillChoices | null => {
  const r = asRecord(v)
  const count = Number(r?.count)
  if (!r || !Number.isFinite(count) || count <= 0) return null
  const options = asList(r.options).filter((s): s is string => typeof s === 'string')
  return { count, options: options.length > 0 ? options : ALL_SKILLS }
}

/** The primary class's level-1 skill pick (`data.skillChoices`). */
export function classSkillChoices(fence: ClassFence | null): SkillChoices | null {
  return asSkillChoices(fence?.data?.skillChoices)
}

/**
 * The skill a class taken **beyond the first** grants — the Bard, the Ranger
 * and the Rogue give one, every other class none (`CoreTraitsPanel`'s
 * `multiclassProfs.skills`).
 *
 * The fence spells it `multiclassProficiencies.skills: { count, options }`,
 * the same shape as `skillChoices` (observed on all three, 2026-10-08).
 */
export function multiclassSkillChoices(fence: ClassFence | null): SkillChoices | null {
  return asSkillChoices(asRecord(fence?.data?.multiclassProficiencies)?.skills)
}

/**
 * The `featureChoices` key a multiclass's skill pick is stored under:
 * `<classId>:multiclass:skills`, a bare array that `finalVaultJson` flattens
 * into `skillProficiencies`, so the first class's picks survive. The plugin's
 * spelling (MYDND-29), adopted upstream by VAULT-243, which also drops the key
 * when that class is replaced or removed.
 */
export { multiclassSkillKey }

// --- Multiclass ---------------------------------------------------------------

export function effectiveScores(draft: BuilderDraft, feats: readonly FeatData[]): Record<AbilityKey, number> {
  return Object.fromEntries(ABILITY_KEYS.map(k => [k, effectiveScore(draft, k, [...feats]) as number])) as Record<
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
  return Object.fromEntries(ABILITY_KEYS.map(k => [k, uncappedScore(draft, k, [...feats]) as number])) as Record<
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
    const lost = increasesLost(base, scoreIncreases(draft, ability, [...feats])) as number
    return lost > 0 ? [{ ability, lost, score: effectiveScore(draft, ability, [...feats]) as number }] : []
  })
}

/** How the warning reads, the same in the sidebar, on Abilities and on Review. */
export function scoreOverCapText({ ability, score, lost }: ScoreOverCap): string {
  const name = (ABILITY_FULL as Record<string, string>)[ability] ?? ability
  return `${name} stops at ${score}: ${lost} point${lost === 1 ? '' : 's'} of increase ${lost === 1 ? 'is' : 'are'} lost`
}

/** Whether the scores allow taking `className` as an extra class. Homebrew always may. */
export function prereqsMet(draft: BuilderDraft, className: string, feats: readonly FeatData[]): boolean {
  return multiclassPrereqsMet(effectiveScores(draft, feats), className) as boolean
}

// --- Spells -------------------------------------------------------------------

export interface CasterCaps {
  cantripCap: number
  spellsCap: number
  spellbookCap: number | null
  isSpellbook: boolean
}

/**
 * The highest spell rank a class's own slots reach at its own level (MYDND-124)
 * — the ranks the Spells step offers, by the slot tables the sheet's panel
 * already uses (`highestRank` of the same `casterProgression`). Each class of a
 * multiclass by its own level, as the 2024 rules prepare them.
 *
 * At least 1 for a caster: a class whose note names no progression, or whose
 * slots start later than its spells (a Tamer gains Spellcasting at 2), is offered
 * first-level spells as it was before MYDND-124, rather than none.
 */
export function maxSpellRank(fence: ClassFence | null, name: string, level: number): number {
  const progression = fence?.data?.casterProgression
  const slots = slotMapFor([{ name, level, progression: typeof progression === 'string' ? progression : null }])
  return Math.max(1, ...Object.keys(slots).map(Number))
}

/**
 * The draft's spellcasting classes, with the caps each one's table gives.
 *
 * **No Cantrips column is no cantrips when the table counts spells** (MYDND-124).
 * `getCasterCaps` answers `Infinity` for a column it cannot find — right for a
 * homebrew note with no table at all, wrong for the 2024 Paladin and Ranger,
 * whose tables have a Prepared Spells column and no cantrips because the class
 * has none. Those were offered every cantrip on the list, uncapped.
 */
export function casters(
  draft: BuilderDraft,
  sources: ReadonlyArray<ClassSource | null>,
  /** Each class row's chosen subclass fence, by `draft.classes` index (MYDND-182). */
  subclassFences: ReadonlyArray<SubclassFence | null> = [],
): Caster[] {
  return draft.classes.flatMap((dc, i): Caster[] => {
    const source = sources[i]
    if (!source) return []
    const row = classData(source)
    const level = dc.level ?? 1
    const subclass = dc.subclass ? { id: dc.subclass.id, fence: subclassFences[i] ?? null } : null
    const bonus = bonusCantrips(draft, source, subclass)
    const extraLists = spellListAccess(source, subclass, level)
    // The Eldritch Knight and the Arcane Trickster (MYDND-182): the class does not
    // cast, its subclass does, from another class's list. Decided on the class
    // *row*, not the draft: once saved, the draft carries the subclass's
    // Intelligence, and `isClassCaster` would then read the Fighter's table.
    const sub = subclassFences[i] ?? null
    const casting = subclassCasting(sub) as { progression: string; list: string | null } | null
    const ownAbility = row.spellcasting_ability
    if (sub && casting && (!ownAbility || ownAbility === 'none')) {
      const caps = getCasterCaps({ data: sub.data }, level) as CasterCaps
      const slots = slotMapFor([{ name: source.row.name, level, progression: casting.progression }])
      return [
        {
          index: i,
          name: sub.name,
          list: casting.list ?? baseClassName(source.row.name),
          extraLists,
          caps: { ...caps, cantripCap: (Number.isFinite(caps.cantripCap) ? caps.cantripCap : 0) + bonus },
          maxRank: Math.max(1, ...Object.keys(slots).map(Number)),
        },
      ]
    }
    if (isClassCaster(dc, row)) {
      const caps = getCasterCaps(row, level) as CasterCaps
      const cantripCap = !Number.isFinite(caps.cantripCap) && Number.isFinite(caps.spellsCap) ? 0 : caps.cantripCap
      return [
        {
          index: i,
          name: source.row.name,
          list: baseClassName(source.row.name),
          extraLists,
          caps: { ...caps, cantripCap: cantripCap + bonus },
          maxRank: maxSpellRank(source.fence, source.row.name, level),
        },
      ]
    }
    return []
  })
}

/** One casting class of the draft, as the Spells step asks it. */
export interface Caster {
  /** Its `draft.classes` index. */
  index: number
  /** The class, or for a subclass that casts, the subclass ("Eldritch Knight"). */
  name: string
  /** The class whose spell list it learns from: its own, or the subclass's (Wizard). */
  list: string
  /** Other lists a feature lets it choose from: Bard Magical Secrets' Cleric, Druid and Wizard (MYDND-182). */
  extraLists: string[]
  caps: CasterCaps
  maxRank: number
}

/**
 * The other classes' lists a class may choose its spells from at its level
 * (MYDND-182): Bard Magical Secrets, whose level-10 feature carries a
 * `spell_list_access` effect naming Cleric, Druid and Wizard. Read by derive's
 * `vaultSpellListAccess` over the features the class (and its subclass) has
 * reached, leaving out unpicked options. Before this a Bard at 10 was offered
 * only Bard spells, though the feature says "any of your new prepared spells".
 */
export function spellListAccess(
  source: ClassSource,
  subclass: { id: string; fence: SubclassFence | null } | null,
  level: number,
): string[] {
  const rows = [
    ...featureRows(source.row.id, source.fence?.features),
    ...(subclass?.fence ? featureRows(subclass.id, subclass.fence.features) : []),
  ].filter(r => r.level <= level && !r.data?.optionOf)
  return vaultSpellListAccess(rows.flatMap(r => (Array.isArray(r.data?.effects) ? (r.data.effects as unknown[]) : []))) as string[]
}

/**
 * Extra cantrips a class's picked options grant (MYDND-182): the Cleric's
 * Thaumaturge and the Druid's Magician, whose `bonus_cantrips` effect sits on the
 * Divine/Primal Order option. The sheet's SpellPanel adds them to its cap
 * (`bonus_cantrips`, baked); the Spells step did not, so a Thaumaturge was
 * offered one cantrip fewer than the sheet then asked for.
 *
 * Summed by `vaultBonusCantrips`, over the option rows the class's (and its
 * subclass's) answers name. Counted against the class that owns the option.
 */
export function bonusCantrips(
  draft: BuilderDraft,
  source: ClassSource,
  subclass: { id: string; fence: SubclassFence | null } | null = null,
): number {
  const rows = [
    ...featureRows(source.row.id, source.fence?.features),
    ...(subclass?.fence ? featureRows(subclass.id, subclass.fence.features) : []),
  ]
  const effects = Object.values(draft.featureChoices).flatMap(answer => {
    const choice = asRecord(answer)
    if (choice?.type !== 'feature_option') return []
    const row = rows.find(r => r.id === choice.optionId)
    return Array.isArray(row?.data?.effects) ? (row.data.effects as unknown[]) : []
  })
  return vaultBonusCantrips(effects) as number
}

/**
 * The elements a class's affinity picks name, or null when its list is not
 * filtered (MYDND-124).
 *
 * Ryoko's Bender casts from the element lists it has chosen through Elemental
 * Affinity (at 1, 6, 10 and 14). Its note says which lists exist
 * (`data.affinitySpells`) and each spell note which it is on (`affinities`);
 * a pick is a `feature_option` answer owned by the class whose option is named
 * for one of them. Null — offer the whole list — for any class without lists,
 * and for a Bender with nothing picked yet, rather than an empty step.
 */
export function affinityPicks(draft: BuilderDraft, classId: string | null, fence: ClassFence | null): Set<string> | null {
  const lists = fence?.data?.affinitySpells
  const elements = new Set(lists && typeof lists === 'object' ? Object.keys(lists) : [])
  if (!classId || elements.size === 0) return null
  const picked = new Set<string>()
  for (const [key, answer] of Object.entries(draft.featureChoices)) {
    const choice = asRecord(answer)
    const name = typeof choice?.optionName === 'string' ? choice.optionName : null
    if (key.startsWith(`${classId}:`) && choice?.type === 'feature_option' && name && elements.has(name)) picked.add(name)
  }
  return picked.size > 0 ? picked : null
}

/** Whether a spell is on the lists `picks` allow; a spell naming no element always is. */
export function offeredByAffinity(spell: { affinities: readonly string[] }, picks: ReadonlySet<string> | null): boolean {
  return !picks || spell.affinities.length === 0 || spell.affinities.some(a => picks.has(a))
}

export function spellsComplete(draft: BuilderDraft, caps: CasterCaps): boolean {
  return isSpellSelectionComplete(draft.spells, caps) as boolean
}

// --- Weapon masteries ---------------------------------------------------------

/**
 * A weapon's mastery, or null — `masteryWeapons.js`'s `weaponMasterySlug`.
 *
 * Re-stated here because that module lives in the web app's `lib/`, not in
 * `@vault/derive`. Its two rules, kept: a mastery belongs to the *weapon*, so a
 * ranged weapon may carry one; and a weapon with none is **not** a legal pick,
 * because it spends a slot on nothing (VAULT-164). The notes keep it in the
 * `vault-item` fence (`mastery: Sap`) — 47 of the 96 weapon notes on 2026-10-08.
 */
export function masteryOf(fence: { mastery?: unknown } | null | undefined): string | null {
  const m = fence?.mastery
  return typeof m === 'string' && m.trim() ? m.trim() : null
}

export const WEAPON_ITEM_TYPES = ['Melee Weapon', 'Ranged Weapon']

// --- Starting equipment -------------------------------------------------------

export function itemRowForEquipment(row: {
  id: string
  name: string
  source: string | null
  itemType: string | null
  scfType?: string | null
  packContents?: readonly string[]
  tags?: readonly string[]
}) {
  const data: {
    scfType?: string
    packContents?: Array<{ name: string; quantity: number }>
    variantGroup?: boolean
  } = {}
  if (row.scfType) data.scfType = row.scfType
  const pack = packContentsFrom(row.packContents ?? [])
  if (pack.length > 0) data.packContents = pack
  // Six XPHB umbrella notes (`artisans-tools`, `musical-instrument`, `gaming-set`,
  // `holy-symbol`, `arcane-focus`, `druidic-focus`) share the category's own name
  // and carry `variant-group`; left in the catalog, `resolveStartingItem` matches
  // the umbrella note before `resolveCategory` can turn the line into a choice.
  if (row.tags?.includes('variant-group')) data.variantGroup = true
  return {
    id: row.id,
    name: row.name,
    source_slug: row.source,
    item_type: row.itemType,
    data,
  }
}

export type EquipmentCatalogRow = ReturnType<typeof itemRowForEquipment>

export interface EquipmentEntry {
  kind: 'item' | 'bundle' | 'choice' | 'unavailable'
  name: string
  quantity: number
  item?: EquipmentCatalogRow
  categoryId?: string
  label?: string
  options?: EquipmentCatalogRow[]
}

export interface EquipmentOption {
  key: string
  entries: EquipmentEntry[]
  gold: number
}

function resolveKitOptions(raw: object | undefined, catalog: readonly EquipmentCatalogRow[]): EquipmentOption[] {
  const concrete = catalog.filter(i => !i.data.variantGroup)
  const gamingOptions = concrete
    .filter(i => i.item_type === 'Gaming Set')
    .sort((a, b) => a.name.localeCompare(b.name))
  const options = resolveStartingEquipment(raw, concrete) as EquipmentOption[]
  if (gamingOptions.length === 0) return options
  return options.map(opt => ({
    ...opt,
    entries: opt.entries.map(entry =>
      entry.kind === 'unavailable' && /^gaming set\b/i.test(entry.name)
        ? {
            kind: 'choice' as const,
            name: entry.name,
            quantity: entry.quantity,
            categoryId: 'gaming-set',
            label: 'A gaming set',
            options: gamingOptions,
          }
        : entry,
    ),
  }))
}

/** The primary class's lettered starting-equipment options, resolved against the item notes. */
export function equipmentOptions(fence: ClassFence | null, catalog: readonly EquipmentCatalogRow[]): EquipmentOption[] {
  return resolveKitOptions(fence?.data?.startingEquipment as object | undefined, catalog)
}

/** 5e.tools' `equipmentType` codes on raw `vault-background` `starting_equipment` entries (MYDND-174). */
const BACKGROUND_EQUIPMENT_TYPE: Record<string, string> = {
  weaponSimple: 'simple weapon',
  weaponSimpleMelee: 'simple melee weapon',
  weaponMartial: 'martial weapon',
  weaponMartialMelee: 'martial melee weapon',
  instrumentMusical: 'musical instrument',
  toolArtisan: "artisan's tools",
  setGaming: 'gaming set',
  focusSpellcastingArcane: 'arcane focus',
  focusSpellcastingHoly: 'holy symbol',
  focusSpellcastingDruidic: 'druidic focus',
}

/** 2014 comma-inverted item names that appear in homebrew `vault-background` kits. */
const BACKGROUND_ITEM_ALIAS: Record<string, string> = {
  'clothes, fine': 'fine clothes',
  "clothes, traveler's": "traveler's clothes",
  'tent, two-person': 'tent',
  'mirror, steel': 'mirror',
  'lamp, hooded': 'hooded lantern',
  'rope, hempen (50 feet)': 'rope',
}

function backgroundEquipmentEntry(entry: unknown): Record<string, unknown> | null {
  if (typeof entry === 'string') return backgroundEquipmentEntry({ item: entry })
  const e = asRecord(entry)
  if (!e) return null
  // Raw 5e.tools `startingEquipment` writes currency `value` in copper pieces
  // (`1400` = 14 gp, `5000` = 50 gp), as `vaultClassFence.ts` divides by 100.
  if (e.value != null && e.item == null && e.equipmentType == null && e.special == null) {
    return { value: Number(e.value) / 100 }
  }
  const types = Array.isArray(e.equipmentTypes)
    ? e.equipmentTypes
        .map(t => BACKGROUND_EQUIPMENT_TYPE[String(t)] ?? String(t))
        .sort()
        .join(' or ')
    : null
  const eqType =
    typeof e.equipmentType === 'string' ? (BACKGROUND_EQUIPMENT_TYPE[e.equipmentType] ?? e.equipmentType) : null
  const raw = e.item ?? e.special ?? types ?? eqType
  if (typeof raw !== 'string' || !raw.trim()) return null
  const tag = /\{@item\s+([^|}]+)/i.exec(raw.trim())
  let name = (tag ? tag[1] : raw.split('|')[0])
    .replace(/\{@\w+\s+([^|}]+)(?:\|[^}]*)?\}/g, '$1')
    .trim()
    .toLowerCase()
  name = BACKGROUND_ITEM_ALIAS[name] ?? name
  let quantity = typeof e.quantity === 'number' ? e.quantity : 1
  const pack = /^(.*\S)\s*\((\d+)\)$/.exec(name)
  if (pack) {
    name = pack[1]
    quantity *= Number(pack[2])
  }
  return quantity === 1 ? { item: name } : { item: name, quantity }
}

function normalizeBackgroundStartingEquipment(raw: unknown): Record<string, unknown> | undefined {
  const first = Array.isArray(raw) ? raw[0] : raw
  const block = asRecord(first)
  if (!block) return undefined
  const out: Record<string, unknown> = {}
  for (const [key, entries] of Object.entries(block)) {
    if (!Array.isArray(entries)) continue
    out[key.toLowerCase()] = entries.map(backgroundEquipmentEntry).filter(Boolean)
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/**
 * The chosen background's lettered starting-equipment options (MYDND-174).
 *
 * `export-lineage-to-lore.ts` writes 5e.tools' raw `startingEquipment` array
 * (`[{ A, B }]`, copper `value`, `equipmentType` codes) directly to
 * `starting_equipment` on the `vault-background` fence; `vaultClassFence.ts`
 * reshaped class kits at export time, so this normalises the background's fence
 * into the same shape before handing it to `resolveStartingEquipment`.
 */
export function backgroundEquipmentOptions(
  fence: LineageFence | null,
  catalog: readonly EquipmentCatalogRow[],
): EquipmentOption[] {
  const raw = fence?.starting_equipment ?? asRecord(fence?.data)?.startingEquipment
  return resolveKitOptions(normalizeBackgroundStartingEquipment(raw), catalog)
}

/**
 * Pre-fills a kit option's category choices (`choice` entries) from tool
 * proficiencies already chosen on the Background step (`draft.backgroundTools`),
 * when a chosen tool is among the entry's options (MYDND-174).
 */
export function defaultEquipmentChoices(
  option: EquipmentOption | null,
  tools: readonly string[] | undefined,
): Record<string, EquipmentCatalogRow> {
  if (!option || !tools || tools.length === 0) return {}
  // `@vault/derive/tools.js` spells `jewellers-tools` in British English while
  // the exported XPHB note is `items/jewelers-tools.md` ("Jeweler's Tools").
  const slugs = tools
    .map(
      t =>
        ((resolveToolSlug(t) ?? resolveToolSlug(t.replace(/-/g, ' '))) as string | null)?.replace(
          'jewellers-',
          'jewelers-',
        ) ?? t.trim().toLowerCase(),
    )
    .filter(Boolean)
  if (slugs.length === 0) return {}
  const used = new Set<string>()
  const choices: Record<string, EquipmentCatalogRow> = {}
  option.entries.forEach((entry, i) => {
    if (entry.kind !== 'choice' || !entry.options) return
    for (const slug of slugs) {
      if (used.has(slug)) continue
      const match = entry.options.find(o => o.id === slug || o.name.toLowerCase() === slug)
      if (match) {
        choices[String(i)] = match
        used.add(slug)
        break
      }
    }
  })
  return choices
}

export interface EquipmentDraft {
  option: string | null
  /** Entry index (as a string, since it is a YAML map key) → the item picked. */
  choices: Record<string, EquipmentCatalogRow>
  /** The chosen background's starting-equipment option (`'a'` / `'b'`), when taken (MYDND-174). */
  backgroundOption?: string | null
  /** Entry index → the item picked for the background kit's open choices. */
  backgroundChoices?: Record<string, EquipmentCatalogRow>
  granted: boolean
}

/** What Create hands over for one kit option: item notes and quantities, gold, and what no note answered. */
export function equipmentGrants(
  option: EquipmentOption | null,
  equipment: Pick<EquipmentDraft, 'choices'> & Partial<EquipmentDraft>,
) {
  return grantsFor(option, equipment.choices ?? {}) as {
    items: Array<{ item: EquipmentCatalogRow; quantity: number }>
    gold: number
    unavailable: string[]
  }
}

/**
 * Combined items and gold from the class kit and background kit (MYDND-174):
 * identical item ids merge their quantities and gold sums into one total.
 */
export function combinedEquipmentGrants(
  classOption: EquipmentOption | null,
  backgroundOption: EquipmentOption | null,
  equipment: EquipmentDraft,
) {
  const cls = equipmentGrants(classOption, { choices: equipment.choices })
  const bg = equipmentGrants(backgroundOption, { choices: equipment.backgroundChoices ?? {} })
  const items: Array<{ item: EquipmentCatalogRow; quantity: number }> = []
  const byId = new Map<string, { item: EquipmentCatalogRow; quantity: number }>()
  for (const g of [...cls.items, ...bg.items]) {
    const prev = byId.get(g.item.id)
    if (prev) prev.quantity += g.quantity
    else {
      const next = { item: g.item, quantity: g.quantity }
      byId.set(g.item.id, next)
      items.push(next)
    }
  }
  return {
    items,
    gold: cls.gold + bg.gold,
    unavailable: [...cls.unavailable, ...bg.unavailable],
  }
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
