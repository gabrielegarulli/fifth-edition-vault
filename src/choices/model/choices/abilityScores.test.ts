import { describe, expect, it } from 'vitest'

import { blankDraft, type BuilderDraft } from '../draft'

import { scoreOverCapText, scoresOverCap } from './abilityScores'
import type { FeatData } from './types'

describe('an increase a score cannot take (MYDND-155, MYDND-181)', () => {
  const scored = (over: Partial<BuilderDraft>): BuilderDraft => ({
    ...blankDraft(),
    abilityScores: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 19 },
    ...over,
  })
  const asi = { type: 'score', first: 'cha', second: 'cha' }
  const feat = (id: string, kind: string, max: number): FeatData => ({
    id,
    name: id,
    source: 'XPHB',
    kind,
    data: { benefits: [{ effects: [{ type: 'ability_score_choice', options: ['cha', 'str'], amount: 3, max }] }] },
  })

  it('holds the score at 20 and says what was lost, from whichever step set the base', () => {
    expect(scoresOverCap(scored({ featureChoices: { a: asi } }), [])).toEqual([{ ability: 'cha', score: 20, lost: 1 }])
    expect(scoreOverCapText({ ability: 'cha', score: 20, lost: 1 })).toBe('Charisma stops at 20: 1 point of increase is lost')
    expect(scoreOverCapText({ ability: 'cha', score: 20, lost: 4 })).toBe('Charisma stops at 20: 4 points of increase are lost')
  })

  it('stays quiet at exactly 20, and while the base is unassigned', () => {
    const exact = scored({ abilityScores: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 18 }, featureChoices: { a: asi } })
    expect(scoresOverCap(exact, [])).toEqual([])
    expect(scoresOverCap({ ...blankDraft(), featureChoices: { a: asi } }, [])).toEqual([])
  })

  it('counts a background increase and a half-feat toward the 20', () => {
    const draft = scored({
      backgroundBonuses: { primary: 'cha', secondary: 'wis' },
      featureChoices: { a: { type: 'feat', featId: 'half', abilityBonus: 'cha' } },
    })
    expect(scoresOverCap(draft, [feat('half', 'general', 20)])).toEqual([{ ability: 'cha', score: 20, lost: 4 }])
  })

  it('lets an Epic Boon pass 20, as a boon or as a feat added on the sheet', () => {
    const boon = feat('boon-of-fate', 'epic_boon', 30)
    const picked = { featId: 'boon-of-fate', abilityBonus: 'cha' }
    const base = { abilityScores: { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 20 } }
    expect(scoresOverCap(scored({ ...base, featureChoices: { a: { type: 'boon', ...picked } } }), [boon])).toEqual([])
    expect(scoresOverCap(scored({ ...base, featureChoices: { feat_boon: { type: 'feat', ...picked } } }), [boon])).toEqual([])
  })

  it('still warns when a boon sits beside an ASI that lost a point to 20 by itself', () => {
    // The ASI is held to 20 first; the boon's +3 then goes on to its own 30.
    const draft = scored({ featureChoices: { a: asi, b: { type: 'boon', featId: 'boon-of-fate', abilityBonus: 'cha' } } })
    expect(scoresOverCap(draft, [feat('boon-of-fate', 'epic_boon', 30)])).toEqual([{ ability: 'cha', score: 23, lost: 1 }])
  })

  it('leaves a base over 20 alone: a converted character arrives with its finals', () => {
    const draft = scored({ abilityScores: { str: 8, dex: 8, con: 22, int: 8, wis: 8, cha: 8 } })
    expect(scoresOverCap(draft, [])).toEqual([])
  })
})
