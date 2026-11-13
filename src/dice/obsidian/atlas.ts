import type { App } from 'obsidian'

/**
 * The Atlas VTT dice bridge.
 *
 * **This is the one bridge.** The phase plan reserved an Atlas roller adapter
 * for Phase 4; MYDND-7 brought this one across from
 * `obsidian-vault-characters` instead, because having two chains walking the
 * same undeclared accessors would mean two things to fix when Atlas renames
 * one. Anything that needs dice — the sheet now, `rollEngine.js` in Phase 4 —
 * goes through here.
 *
 * ## The licence boundary, which is not negotiable
 *
 * **Atlas VTT is AGPL-3.0-only, and nothing here may ever `require` a line of
 * it.** This reaches Atlas the same way Atlas reaches Fantasy Statblocks:
 * through accessors that happen to be public, which is interface-level use. A
 * single import of Atlas source would make this plugin a derivative work and
 * force the whole of it under AGPL.
 *
 * That is also why the adapter lives here rather than in `@vault/derive`: one
 * host, and a licence boundary that should stay nowhere near the shared library.
 *
 * ## The chain, and why it is fragile
 *
 * ```
 * app.workspace.getLeavesOfType('atlas-vtt')   the registered view type
 *   .view.serviceManager                       public getter
 *   .getToolController()                       public
 *   .getDiceTool()                             public
 *   .rollDice(formula, source)                 public
 * ```
 *
 * Every hop is a `public` member of Atlas' own classes — but it is not a
 * *declared* contract, so Atlas can rename any of it in a release without that
 * being a breaking change by its own lights. `window.AtlasVTT` is checked first
 * so that if Atlas ever publishes a facade, this starts using it with no change
 * here. (Checked as of MYDND-7: there is no such facade today.)
 *
 * If rolling breaks after an Atlas update, this chain is the first thing to
 * check — the command *"Check the Atlas VTT dice bridge"* exists for exactly
 * that.
 *
 * ## Advantage is Atlas' own option, else two rolls — never a formula
 *
 * Since 0.9.1 `rollDice` takes `{ advantage }` and rolls the advantage d20
 * itself, in one popup, marking the die it leaves out `dropped` (MYDND-119,
 * `roller.ts`). Where the scene's dice set has no keep rule for that side, the
 * advantage d20 is still a second labelled roll. Never write `1d20+1d20`:
 * Atlas sums every term it is given.
 */

const ATLAS_VIEW_TYPE = 'atlas-vtt'

/** What a roll tells Atlas about where it came from, so the log can say. */
export interface RollSource {
  type: 'statblock'
  abilityName?: string
  tokenName?: string
  statblockPath?: string
}

/** The shape of Atlas' `DiceRollResult`, as much of it as is read here. */
export interface AtlasRollResult {
  total?: number
  /** Per-die faces, not just a total — which is why it satisfies `rollEngine`. */
  rolls?: unknown
}

/** A side of advantage, spelled as Atlas' `AdvantageSide` spells it. */
export type AdvantageSide = 'advantage' | 'disadvantage'

/**
 * What a throw asks of Atlas besides its formula — `RollOptions` since Atlas
 * 0.9.1. Only `advantage` is sent: Atlas then rolls the set's die once more and
 * marks the one it leaves out `dropped`, in one popup (MYDND-119).
 */
export interface AtlasRollOptions {
  advantage?: AdvantageSide
}

export interface AtlasDiceTool {
  /** `origin` is Atlas' token-and-scene tag, never sent from here; it sits between source and options. */
  rollDice(
    formula: string,
    source: RollSource,
    origin?: undefined,
    options?: AtlasRollOptions,
  ): AtlasRollResult | undefined
  /**
   * The dice a bare bonus rolls with, and their advantage rules — since Atlas
   * 0.9.1, and as undeclared as the rest of the chain, so read defensively.
   */
  rollingDice?: () => unknown
}

/** A published facade, if Atlas ever grows one. Checked before the walk. */
interface AtlasWindow {
  AtlasVTT?: { rollDice?: unknown } | null
}

/** Atlas' internals, as far as the accessor walk needs to describe them. */
interface AtlasLeafView {
  serviceManager?: {
    getToolController?: () => { getDiceTool?: () => AtlasDiceTool | null } | null
  } | null
}

/**
 * Atlas' dice tool, or `null` when no scene is open.
 *
 * Every hop is guarded individually rather than with one try/catch, because a
 * renamed accessor should fall through to `null` — which the callers already
 * handle as "no scene" — rather than surface as an exception from inside a
 * click handler.
 */
export function resolveAtlasDice(app: App): AtlasDiceTool | null {
  const published = typeof window !== 'undefined' ? (window as unknown as AtlasWindow).AtlasVTT : null
  if (published && typeof published.rollDice === 'function') {
    return published as unknown as AtlasDiceTool
  }

  for (const leaf of app.workspace.getLeavesOfType(ATLAS_VIEW_TYPE)) {
    const view = leaf?.view as unknown as AtlasLeafView | null
    const controller =
      view?.serviceManager && typeof view.serviceManager.getToolController === 'function'
        ? view.serviceManager.getToolController()
        : null
    const tool = controller && typeof controller.getDiceTool === 'function' ? controller.getDiceTool() : null
    if (tool && typeof tool.rollDice === 'function') return tool
  }
  return null
}

/** Whether a scene is open to roll into. Used to label the sheet honestly. */
export function atlasAvailable(app: App): boolean {
  return resolveAtlasDice(app) !== null
}

/** What a roll needs to know about the character making it. */
export interface RollContext {
  name?: string
  notePath?: string
}

/**
 * Rolls `formula` in the open Atlas scene. Returns the result, or `null` when no
 * scene is open — in which case the caller tells the user rather than silently
 * dropping the roll.
 *
 * **Falling back is correct, and throwing is not.** Phase 4's engine answers a
 * `null` here by using its own `rngRoller`; a throw would take out the click.
 */
export function rollInScene(
  app: App,
  formula: string,
  label?: string | null,
  character?: RollContext | null,
): AtlasRollResult | null {
  const dice = resolveAtlasDice(app)
  if (!dice) return null
  const source: RollSource = { type: 'statblock' }
  if (label) source.abilityName = label
  if (character) {
    if (character.name) source.tokenName = character.name
    if (character.notePath) source.statblockPath = character.notePath
  }
  return dice.rollDice(formula, source) ?? null
}

// `toFormula` lives in `./formula` — it is pure, and keeping it out of this file
// keeps it out of reach of the `obsidian` import above.
export { toFormula } from '../model/formula'
