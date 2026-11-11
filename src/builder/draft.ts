import {
  INITIAL_DRAFT,
  draftFromCharacter,
  finalVaultJson,
  pointsRemaining,
  withClassAdded,
  withClassLevel,
  withClassRemoved,
  withClassSelected,
} from '@vault/derive/builderDraft.js'
import { STANDARD_ARRAY } from '@vault/derive/dnd5e.js'
import { SIZE_FULL, speciesChoiceProblems } from '@vault/derive/speciesChoices.js'
import { optionChoicesComplete } from '@vault/derive/startingEquipment.js'

import { baseClassName, type ClassFence, type ClassRow, type SubclassFence } from '../content/classes'
import type { BackgroundRow, LineageFence, SpeciesRow } from '../content/lineage'
import type { VaultCharacterJson } from '../vaultCharacter/index'
import { defaultEquipmentChoices, type EquipmentCatalogRow, type EquipmentDraft, type EquipmentOption } from './choices'

/**
 * The Character Builder's pure half (MYDND-24; the choices are `./choices.ts`,
 * MYDND-29).
 *
 * The rules are `@vault/derive/builderDraft.js` — the web builder's own draft
 * functions, moved into the shared library by VAULT-241 so this file does not
 * re-derive any of them. What lives here is only what the plugin has and the web
 * app does not:
 *
 * - **Notes, not rows.** `builderDraft` reads `content_class` / `content_race`
 *   rows; the plugin has a catalog row (frontmatter) plus a parsed fence. The
 *   adapters below put the two back together in the row shape, the same way
 *   `vaultCharacter/bake.ts` does for the bake.
 * - **Gating per step.** The web builder spreads its "can proceed" logic across
 *   the component; it is collected here so it is testable without a DOM.
 * - **Edit mode's merge** — see `toVaultJson`.
 *
 * Nothing here imports `obsidian` or React, so it runs in the `logic` project.
 */

export const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const
export type AbilityKey = (typeof ABILITY_KEYS)[number]

export type AbilityMethod = 'pointbuy' | 'standard' | 'manual'

export interface DraftClass {
  id: string | null
  name: string | null
  source: string | null
  level: number
  subclass: { id: string; name: string } | null
  spellcastingAbility: string | null
}

export interface DraftRace {
  id: string
  name: string
  source: string | null
  subrace: string | null
  size: string | null
  spellcastingAbility: string | null
  cantrip: unknown
}

/**
 * `builderDraft`'s draft, typed. `INITIAL_DRAFT` is plain JS and TypeScript
 * infers `race: null` from it, so the shape is restated here once and the
 * library's functions are cast to it at the boundary.
 */
export interface BuilderDraft {
  step: number
  name: string
  avatarUrl: string
  race: DraftRace | null
  classes: DraftClass[]
  background: { id: string; name: string; source: string | null } | null
  originFeat: { id: string; name: string; source: string | null; choices: unknown } | null
  backgroundBonuses: Record<string, string | null | undefined>
  abilityMethod: AbilityMethod
  abilityScores: Record<AbilityKey, number>
  featureChoices: Record<string, unknown>
  saveProficiencies: string[]
  skillProficiencies: string[]
  masteredWeapons: Array<{ id: string; name: string }>
  /** The two languages picked beside Common (MYDND-171). */
  languages?: string[]
  /**
   * Tool slugs the background grants or the player picked (MYDND-171). A pick
   * also pre-fills the matching line of the background's kit (MYDND-174).
   */
  backgroundTools?: string[]
  familiars: Array<Record<string, unknown>>
  spells: { cantrips: SpellPick[]; known: SpellPick[]; prepared?: string[] }
  equipment: EquipmentDraft
  [k: string]: unknown
}

export interface SpellPick {
  id: string
  name: string
  source: string | null
  /** The spell's level, stored since MYDND-124 so the sheet files it under its rank; absent on older picks. */
  level?: number
}

/**
 * Every step, in order. **Spells is shown only to a caster** — see
 * `visibleSteps` — exactly as the web builder appends it only when a class casts.
 *
 * Equipment sits after Abilities, where the book puts it; Features after Class,
 * because every question on it is the class's (MYDND-29).
 */
export const STEPS = [
  { key: 'species', label: 'Species' },
  { key: 'class', label: 'Class' },
  { key: 'features', label: 'Features' },
  { key: 'background', label: 'Background' },
  { key: 'abilities', label: 'Abilities' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'spells', label: 'Spells' },
  { key: 'review', label: 'Review' },
] as const
export type StepKey = (typeof STEPS)[number]['key']
export type Step = (typeof STEPS)[number]

export function visibleSteps(hasCaster: boolean): Step[] {
  return STEPS.filter(s => s.key !== 'spells' || hasCaster)
}

export function blankDraft(): BuilderDraft {
  return structuredClone(INITIAL_DRAFT) as unknown as BuilderDraft
}

/** A saved character re-opened for editing. */
export function draftFromJson(json: VaultCharacterJson): BuilderDraft {
  // `draftFromCharacter` is the web app's and knows none of these keys.
  const draft = draftFromCharacter({ json, name: json.name }) as unknown as BuilderDraft
  const rawEquip = json.equipment as Record<string, unknown> | undefined
  const backgroundOption = typeof rawEquip?.backgroundOption === 'string' ? rawEquip.backgroundOption : null
  const rawChoices = rawEquip?.backgroundChoices
  const backgroundChoices =
    rawChoices && typeof rawChoices === 'object' && !Array.isArray(rawChoices)
      ? ({ ...(rawChoices as Record<string, EquipmentCatalogRow>) })
      : {}
  return {
    ...draft,
    languages: json.languages ?? [],
    backgroundTools: json.backgroundTools ?? [],
    ...(backgroundOption
      ? {
          equipment: {
            ...draft.equipment,
            backgroundOption,
            backgroundChoices,
          },
        }
      : {}),
  }
}

// --- Rows ---------------------------------------------------------------------

/** What the builder has in hand for one class: its catalog row and its fence. */
export interface ClassSource {
  row: ClassRow
  fence: ClassFence | null
}

/** A class note as a `content_class` row — the shape `builderDraft` reads. */
export function classData({ row, fence }: ClassSource) {
  return {
    id: row.id,
    name: row.name,
    source: fence?.source ?? row.source,
    hit_die: fence?.hit_die ?? null,
    spellcasting_ability: fence?.spellcasting_ability ?? null,
    data: fence?.data ?? {},
  }
}

const SIZE_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(SIZE_FULL as Record<string, string>).map(([code, word]) => [word.toLowerCase(), code]),
)

/**
 * The size codes a species' frontmatter allows, in its own order.
 *
 * `speciesChoices` wants `data.size` as an array of codes (`['S', 'M']`), which
 * is how `content_race` stores it. The exporter writes prose instead — `Medium`,
 * `Small or Medium` — 36 of 100 species notes on 2026-10-08 offer two. Parsing
 * it here turns that into a real choice; prose naming no size word yields `[]`,
 * which `speciesChoices` reads as "nothing to ask" rather than a blocked step.
 */
export function sizeCodes(size: string | null | undefined): string[] {
  if (!size) return []
  const words = size.toLowerCase().match(/[a-z]+/g) ?? []
  return [...new Set(words.map(w => SIZE_CODE[w]).filter((c): c is string => Boolean(c)))]
}

/**
 * The species the picker offers: every note except a subrace its parent already
 * offers as a lineage (MYDND-30). Offering both would list every homebrew
 * subrace twice — once on its own and once through its parent — and only the
 * second carries the parent's traits too.
 *
 * The draft's current species is kept even when offered, so a character saved
 * before the exporter stamped `offered_by` still shows what it is.
 */
export function pickableSpecies<T extends Pick<SpeciesRow, 'id' | 'offeredBy'>>(
  rows: readonly T[],
  selectedId: string | null,
): T[] {
  return rows.filter(r => !r.offeredBy || r.id === selectedId)
}

/** A species note as a `content_race` row — what `speciesChoices` reads. */
export function raceData(row: SpeciesRow, fence: LineageFence | null) {
  const sizes = sizeCodes(row.size)
  return {
    id: row.id,
    name: row.name,
    source: row.source,
    data: {
      ...(fence ?? {}),
      ...(row.speed != null ? { speed: { walk: row.speed } } : {}),
      ...(sizes.length > 0 ? { size: sizes } : {}),
    },
  }
}

// --- Draft operations ---------------------------------------------------------

/**
 * Picking a species. Every per-species answer is cleared with it, as the web
 * builder does: a Drow's spellcasting ability means nothing to a Dwarf, and a
 * stale one would be invisible but still stored.
 */
export function withSpecies(draft: BuilderDraft, row: SpeciesRow | null): BuilderDraft {
  return {
    ...draft,
    race: row
      ? {
          id: row.id,
          name: row.name,
          source: row.source,
          subrace: null,
          size: null,
          spellcastingAbility: null,
          cantrip: null,
        }
      : null,
  }
}

export function withRaceChoice(draft: BuilderDraft, patch: Partial<DraftRace>): BuilderDraft {
  return draft.race ? { ...draft, race: { ...draft.race, ...patch } } : draft
}

/**
 * The level a class's subclass arrives at — **read from its own fence**, not
 * assumed to be 3.
 *
 * `builderDraft.withClassLevel` hard-codes 3, which is the 2024 rule for every
 * class. The vault also holds 2014 classes, where a Cleric's Divine Domain and a
 * Sorcerer's Origin come at 1 and a Wizard's Tradition at 2. The fence names the
 * feature after `data.subclassTitle` ("Divine Domain", "Fighter Subclass"), so
 * its level is the answer; a fence naming none falls back to 3.
 *
 * **The title is not always the choice.** Twelve homebrew classes (measured
 * 2026-10-08) carry `subclassTitle: Subclass Feature` — the name of the *later*
 * subclass features, at 6 — while their pick is "Alchemist Subclass" at 3.
 * Matching the title alone put the subclass three levels late for all twelve.
 * Two defences, each sufficient for those twelve on its own (the negative
 * control had to remove both to fail):
 *
 * - `<Class> Subclass`, the 2024 books' own name for the choice, is tried
 *   alongside the title, and the **earliest** match wins;
 * - a title ending in "feature" is not trusted at all, so a class shaped like
 *   those twelve but *without* a `<Class> Subclass` entry falls back to 3
 *   rather than landing on 6.
 */
export function subclassLevel(fence: ClassFence | null): number {
  const norm = (s: unknown) => String(s ?? '').trim().toLowerCase()
  const names = new Set<string>()
  const title = norm(fence?.data?.subclassTitle)
  if (title && !/\bfeatures?$/.test(title)) names.add(title)
  if (fence?.name) names.add(`${norm(baseClassName(fence.name))} subclass`)

  const levels = (fence?.features ?? [])
    .filter(f => names.has(norm(f?.name)) && typeof f?.level === 'number')
    .map(f => f.level)
  return levels.length > 0 ? Math.min(...levels) : 3
}

/**
 * Every `featureChoices` answer a class or subclass owns, dropped.
 *
 * A choice is keyed `<owner slug>:<level>:<feature>` (`bake.featureId`), so the
 * owner is its prefix. Swapping a subclass or removing a class would otherwise
 * leave its answers in the json — invisible in the builder, and still baked if
 * the same owner came back.
 */
function withoutChoicesOf(choices: Record<string, unknown>, ownerId: string | null | undefined) {
  if (!ownerId) return choices
  return Object.fromEntries(Object.entries(choices).filter(([key]) => !key.startsWith(`${ownerId}:`)))
}

/**
 * Picking a class at `index`. Resets what the class decides — see
 * `withClassSelected`: at index 0 that is every class-decided answer (the first
 * class sets saves, skills and the kit); beyond it, only that class's own.
 */
export function withClass(draft: BuilderDraft, source: ClassSource | null, index = 0): BuilderDraft {
  const before = draft.classes[index]
  const level = before?.level ?? 1
  const featureChoices = withoutChoicesOf(withoutChoicesOf(draft.featureChoices, before?.id), before?.subclass?.id)
  const cleared = { ...draft, featureChoices }
  if (!source) {
    const blank = blankDraft().classes[0] as DraftClass
    return { ...cleared, classes: draft.classes.map((c, i) => (i === index ? { ...blank, level } : c)) }
  }
  let next = withClassSelected(cleared, classData(source), index) as unknown as BuilderDraft
  // The kit is the first class's, so a new first class offers a different one.
  // `granted` is kept: it records what an earlier save already handed over.
  if (index === 0) next = { ...next, equipment: { ...draft.equipment, option: null, choices: {} } }
  return withLevel(next, level, source.fence, index)
}

/**
 * Setting a class's level, keeping the subclass when the level still allows it.
 *
 * `withClassLevel` drops the subclass below 3; that is wrong for a 2014 Cleric
 * at level 1, so the pick is restored whenever this class's own subclass level
 * says it is still legal — and cleared whenever it says it is not.
 */
export function withLevel(draft: BuilderDraft, level: number, fence: ClassFence | null, index = 0): BuilderDraft {
  const before = draft.classes[index]
  const next = withClassLevel(draft, Math.floor(level) || 1, index) as unknown as BuilderDraft
  const cls = next.classes[index]
  if (!cls) return next
  const subclass = cls.level >= subclassLevel(fence) ? (before?.subclass ?? null) : null
  const classes = next.classes.map((c, i) => (i === index ? { ...cls, subclass } : c))
  const featureChoices = subclass ? next.featureChoices : withoutChoicesOf(next.featureChoices, before?.subclass?.id)
  return { ...next, classes, featureChoices }
}

export function withSubclass(
  draft: BuilderDraft,
  sub: { id: string; name: string } | null,
  index = 0,
): BuilderDraft {
  const before = draft.classes[index]
  if (!before) return draft
  const picked = sub ? { id: sub.id, name: sub.name } : null
  const classes = draft.classes.map((c, i) => (i === index ? { ...c, subclass: picked } : c))
  const featureChoices =
    before.subclass?.id === sub?.id ? draft.featureChoices : withoutChoicesOf(draft.featureChoices, before.subclass?.id)
  return { ...draft, classes, featureChoices }
}

export function withFlexibleAbility(draft: BuilderDraft, ability: string | null, index = 0): BuilderDraft {
  if (!draft.classes[index]) return draft
  const classes = draft.classes.map((c, i) => (i === index ? { ...c, spellcastingAbility: ability || null } : c))
  return { ...draft, classes }
}

/** A blank class row appended — multiclassing. The caller then picks it with `withClass`. */
export function withExtraClass(draft: BuilderDraft): BuilderDraft {
  return withClassAdded(draft) as unknown as BuilderDraft
}

/** Removing a class beyond the first, and every answer it or its subclass owned. */
export function withoutClass(draft: BuilderDraft, index: number): BuilderDraft {
  const gone = draft.classes[index]
  const next = withClassRemoved(draft, index) as unknown as BuilderDraft
  if (next === draft || !gone) return next
  const featureChoices = withoutChoicesOf(withoutChoicesOf(next.featureChoices, gone.id), gone.subclass?.id)
  return { ...next, featureChoices }
}

export function totalLevelOf(draft: BuilderDraft): number {
  return draft.classes.reduce((sum, c) => sum + (c.level ?? 0), 0)
}

/**
 * Switching the ability method resets the scores to that method's start.
 *
 * Point buy starts at all 8s (0 of 27 spent); the standard array starts
 * *unassigned* (0), so "assign each value once" has something to check; manual
 * keeps whatever was there, because typing over numbers is its whole point.
 */
export function withAbilityMethod(draft: BuilderDraft, method: AbilityMethod): BuilderDraft {
  if (method === draft.abilityMethod) return draft
  const fill = (n: number) => Object.fromEntries(ABILITY_KEYS.map(k => [k, n])) as Record<AbilityKey, number>
  const abilityScores =
    method === 'pointbuy' ? fill(8) : method === 'standard' ? fill(0) : { ...draft.abilityScores }
  return { ...draft, abilityMethod: method, abilityScores }
}

export function withScore(draft: BuilderDraft, key: AbilityKey, score: number): BuilderDraft {
  return { ...draft, abilityScores: { ...draft.abilityScores, [key]: score } }
}

/**
 * The standard array's values a given ability may still take: its own, plus
 * any not yet assigned elsewhere. Each value is used exactly once.
 */
export function standardOptions(draft: BuilderDraft, key: AbilityKey): number[] {
  const taken = ABILITY_KEYS.filter(k => k !== key).map(k => draft.abilityScores[k])
  const pool = [...(STANDARD_ARRAY as number[])]
  for (const t of taken) {
    const i = pool.indexOf(t)
    if (i >= 0) pool.splice(i, 1)
  }
  return pool
}

export const MANUAL_MIN = 1
export const MANUAL_MAX = 20

/**
 * Picking or clearing the background's starting-equipment option (MYDND-174).
 *
 * When an option is chosen, any open category choice in it (Artisan's Tools,
 * Musical Instrument, Gaming Set) is pre-filled from `draft.backgroundTools` if
 * a chosen tool matches the category; when cleared, the background kit keys are
 * omitted so `equipment` stays `{ option, choices, granted }`.
 */
export function withBackgroundEquipmentOption(
  draft: BuilderDraft,
  key: string | null,
  option: EquipmentOption | null = null,
): BuilderDraft {
  const { backgroundOption: prev, backgroundChoices: prevChoices, ...rest } = draft.equipment
  if (key === null) return { ...draft, equipment: rest }
  const backgroundChoices =
    key === prev ? (prevChoices ?? {}) : defaultEquipmentChoices(option, draft.backgroundTools)
  return {
    ...draft,
    equipment: {
      ...rest,
      backgroundOption: key,
      backgroundChoices,
    },
  }
}

// --- Gating ---------------------------------------------------------------------

/** What the builder has loaded for the current choices. */
export interface StepContext {
  /** `raceData(...)` for the chosen species, or null when none / not loaded. */
  race: ReturnType<typeof raceData> | null
  /** The chosen class's fence, or null when none / not loaded. */
  classFence: ClassFence | null
  /** The chosen background's row. */
  background: BackgroundRow | null
  /** Every class's fence, by `draft.classes` index; `classFence` is `[0]` (MYDND-29). */
  classFences?: ReadonlyArray<ClassFence | null>
  /** The starting-equipment option the draft took, resolved — null for none. */
  equipmentOption?: EquipmentOption | null
  /** The background starting-equipment option the draft took, resolved — null for none (MYDND-174). */
  backgroundEquipmentOption?: EquipmentOption | null
}

/**
 * Why a step cannot be left, in words shown to the player.
 *
 * Prose rather than codes because the page prints it: a disabled Next with no
 * reason is the web builder's VAULT-170 lesson — the player who scrolled past
 * the unanswered control sees only a button that will not press.
 */
export function stepProblems(step: StepKey, draft: BuilderDraft, ctx: StepContext): string[] {
  switch (step) {
    case 'species': {
      const problems: string[] = []
      if (!draft.name.trim()) problems.push('Name the character')
      if (!draft.race) problems.push('Choose a species')
      else problems.push(...(speciesChoiceProblems(ctx.race, draft.race) as string[]))
      return problems
    }
    case 'class': {
      if (!draft.classes[0]?.id) return ['Choose a class']
      const problems: string[] = []
      draft.classes.forEach((cls, i) => {
        const which = draft.classes.length > 1 ? ` for ${cls.name ?? `class ${i + 1}`}` : ''
        if (!cls.id) {
          problems.push(`Choose class ${i + 1}, or remove it`)
          return
        }
        const fence = i === 0 ? ctx.classFence : (ctx.classFences?.[i] ?? null)
        if (fence?.spellcasting_ability === 'flexible' && !cls.spellcastingAbility) {
          problems.push(`Choose a spellcasting ability${which}`)
        }
      })
      if (totalLevelOf(draft) > 20) problems.push('The levels add up to more than 20')
      return problems
    }
    case 'equipment':
      // A kit with an unanswered "which holy symbol?" or "which gaming set?" must
      // not leave the step: the grant would silently skip it. Taking *no* kit is
      // allowed — a player may start with nothing and buy their own (the web
      // builder's rule).
      return optionChoicesComplete(ctx.equipmentOption ?? null, draft.equipment?.choices ?? {}) &&
        optionChoicesComplete(ctx.backgroundEquipmentOption ?? null, draft.equipment?.backgroundChoices ?? {})
        ? []
        : ['Choose every item the kit leaves open']
    // Feature choices, feats and spells are never a hard gate — an unanswered
    // one is listed on the step and on Review, as the web builder outlines it.
    // A character can be saved half-chosen and finished later in Edit.
    case 'features':
    case 'spells':
      return []
    case 'background': {
      const b = draft.backgroundBonuses ?? {}
      if (!draft.background) return []
      if (b.mode === 'three_ones') return []
      const problems: string[] = []
      if (!b.primary) problems.push('Choose the +2')
      if (!b.secondary) problems.push('Choose the +1')
      return problems
    }
    case 'abilities': {
      const scores = draft.abilityScores
      if (draft.abilityMethod === 'pointbuy') {
        const left = pointsRemaining(draft) as number
        if (left < 0) return [`${-left} point${left === -1 ? '' : 's'} over budget`]
        if (ABILITY_KEYS.some(k => scores[k] < 8 || scores[k] > 15)) return ['Point buy scores run from 8 to 15']
        return []
      }
      if (draft.abilityMethod === 'standard') {
        const assigned = ABILITY_KEYS.map(k => scores[k]).sort((a, b) => b - a)
        const expected = [...(STANDARD_ARRAY as number[])].sort((a, b) => b - a)
        return assigned.every((v, i) => v === expected[i]) ? [] : ['Assign each standard array value once']
      }
      return ABILITY_KEYS.some(k => !Number.isInteger(scores[k]) || scores[k] < MANUAL_MIN || scores[k] > MANUAL_MAX)
        ? [`Scores run from ${MANUAL_MIN} to ${MANUAL_MAX}`]
        : []
    }
    case 'review':
      return []
  }
}

/** Every step's problems at once — what Create is gated on. */
export function allProblems(draft: BuilderDraft, ctx: StepContext): string[] {
  return STEPS.flatMap(s => stepProblems(s.key, draft, ctx))
}

// --- Persisting ---------------------------------------------------------------

/**
 * The feats an invocation grants (MYDND-175): Lessons of the First Ones names an
 * Origin feat, which is held like any other, so it joins `feats` for the bake.
 */
function invocationFeats(draft: BuilderDraft) {
  return Object.values(draft.featureChoices).flatMap(answer => {
    const choice = answer as { type?: string; invocations?: unknown } | null
    if (choice?.type !== 'invocations' || !Array.isArray(choice.invocations)) return []
    return (choice.invocations as Array<{ target?: { kind?: string; id: string; name: string; source?: string | null } | null }>).flatMap(p =>
      p?.target?.kind === 'origin_feat' ? [{ id: p.target.id, name: p.target.name, source: p.target.source ?? null }] : [],
    )
  })
}

/** The first class's skill pick count (`data.skillChoices.count`), or null when it has none. */
function classPickCount(source: ClassSource | null | undefined): number | null {
  const choices = source?.fence?.data?.skillChoices as { count?: unknown } | undefined
  const count = Number(choices?.count)
  return Number.isFinite(count) && count > 0 ? count : null
}

/**
 * The json to save.
 *
 * `finalVaultJson` builds the character from the draft alone, so any key the
 * draft does not model would vanish on an edit — anything a later ticket adds,
 * or a hand-edit to the fence. In edit mode the original is therefore laid **under** the result: every key
 * the builder decides is the builder's, and every key it does not know about
 * survives the round trip untouched.
 */
export function toVaultJson(
  draft: BuilderDraft,
  { classSources, subclassFences = [], race, background = null, original }: {
    /** One per `draft.classes` entry, in order; null where none is picked or loaded. */
    classSources: ReadonlyArray<ClassSource | null>
    /**
     * Each class's chosen subclass fence, in the same order (MYDND-182). A class
     * that does not cast takes its subclass's ability from it — the Eldritch
     * Knight's Intelligence — and every reader of "is this a caster" reads that.
     */
    subclassFences?: ReadonlyArray<SubclassFence | null>
    race: ReturnType<typeof raceData> | null
    /** The chosen background's row; its skills are baked in (VAULT-244). */
    background?: BackgroundRow | null
    original?: VaultCharacterJson | null
  },
): VaultCharacterJson {
  const rows = classSources.map(s => (s ? classData(s) : null))
  // `finalVaultJson` writes `skillProficiencies` as the first class's picks,
  // then every feature's skill pick, then the background's. Re-opened, that
  // whole array comes back as the draft's class picks, so a background or a
  // feature pick changed since would leave the old skills on the character.
  // The Class step shows and edits only the first `count` of them, so only
  // those are the class's; the rest are rebuilt from the current answers.
  const count = classPickCount(classSources[0])
  // A class row with nothing picked saves no class entry at all, rather than a
  // nameless one at level 1 that every reader would have to step around — the
  // first class's, or an "Add class" row left blank.
  const shaped = {
    ...draft,
    classes: draft.classes.filter(c => c.id),
    ...(count === null ? {} : { skillProficiencies: draft.skillProficiencies.slice(0, count) }),
  }
  const catalogClasses = rows.filter((r): r is NonNullable<typeof r> => r !== null)
  const built = finalVaultJson(shaped, {
    classData: draft.classes[0]?.id ? rows[0] : null,
    catalogClasses,
    // `{ id, data }` is all `resolveClasses` reads of a subclass row. The JS
    // default `catalogSubclasses = []` types the key as `never[]`.
    catalogSubclasses: draft.classes.flatMap((c, i) => {
      const fence = subclassFences[i]
      return c.subclass && fence ? [{ id: c.subclass.id, data: fence.data }] : []
    }) as unknown as never[],
    raceData: race,
    // `backgroundSkills` reads only `data.skillProficiencies`, as `skillSourceMap`
    // does. The JS default `backgroundData = null` types the key as null alone.
    backgroundData: (background
      ? { data: { skillProficiencies: background.skillProficiencies } }
      : null) as unknown as null,
  }) as VaultCharacterJson
  // `finalVaultJson` leaves masteries out because the web app keeps them in a
  // `weapon_masteries` table. The plugin has no table; the json is the store.
  const json = {
    ...built,
    feats: [...(built.feats ?? []), ...invocationFeats(draft)],
    masteredWeapons: draft.masteredWeapons ?? [],
    // The same again for what `finalVaultJson` has no key for (MYDND-171).
    languages: (draft.languages ?? []).filter(Boolean),
    backgroundTools: [...new Set([...(background?.tools ?? []), ...(draft.backgroundTools ?? [])])],
  }
  return original ? { ...original, ...json } : json
}
