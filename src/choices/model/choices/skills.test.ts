import { describe, expect, it } from 'vitest'


import {
  blankDraft,
  stepProblems,
  toVaultJson,
  withExtraClass,
  withFeatureChoice,
  withSubclass,
  withoutClass,
  type StepContext,
} from '../draft'

import { multiclassSkillChoices, multiclassSkillKey } from './skills'

import { row, FIGHTER, ROGUE, pickClass } from './__fixtures__/classes'

describe('multiclassing', () => {
  it("stores a second class's skill under its own key, keeping the first class's picks", () => {
    let d = pickClass(blankDraft(), 0, 'fighter', FIGHTER, 3)
    d = { ...d, skillProficiencies: ['athletics', 'history'] }
    d = pickClass(withExtraClass(d), 1, 'rogue', ROGUE, 1)
    expect(multiclassSkillChoices(ROGUE)).toEqual({ count: 1, options: ['stealth', 'acrobatics'] })
    d = withFeatureChoice(d, multiclassSkillKey('rogue'), ['stealth'])

    const json = toVaultJson(d, {
      classSources: [
        { row: row('fighter', 'Fighter'), fence: FIGHTER },
        { row: row('rogue', 'Rogue'), fence: ROGUE },
      ],
      race: null,
    })
    expect(json.classes?.map(c => [c.id, c.level])).toEqual([
      ['fighter', 3],
      ['rogue', 1],
    ])
    expect(json.skillProficiencies).toEqual(['athletics', 'history', 'stealth'])
    // The first class sets the saves; a second class grants none.
    expect(json.saveProficiencies).toEqual([])
  })

  it('drops every answer a removed class owned, and nothing else', () => {
    let d = pickClass(blankDraft(), 0, 'fighter', FIGHTER, 1)
    d = withFeatureChoice(d, 'fighter:1:fighting-style', { type: 'feat', featId: 'archery' })
    d = pickClass(withExtraClass(d), 1, 'rogue', ROGUE, 1)
    d = withFeatureChoice(d, multiclassSkillKey('rogue'), ['stealth'])
    d = withFeatureChoice(d, 'rogue:1:expertise', { type: 'expertise', skills: ['stealth'] })
    const gone = withoutClass(d, 1)
    expect(gone.classes.map(c => c.id)).toEqual(['fighter'])
    expect(Object.keys(gone.featureChoices)).toEqual(['fighter:1:fighting-style'])
  })

  it("clears a swapped subclass's answers, and keeps them when the same one is re-picked", () => {
    let d = pickClass(blankDraft(), 0, 'fighter', FIGHTER, 3)
    d = withSubclass(d, { id: 'fighter-champion', name: 'Champion' })
    d = withFeatureChoice(d, 'fighter-champion:3:remarkable-athlete', ['athletics'])
    expect(Object.keys(withSubclass(d, { id: 'fighter-champion', name: 'Champion' }).featureChoices)).toHaveLength(1)
    expect(withSubclass(d, { id: 'fighter-battle-master', name: 'Battle Master' }).featureChoices).toEqual({})
  })

  it('holds the Class step on a blank added class, and on levels over 20', () => {
    const base = pickClass(blankDraft(), 0, 'fighter', FIGHTER, 15)
    const c: StepContext = { race: null, classFence: FIGHTER, background: null }
    expect(stepProblems('class', withExtraClass(base), c)).toEqual(['Choose class 2, or remove it'])
    const over = pickClass(withExtraClass(base), 1, 'rogue', ROGUE, 6)
    expect(stepProblems('class', over, c)).toEqual(['The levels add up to more than 20'])
    // A blank added row is not saved as a nameless class.
    const json = toVaultJson(withExtraClass(base), { classSources: [{ row: row('fighter', 'Fighter'), fence: FIGHTER }, null], race: null })
    expect(json.classes?.map(c2 => c2.id)).toEqual(['fighter'])
  })
})
