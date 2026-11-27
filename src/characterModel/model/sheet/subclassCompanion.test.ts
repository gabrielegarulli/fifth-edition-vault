import { describe, expect, it } from 'vitest'

import type { Sheet } from './sheet'
import { subclassCompanions, subclassCompanionView, summonerOf } from './subclassCompanion'

const sheet = (over: Partial<Sheet>): Sheet =>
  ({ hit_dice: [], subclasses: [], abilities: [], proficiency_bonus: 2, spellcasting: null, ...over }) as Sheet

// MYDND-284.
describe('subclassCompanions', () => {
  it('finds each subclass that summons one, at its class level', () => {
    const s = sheet({
      hit_dice: [
        { label: 'Ranger', formula: '5d10' },
        { label: 'Druid', formula: '2d8' },
      ],
      subclasses: ['Drakewarden', 'Circle of Wildfire', 'Hunter'],
    })
    expect(subclassCompanions(s).map(c => [c.featureId, c.level, c.monsters])).toEqual([
      ['subclass:drakewarden', 5, ['drake-companion']],
      ['subclass:circle-of-wildfire', 2, ['wildfire-spirit']],
    ])
  })

  it('needs a level in the class: a subclass name alone summons nothing', () => {
    expect(subclassCompanions(sheet({ subclasses: ['Battle Smith'] }))).toEqual([])
  })

  it("reads a Beast Master's stat block off its Primal Companion pick, or D&D Beyond's", () => {
    const ranger = sheet({ hit_dice: [{ label: 'Ranger', formula: '3d10' }], subclasses: ['Beast Master'] })
    const json = { featureChoices: { x: { type: 'feature_option', optionName: 'Beast of the Sea' } } }
    expect(subclassCompanions(ranger, json)[0]?.picked).toBe('beast-of-the-sea')
    const ddb = { ...ranger, feature_picks: [{ class: 'Ranger', feature: 'Primal Companion', level: 3, picks: ['Beast of the Sky'] }] }
    expect(subclassCompanions(ddb)[0]?.picked).toBe('beast-of-the-sky')
    expect(subclassCompanions(ranger)[0]?.picked).toBeNull()
  })
})

describe('subclassCompanionView', () => {
  it("works the Drake Companion's block out for the summoner", () => {
    const s = summonerOf(sheet({ proficiency_bonus: 3 }), 7)
    const view = subclassCompanionView(
      {
        ac: '14 + PB (natural armor)',
        hp: '5 + five times your ranger level (the drake has a number of Hit Dice [d10s] equal to your ranger level)',
        stats: [16, 12, 15, 8, 14, 8],
        actions: [{ name: 'Bite', desc: '*Melee Weapon Attack:* +3 plus PB to hit, reach 5 ft., one target. *Hit:* 1d6 plus PB piercing damage.' }],
      },
      s,
    )
    expect(view).toMatchObject({
      ac: 17,
      maxHp: 40,
      hitDice: { total: 7, die: 10 },
      checkBonus: 0,
      attacks: [{ name: 'Bite', toHit: 6, damage: '1d6 + 3' }],
    })
  })

  it('answers unknown, not zero, for a note it has not read yet', () => {
    expect(subclassCompanionView(null, summonerOf(sheet({}), 3))).toMatchObject({ ac: null, maxHp: null, attacks: [] })
  })
})
