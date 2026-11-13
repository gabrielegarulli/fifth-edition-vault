import { describe, expect, it } from 'vitest'

import { fightingStyleOptions } from '@vault/derive/fightingStyles.js'

import { blankDraft } from '../draft'

import { fightingStyleFeats, isAsiFeat, spellListsTaken, originFeatComplete } from './feats'

describe('spellListsTaken', () => {
  const held = (spellList: string) => ({ spellList })
  const draft = {
    ...blankDraft(),
    originFeat: { id: 'magic-initiate', name: 'Magic Initiate', source: null, choices: held('Cleric') },
    featureChoices: {
      asi: { type: 'feat', featId: 'magic-initiate', choices: held('Wizard') },
      inv: { type: 'invocations', invocations: [{ name: 'Pact of the Blade' }, { name: 'Lessons', choices: held('Druid') }] },
    },
  }

  it('gathers every copy of the feat but the one asking', () => {
    expect(spellListsTaken(draft, 'nobody').sort()).toEqual(['Cleric', 'Druid', 'Wizard'])
    expect(spellListsTaken(draft, 'origin').sort()).toEqual(['Druid', 'Wizard'])
    expect(spellListsTaken(draft, 'asi').sort()).toEqual(['Cleric', 'Druid'])
    expect(spellListsTaken(draft, 'inv#1').sort()).toEqual(['Cleric', 'Wizard'])
  })
})

describe('the origin feat', () => {
  it("knows when the origin feat's own questions are answered", () => {
    expect(originFeatComplete(null)).toBe(true)
    expect(originFeatComplete({ id: 'tough', name: 'Tough', source: null, choices: null })).toBe(true)
    const mi = { id: 'mi', name: 'Magic Initiate', source: null }
    expect(originFeatComplete({ ...mi, choices: { spellList: 'Cleric', ability: 'wis', cantrips: [null, null], spells: [null] } })).toBe(false)
    const pick = { spellId: 'x', spellName: 'X' }
    expect(
      originFeatComplete({
        ...mi,
        choices: { spellList: 'Cleric', ability: 'wis', cantrips: [pick, { ...pick, spellId: 'y' }], spells: [pick] },
      }),
    ).toBe(true)
  })
})

describe('replacement fighting styles (MYDND-31)', () => {
  const feats = [
    { id: 'archery', name: 'Archery', prerequisiteClass: null, kind: 'fighting_style', tags: [] },
    { id: 'blessed-warrior', name: 'Blessed Warrior', prerequisiteClass: 'Paladin', kind: 'fighting_style', tags: ['replacement'] },
    { id: 'druidic-warrior', name: 'Druidic Warrior', prerequisiteClass: 'Ranger', kind: 'fighting_style', tags: ['replacement'] },
  ]
  const ids = (className: string) => (fightingStyleOptions(fightingStyleFeats(feats), className) as Array<{ id: string }>).map(f => f.id)

  it("offers each class its own replacement and no one else's", () => {
    expect(ids('Paladin')).toEqual(['archery', 'blessed-warrior'])
    expect(ids('Ranger')).toEqual(['archery', 'druidic-warrior'])
    expect(ids('Fighter')).toEqual(['archery'])
  })
})

describe('the ASI feat (MYDND-155)', () => {
  it('is the note that models nothing, and only that one', () => {
    expect(isAsiFeat({ name: 'Ability Score Improvement' })).toBe(true)
    expect(isAsiFeat({ name: 'Boon of Fate' })).toBe(false)
  })
})
