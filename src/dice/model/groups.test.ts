import { describe, expect, it } from 'vitest'

import { atlasFormula, describeDice, isRollable, parseFormula } from './groups'

describe('parseFormula', () => {
  it('reads a modifier-only d20 roll', () => {
    expect(parseFormula('1d20+7')).toEqual({ dice: [{ count: 1, sides: 20, damageType: null }], modifier: 7 })
  })

  it('reads several dice terms and sums the constants', () => {
    expect(parseFormula('1d8+1d6+3+1')).toEqual({
      dice: [
        { count: 1, sides: 8, damageType: null },
        { count: 1, sides: 6, damageType: null },
      ],
      modifier: 4,
    })
  })

  it('treats a bare d6 as one die', () => {
    expect(parseFormula('d6').dice).toEqual([{ count: 1, sides: 6, damageType: null }])
  })

  it('reads a negative modifier', () => {
    expect(parseFormula('1d20-1').modifier).toBe(-1)
  })

  it('attaches a damage type to every term when one is given', () => {
    expect(parseFormula('2d6', 'fire').dice).toEqual([{ count: 2, sides: 6, damageType: 'fire' }])
  })

  it('skips a subtracted dice term rather than flipping its sign', () => {
    // The engine has no representation for a negative dice term, and rolling it
    // as positive would silently add what the formula subtracts.
    expect(parseFormula('1d8-1d4').dice).toEqual([{ count: 1, sides: 8, damageType: null }])
    expect(isRollable('1d8-1d4')).toBe(false)
  })
})

describe('isRollable', () => {
  it('accepts what it can read whole, in either order', () => {
    expect(isRollable('1d20+7')).toBe(true)
    expect(isRollable('+5+1d8')).toBe(true)
    expect(isRollable('7d6')).toBe(true)
  })

  it('refuses a formula with no dice', () => {
    expect(isRollable('+7')).toBe(false)
    expect(isRollable('')).toBe(false)
  })

  it('refuses one it would only partly read', () => {
    // A partial parse looks exactly like a complete one from the outside, which
    // is why this compares a reconstruction rather than trusting the terms.
    expect(isRollable('1d20 + proficiency')).toBe(false)
    expect(isRollable('2d6 fire')).toBe(false)
    expect(isRollable('1d12*2')).toBe(false)
  })

  it('refuses keep-highest notation, which Atlas would sum', () => {
    expect(isRollable('2d20kh1')).toBe(false)
  })
})

describe('atlasFormula', () => {
  it('writes the groups and the modifier, so Atlas shows the total (MYDND-75)', () => {
    expect(atlasFormula([{ qty: 1, sides: 20 }], 15)).toBe('1d20+15')
    expect(atlasFormula([{ qty: 2, sides: 6 }], -1)).toBe('2d6-1')
    expect(atlasFormula([{ qty: 1, sides: 8 }, { qty: 2, sides: 6 }], 3)).toBe('1d8+2d6+3')
  })

  it('writes dice only when there is no modifier', () => {
    expect(atlasFormula([{ qty: 3, sides: 6 }])).toBe('3d6')
  })
})

describe('describeDice', () => {
  it('writes the engine groups back as a formula', () => {
    expect(describeDice([{ count: 1, sides: 20 }], 7)).toBe('1d20+7')
    expect(describeDice([{ count: 1, sides: 20 }], -1)).toBe('1d20-1')
    expect(describeDice([{ count: 2, sides: 6 }], 0)).toBe('2d6')
  })
})
