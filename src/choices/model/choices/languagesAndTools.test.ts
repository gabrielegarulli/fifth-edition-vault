import { describe, expect, it } from 'vitest'

import { blankDraft, type BuilderDraft } from '../draft'

import { openChoicesOf } from './completeness'
import { speciesProficiencyOptions, STANDARD_LANGUAGES, toolChoiceComplete, toolPicksIn, withLanguagePick, withToolPick } from './languagesAndTools'

describe('languages and background tools (MYDND-171)', () => {
  const open = (draft: BuilderDraft, toolChoices: Array<{ category: 'gaming'; count: number }> = []) =>
    // Manual, so these are not also about the points left on Abilities.
    openChoicesOf({ items: [], draft: { ...draft, abilityMethod: 'manual' }, feats: [], masteryCount: 0, invocationCount: () => 1, casters: [], background: { toolChoices } })

  it('leaves languages open on Background until both are picked', () => {
    expect(open(blankDraft())).toEqual([{ text: 'Languages', step: 'background' }])
    expect(open(withLanguagePick(blankDraft(), 0, 'Dwarvish'))).toEqual([{ text: 'Languages', step: 'background' }])
    expect(open(withLanguagePick(withLanguagePick(blankDraft(), 0, 'Dwarvish'), 1, 'Giant'))).toEqual([])
  })

  it('keeps each language in its own slot, so the second can be picked first', () => {
    expect(withLanguagePick(blankDraft(), 1, 'Giant').languages).toEqual(['', 'Giant'])
  })

  it('leaves a background tool choice open until it is answered', () => {
    const draft = { ...blankDraft(), languages: ['Dwarvish', 'Giant'] }
    expect(open(draft, [{ category: 'gaming', count: 1 }])).toEqual([{ text: 'Gaming set', step: 'background' }])
    const picked = withToolPick(draft, 'gaming', 0, 'playing-cards')
    expect(toolChoiceComplete(picked, { category: 'gaming', count: 1 })).toBe(true)
    expect(open(picked, [{ category: 'gaming', count: 1 }])).toEqual([])
  })

  it('swaps a pick and keeps the tools of another kind', () => {
    const draft = { ...blankDraft(), backgroundTools: ['calligraphers-supplies', 'playing-cards'] }
    const next = withToolPick(draft, 'gaming', 0, 'dice-set')
    expect(toolPicksIn(next, 'gaming')).toEqual(['dice-set'])
    expect(next.backgroundTools).toContain('calligraphers-supplies')
  })
})

// MYDND-243: what a species' proficiency choice offers.
describe('speciesProficiencyOptions', () => {
  const choice = (kind: 'skill' | 'tool' | 'language' | 'weapon', extra: { from?: string[]; category?: string } = {}) => ({
    kind, key: kind, count: 1, from: extra.from ?? null, category: extra.category ?? null,
  })

  it('offers its own list by name, else every skill', () => {
    expect(speciesProficiencyOptions(choice('skill', { from: ['sleight_of_hand', 'stealth'] }))).toEqual([
      { value: 'sleight_of_hand', label: 'Sleight of Hand' },
      { value: 'stealth', label: 'Stealth' },
    ])
    expect(speciesProficiencyOptions(choice('skill'))).toHaveLength(18)
  })

  it("narrows a tool by its category, and names it as the sheet does", () => {
    const artisan = speciesProficiencyOptions(choice('tool', { category: 'artisan' }))
    expect(artisan).toHaveLength(17)
    expect(artisan).toContainEqual({ value: 'smiths-tools', label: "Smith's tools" })
    expect(speciesProficiencyOptions(choice('tool')).length).toBeGreaterThan(artisan.length)
  })

  it('offers standard languages, and the rare ones unless narrowed', () => {
    const standard = speciesProficiencyOptions(choice('language', { category: 'standard' })).map(o => o.value)
    expect(standard).toEqual([...STANDARD_LANGUAGES])
    const any = speciesProficiencyOptions(choice('language')).map(o => o.value)
    expect(any).toContain('Undercommon')
    expect(any).not.toContain("Thieves' Cant")
    expect(any).not.toContain('Common')
  })

  it("offers the vault's weapons by name", () => {
    expect(speciesProficiencyOptions(choice('weapon'), { weaponNames: ['Dagger', 'Longsword'] }).map(o => o.label)).toEqual(['Dagger', 'Longsword'])
    expect(speciesProficiencyOptions(choice('weapon'))).toEqual([])
  })
})
