import { describe, expect, it } from 'vitest'

import { boltLine, boltOf, casterId, rangeFeet, targetsFrom, type RawToken } from './beam'

const SCALE = { cell: 140, feetPerCell: 5 }

describe('which spells have a bolt', () => {
  it('is the nine aimed at a creature, each in a look of its own', () => {
    expect(boltOf('Eldritch Blast')).toEqual({ look: 'lightning', color: '#7852ee' })
    expect(boltOf('Fire Bolt')?.look).toBe('fire')
    expect(boltOf('Ray of Frost')?.look).toBe('frost')
    expect(boltOf('Guiding Bolt')?.look).toBe('radiance')
    for (const spell of ['Chain Lightning', 'Disintegrate', 'Magic Missile', 'Scorching Ray', 'Witch Bolt']) {
      expect(boltOf(spell), spell).not.toBeNull()
    }
  })

  it('reads a name however it is written', () => {
    expect(boltOf('ray of frost')).toEqual(boltOf('Ray of Frost'))
  })

  // An area spell must not get a target: Fireball is cast at a point.
  it('has none for a spell cast at a point, or at nobody', () => {
    expect(boltOf('Fireball')).toBeNull()
    expect(boltOf('Fire Bolts')).toBeNull()
    expect(boltOf('Shield')).toBeNull()
    expect(boltOf('')).toBeNull()
  })

  it('uses only looks and colours Atlas reads', () => {
    for (const spell of ['Chain Lightning', 'Disintegrate', 'Eldritch Blast', 'Fire Bolt', 'Guiding Bolt', 'Magic Missile', 'Ray of Frost', 'Scorching Ray', 'Witch Bolt']) {
      const bolt = boltOf(spell)
      expect(['fire', 'frost', 'lightning', 'mist', 'radiance', 'shadow'], spell).toContain(bolt?.look)
      expect(bolt?.color, spell).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})

describe('a bolt', () => {
  const bolt = boltOf('Eldritch Blast')!
  const make = (from: { x: number; y: number }, to: { x: number; y: number }, extra = {}) =>
    boltLine({ bolt, from, fromRadius: 70, to, scale: SCALE, ...extra })

  it("runs from the caster's edge to the target's centre", () => {
    expect(make({ x: 0, y: 0 }, { x: 840, y: 0 })?.points).toEqual([
      { x: 70, y: 0 },
      { x: 840, y: 0 },
    ])
  })

  it('leaves the edge along a diagonal too', () => {
    const start = make({ x: 0, y: 0 }, { x: 300, y: 400 })?.points[0]
    expect(start?.x).toBeCloseTo(42)
    expect(start?.y).toBeCloseTo(56)
  })

  it("starts at the centre for a target inside the caster's footprint", () => {
    expect(make({ x: 0, y: 0 }, { x: 50, y: 0 })?.points[0]).toEqual({ x: 0, y: 0 })
  })

  it("is a narrow line in the spell's look, drawn whole through walls", () => {
    expect(make({ x: 0, y: 0 }, { x: 840, y: 0 })).toMatchObject({
      shape: 'line',
      width: 56,
      color: '#7852ee',
      effect: 'lightning',
      walls: false,
    })
  })

  it("keeps to the caster's floor, and names none where there is none", () => {
    expect(make({ x: 0, y: 0 }, { x: 840, y: 0 }, { level: 'upper' })?.level).toBe('upper')
    expect(make({ x: 0, y: 0 }, { x: 840, y: 0 }, { level: 3 })).not.toHaveProperty('level')
    expect(make({ x: 0, y: 0 }, { x: 840, y: 0 })).not.toHaveProperty('level')
  })

  it("is the GM's alone for a hidden caster", () => {
    expect(make({ x: 0, y: 0 }, { x: 840, y: 0 }, { hidden: true })?.hidden).toBe(true)
    expect(make({ x: 0, y: 0 }, { x: 840, y: 0 })).not.toHaveProperty('hidden')
  })

  it('is nothing between two tokens on the same spot', () => {
    expect(make({ x: 5, y: 5 }, { x: 5, y: 5 })).toBeNull()
  })
})

describe('the range', () => {
  it('reads the number a note writes', () => {
    expect(rangeFeet('120 feet')).toBe(120)
    expect(rangeFeet('1 foot')).toBe(1)
    expect(rangeFeet('90 ft')).toBe(90)
  })

  it('has none for what is not a distance', () => {
    expect(rangeFeet('Self')).toBeNull()
    expect(rangeFeet('Touch')).toBeNull()
    expect(rangeFeet(null)).toBeNull()
  })
})

describe('the scene', () => {
  const tokens: Record<string, RawToken> = {
    a: { name: 'Archmage', statblockPath: 'bestiary/archmage.md', x: 840, y: 0 },
    m: { name: 'Mordecai Vane', notePath: 'characters/level-20/Mordecai Vane.md', x: 0, y: 0 },
  }

  it('knows the caster by the note on its token', () => {
    const renamed = { m: { ...tokens.m, name: 'The Hooded One' } }
    expect(casterId(renamed, { name: 'Mordecai Vane', notePath: 'characters/level-20/Mordecai Vane.md' })).toBe('m')
  })

  it('knows the caster by its statblock link', () => {
    expect(casterId(tokens, { notePath: 'bestiary/archmage.md' })).toBe('a')
  })

  it('falls back on the name, for a token with no link', () => {
    expect(casterId({ m: { name: 'mordecai vane' } }, { name: 'Mordecai Vane', notePath: 'elsewhere.md' })).toBe('m')
  })

  it('prefers the link to a stranger of the same name', () => {
    const both = {
      stranger: { name: 'Mordecai Vane' },
      him: { name: 'Hooded', notePath: 'him.md' },
    }
    expect(casterId(both, { name: 'Mordecai Vane', notePath: 'him.md' })).toBe('him')
  })

  it('does not count a token waiting off the map', () => {
    expect(casterId({ m: { ...tokens.m, offMap: true } }, { name: 'Mordecai Vane' })).toBeNull()
  })

  it('has no caster for nobody', () => {
    expect(casterId(tokens, null)).toBeNull()
    expect(casterId(tokens, { name: 'Ilse' })).toBeNull()
  })

  it('offers everyone else, nearest first', () => {
    const scene: Record<string, RawToken> = {
      ...tokens,
      near: { name: 'Goblin', x: 140, y: 0 },
    }
    const targets = targetsFrom(scene, 'm', { x: 0, y: 0 }, SCALE)
    expect(targets.map(t => t.label)).toEqual(['Goblin', 'Archmage'])
    expect(targets.map(t => t.feet)).toEqual([5, 30])
  })

  it('numbers tokens that share a name, as the map does', () => {
    const scene: Record<string, RawToken> = {
      m: tokens.m,
      g1: { name: 'Goblin', instanceNumber: 1, x: 140, y: 0 },
      g2: { name: 'Goblin', instanceNumber: 2, x: 280, y: 0 },
      solo: { name: 'Ogre', instanceNumber: 1, x: 420, y: 0 },
    }
    expect(targetsFrom(scene, 'm', { x: 0, y: 0 }, SCALE).map(t => t.label)).toEqual(['Goblin 1', 'Goblin 2', 'Ogre'])
  })

  it('names a plain token, which has no name of its own', () => {
    const [target] = targetsFrom({ m: tokens.m, t: { x: 140, y: 0 } }, 'm', { x: 0, y: 0 }, SCALE)
    expect(target.label).toBe('Unnamed token')
  })

  it('takes the statblock name where the token has none', () => {
    const [target] = targetsFrom({ t: { name: '', statblockName: 'Ogre', x: 1, y: 0 } }, 'm', { x: 0, y: 0 }, SCALE)
    expect(target.label).toBe('Ogre')
  })

  it('marks a hidden token and leaves out one off the map', () => {
    const scene: Record<string, RawToken> = {
      hid: { name: 'Assassin', isHidden: true, x: 140, y: 0 },
      off: { name: 'Reserve', offMap: true, x: 280, y: 0 },
    }
    expect(targetsFrom(scene, 'm', { x: 0, y: 0 }, SCALE)).toMatchObject([{ label: 'Assassin', hidden: true }])
  })
})
