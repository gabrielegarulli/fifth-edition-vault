import { describe, expect, it } from 'vitest'

import { companionView } from '../../characterModel/model/sheet/companion'
import {
  armorOptions,
  freePicks,
  improvementDefs,
  improvementSlots,
  improvementsComplete,
  pickComplete,
  slotOptions,
  slottedOf,
  storedImprovements,
  throatCap,
  type ImprovementPick,
} from './companion'

// The shape `export:monsters` writes on `bestiary/dragonling.md` (MYDND-126),
// trimmed: two of the six universal rows, and the bespoke tree's first rungs.
const FENCE = {
  improvements: [
    { slug: 'dragonling-growth-i', name: 'Growth I', kind: 'bespoke', level: 1, free: true, description: 'Grows.' },
    { slug: 'dragonling-harden-i', name: 'Harden I', kind: 'bespoke', level: 3, description: '+2 AC.' },
    { slug: 'dragonling-multiattack', name: 'Multiattack', kind: 'bespoke', level: 5, description: 'Two bites.' },
    { slug: 'dragonling-growth-ii', name: 'Growth II', kind: 'bespoke', level: 5, requires: ['dragonling-growth-i'], description: 'Grows again.' },
    { slug: 'dragonling-harden-ii', name: 'Harden II', kind: 'bespoke', level: 9, requires: ['dragonling-harden-i'], description: '+2 AC more.' },
    { slug: 'go-for-the-throat', name: 'Go For the Throat', kind: 'universal', level: 2, repeatable: true, description: '+1.' },
    { slug: 'ability-boost', name: 'Ability Boost', kind: 'universal', level: 2, repeatable: true, description: '+1 score.' },
    { slug: 'war-training', name: 'War Training', kind: 'universal', level: 2, repeatable: true, description: 'Armour.' },
    { slug: 'speed-training', name: 'Speed Training', kind: 'universal', level: 2, repeatable: true, description: '+15 ft.' },
    { name: 'No slug — dropped' },
  ],
}
const DEFS = improvementDefs(FENCE)
const slugs = (list: Array<{ slug: string }>) => list.map(d => d.slug)
const pick = (slug: string, target?: ImprovementPick['target']): ImprovementPick => {
  const d = DEFS.find(x => x.slug === slug)!
  return { slug, name: d.name, kind: d.kind, ...(target !== undefined ? { target } : {}) }
}

describe('improvementDefs', () => {
  it('reads every entry with a slug and a name, and coerces the rest', () => {
    expect(DEFS).toHaveLength(9)
    expect(DEFS[0]).toMatchObject({ slug: 'dragonling-growth-i', free: true, level: 1, requires: [] })
    expect(DEFS[3]?.requires).toEqual(['dragonling-growth-i'])
  })

  it('degrades to no tree on a note without the fence', () => {
    expect(improvementDefs(null)).toEqual([])
    expect(improvementDefs({ improvements: 'nope' })).toEqual([])
  })
})

describe('slots', () => {
  it('are the bespoke companion table: none at 1, level − 1 after, 19 at 20', () => {
    expect([1, 2, 5, 9, 20].map(improvementSlots)).toEqual([0, 1, 4, 8, 19])
  })

  it('slot i offers only what Tamer level i + 2 allows, never a free one', () => {
    // Slot 0 is earned at 2nd level: no Harden I (3rd) and no Growth I (free).
    expect(slugs(slotOptions(DEFS, [], 0))).toEqual(['go-for-the-throat', 'ability-boost', 'war-training', 'speed-training'])
    // Slot 3 is earned at 5th: Growth II, whose prerequisite is the free Growth I.
    expect(slugs(slotOptions(DEFS, [], 3))).toContain('dragonling-growth-ii')
    expect(slugs(slotOptions(DEFS, [], 3))).not.toContain('dragonling-harden-ii')
  })

  it('a prerequisite must be taken in an earlier slot', () => {
    const slots = [null, pick('dragonling-harden-i'), null, null, null, null, null, null]
    expect(slugs(slotOptions(DEFS, slots, 7))).toContain('dragonling-harden-ii')
    expect(slugs(slotOptions(DEFS, slots, 0))).not.toContain('dragonling-harden-ii')
    expect(slugs(slotOptions(DEFS, [], 7))).not.toContain('dragonling-harden-ii')
  })

  it('a bespoke improvement is taken once; a universal one again', () => {
    const slots = [pick('ability-boost', 'str'), pick('dragonling-harden-i')]
    expect(slugs(slotOptions(DEFS, slots, 2))).toContain('ability-boost')
    expect(slugs(slotOptions(DEFS, slots, 2))).not.toContain('dragonling-harden-i')
    // …but the slot that holds it still offers it.
    expect(slugs(slotOptions(DEFS, slots, 1))).toContain('dragonling-harden-i')
  })

  it("caps Go for the Throat at once, twice from 5th, three times from 9th", () => {
    expect([1, 2, 4, 5, 8, 9, 20].map(throatCap)).toEqual([0, 1, 1, 2, 2, 3, 3])
    const one = [pick('go-for-the-throat')]
    expect(slugs(slotOptions(DEFS, one, 1))).not.toContain('go-for-the-throat') // 3rd level: once
    expect(slugs(slotOptions(DEFS, [...one, null, null], 3))).toContain('go-for-the-throat') // 5th: twice
  })

  it("War Training's armour goes light, medium, heavy, then nothing", () => {
    const armor = (a: string) => pick('war-training', { kind: 'armor', armor: a })
    expect(armorOptions([], 0)).toEqual(['Light Armor'])
    expect(armorOptions([armor('Light Armor')], 1)).toEqual(['Medium Armor'])
    expect(armorOptions([armor('Light Armor'), armor('Medium Armor'), armor('Heavy Armor')], 3)).toEqual([])
  })
})

describe('the stored list', () => {
  it('is the free picks, then the filled slots, cut to the level', () => {
    const stored = storedImprovements(DEFS, [pick('ability-boost', 'con'), null, pick('dragonling-harden-i')], 3)
    expect(slugs(stored)).toEqual(['dragonling-growth-i', 'ability-boost'])
    expect(stored[0]).toEqual({ slug: 'dragonling-growth-i', name: 'Growth I', kind: 'bespoke', free: true })
    expect(stored.every(p => !('id' in p))).toBe(true)
    expect(slugs(slottedOf(stored).filter((p): p is ImprovementPick => !!p))).toEqual(['ability-boost'])
    expect(slugs(freePicks(DEFS))).toEqual(['dragonling-growth-i'])
  })

  it('is complete when every slot is filled and every follow-up answered', () => {
    expect(improvementsComplete(storedImprovements(DEFS, [], 1), 1)).toBe(true)
    expect(improvementsComplete(storedImprovements(DEFS, [], 2), 2)).toBe(false)
    expect(improvementsComplete(storedImprovements(DEFS, [pick('ability-boost')], 2), 2)).toBe(false)
    expect(improvementsComplete(storedImprovements(DEFS, [pick('ability-boost', 'dex')], 2), 2)).toBe(true)
    expect(pickComplete(pick('war-training', { kind: 'weapons', weapons: ['Club', null] }))).toBe(false)
    expect(pickComplete(pick('war-training', { kind: 'weapons', weapons: ['Club', 'Dagger'] }))).toBe(true)
    expect(pickComplete(pick('go-for-the-throat'))).toBe(true)
  })

  it('is what tamerScaling applies: the free Growth, a boost, Harden, a faster flight', () => {
    const statblock = { ac: 14, hp: 3, hit_dice: '1d4 + 1', speed: '25 ft., Fly 30 ft.', stats: [14, 10, 12, 9, 11, 13], size: 'Tiny' }
    const stored = storedImprovements(
      DEFS,
      [pick('ability-boost', 'con'), pick('dragonling-harden-i'), pick('speed-training', 'fly')],
      4,
    )
    const view = companionView(statblock, stored, 4, 2)
    expect(view.size).toBe('Small') // Growth I, granted free
    expect(view.hitDice).toEqual({ total: 4, die: 6 })
    expect(view.stats[2]).toBe(13) // Con 12 → 13
    expect(view.ac).toBe(16) // Harden I
    expect(view.speed).toBe('25 ft., fly 45 ft.') // capped at 150%
    expect(view.improvements).toEqual(['Growth I', 'Ability Boost', 'Harden I', 'Speed Training'])
  })
})
