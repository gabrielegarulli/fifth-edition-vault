import { describe, expect, it } from 'vitest'

import { companionView, parseSpeed, tamerLevelOf } from './companion'

const WOLF = { ac: 12, hp: 11, hit_dice: '2d8 + 2', speed: '40 ft.', stats: [14, 15, 12, 3, 12, 6], size: 'Medium' }

describe('companionView', () => {
  it('scales Hit Dice with the Tamer level: Tamer 3 is 3d8, (5 + 1) each', () => {
    expect(companionView(WOLF, [], 3, 2)).toMatchObject({ maxHp: 18, hitDice: { total: 3, die: 8 }, dieUpgraded: false })
  })

  it('never drops below the statblock’s own Hit Dice', () => {
    // Tamer 1's table says 2 HD, the Wolf's own: 2 × 6.
    expect(companionView(WOLF, [], 1, 2).hitDice).toEqual({ total: 2, die: 8 })
  })

  it('adds a Hit Die per Toughen Up, and Growth raises the die for all of them', () => {
    const view = companionView(WOLF, [{ slug: 'toughen-up', name: 'Toughen Up' }, { slug: 'growth-i', name: 'Growth I' }], 3, 2)
    // 4d10, (6 + 1) each.
    expect(view).toMatchObject({ maxHp: 28, hitDice: { total: 4, die: 10 }, dieUpgraded: true })
    expect(view.improvements).toEqual(['Toughen Up', 'Growth I'])
  })

  it('applies Ability Boost, Speed Training and Survival Instincts', () => {
    const view = companionView(
      WOLF,
      [
        { slug: 'ability-boost', target: 'dex' },
        { slug: 'speed-training', target: 'walk' },
        { slug: 'survival-instincts', target: 'dex' },
      ],
      3,
      2,
    )
    expect(view.stats).toEqual([14, 16, 12, 3, 12, 6])
    // +15 a pick, capped at 1.5 × the base rounded up to 5: 55.
    expect(view.speed).toBe('55 ft.')
    // DEX 16 (+3) + PB 2.
    expect(view.saves).toEqual([{ ability: 'dex', bonus: 5 }])
  })

  it('leaves the statblock as written with no improvements', () => {
    expect(companionView(WOLF, [], 1, 2)).toMatchObject({ ac: 12, speed: '40 ft.', stats: WOLF.stats, saves: [] })
  })
})

describe('parseSpeed', () => {
  it('reads every movement mode', () => {
    expect(parseSpeed('30 ft., fly 60 ft. (hover), swim 30 ft.')).toEqual({ walk: 30, fly: 60, swim: 30 })
  })
})

describe('tamerLevelOf', () => {
  it('finds the Tamer among the classes, or 0', () => {
    expect(tamerLevelOf({ classes: [{ name: 'Fighter', level: 2 }, { name: 'Tamer', level: 5 }] })).toBe(5)
    expect(tamerLevelOf({ classes: [{ name: 'Fighter', level: 2 }] })).toBe(0)
  })
})
