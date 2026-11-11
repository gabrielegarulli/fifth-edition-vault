import { describe, expect, it } from 'vitest'
import type { App } from 'obsidian'

import type { BeamEffect, RawToken } from './beam'
import { aimPush, aimSpell, canAim, type ReadyAim } from './bridge'

/**
 * The bridge against a fake of the plugin's 0.6.0 surface. What this proves: a
 * plugin that is missing or has changed shape reads as "nothing to draw with",
 * never as a throw out of a click. What it cannot prove is that the real plugin
 * still has this shape: that was checked in Obsidian, and the chain is undeclared.
 */

const NOTE = 'characters/level-20/Mordecai Vane.md'
const CHARACTER = { name: 'Mordecai Vane', notePath: NOTE }

const FILES = [
  { path: 'a/EldritchBlast_01_Regular_Purple_30ft_1600x400.webm', name: 'EldritchBlast_01_Regular_Purple_30ft_1600x400', feet: 30, video: true },
]

const SCENE: Record<string, RawToken> = {
  m: { name: 'Mordecai Vane', notePath: NOTE, x: 0, y: 0 },
  a: { name: 'Archmage', x: 840, y: 0 },
}

function fakePlugin(tokens: Record<string, RawToken> = SCENE, state: Record<string, unknown> = {}) {
  const cast: BeamEffect[] = []
  const pickers: ((id: string) => void)[] = []
  const moves: [string, number, number][] = []
  const snapped: number[] = []
  const moveToken = (id: string, x: number, y: number) => moves.push([id, x, y])
  const tab = {
    store: { getState: () => ({ objects: { tokens }, moveToken, ...state }) },
    renderer: {
      getGridSystem: () => ({
        snapTokenCenter(x: number, y: number, size: number) {
          snapped.push(size)
          return { x: Math.round(x / 140) * 140, y: Math.round(y / 140) * 140 }
        },
      }),
    },
  }
  return {
    cast,
    pickers,
    moves,
    snapped,
    tokens,
    plugin: {
      files: FILES,
      atlasTab: () => tab,
      tokenOf: (_: unknown, id: string) => {
        const t = tokens[id]
        return t ? { x: t.x as number, y: t.y as number } : null
      },
      scaleOf: () => ({ cell: 140, feetPerCell: 5 }),
      mapOf: () => 'scene.atlasmap',
      cast: (e: BeamEffect) => cast.push(e),
      pickToken: (_: unknown, __: string, done: (id: string) => void) => pickers.push(done),
    },
  }
}

const appWith = (plugin: unknown): App => ({ plugins: { plugins: { 'atlas-spell-effects': plugin } } }) as unknown as App

const ready = (app: App): ReadyAim => {
  const aim = aimSpell(app, 'Eldritch Blast', CHARACTER, '120 feet')
  if (aim.kind !== 'ready') throw new Error(`expected a ready aim, got ${aim.kind}`)
  return aim
}

describe('when there is nothing to draw with', () => {
  it('asks nothing of an app with no plugin registry, as on the web', () => {
    expect(aimSpell({} as App, 'Eldritch Blast', CHARACTER)).toEqual({ kind: 'none' })
  })

  it('asks nothing when the plugin is not installed', () => {
    expect(aimSpell({ plugins: { plugins: {} } } as unknown as App, 'Eldritch Blast', CHARACTER)).toEqual({ kind: 'none' })
  })

  it('asks nothing of a plugin that has lost a method', () => {
    for (const method of ['atlasTab', 'tokenOf', 'scaleOf', 'mapOf', 'cast', 'pickToken']) {
      const { plugin } = fakePlugin()
      expect(aimSpell(appWith({ ...plugin, [method]: undefined }), 'Eldritch Blast', CHARACTER)).toEqual({ kind: 'none' })
    }
  })

  it('asks nothing with no map open', () => {
    const { plugin } = fakePlugin()
    expect(aimSpell(appWith({ ...plugin, atlasTab: () => null }), 'Eldritch Blast', CHARACTER)).toEqual({ kind: 'none' })
  })

  it('asks nothing for a spell with no art', () => {
    expect(aimSpell(appWith(fakePlugin().plugin), 'Shield', CHARACTER)).toEqual({ kind: 'none' })
  })

  it('asks nothing of a tab whose store has moved', () => {
    const { plugin } = fakePlugin()
    expect(aimSpell(appWith({ ...plugin, atlasTab: () => ({}) }), 'Eldritch Blast', CHARACTER)).toEqual({ kind: 'none' })
  })
})

describe('when a token is missing', () => {
  it('says the caster is not on this map', () => {
    expect(aimSpell(appWith(fakePlugin().plugin), 'Eldritch Blast', { name: 'Ilse', notePath: 'ilse.md' })).toEqual({ kind: 'no-caster' })
  })

  it('says the caster is alone', () => {
    const { plugin } = fakePlugin({ m: SCENE.m })
    expect(aimSpell(appWith(plugin), 'Eldritch Blast', CHARACTER)).toEqual({ kind: 'no-targets' })
  })
})

describe('a spell aimed at a token', () => {
  it('offers the scene and the range', () => {
    const aim = ready(appWith(fakePlugin().plugin))
    expect(aim.targets).toMatchObject([{ id: 'a', label: 'Archmage', feet: 30 }])
    expect(aim.range).toBe(120)
  })

  it('hands the plugin a beam between the two tokens', () => {
    const fake = fakePlugin()
    expect(ready(appWith(fake.plugin)).play('a')).toBe(true)
    expect(fake.cast).toHaveLength(1)
    expect(fake.cast[0]).toMatchObject({ map: 'scene.atlasmap', name: 'Eldritch Blast', shape: 'line', file: FILES[0].path })
  })

  it('reads the tokens again when it plays, since they may have moved', () => {
    const fake = fakePlugin({ m: { ...SCENE.m }, a: { ...SCENE.a } })
    const aim = ready(appWith(fake.plugin))
    fake.tokens.m.x = 420
    aim.play('a')
    expect(fake.cast[0].at.x).toBeGreaterThan(200)
  })

  it('reports a target that has gone', () => {
    const fake = fakePlugin({ m: { ...SCENE.m }, a: { ...SCENE.a } })
    const aim = ready(appWith(fake.plugin))
    delete fake.tokens.a
    expect(aim.play('a')).toBe(false)
    expect(fake.cast).toEqual([])
  })

  it('passes a click on the map through', () => {
    const fake = fakePlugin()
    const picked: string[] = []
    ready(appWith(fake.plugin)).pickOnMap('Pick', id => picked.push(id))
    fake.pickers[0]('a')
    expect(picked).toEqual(['a'])
  })

  // MYDND-179.
  describe('pushing a token', () => {
    it('moves it straight away from the caster, and says how far', () => {
      const fake = fakePlugin()
      expect(ready(appWith(fake.plugin)).push('a', 10)).toEqual({ feet: 10, stop: null })
      expect(fake.moves).toEqual([['a', 1120, 0]])
    })

    it('settles it where a drag would, at its own size', () => {
      const fake = fakePlugin({ ...SCENE, a: { ...SCENE.a, size: 1.5 } })
      ready(appWith(fake.plugin)).push('a', 10)
      expect(fake.snapped.every(size => size === 1.5)).toBe(true)
      expect(fake.snapped).toHaveLength(2)
    })

    it('reads where the tokens are now, not where they were aimed', () => {
      const fake = fakePlugin({ m: { ...SCENE.m }, a: { ...SCENE.a } })
      const aim = ready(appWith(fake.plugin))
      fake.tokens.a.x = -840
      aim.push('a', 10)
      expect(fake.moves).toEqual([['a', -1120, 0]])
    })

    it('writes nothing where the token stays put', () => {
      const walls = { w: { type: 'solid', p1: { x: 910, y: -140 }, p2: { x: 910, y: 140 } } }
      const fake = fakePlugin(SCENE, { objects: { tokens: SCENE, walls } })
      expect(ready(appWith(fake.plugin)).push('a', 10)).toEqual({ feet: 0, stop: 'wall' })
      expect(fake.moves).toEqual([])
    })

    it('goes on plain distance on a hex grid', () => {
      const fake = fakePlugin(
        { m: SCENE.m, a: { name: 'Archmage', x: 420, y: 420 } },
        { grid: { type: 'hex-vertical', snapToGrid: false } },
      )
      ready(appWith(fake.plugin)).push('a', 10)
      expect(fake.moves[0][1]).toBeCloseTo(420 + 280 / Math.SQRT2)
      expect(fake.snapped).toEqual([])
    })

    it('does not snap a scene that has snapping off', () => {
      const fake = fakePlugin(SCENE, { grid: { snapToGrid: false } })
      ready(appWith(fake.plugin)).push('a', 10)
      expect(fake.snapped).toEqual([])
    })

    it('refuses a creature its note calls Huge, and moves nothing', () => {
      const fake = fakePlugin({ ...SCENE, a: { ...SCENE.a, statblockPath: 'bestiary/giant.md' } })
      const app = {
        ...appWith(fake.plugin),
        vault: { getFileByPath: (path: string) => ({ path }) },
        metadataCache: { getFileCache: () => ({ frontmatter: { size: 'Huge' } }) },
      } as unknown as App
      expect(ready(app).push('a', 10)).toEqual({ feet: 0, stop: 'too-big' })
      expect(fake.moves).toEqual([])
    })

    it('refuses a token drawn 3×3 when it has no note', () => {
      const fake = fakePlugin({ ...SCENE, a: { ...SCENE.a, size: 2 } })
      expect(ready(appWith(fake.plugin)).push('a', 10)).toEqual({ feet: 0, stop: 'too-big' })
    })

    it('answers null, and does not throw, for a token that has gone', () => {
      const fake = fakePlugin({ m: { ...SCENE.m }, a: { ...SCENE.a } })
      const aim = ready(appWith(fake.plugin))
      delete fake.tokens.a
      expect(aim.push('a', 10)).toBeNull()
    })

    it('answers null for an Atlas that has renamed its move', () => {
      const fake = fakePlugin(SCENE, { moveToken: undefined })
      expect(ready(appWith(fake.plugin)).push('a', 10)).toBeNull()
    })

    it('still moves on an Atlas with no grid system to ask', () => {
      const fake = fakePlugin()
      const tab = { store: fake.plugin.atlasTab().store }
      ready(appWith({ ...fake.plugin, atlasTab: () => tab })).push('a', 10)
      expect(fake.moves).toEqual([['a', 1120, 0]])
    })
  })

  // `pickToken` has no cancel: without this, one click would pay for two casts.
  it('lets only the latest pick land', () => {
    const fake = fakePlugin()
    const picked: string[] = []
    const app = appWith(fake.plugin)
    ready(app).pickOnMap('Pick', id => picked.push(`first ${id}`))
    ready(app).pickOnMap('Pick', id => picked.push(`second ${id}`))
    fake.pickers[0]('a')
    fake.pickers[1]('a')
    expect(picked).toEqual(['second a'])
  })
})

// MYDND-179: a weapon has no art, and needs none to push.
describe('aiming a push with no spell', () => {
  it('needs no art', () => {
    const { plugin } = fakePlugin()
    const aim = aimPush(appWith({ ...plugin, files: [] }), CHARACTER)
    expect(aim.kind).toBe('ready')
  })

  it('moves the token as a spell would', () => {
    const fake = fakePlugin()
    const aim = aimPush(appWith(fake.plugin), CHARACTER)
    if (aim.kind !== 'ready') throw new Error(aim.kind)
    expect(aim.targets.map(t => t.label)).toEqual(['Archmage'])
    expect(aim.push('a', 10)).toEqual({ feet: 10, stop: null })
    expect(fake.moves).toEqual([['a', 1120, 0]])
  })

  it('answers none with no plugin or no map', () => {
    const { plugin } = fakePlugin()
    expect(aimPush({} as App, CHARACTER)).toEqual({ kind: 'none' })
    expect(aimPush(appWith({ ...plugin, atlasTab: () => null }), CHARACTER)).toEqual({ kind: 'none' })
  })

  it('says when the character has no token, or nobody is there', () => {
    const { plugin } = fakePlugin()
    expect(aimPush(appWith(plugin), { name: 'Nobody' })).toEqual({ kind: 'no-caster' })
    expect(aimPush(appWith(fakePlugin({ m: SCENE.m }).plugin), CHARACTER)).toEqual({ kind: 'no-targets' })
  })

  it('tells a render whether there is any map to reach, reading no scene', () => {
    const { plugin } = fakePlugin()
    expect(canAim({} as App)).toBe(false)
    expect(canAim(appWith({ ...plugin, atlasTab: () => { throw new Error('read a scene') } }))).toBe(true)
  })
})
