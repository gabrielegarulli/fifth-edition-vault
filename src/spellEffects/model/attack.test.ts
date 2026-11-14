import { describe, expect, it } from 'vitest'

import { acFrom, attackCount, criticalFormula, fireShots, verdict, volleySummary, type Shot } from './attack'
import { missPoint } from './beam'

describe('how many attacks a cast makes', () => {
  it.each([
    [1, 1],
    [4, 1],
    [5, 2],
    [10, 2],
    [11, 3],
    [16, 3],
    [17, 4],
    [20, 4],
  ])('Eldritch Blast at character level %i is %i', (level, beams) => {
    expect(attackCount('Eldritch Blast', 0, level)).toBe(beams)
  })

  it('counts Scorching Ray by the slot, not the character', () => {
    expect(attackCount('Scorching Ray', 2, 20)).toBe(3)
    expect(attackCount('Scorching Ray', 3, 1)).toBe(4)
    expect(attackCount('Scorching Ray', 5, 1)).toBe(6)
  })

  it('gives the other attack spells one', () => {
    for (const spell of ['Fire Bolt', 'Ray of Frost', 'Guiding Bolt', 'Witch Bolt']) {
      expect(attackCount(spell, 1, 20)).toBe(1)
    }
  })

  // Magic Missile never rolls to hit; the other two are saving throws.
  it('gives none to a spell that does not roll to hit', () => {
    for (const spell of ['Magic Missile', 'Disintegrate', 'Chain Lightning', 'Fireball']) {
      expect(attackCount(spell, 6, 20)).toBeNull()
    }
  })
})

describe('reading an AC', () => {
  it('takes a number, however the frontmatter spells it', () => {
    expect(acFrom(17)).toBe(17)
    expect(acFrom('17')).toBe(17)
  })

  // Real spellings from the bestiary: reading the 13 would be the wrong AC.
  it('refuses a formula rather than read its first number', () => {
    expect(acFrom("13 + the spell's level")).toBeNull()
    expect(acFrom('10 + Dex')).toBeNull()
  })

  it('has none for nothing', () => {
    expect(acFrom(undefined)).toBeNull()
    expect(acFrom('')).toBeNull()
    expect(acFrom(Number.NaN)).toBeNull()
  })
})

describe('a verdict', () => {
  it('holds the total against the AC, and meeting it hits', () => {
    expect(verdict(10, 21, 21)).toBe('hit')
    expect(verdict(10, 20, 21)).toBe('miss')
  })

  it('always hits on a natural 20, however high the AC', () => {
    expect(verdict(20, 21, 30)).toBe('critical')
  })

  it('always misses on a natural 1, however high the total', () => {
    expect(verdict(1, 12, 5)).toBe('miss')
  })

  it('cannot say without an AC, except for a natural die', () => {
    expect(verdict(10, 21, null)).toBe('unjudged')
    expect(verdict(20, 31, null)).toBe('critical')
    expect(verdict(1, 12, null)).toBe('miss')
  })
})

describe('a critical', () => {
  it('doubles the dice and not the bonus', () => {
    expect(criticalFormula('1d10')).toBe('2d10')
    expect(criticalFormula('2d6+3')).toBe('4d6+3')
    expect(criticalFormula('10d6+40')).toBe('20d6+40')
  })

  it('doubles every die in a mixed roll', () => {
    expect(criticalFormula('3d8+2d6')).toBe('6d8+4d6')
  })
})

describe('firing a cast', () => {
  const ARCHMAGE: Shot = { id: 'a', label: 'Archmage', ac: 17 }

  /** Faces as the dice would give them, at +11, and a record of what happened in order. */
  function run(faces: number[], shots: Shot[], damageFormula: string | null = '1d10') {
    const steps: string[] = []
    const left = [...faces]
    return {
      steps,
      volley: fireShots({
        spell: 'Eldritch Blast',
        shots,
        damageFormula,
        attack: label => {
          const face = left.shift() ?? 10
          steps.push(`attack ${label}`)
          return Promise.resolve({ total: face + 11, modifier: 11 })
        },
        rollDamage: (formula, label) => {
          steps.push(`damage ${formula} ${label}`)
          return Promise.resolve({ total: 6 })
        },
        play: (id, miss) => void steps.push(`${miss ? 'wide of' : 'hit'} ${id}`),
        hurt: (_, amount) => Promise.resolve({ dealt: amount, defence: null, current: 170 - amount, max: 170 }),
      }),
    }
  }

  it('rolls damage only for a hit, in order, beam by beam', async () => {
    const { steps, volley } = run([10, 2], [ARCHMAGE, ARCHMAGE])
    expect(await volley).toMatchObject({ shots: 2, hits: 1, misses: 1, damage: 6 })
    expect(steps).toEqual([
      'attack Eldritch Blast 1 of 2 at Archmage',
      'hit a',
      'damage 1d10 Eldritch Blast damage',
      'attack Eldritch Blast 2 of 2 at Archmage',
      'wide of a',
    ])
  })

  it('waits for one roll before the next, so the dice stay readable', async () => {
    let inFlight = 0
    let most = 0
    const slow = () => {
      inFlight += 1
      most = Math.max(most, inFlight)
      return new Promise<{ total: number; modifier: number }>(resolve => {
        setTimeout(() => {
          inFlight -= 1
          resolve({ total: 21, modifier: 11 })
        }, 1)
      })
    }
    await fireShots({
      spell: 'Eldritch Blast',
      shots: [ARCHMAGE, ARCHMAGE, ARCHMAGE, ARCHMAGE],
      damageFormula: '1d10',
      attack: slow,
      rollDamage: slow,
      play: () => {},
      hurt: () => Promise.resolve(null),
    })
    expect(most).toBe(1)
  })

  it('doubles the dice on a critical', async () => {
    const { steps, volley } = run([20], [ARCHMAGE])
    expect(await volley).toMatchObject({ hits: 1, criticals: 1 })
    expect(steps).toContain('damage 2d10 Eldritch Blast critical damage')
  })

  // MYDND-179: Repelling Blast. A push is the last thing a hit does, so the next
  // beam starts from where the target landed.
  describe('with a push on a hit', () => {
    const GOBLIN: Shot = { id: 'g', label: 'Goblin', ac: 12 }
    const fire = (faces: number[], shots: Shot[], ac = {}) => {
      const pushed: string[] = []
      const order: string[] = []
      const left = [...faces]
      const volley = fireShots({
        spell: 'Eldritch Blast',
        shots: shots.map(s => ({ ...s, ...ac })),
        damageFormula: '1d10',
        attack: () => {
          const face = left.shift() ?? 10
          return Promise.resolve({ total: face + 5, modifier: 5 })
        },
        rollDamage: () => Promise.resolve({ total: 6 }),
        play: () => {},
        hurt: () => {
          order.push('hurt')
          return Promise.resolve(null)
        },
        push: id => {
          order.push('push')
          pushed.push(id)
          return { feet: 10, stop: null }
        },
      })
      return { pushed, order, volley }
    }

    it('pushes on a hit, after the damage', async () => {
      const { pushed, order, volley } = fire([15], [GOBLIN])
      expect((await volley).pushes).toEqual({ Goblin: { feet: 10, stop: null } })
      expect(pushed).toEqual(['g'])
      expect(order).toEqual(['hurt', 'push'])
    })

    it('pushes on a critical', async () => {
      const { pushed, volley } = fire([20], [GOBLIN])
      await volley
      expect(pushed).toEqual(['g'])
    })

    it('leaves a miss where it stands', async () => {
      const { pushed, volley } = fire([2], [GOBLIN])
      expect((await volley).pushes).toEqual({})
      expect(pushed).toEqual([])
    })

    // The GM decides an unjudged attack, so no token moves on it, as no hit points do.
    it('moves nothing on an attack with no AC to judge', async () => {
      const { pushed, volley } = fire([15], [GOBLIN], { ac: null })
      expect((await volley).unjudged).toBe(1)
      expect(pushed).toEqual([])
    })

    it('adds two hits on one target together', async () => {
      const { pushed, volley } = fire([15, 15], [GOBLIN, GOBLIN])
      expect((await volley).pushes).toEqual({ Goblin: { feet: 20, stop: null } })
      expect(pushed).toEqual(['g', 'g'])
    })

    it('says so at the end', async () => {
      const { volley } = fire([15], [GOBLIN])
      expect(volleySummary('Eldritch Blast', await volley)).toContain('Goblin pushed 10 ft')
    })

    it('reports nothing for a token that could not be moved', async () => {
      const volley = await fireShots({
        spell: 'Eldritch Blast',
        shots: [GOBLIN],
        damageFormula: null,
        attack: () => Promise.resolve({ total: 20, modifier: 5 }),
        rollDamage: () => Promise.resolve(null),
        play: () => {},
        hurt: () => Promise.resolve(null),
        push: () => null,
      })
      expect(volley.pushes).toEqual({})
    })
  })

  // Found on a recording of a real cast: the art winds up for over a second, so
  // the token jumped clear and the bolt struck the empty square behind it.
  describe('while the bolt is in the air', () => {
    const GOBLIN: Shot = { id: 'g', label: 'Goblin', ac: 12 }

    function flight(faces: number[], shots: Shot[]) {
      const steps: string[] = []
      const arrivals: (() => void)[] = []
      const left = [...faces]
      const volley = fireShots({
        spell: 'Eldritch Blast',
        shots,
        damageFormula: '1d10',
        attack: () => {
          steps.push('attack')
          const face = left.shift() ?? 15
          return Promise.resolve({ total: face + 5, modifier: 5 })
        },
        rollDamage: () => {
          steps.push('damage')
          return Promise.resolve({ total: 6 })
        },
        play: (_, miss) => {
          steps.push(miss ? 'wide' : 'beam')
          return miss ? undefined : new Promise<void>(arrived => arrivals.push(arrived))
        },
        hurt: () => {
          steps.push('hurt')
          return Promise.resolve(null)
        },
        push: () => {
          steps.push('push')
          return { feet: 10, stop: null }
        },
      })
      return { steps, arrivals, volley }
    }
    const tick = () => new Promise(resolve => setTimeout(resolve, 0))

    it('rolls the damage, and touches nothing until it lands', async () => {
      const { steps, arrivals, volley } = flight([15], [GOBLIN])
      await tick()
      expect(steps).toEqual(['attack', 'beam', 'damage'])

      arrivals[0]()
      await volley
      expect(steps).toEqual(['attack', 'beam', 'damage', 'hurt', 'push'])
    })

    it('throws the next beam only after the last one landed', async () => {
      const { steps, arrivals, volley } = flight([15, 15], [GOBLIN, GOBLIN])
      await tick()
      expect(steps.filter(s => s === 'beam')).toHaveLength(1)

      arrivals[0]()
      await tick()
      expect(steps.filter(s => s === 'beam')).toHaveLength(2)
      arrivals[1]()
      await volley
    })

    it('does not wait on a miss', async () => {
      const { steps, volley } = flight([2], [GOBLIN])
      await volley
      expect(steps).toEqual(['attack', 'wide'])
    })
  })

  it('judges each beam against its own target', async () => {
    const { steps, volley } = run(
      [8, 8],
      [
        { id: 'weak', label: 'Goblin', ac: 12 },
        { id: 'tough', label: 'Dragon', ac: 22 },
      ],
    )
    expect(await volley).toMatchObject({ hits: 1, misses: 1 })
    expect(steps).toContain('hit weak')
    expect(steps).toContain('wide of tough')
  })

  it('rolls damage it cannot judge, and counts it apart', async () => {
    const { volley } = run([10], [{ id: 'x', label: 'Unnamed token', ac: null }])
    expect(await volley).toMatchObject({ hits: 0, unjudged: 1, damage: 6 })
  })

  it('still attacks a spell with no dice on its note', async () => {
    const { steps, volley } = run([10], [ARCHMAGE], null)
    expect(await volley).toMatchObject({ hits: 1, damage: 0 })
    expect(steps.some(s => s.startsWith('damage'))).toBe(false)
  })

  it('skips an attack nothing rolled, with no beam', async () => {
    const played: string[] = []
    const volley = await fireShots({
      spell: 'Eldritch Blast',
      shots: [ARCHMAGE],
      damageFormula: '1d10',
      attack: () => Promise.resolve(null),
      rollDamage: () => Promise.resolve(null),
      play: id => void played.push(id),
      hurt: () => Promise.resolve(null),
    })
    expect(played).toEqual([])
    expect(volley).toMatchObject({ hits: 0, misses: 0 })
  })
})

describe('the line a cast ends on', () => {
  const volley = { shots: 4, hits: 3, criticals: 1, misses: 1, unjudged: 0, damage: 19, wounds: {}, defended: [], pushes: {} }

  it('adds up the volley', () => {
    expect(volleySummary('Eldritch Blast', volley)).toBe('Eldritch Blast: 3 of 4 hit, critical, 19 damage')
  })

  it('reads a single attack plainly', () => {
    expect(volleySummary('Fire Bolt', { ...volley, shots: 1, hits: 1, criticals: 0, misses: 0, damage: 7 })).toBe('Fire Bolt: hit, 7 damage')
    expect(volleySummary('Fire Bolt', { ...volley, shots: 1, hits: 0, criticals: 0, misses: 1, damage: 0 })).toBe('Fire Bolt: missed')
  })

  it('says when it could not judge', () => {
    const line = volleySummary('Fire Bolt', { ...volley, shots: 1, hits: 0, criticals: 0, misses: 0, unjudged: 1, damage: 7 })
    expect(line).toBe('Fire Bolt: rolled, 7 damage. No AC for that target, so check against the rolls and apply it by hand')
  })
})

describe('a miss', () => {
  it('goes clear of the token, to either side', () => {
    const from = { x: 0, y: 0 }
    const to = { x: 840, y: 0 }
    expect(missPoint(from, to, 70, 1)).toEqual({ x: 840, y: 105 })
    expect(missPoint(from, to, 70, -1)).toEqual({ x: 840, y: -105 })
  })

  it('stays where it is for two tokens on one spot', () => {
    expect(missPoint({ x: 5, y: 5 }, { x: 5, y: 5 }, 70, 1)).toEqual({ x: 5, y: 5 })
  })
})
