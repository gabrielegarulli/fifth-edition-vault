import { afterEach, describe, expect, it } from 'vitest'
import type { App } from 'obsidian'

import { atlasAvailable, resolveAtlasDice, rollInScene, type RollSource } from './atlas'

/**
 * Ported from `obsidian-vault-characters`' Atlas-bridge suite (MYDND-7).
 *
 * This runs in the `logic` project — `atlas.ts` imports only the *type* `App`
 * from `obsidian`, and a type import is erased at compile time. So the accessor
 * walk is testable with no stub module at all, which is worth having: the chain
 * is **undeclared**, and any Atlas release can rename a hop in it without
 * calling that a break.
 *
 * What this cannot prove is that Atlas still *has* those accessors. That is what
 * the "Check the Atlas VTT dice bridge" command is for, against a running Atlas.
 */

interface Recorded {
  formula: string
  source: RollSource
}

/** An app whose Atlas chain is complete, recording what it is asked to roll. */
function appWithAtlas(): { app: App; rolls: Recorded[] } {
  const rolls: Recorded[] = []
  const diceTool = {
    rollDice: (formula: string, source: RollSource) => {
      rolls.push({ formula, source })
      return { total: 14, rolls: [[7, 7]] }
    },
  }
  const leaf = {
    view: { serviceManager: { getToolController: () => ({ getDiceTool: () => diceTool }) } },
  }
  const app = {
    workspace: { getLeavesOfType: (type: string) => (type === 'atlas-vtt' ? [leaf] : []) },
  } as unknown as App
  return { app, rolls }
}

const appWithLeaves = (leaves: unknown[]): App =>
  ({ workspace: { getLeavesOfType: () => leaves } }) as unknown as App

/**
 * There is no `window` in the `logic` project, which is the node one — and
 * `resolveAtlasDice` guards on exactly that (`typeof window !== 'undefined'`),
 * so the absence is itself covered by every test here that does not set one.
 * These two helpers supply and remove a fake global for the facade cases.
 */
const setPublishedFacade = (facade: unknown): void => {
  ;(globalThis as Record<string, unknown>).window = { AtlasVTT: facade }
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).window
})

describe('resolveAtlasDice', () => {
  it('finds nothing when no Atlas view is open', () => {
    expect(resolveAtlasDice(appWithLeaves([]))).toBeNull()
    expect(atlasAvailable(appWithLeaves([]))).toBe(false)
  })

  it('walks the accessor chain to the dice tool', () => {
    const { app } = appWithAtlas()
    expect(resolveAtlasDice(app)).not.toBeNull()
    expect(atlasAvailable(app)).toBe(true)
  })

  it('prefers a published window.AtlasVTT facade if Atlas ever grows one', () => {
    // Checked first so that a published facade is used with no change here.
    // There is no such facade today (verified at MYDND-7).
    const facade = { rollDice: () => ({ total: 3 }) }
    setPublishedFacade(facade)
    expect(resolveAtlasDice(appWithLeaves([]))).toBe(facade)
  })

  it('ignores a facade that cannot roll', () => {
    setPublishedFacade({ somethingElse: true })
    expect(resolveAtlasDice(appWithLeaves([]))).toBeNull()
  })

  it('works with no `window` at all, which is the case in plain Node', () => {
    expect(resolveAtlasDice(appWithLeaves([]))).toBeNull()
  })

  describe('a renamed hop falls through to null rather than throwing', () => {
    // Every hop is guarded individually, because a renamed accessor should read
    // as "no scene" — which every caller already handles — rather than surface
    // as an exception from inside a click handler.
    const cases: [string, unknown][] = [
      ['a leaf with no view', { view: null }],
      ['a view with no serviceManager', { view: {} }],
      ['a serviceManager with no getToolController', { view: { serviceManager: {} } }],
      [
        'a controller with no getDiceTool',
        { view: { serviceManager: { getToolController: () => ({}) } } },
      ],
      [
        'a controller that answers null',
        { view: { serviceManager: { getToolController: () => null } } },
      ],
      [
        'a dice tool with no rollDice',
        { view: { serviceManager: { getToolController: () => ({ getDiceTool: () => ({}) }) } } },
      ],
    ]

    for (const [name, leaf] of cases) {
      it(name, () => {
        expect(() => resolveAtlasDice(appWithLeaves([leaf]))).not.toThrow()
        expect(resolveAtlasDice(appWithLeaves([leaf]))).toBeNull()
      })
    }
  })
})

describe('rollInScene', () => {
  it('returns null with no scene open, rather than throwing', () => {
    // Falling back is correct: Phase 4's engine answers a null here by using its
    // own rngRoller, and a throw would take out the click.
    expect(rollInScene(appWithLeaves([]), '1d20+4', 'Initiative')).toBeNull()
  })

  it('passes the formula through untouched', () => {
    const { app, rolls } = appWithAtlas()
    rollInScene(app, '7d6', 'Sneak Attack')
    expect(rolls[0].formula).toBe('7d6')
  })

  it('tags the roll as coming from a statblock, which is how Atlas resolves it', () => {
    const { app, rolls } = appWithAtlas()
    rollInScene(app, '1d20+4', 'Initiative')
    expect(rolls[0].source.type).toBe('statblock')
  })

  it('labels the roll so the log names it', () => {
    const { app, rolls } = appWithAtlas()
    rollInScene(app, '1d20+4', 'Initiative')
    expect(rolls[0].source.abilityName).toBe('Initiative')
  })

  it('names the token and its note when the character is known', () => {
    const { app, rolls } = appWithAtlas()
    rollInScene(app, '1d20+4', 'Initiative', { name: 'Gibbs', notePath: 'characters/Gibbs.md' })
    expect(rolls[0].source.tokenName).toBe('Gibbs')
    expect(rolls[0].source.statblockPath).toBe('characters/Gibbs.md')
  })

  it('omits what it does not know rather than sending empty strings', () => {
    const { app, rolls } = appWithAtlas()
    rollInScene(app, '1d20', null, null)
    expect(rolls[0].source).toEqual({ type: 'statblock' })
  })

  it('returns the result, so a caller can build a turn order from it', () => {
    const { app } = appWithAtlas()
    expect(rollInScene(app, '1d20+4', 'Initiative')?.total).toBe(14)
  })
})
