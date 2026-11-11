import { describe, expect, it } from 'vitest'

import { priorityFit } from './priorityFit'

describe('priorityFit (MYDND-122)', () => {
  it('shows every item, and no More, when the whole row fits', () => {
    // 3 × 80 + 2 × 4 = 248
    expect(priorityFit([80, 80, 80], 60, 248, 4)).toBe(3)
  })

  it('leaves room for More once the row does not fit', () => {
    // More 60, then 80 + 4 each: 144, 228, 312 > 300.
    expect(priorityFit([80, 80, 80, 80], 60, 300, 4)).toBe(2)
  })

  it('sends the last item under More when the whole row is a pixel too wide', () => {
    // The whole row is 332. Three and More are 60 + 3 × 84 = 312.
    expect(priorityFit([80, 80, 80, 80], 60, 331, 4)).toBe(3)
  })

  it('can put everything under More', () => {
    expect(priorityFit([80, 80], 60, 100, 4)).toBe(0)
  })

  it('shows everything before the row has been measured', () => {
    expect(priorityFit([80, 80, 80], 60, 0, 4)).toBe(3)
  })
})
