// The spell bridge: aiming a spell or a push at an Atlas token through the
// host's `App`.

import type { App } from 'obsidian'

import { acFrom, afterDefences, defencesFrom, type Defences, type Hurt } from '../model/attack'
import {
  boltLine,
  boltOf,
  boltShownMs,
  casterId,
  missPoint,
  rangeFeet,
  targetsFrom,
  type BoltLine,
  type Point,
  type RawToken,
  type SceneScale,
  type SceneTarget,
} from '../model/beam'
import { planPush, tooBigToPush, type Pushed, type RawWall } from '../model/push'

/**
 * The bridge to an Atlas VTT scene, for a cast or a push from the sheet
 * (MYDND-172, MYDND-179, MYDND-211).
 *
 * Until MYDND-211 this went through the Atlas Spell Effects plugin, which played
 * JB2A art and lent us its way into Atlas. Atlas 0.15.0 draws spell effects of
 * its own, as a look on a kept area, so a bolt is now one of Atlas' own lines
 * (`boltLine`) and the plugin is not needed. Without Atlas, or without a map
 * open, or for a spell that is not aimed at a creature, `aimSpell` answers
 * `none` and Cast does what it always did. That covers the web build, whose `App`
 * has no Atlas leaves.
 *
 * ## The chain, and why it is fragile
 *
 * ```
 * app.workspace.getLeavesOfType('atlas-vtt')        the registered view type
 *   .view.atlasStore                                public getter: the scene's store
 *     .getState().addMeasure / deleteMeasure        the bolt (0.15.0)
 *     .getState().updateToken / moveToken           hit points, a push
 *     .getState().clearSelection, .subscribe        a pick on the map
 *     .temporal.getState().untracked                the bolt stays off the undo history
 *   .view.serviceManager.getRendererService()
 *     .getRenderer()                                grid size and snapping, the canvas
 * ```
 *
 * Every hop is a public member of Atlas' classes or its store, and none is a
 * *declared* contract: Atlas may rename any of them in a release. So every
 * member is checked before use, as the dice chain in `dice/obsidian/atlas.ts` is,
 * and a rename falls through to `none`, or to a cast that draws nothing: the
 * spell still casts. The renderer's `getTokenRenderer().dragRuler` is private in
 * Atlas' TypeScript and reached anyway, for the scene's unit; without it a
 * square is 5 feet.
 *
 * **The AGPL boundary in `dice/obsidian/atlas.ts` applies here unchanged:**
 * nothing of Atlas is ever `require`d. The views are found the way the dice
 * bridge finds them, and this is the second walk of them, for the scene where
 * that one is for the dice tool.
 *
 * `aimPush` is the same scene with no bolt asked of it, for the Push mastery on
 * a weapon's row (MYDND-179).
 */

const ATLAS_VIEW_TYPE = 'atlas-vtt'
const ATLAS_PLUGIN_ID = 'atlas-vtt'

/** A square's pixels where neither the renderer nor the scene says. */
const DEFAULT_CELL = 70

interface SceneState {
  objects?: { tokens?: Record<string, RawToken>; walls?: Record<string, RawWall> }
  /** The scene's floors, bottom first. */
  levels?: readonly { id?: unknown }[]
  grid?: { snapToGrid?: boolean; type?: string; size?: unknown }
  /** What the GM has selected on the map: a click on a token selects it alone. */
  selectedIds?: unknown
  updateToken?: (id: string, updates: { resources: Record<string, unknown> }) => void
  moveToken?: (id: string, x: number, y: number) => void
  /** Since 0.15.0 a kept area can carry an `effect`. Null where its floor is full. */
  addMeasure?: (data: BoltLine) => string | null
  deleteMeasure?: (id: string) => void
  clearSelection?: () => void
}

interface SceneStore {
  getState: () => SceneState | null | undefined
  /** Zustand's: the listener hears every write, and the call answers its unsubscribe. */
  subscribe?: (listener: (state: SceneState | null | undefined) => void) => unknown
  /** Atlas' undo history. */
  temporal?: { getState?: () => { untracked?: <T>(write: () => T) => T } | null | undefined }
}

interface Renderer {
  getGridOptions?: () => { size?: unknown } | null | undefined
  getGridSystem?: () => { snapTokenCenter?: (x: number, y: number, size: number) => Point } | null | undefined
  getTokenRenderer?: () => { dragRuler?: { settingsProvider?: () => unknown } | null } | null | undefined
  getAppInstance?: () => { canvas?: unknown } | null | undefined
}

interface AtlasLeafView {
  atlasStore?: unknown
  serviceManager?: { getRendererService?: () => { getRenderer?: () => Renderer | null | undefined } | null } | null
}

/** One open Atlas map: its scene, and what draws it. */
interface AtlasTab {
  leaf: unknown
  store: SceneStore
  renderer: Renderer | null
  canvas: HTMLElement | null
}

type Workspace = {
  getLeavesOfType?: (type: string) => readonly ({ view?: unknown } | null | undefined)[]
  getMostRecentLeaf?: () => unknown
}

const workspaceOf = (app: App): Workspace | undefined => (app as unknown as { workspace?: Workspace }).workspace

function rendererOf(view: AtlasLeafView): Renderer | null {
  const service = view.serviceManager?.getRendererService?.()
  return typeof service?.getRenderer === 'function' ? (service.getRenderer() ?? null) : null
}

/** Every Atlas map open in the workspace whose store answers. */
function atlasTabs(app: App): AtlasTab[] {
  const workspace = workspaceOf(app)
  if (typeof workspace?.getLeavesOfType !== 'function') return []
  const tabs: AtlasTab[] = []
  for (const leaf of workspace.getLeavesOfType(ATLAS_VIEW_TYPE)) {
    const view = leaf?.view as AtlasLeafView | null | undefined
    const store = view?.atlasStore as SceneStore | null | undefined
    if (!view || typeof store?.getState !== 'function') continue
    const renderer = rendererOf(view)
    const canvas = renderer?.getAppInstance?.()?.canvas
    tabs.push({ leaf, store, renderer, canvas: isElement(canvas) ? canvas : null })
  }
  return tabs
}

const isElement = (value: unknown): value is HTMLElement =>
  typeof value === 'object' && value !== null && 'ownerDocument' in value

/** The map the GM is working on: the active one, else the one showing, else the first. */
function atlasTab(app: App): AtlasTab | null {
  const tabs = atlasTabs(app)
  const active = workspaceOf(app)?.getMostRecentLeaf?.()
  return (
    tabs.find(tab => tab.leaf === active) ??
    tabs.find(tab => tab.canvas !== null && tab.canvas.offsetParent !== null) ??
    tabs[0] ??
    null
  )
}

const finite = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null)

/** Pixels to a square, and feet to a square, read from the map as it is now. */
function scaleOf(tab: AtlasTab): SceneScale {
  const cell = finite(tab.renderer?.getGridOptions?.()?.size) ?? finite(tab.store.getState()?.grid?.size) ?? DEFAULT_CELL
  const ruler = tab.renderer?.getTokenRenderer?.()?.dragRuler
  const units = typeof ruler?.settingsProvider === 'function' ? (ruler.settingsProvider() as { unitType?: unknown; unitDistance?: unknown } | null) : null
  const distance = finite(units?.unitDistance)
  const feetPerCell =
    distance === null ? 5 : units?.unitType === 'meters' ? distance / 0.3 : units?.unitType === 'yards' ? distance * 3 : distance
  return { cell, feetPerCell }
}

/** A token's centre, and how far its footprint reaches from it. */
function tokenOf(tab: AtlasTab, id: string): (Point & { r: number }) | null {
  const token = tab.store.getState()?.objects?.tokens?.[id]
  if (!token || !Number.isFinite(token.x) || !Number.isFinite(token.y)) return null
  const size = finite(token.size) ?? 1
  return { x: token.x as number, y: token.y as number, r: (size * scaleOf(tab).cell) / 2 }
}

/** A write Atlas' undo history does not record as the GM's: a bolt comes and goes on its own. */
function untracked<T>(store: SceneStore, write: () => T): T {
  const history = store.temporal?.getState?.()
  return typeof history?.untracked === 'function' ? history.untracked(write) : write()
}

/**
 * The window the map is drawn in, for its timers: the canvas's own, so a map in
 * a popout times its bolt there. None without a canvas, as in the logic suite.
 */
const windowOf = (tab: AtlasTab): Pick<Window, 'setTimeout'> | null => tab.canvas?.ownerDocument.defaultView ?? null

/**
 * Draws a bolt as a kept area, and takes it away again once it has struck.
 *
 * **Both writes are untracked**, so neither is an undo step: an undo after a cast
 * takes back the hit points or the push, not half a bolt. The bolt is gone before
 * either is written, so no step remembers it either. It settles at once, drawing
 * nothing, where this Atlas cannot draw one (before 0.15.0, or a floor with no
 * room left) or where there is no canvas to time it by.
 */
function drawBolt(tab: AtlasTab, line: BoltLine): Promise<void> {
  const state = tab.store.getState()
  const view = windowOf(tab)
  if (typeof state?.addMeasure !== 'function' || !view) return Promise.resolve()
  const add = state.addMeasure
  const id = untracked(tab.store, () => add(line))
  if (typeof id !== 'string') return Promise.resolve()
  return new Promise(gone =>
    view.setTimeout(() => {
      const remove = tab.store.getState()?.deleteMeasure
      if (typeof remove === 'function') untracked(tab.store, () => remove(id))
      gone()
    }, boltShownMs()),
  )
}

/** The scene read and ready: who is there, and what can be done to them with no bolt. */
export interface ReadyPush {
  kind: 'ready'
  targets: SceneTarget[]
  /** Pushes the token straight away from the caster. Null if it cannot be moved. */
  push(targetId: string, feet: number): Pushed | null
  /**
   * Waits for the GM to click a token on the map, then answers it. `stopped` is
   * called instead when Escape is pressed or a later pick replaces this one.
   */
  pickOnMap(done: (targetId: string) => void, stopped?: () => void): void
}

/** A spell aimed and ready: who it could hit, and how to draw it. */
export interface ReadyAim extends ReadyPush {
  /** The spell's range in feet, or null where it has no number. */
  range: number | null
  /**
   * Draws the bolt at this token, or past it. Settles once the bolt has struck
   * and gone; null if either token has since left the map.
   */
  play(targetId: string, miss?: boolean): Promise<void> | null
  /** What the token's linked note says its AC is, or null. */
  acOf(targetId: string): number | null
  /** Takes damage off the token's HP, after its defences. Null if it has no HP. */
  hurt(targetId: string, amount: number, damageType: string | null | undefined): Promise<Hurt | null>
}

type NotReady =
  /** Nothing to aim with: no Atlas, no map, or a spell that is not aimed at a creature. */
  | { kind: 'none' }
  /** The character has no token on this map. */
  | { kind: 'no-caster' }
  /** The caster is alone on this map. */
  | { kind: 'no-targets' }

export type Aim = NotReady | ReadyAim
export type PushAim = NotReady | ReadyPush

/** Stops the pick under way, if any: one click on a token must not answer two casts. */
let stopPick: (() => void) | null = null

/**
 * A pick on the map, through Atlas' own selection: a click on a token selects it
 * alone, so the pick is the first time a single token other than the caster is
 * selected. Atlas has hit-tested the click, so nothing here reads the canvas or
 * swallows a pointer event. The selection is cleared first, or a click on the
 * token already selected would change nothing and never answer. Selection is not
 * on Atlas' undo history.
 */
function pickToken(tab: AtlasTab, caster: string, done: (targetId: string) => void, stopped?: () => void): void {
  stopPick?.()
  const { store } = tab
  if (typeof store.subscribe !== 'function') {
    stopped?.()
    return
  }
  // The map's own document, so Escape is heard in a popout. Without a canvas, only a later pick stops it.
  const doc = tab.canvas?.ownerDocument ?? null
  let unsubscribe: (() => void) | null = null
  const finish = (): void => {
    unsubscribe?.()
    doc?.removeEventListener('keydown', onKey, true)
    if (stopPick === stop) stopPick = null
  }
  const stop = (): void => {
    finish()
    stopped?.()
  }
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') stop()
  }

  store.getState()?.clearSelection?.()
  const off = store.subscribe(state => {
    const ids = state?.selectedIds
    if (!Array.isArray(ids) || ids.length !== 1) return
    const [id] = ids as unknown[]
    if (typeof id !== 'string' || id === caster || !state?.objects?.tokens?.[id]) return
    finish()
    done(id)
  })
  if (typeof off === 'function') unsubscribe = off as () => void
  doc?.addEventListener('keydown', onKey, true)
  stopPick = stop
}

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

/** Whether Atlas is installed at all: read in a render, so it touches no scene. */
export const canAim = (app: App): boolean => {
  const host = app as unknown as { plugins?: { plugins?: Record<string, unknown> } }
  return Boolean(host.plugins?.plugins?.[ATLAS_PLUGIN_ID])
}

/**
 * Pushes one token, writing nothing where it stays put.
 *
 * `moveToken` and not `updateToken`, because it is the write that tells Atlas'
 * ambient audio the listener moved. It is one step on Atlas' undo history.
 */
function pushToken(app: App, tab: AtlasTab, caster: string, targetId: string, feet: number): Pushed | null {
  const state = tab.store.getState()
  const tokens = state?.objects?.tokens
  const token = tokens?.[targetId]
  const from = tokenOf(tab, caster)
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
    scale: scaleOf(tab),
    onSquares: snaps && !/hex/i.test(state.grid?.type ?? ''),
    snap: (point, size) => grid?.snapTokenCenter?.(point.x, point.y, size) ?? point,
  })
  if (pushed.feet > 0) state.moveToken(targetId, at.x, at.y)
  return pushed
}

/** Who is on the map with this character, whatever is about to be done to them. */
function sceneAim(
  app: App,
  tab: AtlasTab,
  character: { name?: string; notePath?: string } | null | undefined,
): NotReady | (ReadyPush & { caster: string }) {
  const tokens = tab.store.getState()?.objects?.tokens
  if (!tokens) return { kind: 'none' }

  const caster = casterId(tokens, character)
  const from = caster ? tokenOf(tab, caster) : null
  if (!caster || !from) return { kind: 'no-caster' }

  const targets = targetsFrom(tokens, caster, from, scaleOf(tab))
  if (targets.length === 0) return { kind: 'no-targets' }

  return {
    kind: 'ready',
    caster,
    targets,
    push: (targetId, feet) => pushToken(app, tab, caster, targetId, feet),
    pickOnMap: (done, stopped) => pickToken(tab, caster, done, stopped),
  }
}

/** What a push with no spell can aim at right now. Read when pressed, as `aimSpell` is. */
export function aimPush(app: App, character: { name?: string; notePath?: string } | null | undefined): PushAim {
  const tab = atlasTab(app)
  return tab ? sceneAim(app, tab, character) : { kind: 'none' }
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
  const bolt = boltOf(spell)
  const tab = bolt ? atlasTab(app) : null
  if (!bolt || !tab) return { kind: 'none' }

  const scene = sceneAim(app, tab, character)
  if (scene.kind !== 'ready') return scene
  const { caster } = scene

  return {
    ...scene,
    range: rangeFeet(range),
    // Positions are read again here: a pick on the map can take a while.
    play(targetId, miss = false) {
      const start = tokenOf(tab, caster)
      const end = tokenOf(tab, targetId)
      if (!start || !end) return null
      const casterToken = tab.store.getState()?.objects?.tokens?.[caster]
      const line = boltLine({
        bolt,
        from: start,
        fromRadius: start.r,
        to: miss ? missPoint(start, end, end.r, Math.random() < 0.5 ? 1 : -1) : end,
        scale: scaleOf(tab),
        level: casterToken?.level,
        hidden: casterToken?.isHidden === true,
      })
      return line ? drawBolt(tab, line) : Promise.resolve()
    },
    acOf: targetId => acOfToken(app, tab.store.getState()?.objects?.tokens?.[targetId]),
    async hurt(targetId, amount, damageType) {
      const before = tab.store.getState()?.objects?.tokens?.[targetId]
      const { dealt, defence } = afterDefences(amount, damageType, await defencesOfToken(app, before))

      // Read after the wait, and written whole: `updateToken` replaces `resources`.
      const state = tab.store.getState()
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
