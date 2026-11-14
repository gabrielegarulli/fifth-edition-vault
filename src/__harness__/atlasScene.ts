/**
 * A fake Atlas VTT map, as `spellEffects/obsidian/bridge.ts` reaches it
 * (MYDND-211): a workspace leaf whose view has `atlasStore` and a renderer.
 *
 * The store holds what the test hands it, plus Atlas' writes as recorders:
 * `moveToken` and `updateToken` change the tokens, `addMeasure` and
 * `deleteMeasure` keep the bolts, and `select` stands in for a click on a token.
 * What it proves is the bridge's side of the chain; whether Atlas still has this
 * shape is checked in Obsidian, since the chain is undeclared.
 *
 * Imports nothing from `obsidian`, so the `logic` suite can use it too.
 */

export interface FakeMeasure {
  id: string
  shape?: string
  points?: { x: number; y: number }[]
  [key: string]: unknown
}

export interface FakeAtlasOptions {
  /** Merged into the store's state, over the defaults. */
  state?: Record<string, unknown>
  /** Pixels to a square, as the renderer's grid options say. 140 unless given. */
  cell?: number
  /** False for an Atlas with no renderer to ask. */
  renderer?: boolean
  /** False for an Atlas before 0.15.0, which keeps no measurements. */
  measures?: boolean
  /** False for a renderer with no canvas: nothing to time a bolt by, no document to hear Escape in. */
  canvas?: boolean
}

export function fakeAtlas(tokens: Record<string, Record<string, unknown>>, options: FakeAtlasOptions = {}) {
  const { cell = 140, renderer = true, measures: keepsMeasures = true, canvas: hasCanvas = true } = options
  const moves: [string, number, number][] = []
  const updates: { resources: Record<string, unknown> }[] = []
  const measures: Record<string, FakeMeasure> = {}
  const drawn: FakeMeasure[] = []
  const snapped: number[] = []
  /** Whether each bolt write went through the history's `untracked`, in order. */
  const tracking: ('untracked' | 'tracked')[] = []
  const listeners = new Set<(state: Record<string, unknown>) => void>()
  const keyListeners = new Set<(event: { key: string }) => void>()

  /**
   * The canvas's document and window. Its timer is the global one looked up at
   * each call, so a suite's fake timers drive it.
   */
  const ownerDocument = {
    defaultView: { setTimeout: (run: () => void, ms: number) => setTimeout(run, ms) },
    addEventListener: (type: string, listener: (event: { key: string }) => void) => {
      if (type === 'keydown') keyListeners.add(listener)
    },
    removeEventListener: (type: string, listener: (event: { key: string }) => void) => {
      if (type === 'keydown') keyListeners.delete(listener)
    },
  }
  const canvas = hasCanvas ? { ownerDocument, offsetParent: {} } : null
  let untracked = false
  let selectedIds: string[] = []
  let made = 0

  const write = (): void => {
    for (const listener of [...listeners]) listener(state())
  }
  const actions: Record<string, unknown> = {
    moveToken(id: string, x: number, y: number) {
      moves.push([id, x, y])
      tokens[id] = { ...tokens[id], x, y }
      write()
    },
    updateToken(id: string, change: { resources: Record<string, unknown> }) {
      updates.push(change)
      tokens[id] = { ...tokens[id], ...change }
      write()
    },
    clearSelection() {
      selectedIds = []
      write()
    },
    ...(keepsMeasures && {
      addMeasure(data: Record<string, unknown>) {
        tracking.push(untracked ? 'untracked' : 'tracked')
        made += 1
        const measure = { id: `measure_${made}`, kind: 'measure', ...data } as FakeMeasure
        measures[measure.id] = measure
        drawn.push(measure)
        write()
        return measure.id
      },
      deleteMeasure(id: string) {
        tracking.push(untracked ? 'untracked' : 'tracked')
        delete measures[id]
        write()
      },
    }),
  }
  const state = (): Record<string, unknown> => ({
    objects: { tokens, measures },
    selectedIds,
    ...actions,
    ...options.state,
  })

  const store = {
    getState: state,
    subscribe(listener: (state: Record<string, unknown>) => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    temporal: {
      getState: () => ({
        untracked<T>(run: () => T): T {
          untracked = true
          try {
            return run()
          } finally {
            untracked = false
          }
        },
      }),
    },
  }

  const gridRenderer = {
    getGridOptions: () => ({ size: cell }),
    getGridSystem: () => ({
      snapTokenCenter(x: number, y: number, size: number) {
        snapped.push(size)
        return { x: Math.round(x / cell) * cell, y: Math.round(y / cell) * cell }
      },
    }),
    getTokenRenderer: () => ({ dragRuler: { settingsProvider: () => ({ unitType: 'feet', unitDistance: 5 }) } }),
    getAppInstance: () => ({ canvas }),
  }

  const view = {
    atlasStore: store,
    serviceManager: renderer ? { getRendererService: () => ({ getRenderer: () => gridRenderer }) } : null,
  }
  const leaf = { view }

  return {
    tokens,
    moves,
    updates,
    measures,
    drawn,
    snapped,
    tracking,
    store,
    leaf,
    /** How many picks are listening to the store. */
    listening: () => listeners.size,
    /** How many keydown listeners are on the canvas's document. */
    listeningForKeys: () => keyListeners.size,
    /** A key pressed in the map's window. */
    press(key: string) {
      for (const listener of [...keyListeners]) listener({ key })
    },
    /** A click on a token, as Atlas answers it: that token selected alone. */
    select(...ids: string[]) {
      selectedIds = ids
      write()
    },
    /** An `App` with Atlas installed and this map open, plus whatever else the test needs. */
    app(extra: Record<string, unknown> = {}) {
      return {
        plugins: { plugins: { 'atlas-vtt': {} } },
        workspace: { getLeavesOfType: (type: string) => (type === 'atlas-vtt' ? [leaf] : []) },
        ...extra,
      }
    },
  }
}
