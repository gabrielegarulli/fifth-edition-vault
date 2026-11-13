// The Spell Effects bridge: aiming a spell or a push at an Atlas token
// through the host's `App`.

import type { App } from 'obsidian'

import { acFrom, afterDefences, defencesFrom, type Defences, type Hurt } from '../model/attack'
import {
  beamArt,
  beamEffect,
  casterId,
  missPoint,
  rangeFeet,
  targetsFrom,
  type EffectFile,
  type Point,
  type RawToken,
  type SceneScale,
  type SceneTarget,
} from '../model/beam'
import { planPush, tooBigToPush, type Pushed, type RawWall } from '../model/push'

/**
 * The bridge to the Atlas Spell Effects plugin (MYDND-172).
 *
 * That plugin draws animated spells over an Atlas map and the players' screen,
 * so a cast from the sheet asks it to rather than drawing anything here. It is
 * someone else's plugin, and optional: without it, or without a map open, or for
 * a spell it has no art for, `aimSpell` answers `none` and Cast does what it
 * always did.
 *
 * ## The chain, and why it is fragile
 *
 * ```
 * app.plugins.plugins['atlas-spell-effects']   the plugin instance
 *   .atlasTab()                                the Atlas tab in use
 *   .tokenOf / .scaleOf / .mapOf               reading the scene
 *   .cast(effect) / .pickToken(tab, …)         drawing, and a click on the map
 * ```
 *
 * None of it is a declared API; it is what the plugin's own commands call, read
 * from its 0.6.0 `main.js`, and it calls itself a bridge until Atlas has effects
 * of its own. So every member is checked before use, like the dice chain in
 * `dice/obsidian/atlas.ts`, and a rename falls through to `none`: the spell still casts,
 * it just plays nothing.
 *
 * **Only `tab.store` and `tab.renderer` reach Atlas**, through the plugin's own
 * tab, so this adds no second walk of Atlas' accessors beside the dice one. The
 * AGPL boundary in `dice/obsidian/atlas.ts` applies here unchanged: nothing of Atlas is
 * ever `require`d.
 *
 * `aimPush` is the same scene with no art asked of it, for a push that plays
 * nothing: the Push mastery on a weapon's row (MYDND-179).
 */

const PLUGIN_ID = 'atlas-spell-effects'

interface SceneState {
  objects?: { tokens?: Record<string, RawToken>; walls?: Record<string, RawWall> }
  /** The scene's floors, bottom first. */
  levels?: readonly { id?: unknown }[]
  grid?: { snapToGrid?: boolean; type?: string }
  updateToken?: (id: string, updates: { resources: Record<string, unknown> }) => void
  moveToken?: (id: string, x: number, y: number) => void
}

interface EffectsTab {
  store?: { getState?: () => SceneState | null | undefined }
  renderer?: {
    getGridSystem?: () => { snapTokenCenter?: (x: number, y: number, size: number) => Point } | null | undefined
  }
}

interface EffectsPlugin {
  files: EffectFile[]
  atlasTab(): EffectsTab | null | undefined
  tokenOf(tab: EffectsTab, id: string): (Point & { r?: number }) | null | undefined
  scaleOf(tab: EffectsTab): SceneScale
  mapOf(tab: EffectsTab): string
  cast(effect: unknown): void
  pickToken(tab: EffectsTab, prompt: string, done: (tokenId: string) => void): void
}

/** The plugin, or `null` if it is missing or no longer has this shape. */
function resolvePlugin(app: App): EffectsPlugin | null {
  const host = app as unknown as { plugins?: { plugins?: Record<string, unknown> } }
  const plugin = host.plugins?.plugins?.[PLUGIN_ID] as Partial<EffectsPlugin> | undefined
  if (!plugin || !Array.isArray(plugin.files)) return null
  const methods = [plugin.atlasTab, plugin.tokenOf, plugin.scaleOf, plugin.mapOf, plugin.cast, plugin.pickToken]
  return methods.every(method => typeof method === 'function') ? (plugin as EffectsPlugin) : null
}

/** The scene read and ready: who is there, and what can be done to them with no art. */
export interface ReadyPush {
  kind: 'ready'
  targets: SceneTarget[]
  /** Pushes the token straight away from the caster. Null if it cannot be moved. */
  push(targetId: string, feet: number): Pushed | null
  /** Asks for a click on a token; `done` is not called if the GM backs out. */
  pickOnMap(prompt: string, done: (targetId: string) => void): void
}

/** A spell aimed and ready: who it could hit, and how to play it. */
export interface ReadyAim extends ReadyPush {
  /** The spell's range in feet, or null where it has no number. */
  range: number | null
  /** Plays the spell at this token, or past it. False if either token has since gone. */
  play(targetId: string, miss?: boolean): boolean
  /** What the token's linked note says its AC is, or null. */
  acOf(targetId: string): number | null
  /** Takes damage off the token's HP, after its defences. Null if it has no HP. */
  hurt(targetId: string, amount: number, damageType: string | null | undefined): Promise<Hurt | null>
}

type NotReady =
  /** Nothing to draw with: no plugin, no map, or no art for this spell. */
  | { kind: 'none' }
  /** There is art, but the character has no token on this map. */
  | { kind: 'no-caster' }
  /** The caster is alone on this map. */
  | { kind: 'no-targets' }

export type Aim = NotReady | ReadyAim
export type PushAim = NotReady | ReadyPush

/**
 * Numbers each pick on the map. The plugin's `pickToken` has no cancel, so a
 * second Cast would leave the first listening; only the latest may land, or one
 * click on a token would pay for two casts.
 */
let latestPick = 0

const effectId = (now: number): string => `mydnd${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`

/**
 * A token's AC, from the frontmatter of the note it links to. The metadata cache
 * is already parsed, so this reads no file: a statblock for a monster, the
 * character's own note for a player. Checked member by member, because the web
 * host's `App` is not Obsidian's.
 */
function acOfToken(app: App, token: RawToken | undefined): number | null {
  const file = linkedNote(app, token)
  const frontmatter = file ? app.metadataCache?.getFileCache?.(file)?.frontmatter : null
  return acFrom(frontmatter?.ac)
}

const linkedNote = (app: App, token: RawToken | undefined) => {
  const path = [token?.statblockPath, token?.notePath].find(p => typeof p === 'string' && p !== '') as string | undefined
  return path ? (app.vault?.getFileByPath?.(path) ?? null) : null
}

/** A token's defences, from its note's statblock. A note that will not read has none. */
async function defencesOfToken(app: App, token: RawToken | undefined): Promise<Defences | undefined> {
  const file = linkedNote(app, token)
  if (!file || typeof app.vault?.cachedRead !== 'function') return undefined
  return app.vault.cachedRead(file).then(defencesFrom, () => undefined)
}

/** Whether a push can be drawn at all: read in a render, so it touches no scene. */
export const canAim = (app: App): boolean => resolvePlugin(app) !== null

/**
 * Pushes one token, writing nothing where it stays put.
 *
 * `moveToken` and not `updateToken`, because it is the write that tells Atlas'
 * ambient audio the listener moved. It is one step on Atlas' undo history.
 */
function pushToken(
  app: App,
  plugin: EffectsPlugin,
  tab: EffectsTab,
  caster: string,
  targetId: string,
  feet: number,
): Pushed | null {
  const state = tab.store?.getState?.()
  const tokens = state?.objects?.tokens
  const token = tokens?.[targetId]
  const from = plugin.tokenOf(tab, caster)
  if (!tokens || !token || !from || typeof state?.moveToken !== 'function') return null

  const file = linkedNote(app, token)
  const noteSize: unknown = file ? app.metadataCache?.getFileCache?.(file)?.frontmatter?.size : null
  if (tooBigToPush(noteSize, token.size)) return { feet: 0, stop: 'too-big' }

  const snaps = state.grid?.snapToGrid ?? true
  const grid = snaps ? tab.renderer?.getGridSystem?.() : null
  const { at, ...pushed } = planPush({
    tokens,
    walls: state.objects?.walls,
    floors: state.levels,
    targetId,
    from,
    feet,
    scale: plugin.scaleOf(tab),
    onSquares: snaps && !/hex/i.test(state.grid?.type ?? ''),
    snap: (point, size) => grid?.snapTokenCenter?.(point.x, point.y, size) ?? point,
  })
  if (pushed.feet > 0) state.moveToken(targetId, at.x, at.y)
  return pushed
}

/** Who is on the map with this character, whatever is about to be done to them. */
function sceneAim(
  app: App,
  plugin: EffectsPlugin,
  tab: EffectsTab,
  character: { name?: string; notePath?: string } | null | undefined,
): NotReady | (ReadyPush & { caster: string }) {
  const tokens = tab.store?.getState?.()?.objects?.tokens
  if (!tokens) return { kind: 'none' }

  const caster = casterId(tokens, character)
  const from = caster ? plugin.tokenOf(tab, caster) : null
  if (!caster || !from) return { kind: 'no-caster' }

  const targets = targetsFrom(tokens, caster, from, plugin.scaleOf(tab))
  if (targets.length === 0) return { kind: 'no-targets' }

  return {
    kind: 'ready',
    caster,
    targets,
    push: (targetId, feet) => pushToken(app, plugin, tab, caster, targetId, feet),
    pickOnMap(prompt, done) {
      latestPick += 1
      const pick = latestPick
      plugin.pickToken(tab, prompt, targetId => {
        if (pick === latestPick) done(targetId)
      })
    },
  }
}

/** What a push with no spell can aim at right now. Read when pressed, as `aimSpell` is. */
export function aimPush(app: App, character: { name?: string; notePath?: string } | null | undefined): PushAim {
  const plugin = resolvePlugin(app)
  const tab = plugin?.atlasTab()
  return plugin && tab ? sceneAim(app, plugin, tab, character) : { kind: 'none' }
}

const isHitPoints = (value: unknown): value is { current: number; max: number } => {
  const hp = value as { current?: unknown; max?: unknown } | null | undefined
  return Number.isFinite(hp?.current) && Number.isFinite(hp?.max)
}

/**
 * What a cast of `spell` can aim at right now.
 *
 * Read when Cast is pressed, never in a render: a token moves without this pane
 * hearing about it.
 */
export function aimSpell(
  app: App,
  spell: string,
  character: { name?: string; notePath?: string } | null | undefined,
  range?: string | null,
): Aim {
  const plugin = resolvePlugin(app)
  const tab = plugin?.atlasTab()
  if (!plugin || !tab) return { kind: 'none' }

  const art = beamArt(spell, plugin.files)
  if (art.length === 0) return { kind: 'none' }

  const scene = sceneAim(app, plugin, tab, character)
  if (scene.kind !== 'ready') return scene
  const { caster } = scene

  return {
    ...scene,
    range: rangeFeet(range),
    // Positions are read again here: a pick on the map can take a while.
    play(targetId, miss = false) {
      const start = plugin.tokenOf(tab, caster)
      const end = plugin.tokenOf(tab, targetId)
      if (!start || !end) return false
      const scale = plugin.scaleOf(tab)
      const radius = end.r ?? scale.cell / 2
      const now = Date.now()
      const effect = beamEffect({
        id: effectId(now),
        map: plugin.mapOf(tab),
        name: spell,
        art,
        from: start,
        to: miss ? missPoint(start, end, radius, Math.random() < 0.5 ? 1 : -1) : end,
        scale,
        now,
      })
      if (!effect) return false
      plugin.cast(effect)
      return true
    },
    acOf: targetId => acOfToken(app, tab.store?.getState?.()?.objects?.tokens?.[targetId]),
    async hurt(targetId, amount, damageType) {
      const before = tab.store?.getState?.()?.objects?.tokens?.[targetId]
      const { dealt, defence } = afterDefences(amount, damageType, await defencesOfToken(app, before))

      // Read after the wait, and written whole: `updateToken` replaces `resources`.
      const state = tab.store?.getState?.()
      const token = state?.objects?.tokens?.[targetId]
      const hp = token?.resources?.hp
      if (!token || !isHitPoints(hp) || typeof state?.updateToken !== 'function') return null
      // Stops at 0, as Atlas' own `clampValue` does.
      const current = Math.max(0, hp.current - dealt)
      state.updateToken(targetId, { resources: { ...token.resources, hp: { ...hp, current } } })
      return { dealt, defence, current, max: hp.max }
    },
  }
}
