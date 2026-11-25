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

  it('adds the step once per `every` slot levels, rounding down (MYDND-233)', () => {
    // Level 1, every 2: +1d6 at slots 3, 5, 7 and 9, nothing extra at 2.
    expect([1, 2, 3, 4, 5, 9].map(rank => diceAtRank('1d6', '1d6', 1, rank, 2))).toEqual(['1d6', '1d6', '2d6', '2d6', '3d6', '5d6'])
    // Level 2, every 2: at 4, 6 and 8, as "for every two slot levels above 2nd" reads.
    expect([3, 4, 6, 8].map(rank => diceAtRank('1d8', '1d8', 2, rank, 2))).toEqual(['1d8', '2d8', '3d8', '4d8'])
    // Nonsense is 1, never a division by zero.
    expect(diceAtRank('1d6', '1d6', 1, 3, 0)).toBe('3d6')
  })
})

describe('cantripTier', () => {
  it('steps at character levels 5, 11 and 17', () => {
    expect([1, 4, 5, 10, 11, 16, 17, 20].map(cantripTier)).toEqual([0, 0, 1, 1, 2, 2, 3, 3])
  })
})
