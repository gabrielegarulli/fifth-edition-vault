import { describe, expect, it } from 'vitest'

import { blankDraft, type BuilderDraft, type DraftClass } from '../draft'

import {
  classPickedTools,
  classToolChoiceLabel,
  classToolOpenChoices,
  classToolOptions,
  classToolSlotsOf,
  toolsHeldBesides,
  withClassToolPick,
} from './classTools'
import { openChoicesOf } from './completeness'

// MYDND-280: a class's tool choices, asked on the Class step.

const fence = (starting: string[], multi: string[] = []) => ({
  data: { startingProficiencies: { tools: starting }, multiclassProficiencies: { tools: multi } },
})
const BARD = fence(['Choose three Musical Instruments'], ['Choose one Musical Instrument'])
const MONK = fence(["Choose one type of Artisan's Tools or Musical Instrument"])
const ROGUE = fence(["Thieves' Tools"], ["Thieves' Tools"])

const cls = (id: string, name: string, toolPicks?: string[]): DraftClass => ({
  id,
  name,
  source: null,
  level: 1,
  subclass: null,
  spellcastingAbility: null,
  ...(toolPicks ? { toolPicks } : {}),
})
const draftOf = (...classes: DraftClass[]): BuilderDraft => ({ ...blankDraft(), classes })

describe('withClassToolPick', () => {
  it('fills a slot and stores the picks on the class, without holes', () => {
    let d = draftOf(cls('bard', 'Bard'))
    d = withClassToolPick(d, BARD, 0, 1, 'lute')
    expect(d.classes[0]?.toolPicks).toEqual(['lute'])
    // Stored compact, the pick moves to the first slot; a second pick fills the next.
    d = withClassToolPick(d, BARD, 0, 1, 'drum')
    expect(classToolSlotsOf(d, BARD, 0).map(s => s.pick)).toEqual(['lute', 'drum', ''])
  })

  it('clears a slot with a blank, and ignores a slot the class does not have', () => {
    const d = draftOf(cls('bard', 'Bard', ['lute', 'drum']))
    expect(withClassToolPick(d, BARD, 0, 0, '').classes[0]?.toolPicks).toEqual(['drum'])
    expect(withClassToolPick(d, BARD, 0, 5, 'horn')).toBe(d)
  })
})

describe('classToolOptions', () => {
  it('groups a two-kind choice by kind, and marks a tool held elsewhere as taken', () => {
    const [monk] = classToolSlotsOf(draftOf(cls('monk', 'Monk')), MONK, 0)
    expect(monk).toEqual({ choice: 0, pick: '' })
    const options = classToolOptions({ categories: ['artisan', 'instrument'], count: 1 }, { lute: 'Entertainer' }, '')
    expect(new Set(options.map(o => o.group))).toEqual(new Set(["Artisan's tools", 'Musical instrument']))
    expect(options).toHaveLength(27)
    expect(options.find(o => o.value === 'lute')).toMatchObject({ label: 'Lute (Entertainer)', disabled: true })
    // Kept selectable while it is this slot's pick, so the select shows it.
    expect(classToolOptions({ categories: ['instrument'], count: 1 }, { lute: 'Entertainer' }, 'lute').find(o => o.value === 'lute')?.disabled).toBe(false)
  })

  it('labels the choice by its kinds', () => {
    expect(classToolChoiceLabel({ categories: ['artisan', 'instrument'], count: 1 })).toBe("Artisan's tools or musical instrument")
  })
})

describe('Proficiency Overlap for class tool picks', () => {
  it("holds the background's tools and every other class's, and not the class's own picks", () => {
    const d = { ...draftOf(cls('rogue', 'Rogue'), cls('bard', 'Bard', ['lute'])), backgroundTools: ['dice-set'] }
    const held = toolsHeldBesides(d, [ROGUE, BARD], 1, { name: 'Soldier', tools: [] })
    expect(held).toEqual({ 'dice-set': 'Soldier', 'thieves-tools': 'Rogue' })
    expect(toolsHeldBesides(d, [ROGUE, BARD], 0, null)).toMatchObject({ lute: 'Bard' })
    expect(classPickedTools(d, [ROGUE, BARD])).toEqual(['lute'])
  })

  it('flags a pick that a background tool doubles', () => {
    const d = draftOf(cls('monk', 'Monk', ['lute']))
    expect(classToolOpenChoices(d, [MONK], { name: 'Entertainer', tools: ['lute'] })).toEqual([
      'Lute also comes from Entertainer: choose a different tool.',
    ])
    expect(classToolOpenChoices(d, [MONK], { name: 'Sage', tools: [] })).toEqual([])
  })
})

describe('the open choices', () => {
  const open = (draft: BuilderDraft, fences: ReadonlyArray<{ data?: unknown } | null>) =>
    openChoicesOf({ items: [], draft: { ...draft, abilityMethod: 'manual', languages: ['Dwarvish', 'Elvish'] }, feats: [], masteryCount: 0, invocationCount: () => 0, casters: [], fences: fences as never })
      .filter(o => o.text.includes('tool'))

  it('asks on the Class step until every pick is made', () => {
    expect(open(draftOf(cls('bard', 'Bard', ['lute'])), [BARD])).toEqual([{ text: 'Bard tool proficiencies', step: 'class' }])
    expect(open(draftOf(cls('bard', 'Bard', ['lute', 'drum', 'flute'])), [BARD])).toEqual([])
    // A class with only named tools asks nothing.
    expect(open(draftOf(cls('rogue', 'Rogue')), [ROGUE])).toEqual([])
  })
})
