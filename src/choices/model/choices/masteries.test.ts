import { describe, expect, it } from 'vitest'

import { masteryOf } from './masteries'

describe('a weapon mastery', () => {
  it('reads a mastery off the weapon fence, and none off a weapon without one', () => {
    expect(masteryOf({ mastery: 'Sap' })).toBe('Sap')
    expect(masteryOf({ mastery: '  ' })).toBeNull()
    expect(masteryOf(null)).toBeNull()
  })
})
