import { describe, expect, it } from 'vitest'

import { blankDraft, type BuilderDraft } from '../draft'

import { openChoicesOf } from './completeness'
import { toolChoiceComplete, toolPicksIn, withLanguagePick, withToolPick } from './languagesAndTools'

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
