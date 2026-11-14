import { afterEach, describe, expect, it, vi } from 'vitest'
import type { App } from 'obsidian'

import { fakeAtlas } from '../../__harness__/atlasScene'
import type { RawToken } from '../model/beam'
import { BOLT_SHOWN_MS } from '../model/beam'
import { aimPush, aimSpell, canAim, type ReadyAim } from './bridge'

/**
 * The bridge against a fake of Atlas 0.15.0's scene (MYDND-211). What this
 * proves: an Atlas that is missing or has changed shape reads as "nothing to aim
 * at", never as a throw out of a click, and a bolt comes and goes off the undo
 * history. What it cannot prove is that the real Atlas still has this shape:
 * that was checked in Obsidian, and the chain is undeclared.
 */

const NOTE = 'characters/level-20/Mordecai Vane.md'
const CHARACTER = { name: 'Mordecai Vane', notePath: NOTE }

const scene = (): Record<string, RawToken & Record<string, unknown>> => ({
  m: { name: 'Mordecai Vane', notePath: NOTE, x: 0, y: 0 },
  a: { name: 'Archmage', x: 840, y: 0 },
})

const asApp = (app: unknown): App => app as App

const ready = (app: App, spell = 'Eldritch Blast'): ReadyAim => {
  const aim = aimSpell(app, spell, CHARACTER, '120 feet')
  if (aim.kind !== 'ready') throw new Error(`expected a ready aim, got ${aim.kind}`)
  return aim
}

afterEach(() => {
  vi.useRealTimers()
})

describe('when there is nothing to aim with', () => {
  it('asks nothing of an app with no workspace, as on the web', () => {
    expect(aimSpell({} as App, 'Eldritch Blast', CHARACTER)).toEqual({ kind: 'none' })
  })

  it('asks nothing with no Atlas map open', () => {
    const app = asApp({ workspace: { getLeavesOfType: () => [] } })
    expect(aimSpell(app, 'Eldritch Blast', CHARACTER)).toEqual({ kind: 'none' })
  })

  it('asks nothing of a view whose store has moved', () => {
    const fake = fakeAtlas(scene())
    const app = asApp({ workspace: { getLeavesOfType: () => [{ view: { atlasStore: {} } }, null, { view: null }] } })
    expect(aimSpell(app, 'Eldritch Blast', CHARACTER)).toEqual({ kind: 'none' })
    expect(aimSpell(asApp(fake.app()), 'Eldritch Blast', CHARACTER).kind).toBe('ready')
  })

  // Fireball is cast at a point, not a creature: the negative control for the table.
  it('asks nothing for a spell that is not aimed at a creature', () => {
    const app = asApp(fakeAtlas(scene()).app())
    expect(aimSpell(app, 'Shield', CHARACTER)).toEqual({ kind: 'none' })
    expect(aimSpell(app, 'Fireball', CHARACTER)).toEqual({ kind: 'none' })
  })

  it('no longer needs, or reads, the Atlas Spell Effects plugin', () => {
    const app = asApp({ plugins: { plugins: { 'atlas-spell-effects': { files: [] } } } })
    expect(aimSpell(app, 'Eldritch Blast', CHARACTER)).toEqual({ kind: 'none' })
  })
})

describe('when a token is missing', () => {
  it('says the caster is not on this map', () => {
    const app = asApp(fakeAtlas(scene()).app())
    expect(aimSpell(app, 'Eldritch Blast', { name: 'Ilse', notePath: 'ilse.md' })).toEqual({ kind: 'no-caster' })
  })

  it('says the caster is alone', () => {
    const app = asApp(fakeAtlas({ m: scene().m }).app())
    expect(aimSpell(app, 'Eldritch Blast', CHARACTER)).toEqual({ kind: 'no-targets' })
  })
})

describe('a spell aimed at a token', () => {
  it('offers the scene and the range, measured on the map', () => {
    const aim = ready(asApp(fakeAtlas(scene()).app()))
    expect(aim.targets).toMatchObject([{ id: 'a', label: 'Archmage', feet: 30 }])
    expect(aim.range).toBe(120)
  })

  it('reads the square from the scene when the renderer will not say', () => {
    const fake = fakeAtlas(scene(), { renderer: false, state: { grid: { size: 280 } } })
    expect(ready(asApp(fake.app())).targets[0].feet).toBe(15)
  })

  it('takes the map the GM is working on', () => {
    const idle = fakeAtlas({ m: scene().m, g: { name: 'Goblin', x: 140, y: 0 } })
    const busy = fakeAtlas(scene())
    const app = asApp({
      workspace: {
        getLeavesOfType: () => [idle.leaf, busy.leaf],
        getMostRecentLeaf: () => busy.leaf,
      },
    })
    expect(ready(app).targets.map(t => t.label)).toEqual(['Archmage'])
  })

  describe('the bolt', () => {
    it("is one of Atlas' own lines, from the caster's edge to the target, in the spell's look", async () => {
      vi.useFakeTimers()
      const fake = fakeAtlas(scene())
      void ready(asApp(fake.app())).play('a')
      expect(fake.drawn).toEqual([
        {
          id: 'measure_1',
          kind: 'measure',
          shape: 'line',
          points: [
            { x: 70, y: 0 },
            { x: 840, y: 0 },
          ],
          width: 56,
          color: '#7852ee',
          effect: 'lightning',
          walls: false,
        },
      ])
    })

    it('stays until it has struck, then goes, and only then settles', async () => {
      vi.useFakeTimers()
      const fake = fakeAtlas(scene())
      let settled = false
      void ready(asApp(fake.app()))
        .play('a')
        ?.then(() => {
          settled = true
        })
      await vi.advanceTimersByTimeAsync(BOLT_SHOWN_MS - 1)
      expect(Object.keys(fake.measures)).toEqual(['measure_1'])
      expect(settled).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      expect(fake.measures).toEqual({})
      expect(settled).toBe(true)
    })

    // An undo after a cast must take back the hit points, not half a bolt.
    it('comes and goes off the undo history', async () => {
      vi.useFakeTimers()
      const fake = fakeAtlas(scene())
      void ready(asApp(fake.app())).play('a')
      await vi.advanceTimersByTimeAsync(BOLT_SHOWN_MS)
      expect(fake.tracking).toEqual(['untracked', 'untracked'])
    })

    it('takes the look the spell has', () => {
      vi.useFakeTimers()
      const fake = fakeAtlas(scene())
      void ready(asApp(fake.app()), 'Ray of Frost').play('a')
      void ready(asApp(fake.app()), 'Fire Bolt').play('a')
      expect(fake.drawn.map(m => m.effect)).toEqual(['frost', 'fire'])
    })

    it('goes wide of the token on a miss', () => {
      vi.useFakeTimers()
      const fake = fakeAtlas(scene())
      void ready(asApp(fake.app())).play('a', true)
      expect(Math.abs(fake.drawn[0].points?.[1].y ?? 0)).toBe(105)
    })

    it("lies on the caster's floor, and only the GM sees a hidden caster's", () => {
      vi.useFakeTimers()
      const fake = fakeAtlas({ ...scene(), m: { ...scene().m, level: 'upper', isHidden: true } })
      void ready(asApp(fake.app())).play('a')
      expect(fake.drawn[0]).toMatchObject({ level: 'upper', hidden: true })
    })

    it('reads the tokens again when it plays, since they may have moved', () => {
      vi.useFakeTimers()
      const fake = fakeAtlas(scene())
      const aim = ready(asApp(fake.app()))
      fake.tokens.m.x = 420
      void aim.play('a')
      expect(fake.drawn[0].points?.[0].x).toBe(490)
    })

    it('reports a target that has gone', () => {
      const fake = fakeAtlas(scene())
      const aim = ready(asApp(fake.app()))
      delete fake.tokens.a
      expect(aim.play('a')).toBeNull()
      expect(fake.drawn).toEqual([])
    })

    it('draws nothing, and waits for nothing, with no canvas to time it by', async () => {
      const fake = fakeAtlas(scene(), { canvas: false })
      await expect(ready(asApp(fake.app())).play('a')).resolves.toBeUndefined()
      expect(fake.drawn).toEqual([])
    })

    // An Atlas before 0.15.0: the cast still aims, rolls and pushes.
    it('draws nothing, and waits for nothing, on an Atlas that keeps no measurements', async () => {
      const fake = fakeAtlas(scene(), { measures: false })
      await expect(ready(asApp(fake.app())).play('a')).resolves.toBeUndefined()
    })
  })

  describe('a click on the map', () => {
    it('answers the token Atlas selects for it', () => {
      const fake = fakeAtlas(scene())
      const picked: string[] = []
      ready(asApp(fake.app())).pickOnMap(id => picked.push(id))
      fake.select('a')
      expect(picked).toEqual(['a'])
      expect(fake.listening()).toBe(0)
    })

    // A click on the token already selected would change nothing, and never answer.
    it('clears the selection first', () => {
      const fake = fakeAtlas(scene())
      fake.select('a')
      const picked: string[] = []
      ready(asApp(fake.app())).pickOnMap(id => picked.push(id))
      expect(fake.store.getState().selectedIds).toEqual([])
      fake.select('a')
      expect(picked).toEqual(['a'])
    })

    it('waits past the caster, a box of several, and an id that is no token', () => {
      const fake = fakeAtlas(scene())
      const picked: string[] = []
      ready(asApp(fake.app())).pickOnMap(id => picked.push(id))
      fake.select('m')
      fake.select('a', 'm')
      fake.select('wall_1')
      expect(picked).toEqual([])
      fake.select('a')
      expect(picked).toEqual(['a'])
    })

    // In the map's own document, so a map in a popout hears it.
    it('stops on Escape, and says so', () => {
      const fake = fakeAtlas(scene())
      const picked: string[] = []
      let stopped = 0
      ready(asApp(fake.app())).pickOnMap(
        id => picked.push(id),
        () => (stopped += 1),
      )
      fake.press('Enter')
      expect(stopped).toBe(0)
      fake.press('Escape')
      fake.select('a')
      expect({ picked, stopped, listening: fake.listening(), keys: fake.listeningForKeys() }).toEqual({
        picked: [],
        stopped: 1,
        listening: 0,
        keys: 0,
      })
    })

    it('lets go of the keyboard once a token is picked', () => {
      const fake = fakeAtlas(scene())
      ready(asApp(fake.app())).pickOnMap(() => {})
      expect(fake.listeningForKeys()).toBe(1)
      fake.select('a')
      expect(fake.listeningForKeys()).toBe(0)
    })

    // Without this, one click on a token would pay for two casts.
    it('lets only the latest pick land, and stops the one before', () => {
      const fake = fakeAtlas(scene())
      const picked: string[] = []
      const stopped: string[] = []
      const app = asApp(fake.app())
      ready(app).pickOnMap(
        id => picked.push(`first ${id}`),
        () => stopped.push('first'),
      )
      ready(app).pickOnMap(
        id => picked.push(`second ${id}`),
        () => stopped.push('second'),
      )
      fake.select('a')
      expect({ picked, stopped }).toEqual({ picked: ['second a'], stopped: ['first'] })
    })

    it('stops at once on a store that cannot be listened to', () => {
      const fake = fakeAtlas(scene())
      const app = asApp({ workspace: { getLeavesOfType: () => [{ view: { atlasStore: { getState: fake.store.getState } } }] } })
      let stopped = false
      ready(app).pickOnMap(
        () => {},
        () => (stopped = true),
      )
      expect(stopped).toBe(true)
    })
  })

  // MYDND-179.
  describe('pushing a token', () => {
    it('moves it straight away from the caster, and says how far', () => {
      const fake = fakeAtlas(scene())
      expect(ready(asApp(fake.app())).push('a', 10)).toEqual({ feet: 10, stop: null })
      expect(fake.moves).toEqual([['a', 1120, 0]])
    })

    it('settles it where a drag would, at its own size', () => {
      const fake = fakeAtlas({ ...scene(), a: { ...scene().a, size: 1.5 } })
      ready(asApp(fake.app())).push('a', 10)
      expect(fake.snapped.every(size => size === 1.5)).toBe(true)
      expect(fake.snapped).toHaveLength(2)
    })

    it('reads where the tokens are now, not where they were aimed', () => {
      const fake = fakeAtlas(scene())
      const aim = ready(asApp(fake.app()))
      fake.tokens.a.x = -840
      aim.push('a', 10)
      expect(fake.moves).toEqual([['a', -1120, 0]])
    })

    it('writes nothing where the token stays put', () => {
      const tokens = scene()
      const walls = { w: { type: 'solid', p1: { x: 910, y: -140 }, p2: { x: 910, y: 140 } } }
      const fake = fakeAtlas(tokens, { state: { objects: { tokens, walls } } })
      expect(ready(asApp(fake.app())).push('a', 10)).toEqual({ feet: 0, stop: 'wall' })
      expect(fake.moves).toEqual([])
    })

    it('goes on plain distance on a hex grid', () => {
      const fake = fakeAtlas(
        { m: scene().m, a: { name: 'Archmage', x: 420, y: 420 } },
        { state: { grid: { type: 'hex-vertical', snapToGrid: false } } },
      )
      ready(asApp(fake.app())).push('a', 10)
      expect(fake.moves[0][1]).toBeCloseTo(420 + 280 / Math.SQRT2)
      expect(fake.snapped).toEqual([])
    })

    it('does not snap a scene that has snapping off', () => {
      const fake = fakeAtlas(scene(), { state: { grid: { snapToGrid: false } } })
      ready(asApp(fake.app())).push('a', 10)
      expect(fake.snapped).toEqual([])
    })

    it('refuses a creature its note calls Huge, and moves nothing', () => {
      const fake = fakeAtlas({ ...scene(), a: { ...scene().a, statblockPath: 'bestiary/giant.md' } })
      const app = asApp(
        fake.app({
          vault: { getFileByPath: (path: string) => ({ path }) },
          metadataCache: { getFileCache: () => ({ frontmatter: { size: 'Huge' } }) },
        }),
      )
      expect(ready(app).push('a', 10)).toEqual({ feet: 0, stop: 'too-big' })
      expect(fake.moves).toEqual([])
    })

    it('refuses a token drawn 3×3 when it has no note', () => {
      const fake = fakeAtlas({ ...scene(), a: { ...scene().a, size: 2 } })
      expect(ready(asApp(fake.app())).push('a', 10)).toEqual({ feet: 0, stop: 'too-big' })
    })

    it('answers null, and does not throw, for a token that has gone', () => {
      const fake = fakeAtlas(scene())
      const aim = ready(asApp(fake.app()))
      delete fake.tokens.a
      expect(aim.push('a', 10)).toBeNull()
    })

    it('answers null for an Atlas that has renamed its move', () => {
      const fake = fakeAtlas(scene(), { state: { moveToken: undefined } })
      expect(ready(asApp(fake.app())).push('a', 10)).toBeNull()
    })

    it('still moves on an Atlas with no renderer to ask', () => {
      const fake = fakeAtlas(scene(), { renderer: false, state: { grid: { size: 140 } } })
      ready(asApp(fake.app())).push('a', 10)
      expect(fake.moves).toEqual([['a', 1120, 0]])
    })
  })
})

// MYDND-179: a weapon has no bolt, and needs none to push.
describe('aiming a push with no spell', () => {
  it('moves the token as a spell would', () => {
    const fake = fakeAtlas(scene())
    const aim = aimPush(asApp(fake.app()), CHARACTER)
    if (aim.kind !== 'ready') throw new Error(aim.kind)
    expect(aim.targets.map(t => t.label)).toEqual(['Archmage'])
    expect(aim.push('a', 10)).toEqual({ feet: 10, stop: null })
    expect(fake.moves).toEqual([['a', 1120, 0]])
  })

  it('answers none with no Atlas or no map', () => {
    expect(aimPush({} as App, CHARACTER)).toEqual({ kind: 'none' })
    expect(aimPush(asApp({ workspace: { getLeavesOfType: () => [] } }), CHARACTER)).toEqual({ kind: 'none' })
  })

  it('says when the character has no token, or nobody is there', () => {
    expect(aimPush(asApp(fakeAtlas(scene()).app()), { name: 'Nobody' })).toEqual({ kind: 'no-caster' })
    expect(aimPush(asApp(fakeAtlas({ m: scene().m }).app()), CHARACTER)).toEqual({ kind: 'no-targets' })
  })

  it('tells a render whether Atlas is installed, reading no scene', () => {
    expect(canAim({} as App)).toBe(false)
    expect(canAim(asApp({ plugins: { plugins: { 'atlas-spell-effects': {} } } }))).toBe(false)
    const reads = vi.fn(() => [])
    expect(canAim(asApp({ plugins: { plugins: { 'atlas-vtt': {} } }, workspace: { getLeavesOfType: reads } }))).toBe(true)
    expect(reads).not.toHaveBeenCalled()
  })
})
