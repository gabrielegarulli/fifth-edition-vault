import { describe, expect, it } from 'vitest'

import { artFor, beamArt, beamEffect, casterId, distanceFeet, rangeFeet, targetsFrom, type EffectFile, type RawToken } from './beam'

/**
 * The file names are JB2A's own, copied from the free pack. Measured there, not
 * invented: a rule that matches a made-up name proves nothing about the library.
 */
const file = (name: string, feet = 0, video = true): EffectFile => ({
  path: `JB2A_DnD5e/Library/${name}.webm`,
  name,
  feet,
  video,
})

const ELDRITCH = [
  file('EldritchBlast_01_Regular_Purple_90ft_4000x400', 90),
  file('EldritchBlast_01_Regular_Purple_05ft_600x400', 5),
  file('EldritchBlast_01_Regular_Purple_30ft_1600x400', 30),
  file('EldritchBlast_01_Regular_Purple_15ft_1000x400', 15),
  file('EldritchBlast_01_Regular_Purple_60ft_2800x400', 60),
]

const SCALE = { cell: 140, feetPerCell: 5 }

describe('which spells have a beam', () => {
  it('finds the art named for the spell, shortest first', () => {
    expect(beamArt('Eldritch Blast', ELDRITCH).map(f => f.feet)).toEqual([5, 15, 30, 60, 90])
  })

  it('reads a spell name with small words in it', () => {
    expect(beamArt('Ray of Frost', [file('RayOfFrost_01_Regular_Blue_30ft_1600x400', 30)])).toHaveLength(1)
  })

  // An area spell must not get a target: Fireball's beam is only its flight.
  it('does not take a longer name for the spell', () => {
    expect(beamArt('Fireball', [file('FireballBeam_01_Orange_30ft_1600x400', 30)])).toEqual([])
  })

  it('wants art made for a range, in a video', () => {
    expect(beamArt('Darkness', [file('Darkness_01_Black_600x600')])).toEqual([])
    expect(beamArt('Fire Bolt', [file('FireBolt_01_Regular_Orange_30ft_1600x400', 30, false)])).toEqual([])
  })

  it('keeps to one variant, so the colour does not change with the distance', () => {
    const art = beamArt('Fire Bolt', [
      file('FireBolt_01_Regular_Orange_30ft_1600x400', 30),
      file('FireBolt_01_Regular_Blue_60ft_2800x400', 60),
      file('FireBolt_01_Regular_Blue_30ft_1600x400', 30),
    ])
    expect(art.map(f => f.name)).toEqual(['FireBolt_01_Regular_Blue_30ft_1600x400', 'FireBolt_01_Regular_Blue_60ft_2800x400'])
  })
})

describe('which file a distance takes', () => {
  const art = beamArt('Eldritch Blast', ELDRITCH)

  it('is the shortest that reaches', () => {
    expect(artFor(art, 29)?.feet).toBe(30)
    expect(artFor(art, 30)?.feet).toBe(30)
    expect(artFor(art, 31)?.feet).toBe(60)
  })

  it('is the longest past the end of the library', () => {
    expect(artFor(art, 120)?.feet).toBe(90)
  })
})

describe('a beam', () => {
  const art = beamArt('Eldritch Blast', ELDRITCH)
  const make = (from: { x: number; y: number }, to: { x: number; y: number }) =>
    beamEffect({ id: 'fx', map: 'scene.atlasmap', name: 'Eldritch Blast', art, from, to, scale: SCALE, now: 1000 })

  it('runs exactly from token to token when the file fits the distance', () => {
    // 6 squares east is 30ft: no stretch, so the padding is its full 5ft.
    const fx = make({ x: 0, y: 0 }, { x: 840, y: 0 })
    expect(fx?.file).toContain('_30ft_')
    expect(fx?.size).toBeCloseTo(40)
    expect(fx?.at.x).toBeCloseTo(-140)
    expect(fx?.at.y).toBeCloseTo(0)
    expect(fx?.dir).toBeCloseTo(0)
  })

  // The case the real scene hit: 29.15ft, on a diagonal, in the 30ft file.
  it('lands the padded art on both tokens at any distance', () => {
    const from = { x: 1750, y: 2030 }
    const to = { x: 2450, y: 1610 }
    const fx = make(from, to)
    const feet = distanceFeet(from, to, SCALE)
    const stretch = feet / 30
    const pxPerFoot = SCALE.cell / SCALE.feetPerCell

    expect(fx?.size).toBeCloseTo(40 * stretch)
    // Walk 5ft (scaled) in from the box's start: that is the caster.
    const inset = 5 * stretch * pxPerFoot
    expect((fx?.at.x ?? 0) + Math.cos(fx?.dir ?? 0) * inset).toBeCloseTo(from.x)
    expect((fx?.at.y ?? 0) + Math.sin(fx?.dir ?? 0) * inset).toBeCloseTo(from.y)
    // And the same again short of the box's end: that is the target.
    const end = (fx?.size ?? 0) * pxPerFoot - inset
    expect((fx?.at.x ?? 0) + Math.cos(fx?.dir ?? 0) * end).toBeCloseTo(to.x)
    expect((fx?.at.y ?? 0) + Math.sin(fx?.dir ?? 0) * end).toBeCloseTo(to.y)
  })

  it('reads a scene measured in other units', () => {
    const fx = beamEffect({
      id: 'fx',
      map: 'm',
      name: 'Eldritch Blast',
      art,
      from: { x: 0, y: 0 },
      to: { x: 300, y: 0 },
      scale: { cell: 100, feetPerCell: 10 },
      now: 0,
    })
    expect(fx?.file).toContain('_30ft_')
    expect(fx?.size).toBeCloseTo(40)
  })

  it('plays once and leaves nothing on the map', () => {
    expect(make({ x: 0, y: 0 }, { x: 140, y: 0 })).toMatchObject({ shape: 'line', lasting: false, started: 1000 })
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
