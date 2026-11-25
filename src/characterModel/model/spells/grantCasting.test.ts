import { describe, expect, it } from 'vitest'

import { grantCasting } from './grantCasting'

const abilities = [
  { label: 'INT', score: 10, mod: 0 },
  { label: 'WIS', score: 16, mod: 3 },
  { label: 'CHA', score: 8, mod: -1 },
]

describe('grantCasting (MYDND-274)', () => {
  it("gives a Fighter with Magic Initiate a DC and an attack, though no class casts", () => {
    expect(grantCasting({ abilities, proficiency_bonus: 2, spellcasting: null }, 'wis')).toEqual({ ability: 'WIS', mod: 3, attack: 5, dc: 13 })
  })

  it("casts off the grant's ability, not the class's", () => {
    // A Wizard (INT +0) whose Magic Initiate chose Wisdom.
    const spellcasting = { ability: 'INT', mod: 0, attack: 2, dc: 10 }
    expect(grantCasting({ abilities, proficiency_bonus: 2, spellcasting }, 'wis')).toEqual({ ability: 'WIS', mod: 3, attack: 5, dc: 13 })
  })

  it("keeps what the class's line adds beyond the score, such as an item's +1", () => {
    const spellcasting = { ability: 'INT', mod: 0, attack: 3, dc: 11 }
    expect(grantCasting({ abilities, proficiency_bonus: 2, spellcasting }, 'cha')).toEqual({ ability: 'CHA', mod: -1, attack: 2, dc: 10 })
  })

  it('answers null with no ability, so the spell casts off the class', () => {
    expect(grantCasting({ abilities, proficiency_bonus: 2, spellcasting: null }, null)).toBeNull()
    expect(grantCasting({ abilities, proficiency_bonus: 2, spellcasting: null }, 'str')).toBeNull()
  })
})
