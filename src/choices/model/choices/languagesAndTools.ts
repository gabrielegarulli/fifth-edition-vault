import type { ProficiencyChoice } from '@vault/derive/speciesChoices.js'
import { TOOL_SLUGS, toolName, toolSlugsIn } from '@vault/derive/tools.js'

import { ALL_SKILLS, SKILL_NAME } from './skills'

import type { ToolChoice } from '../../../compendium'
import type { BuilderDraft } from '../draft'

// Languages and background tools (MYDND-171).
// One module of the builder's choices (MYDND-197); index.ts says what the folder is.

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

export const toolSlugsOf = (category: ToolChoice['category']): string[] => toolSlugsIn(category)

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

// --- A species' proficiency choices (MYDND-243) ---------------------------------

/**
 * The SRD's Rare Languages table, less Druidic and Thieves' Cant: those two are
 * a class's secret, never a language a species may choose.
 */
export const RARE_LANGUAGES = [
  'Abyssal',
  'Celestial',
  'Deep Speech',
  'Infernal',
  'Primordial',
  'Sylvan',
  'Undercommon',
] as const

export interface ProficiencyOption {
  value: string
  label: string
}

/**
 * What one species proficiency choice offers: its own list where it has one,
 * else every option of its kind, narrowed by its category (`artisan` tools,
 * `standard` languages). A weapon is any weapon note the vault has, by name.
 */
export function speciesProficiencyOptions(
  choice: ProficiencyChoice,
  { weaponNames = [] }: { weaponNames?: readonly string[] } = {},
): ProficiencyOption[] {
  switch (choice.kind) {
    case 'skill':
      return (choice.from ?? ALL_SKILLS).map(s => ({ value: s, label: SKILL_NAME[s] ?? s }))
    case 'tool': {
      const slugs = choice.from ?? (choice.category ? toolSlugsIn(choice.category) : [...TOOL_SLUGS])
      return slugs.map(t => ({ value: t, label: toolName(t) ?? t })).sort((a, b) => a.label.localeCompare(b.label))
    }
    case 'language': {
      const names = choice.from ?? [
        ...STANDARD_LANGUAGES,
        ...(choice.category === 'standard' ? [] : RARE_LANGUAGES),
      ]
      return names.map(l => ({ value: l, label: l }))
    }
    case 'weapon':
      return (choice.from ?? weaponNames).map(w => ({ value: w, label: w }))
  }
}
