import { describe, expect, it } from 'vitest'

import { afterFreeCasting, freeCastingRank } from './freeCasting'

const boon = { feats: ['Boon of Spell Recall'] }

describe('Boon of Spell Recall: Free Casting (MYDND-274)', () => {
  it('asks for the 1d4 on a level 1 to 4 slot, for a character with the boon', () => {
    expect(freeCastingRank(boon, { slot: { rank: 3, max: 3 } })).toBe(3)
    expect(freeCastingRank(boon, { slot: { rank: 5, max: 2 } })).toBeNull()
    expect(freeCastingRank(boon, { use: { key: 'x', max: 1 } })).toBeNull()
    expect(freeCastingRank({ feats: ['Alert'] }, { slot: { rank: 1, max: 4 } })).toBeNull()
  })

  it("keeps the slot when the die matches the slot's level, and nothing else changes", () => {
    const cost = { slot: { rank: 2, max: 3 }, concentration: 'Hold Person' }
    expect(afterFreeCasting(cost, 2)).toEqual({ concentration: 'Hold Person' })
    expect(afterFreeCasting(cost, 3)).toBe(cost)
    expect(afterFreeCasting(cost, null)).toBe(cost)
  })
})
