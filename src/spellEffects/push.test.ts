import { describe, expect, it } from 'vitest'

import type { Point, RawToken } from './beam'
import { crosses, planPush, pushLine, tooBigToPush, type RawWall } from './push'

const CELL = 140
const scale = { cell: CELL, feetPerCell: 5 }
const CASTER = { x: 0, y: 0 }

/** A square grid whose cell centres sit on multiples of `CELL`. */
const onCell = ({ x, y }: Point): Point => ({ x: Math.round(x / CELL) * CELL, y: Math.round(y / CELL) * CELL })

const plan = (
  target: RawToken,
  rest: {
    others?: Record<string, RawToken>
    walls?: Record<string, RawWall>
    floors?: { id: string }[]
    feet?: number
    onSquares?: boolean
    snap?: (point: Point) => Point
    scale?: typeof scale
  } = {},
) =>
  planPush({
    tokens: { me: { x: 0, y: 0 }, t: target, ...rest.others },
    walls: rest.walls,
    floors: rest.floors,
    targetId: 't',
    from: CASTER,
    feet: rest.feet ?? 10,
    scale: rest.scale ?? scale,
    onSquares: rest.onSquares ?? true,
    snap: rest.snap ?? onCell,
  })

/** A wall across the line y = 0, at this x. */
const wallAt = (x: number, extra: RawWall = {}): Record<string, RawWall> => ({
  w: { type: 'solid', p1: { x, y: -CELL }, p2: { x, y: CELL }, ...extra },
})

describe('which way, and how far', () => {
  it('goes two squares straight away from the caster', () => {
    expect(plan({ x: 840, y: 0 })).toEqual({ at: { x: 1120, y: 0 }, feet: 10, stop: null })
  })

  it('goes the other way from the other side', () => {
    expect(plan({ x: -840, y: 0 }).at).toEqual({ x: -1120, y: 0 })
    expect(plan({ x: 0, y: -840 }).at).toEqual({ x: 0, y: -1120 })
  })

  // Distance would make 10 feet one and a half squares, which snaps to one.
  it('counts a diagonal square as 5 feet, as the rules do', () => {
    expect(plan({ x: 420, y: 420 })).toEqual({ at: { x: 700, y: 700 }, feet: 10, stop: null })
  })

  it('stays on the line at a slant, a square at a time', () => {
    expect(plan({ x: 700, y: 140 }).at).toEqual({ x: 980, y: 140 })
    expect(plan({ x: 280, y: 140 }).at).toEqual({ x: 560, y: 280 })
  })

  it('measures plain distance with no squares to count', () => {
    const { at, feet } = plan({ x: 300, y: 400 }, { onSquares: false, snap: p => p })
    expect(at.x).toBeCloseTo(468)
    expect(at.y).toBeCloseTo(624)
    expect(feet).toBe(10)
  })

  it('has no away to go to from on top of the caster', () => {
    expect(plan({ x: 0, y: 0 })).toEqual({ at: { x: 0, y: 0 }, feet: 0, stop: null })
  })

  it('reads the map scale: 10 feet is one square of 10', () => {
    expect(plan({ x: 840, y: 0 }, { scale: { cell: CELL, feetPerCell: 10 } })).toMatchObject({ at: { x: 980, y: 0 }, feet: 10 })
  })

  it('stays put where a square is longer than the push', () => {
    expect(plan({ x: 840, y: 0 }, { scale: { cell: CELL, feetPerCell: 15 } })).toMatchObject({ at: { x: 840, y: 0 }, feet: 0 })
  })

  it('goes part of a square where nothing snaps', () => {
    const { at, feet } = plan({ x: 840, y: 0 }, { scale: { cell: CELL, feetPerCell: 20 }, onSquares: false, snap: p => p })
    expect(at.x).toBeCloseTo(910)
    expect(feet).toBe(10)
  })
})

describe('what stops it', () => {
  it('stops at a wall, on the last square before it', () => {
    expect(plan({ x: 840, y: 0 }, { walls: wallAt(1050) })).toEqual({ at: { x: 980, y: 0 }, feet: 5, stop: 'wall' })
  })

  it('goes nowhere with a wall at its back', () => {
    expect(plan({ x: 840, y: 0 }, { walls: wallAt(910) })).toEqual({ at: { x: 840, y: 0 }, feet: 0, stop: 'wall' })
  })

  it('ignores a wall beyond where it lands', () => {
    expect(plan({ x: 840, y: 0 }, { walls: wallAt(1190) }).stop).toBeNull()
  })

  it('passes an open door and stops at a shut one', () => {
    expect(plan({ x: 840, y: 0 }, { walls: wallAt(910, { type: 'door', closed: false }) }).stop).toBeNull()
    expect(plan({ x: 840, y: 0 }, { walls: wallAt(910, { type: 'secret-door', closed: false }) }).stop).toBeNull()
    expect(plan({ x: 840, y: 0 }, { walls: wallAt(910, { type: 'door', closed: true }) }).stop).toBe('wall')
    expect(plan({ x: 840, y: 0 }, { walls: wallAt(910, { type: 'door' }) }).stop).toBe('wall')
  })

  it('takes no notice of a wall shrunk to a point', () => {
    const point = { type: 'solid', p1: { x: 910, y: 0 }, p2: { x: 910, y: 0 } }
    expect(plan({ x: 840, y: 0 }, { walls: { w: point } }).stop).toBeNull()
  })

  it('stops short of another creature', () => {
    expect(plan({ x: 840, y: 0 }, { others: { b: { x: 1120, y: 0 } } })).toEqual({ at: { x: 980, y: 0 }, feet: 5, stop: 'token' })
  })

  it('counts every square a big token covers', () => {
    expect(plan({ x: 840, y: 0 }, { others: { b: { x: 1260, y: 0, size: 2 } } })).toMatchObject({ feet: 5, stop: 'token' })
  })

  it('passes beside a creature it does not touch', () => {
    expect(plan({ x: 840, y: 0 }, { others: { b: { x: 980, y: 140 } } }).stop).toBeNull()
  })

  it('is not stopped by a token kept off the map', () => {
    expect(plan({ x: 840, y: 0 }, { others: { b: { x: 1120, y: 0, offMap: true } } }).stop).toBeNull()
  })

  describe('in a scene with floors', () => {
    const floors = [{ id: 'ground' }, { id: 'upper' }]

    it('is not stopped by a token upstairs', () => {
      const others = { b: { x: 1120, y: 0, level: 'upper' } }
      expect(plan({ x: 840, y: 0 }, { floors, others }).stop).toBeNull()
    })

    it('reads no level as the first floor', () => {
      const others = { b: { x: 1120, y: 0, level: 'ground' } }
      expect(plan({ x: 840, y: 0 }, { floors, others }).stop).toBe('token')
    })

    it('is not stopped by a wall upstairs, and is by one on every floor', () => {
      expect(plan({ x: 840, y: 0 }, { floors, walls: wallAt(910, { level: 'upper' }) }).stop).toBeNull()
      expect(plan({ x: 840, y: 0 }, { floors, walls: wallAt(910, { levels: ['upper'] }) }).stop).toBeNull()
      expect(plan({ x: 840, y: 0 }, { floors, walls: wallAt(910, { levels: 'all' }) }).stop).toBe('wall')
      expect(plan({ x: 840, y: 0, level: 'upper' }, { floors, walls: wallAt(910, { levels: ['upper'] }) }).stop).toBe('wall')
    })
  })
})

describe('whether a line crosses a wall', () => {
  const p = { x: 5, y: -5 }
  const q = { x: 5, y: 5 }

  it('sees a crossing, and not a near miss', () => {
    expect(crosses({ x: 0, y: 0 }, { x: 10, y: 0 }, p, q)).toBe(true)
    expect(crosses({ x: 0, y: 0 }, { x: 4, y: 0 }, p, q)).toBe(false)
    expect(crosses({ x: 0, y: 6 }, { x: 10, y: 6 }, p, q)).toBe(false)
  })

  it('does not call a parallel line a crossing', () => {
    expect(crosses({ x: 5, y: -9 }, { x: 5, y: 9 }, p, q)).toBe(false)
  })
})

describe('whether a creature is too big', () => {
  it.each([
    ['Tiny', false],
    ['Medium', false],
    ['Small/Medium', false],
    ['Large', false],
    ['Huge', true],
    ['Gargantuan', true],
    ['huge', true],
  ])('a note saying %s: %s', (size, big) => {
    expect(tooBigToPush(size, 1)).toBe(big)
  })

  it('believes the note over the token', () => {
    expect(tooBigToPush('Huge', 1)).toBe(true)
    expect(tooBigToPush('Medium', 3)).toBe(false)
  })

  it('goes by the footprint with no note, where 2 is 3×3', () => {
    expect(tooBigToPush(null, 1.5)).toBe(false)
    expect(tooBigToPush(null, 2)).toBe(true)
    expect(tooBigToPush('', 2)).toBe(true)
    expect(tooBigToPush(undefined, undefined)).toBe(false)
  })
})

describe('what it says', () => {
  it.each([
    [{ feet: 10, stop: null }, 'Ogre pushed 10 ft'],
    [{ feet: 5, stop: 'wall' }, 'Ogre pushed 5 ft, stopped by a wall'],
    [{ feet: 5, stop: 'token' }, 'Ogre pushed 5 ft, stopped by another creature'],
    [{ feet: 0, stop: 'wall' }, 'Ogre cannot be pushed: a wall is in the way'],
    [{ feet: 0, stop: 'token' }, 'Ogre cannot be pushed: another creature is in the way'],
    [{ feet: 0, stop: 'too-big' }, 'Ogre is too big to push'],
    [{ feet: 0, stop: null }, 'Ogre did not move'],
  ] as const)('%o', (pushed, line) => {
    expect(pushLine('Ogre', pushed)).toBe(line)
  })
})
