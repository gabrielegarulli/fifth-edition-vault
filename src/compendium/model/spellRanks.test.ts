import { describe, expect, it } from 'vitest'

import { cantripTier, diceAtRank } from './spellRanks'

describe('diceAtRank (MYDND-49)', () => {
  it('adds a same-sized step per rank above the spell, keeping a flat bonus', () => {
    expect(diceAtRank('8d6', '1d6', 3, 3)).toBe('8d6')
    expect(diceAtRank('8d6', '1d6', 3, 5)).toBe('10d6')
    expect(diceAtRank('2d8', '2d8', 1, 3)).toBe('6d8')
    expect(diceAtRank('1d4+1', null, 1, 4)).toBe('1d4+1')
  })

  it('appends a step of another die rather than pretending it is the same', () => {
    expect(diceAtRank('3d8', '1d6', 1, 3)).toBe('3d8+2d6')
  })
})

describe('cantripTier', () => {
  it('steps at character levels 5, 11 and 17', () => {
    expect([1, 4, 5, 10, 11, 16, 17, 20].map(cantripTier)).toEqual([0, 0, 1, 1, 2, 2, 3, 3])
  })
})
