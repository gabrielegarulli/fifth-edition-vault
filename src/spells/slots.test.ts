import { combinedSlotMax } from '@vault/derive/casterProgression.js'
import { describe, expect, it } from 'vitest'

import { DDB_CLASS_PROGRESSION, slotMapFor, slotMapForClassNames, slotMapForDdbClasses } from './slots'

describe('DDB_CLASS_PROGRESSION (MYDND-139)', () => {
  // A copy of `casterProgression.js`'s unexported map. If upstream changes a
  // class's progression, this is where the copy finds out.
  it("agrees with combinedSlotMax for every class it names, at every level", () => {
    for (const [name, progression] of Object.entries(DDB_CLASS_PROGRESSION)) {
      for (let level = 1; level <= 20; level++) {
        expect(slotMapFor([{ name, level, progression }]), `${name} ${level}`).toEqual(
          slotMapForClassNames([{ name, level }]),
        )
      }
    }
  })

  it('names every class combinedSlotMax gives slots to', () => {
    // A class upstream added and this copy lacks would cast with no slots
    // whenever a third caster stood beside it.
    for (const name of ['Wizard', 'Cleric', 'Druid', 'Bard', 'Sorcerer', 'Paladin', 'Ranger', 'Artificer', 'Warlock', 'Fighter', 'Rogue', 'Monk', 'Barbarian']) {
      const has = Object.keys(combinedSlotMax([{ name, level: 20 }])).length > 0
      expect(name.toLowerCase() in DDB_CLASS_PROGRESSION, name).toBe(has)
    }
  })
})

describe('slotMapForDdbClasses', () => {
  it('is slotMapForClassNames when no subclass casts', () => {
    const classes = [
      { name: 'Paladin', level: 6 },
      { name: 'Sorcerer', level: 5 },
      { name: 'Warlock', level: 2 },
    ]
    expect(slotMapForDdbClasses(classes)).toEqual(slotMapForClassNames(classes))
  })

  it('puts a lone third caster on its own table', () => {
    expect(slotMapForDdbClasses([{ name: 'Rogue', level: 3, subclassCasts: true }])).toEqual({ '1': 2 })
    expect(slotMapForDdbClasses([{ name: 'Fighter', level: 19, subclassCasts: true }])).toEqual({ '1': 4, '2': 3, '3': 3, '4': 1 })
  })

  it('counts a third of its levels in a multiclass, beside a Warlock’s pact slots', () => {
    // Fighter 6 (EK) + Wizard 3: 3 + 2 = 5 → full-caster 5. Warlock 2's pact slots on top.
    expect(
      slotMapForDdbClasses([
        { name: 'Fighter', level: 6, subclassCasts: true },
        { name: 'Wizard', level: 3 },
        { name: 'Warlock', level: 2 },
      ]),
    ).toEqual({ '1': 6, '2': 3, '3': 2 })
  })
})
