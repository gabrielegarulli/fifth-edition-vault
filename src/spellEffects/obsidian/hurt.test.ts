import { describe, expect, it } from 'vitest'
import type { App } from 'obsidian'

import { afterDefences, defencesFrom, fireShots, volleySummary, type Hurt, type Shot } from '../model/attack'
import type { RawToken } from '../model/beam'
import { aimSpell, type ReadyAim } from './bridge'

/** Damage reaching a token: the defences, the volley, and the write to Atlas. */

describe('what a hit does to the target', () => {
  const ARCHMAGE: Shot = { id: 'a', label: 'Archmage', ac: 17 }
  const fire = (faces: number[], shot: Shot, hurt: (id: string, amount: number) => Promise<Hurt | null>) => {
    const left = [...faces]
    return fireShots({
      spell: 'Fire Bolt',
      shots: faces.map(() => shot),
      damageFormula: '1d10',
      attack: () => Promise.resolve({ total: (left.shift() ?? 10) + 11, modifier: 11 }),
      rollDamage: () => Promise.resolve({ total: 6 }),
      play: () => {},
      hurt,
    })
  }

  it('hurts the target for each hit and not for a miss', async () => {
    const hurt: [string, number][] = []
    await fire([10, 2, 10], ARCHMAGE, (id, amount) => {
      hurt.push([id, amount])
      return Promise.resolve(null)
    })
    expect(hurt).toEqual([
      ['a', 6],
      ['a', 6],
    ])
  })

  // The GM has not said this hit, so nothing may come off the token.
  it('leaves the token alone when no AC could judge the attack', async () => {
    let called = false
    const volley = await fire([10], { ...ARCHMAGE, ac: null }, () => {
      called = true
      return Promise.resolve(null)
    })
    expect(called).toBe(false)
    expect(volley).toMatchObject({ unjudged: 1, damage: 6 })
  })

  it('reports what was dealt, not what was rolled', async () => {
    const volley = await fire([10], ARCHMAGE, () =>
      Promise.resolve({ dealt: 3, defence: 'resistant', current: 167, max: 170 }),
    )
    expect(volley).toMatchObject({
      damage: 3,
      wounds: { Archmage: { current: 167, max: 170 } },
      defended: ['Archmage is resistant'],
      pushes: {},
    })
  })

  it('reports the damage rolled for a token with no hit points', async () => {
    const volley = await fire([10], ARCHMAGE, () => Promise.resolve(null))
    expect(volley).toMatchObject({ damage: 6, wounds: {} })
  })

  it('says where each target ended, and a defence once', () => {
    const line = volleySummary('Fire Bolt', {
      shots: 2,
      hits: 2,
      criticals: 0,
      misses: 0,
      unjudged: 0,
      damage: 0,
      wounds: { 'Fire Elemental': { current: 102, max: 102 }, Goblin: { current: 0, max: 7 } },
      defended: ['Fire Elemental is immune'],
      pushes: {},
    })
    expect(line).toBe('Fire Bolt: 2 of 2 hit. Fire Elemental is immune. Fire Elemental 102 of 102 HP. Goblin is at 0 HP')
  })
})

describe('a statblock', () => {
  // The spellings in the bestiary, with the fence's YAML around them.
  const FENCE = [
    '```statblock',
    'resistances: Bludgeoning, Piercing, Slashing',
    'immunities: Fire, Poison',
    'vulnerabilities: "Cold"',
    'condition_immunities: Charmed, Fire',
    '```',
  ].join('\n')

  it('lists its defences in lower case', () => {
    expect(defencesFrom(FENCE)).toEqual({
      immune: ['fire', 'poison'],
      resistant: ['bludgeoning', 'piercing', 'slashing'],
      vulnerable: ['cold'],
    })
  })

  it('does not read a condition immunity as a damage immunity', () => {
    expect(defencesFrom('condition_immunities: Fire').immune).toEqual([])
  })

  it('has none where the note lists none', () => {
    expect(defencesFrom('# Goblin')).toEqual({ immune: [], resistant: [], vulnerable: [] })
  })

  it('never matches a conditional entry', () => {
    expect(afterDefences(10, 'thunder', defencesFrom('resistances: Thunder (Air Only)'))).toEqual({ dealt: 10, defence: null })
  })
})

describe('defences against damage', () => {
  const FIRE_ELEMENTAL = { immune: ['fire'], resistant: ['cold'], vulnerable: ['force'] }

  it('takes it all for an immunity', () => {
    expect(afterDefences(14, 'Fire', FIRE_ELEMENTAL)).toEqual({ dealt: 0, defence: 'immune' })
  })

  it('halves for a resistance, rounding down', () => {
    expect(afterDefences(15, 'cold', FIRE_ELEMENTAL)).toEqual({ dealt: 7, defence: 'resistant' })
  })

  it('doubles for a vulnerability', () => {
    expect(afterDefences(5, 'force', FIRE_ELEMENTAL)).toEqual({ dealt: 10, defence: 'vulnerable' })
  })

  it('leaves everything else, and damage of no type', () => {
    expect(afterDefences(9, 'acid', FIRE_ELEMENTAL)).toEqual({ dealt: 9, defence: null })
    expect(afterDefences(9, null, FIRE_ELEMENTAL)).toEqual({ dealt: 9, defence: null })
    expect(afterDefences(9, 'fire')).toEqual({ dealt: 9, defence: null })
  })
})

describe('taking damage off a token', () => {
  const NOTE_PATH = 'bestiary/target.md'
  const FIRE_ELEMENTAL = ['```statblock', 'immunities: Fire, Poison', 'resistances: Cold', '```'].join('\n')
  const HP = { hp: { current: 170, max: 170 } }

  /** A scene of a caster and one target, over a store whose `updateToken` is real enough. */
  function scene(target: RawToken, note = '', { canUpdate = true } = {}) {
    const tokens: Record<string, RawToken> = {
      m: { name: 'Mordecai Vane', notePath: 'm.md', x: 0, y: 0 },
      t: { name: 'Target', statblockPath: NOTE_PATH, x: 840, y: 0, ...target },
    }
    const updates: unknown[] = []
    const state = {
      objects: { tokens },
      ...(canUpdate && {
        updateToken: (id: string, change: { resources: Record<string, unknown> }) => {
          updates.push(change)
          tokens[id] = { ...tokens[id], ...change }
        },
      }),
    }
    const plugin = {
      files: [{ path: 'a.webm', name: 'EldritchBlast_01_Regular_Purple_30ft_1600x400', feet: 30, video: true }],
      atlasTab: () => ({ store: { getState: () => state } }),
      tokenOf: (_: unknown, id: string) => {
        const t = tokens[id]
        return t ? { x: t.x as number, y: t.y as number } : null
      },
      scaleOf: () => ({ cell: 140, feetPerCell: 5 }),
      mapOf: () => 'scene.atlasmap',
      cast: () => {},
      pickToken: () => {},
    }
    const app = {
      plugins: { plugins: { 'atlas-spell-effects': plugin } },
      vault: {
        getFileByPath: (path: string) => (path === NOTE_PATH ? { path } : null),
        cachedRead: () => Promise.resolve(note),
      },
      metadataCache: { getFileCache: () => null },
    } as unknown as App
    const aim = aimSpell(app, 'Eldritch Blast', { name: 'Mordecai Vane', notePath: 'm.md' }) as ReadyAim
    return { aim, updates, tokens }
  }

  it('takes it off the hit points and leaves the rest of the token', async () => {
    const { aim, tokens } = scene({ resources: { ...HP, ki: { current: 3, max: 5 } } })
    expect(await aim.hurt('t', 9, 'force')).toEqual({ dealt: 9, defence: null, current: 161, max: 170 })
    expect(tokens.t.resources).toEqual({ hp: { current: 161, max: 170 }, ki: { current: 3, max: 5 } })
  })

  it('stops at 0, and reports what was dealt', async () => {
    const { aim, tokens } = scene({ resources: { hp: { current: 4, max: 7 } } })
    expect(await aim.hurt('t', 9, 'force')).toMatchObject({ dealt: 9, current: 0 })
    expect(tokens.t.resources).toEqual({ hp: { current: 0, max: 7 } })
  })

  it('takes nothing from a creature immune to it', async () => {
    const { aim, tokens } = scene({ resources: HP }, FIRE_ELEMENTAL)
    expect(await aim.hurt('t', 9, 'fire')).toMatchObject({ dealt: 0, defence: 'immune', current: 170 })
    expect(tokens.t.resources).toEqual(HP)
  })

  it('halves it for a resistance', async () => {
    const { aim } = scene({ resources: HP }, FIRE_ELEMENTAL)
    expect(await aim.hurt('t', 9, 'cold')).toMatchObject({ dealt: 4, defence: 'resistant', current: 166 })
  })

  it('builds on the last hit, not the hit points it started with', async () => {
    const { aim } = scene({ resources: HP })
    await aim.hurt('t', 9, 'force')
    expect(await aim.hurt('t', 6, 'force')).toMatchObject({ current: 155 })
  })

  it('leaves alone a token with no hit points', async () => {
    const { aim, updates } = scene({})
    expect(await aim.hurt('t', 9, 'force')).toBeNull()
    expect(updates).toEqual([])
  })

  it('leaves alone a token that left while the note was read', async () => {
    const { aim, tokens, updates } = scene({ resources: HP })
    const hurt = aim.hurt('t', 9, 'force')
    delete tokens.t
    expect(await hurt).toBeNull()
    expect(updates).toEqual([])
  })

  it('leaves alone a store that has lost `updateToken`', async () => {
    const { aim } = scene({ resources: HP }, '', { canUpdate: false })
    expect(await aim.hurt('t', 9, 'force')).toBeNull()
  })
})
