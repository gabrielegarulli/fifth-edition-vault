// The Atlas roller: the engine's dice groups thrown in Atlas through the
// host's `App`, within Atlas's limits.

import type { App } from 'obsidian'

import {
  resolveAtlasDice,
  type AdvantageSide,
  type AtlasDiceTool,
  type RollContext,
  type RollSource,
} from './atlas'
import { atlasFormula, type EngineGroup, type EngineResult } from '../model/groups'

/**
 * Atlas as a `rollEngine.js` roller.
 *
 * The engine's contract is `(groups) => results | Promise<results> | null`,
 * where `groups` is `[{ qty, sides, damageType? }]` and `results` is aligned by
 * index as `[{ results: number[] }]`. **Returning `null` is how you decline**,
 * and the engine then falls back to `rngRoller` — which is the designed path
 * when no Atlas scene is open, not an error.
 *
 * `atlas.ts` stays the one accessor walk; this adds the engine's shape on top of
 * it and nothing else.
 *
 * ## The reveal wait, and what it is for
 *
 * `rollDice` **returns synchronously** but Atlas animates the reveal afterwards
 * (`REVEAL_DELAY_SECONDS = 0.3` in its `diceRevealSound.ts`). So the faces are
 * in hand roughly 400ms before the player can see them. That did not matter
 * while nothing happened after a roll; it matters now, because an intervention
 * prompt asks *about a specific face* and arriving first makes it a prompt about
 * nothing. The wait is here, in the roller, rather than in the prompt — so
 * anything that ever reads a roll gets it for free and nobody has to remember.
 *
 * ## One `rollDice` per throw, modifier included
 *
 * Everything is one formula **with the modifier**, so the popup shows the
 * roll's total (MYDND-75); see `throwsOf`. Atlas' parser sums every dice term
 * it finds, so `1d20+1d20` would roll two d20s and add them — the advantage d20
 * never goes into the formula.
 *
 * ## Advantage is Atlas' own, where its dice set says how (MYDND-119)
 *
 * Since 0.9.1, `rollDice(formula, source, origin, { advantage })` rolls the
 * set's die once more, keeps the best (worst) and marks the other `dropped` —
 * one popup with both faces, instead of `Stealth (1/2)` and `(2/2)`. The
 * engine is still the one that keeps a die: the pair is read back into its two
 * groups and `applyKeep` decides, so the log and `dropped` come out exactly as
 * they did. `atlasKeepsD20` says when Atlas would roll it the way the engine
 * counts it; everywhere else the advantage d20 is still thrown on its own. A
 * `dropped` die is a real face Atlas threw and the player saw either way.
 */

/** Atlas' own reveal animation, plus a little. Measured from its constant. */
export const REVEAL_WAIT_MS = 400

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Per-die faces out of whatever Atlas handed back, split back into `groups`.
 *
 * `DiceRollResult.rolls` is per-die rather than a total, which is the property
 * that makes Atlas usable as an engine roller at all — but it is an undeclared
 * interface, so this reads it defensively and in three shapes. A result it
 * cannot read returns `null`, which propagates to the engine as a decline
 * rather than as an array of `NaN`.
 *
 * One formula can carry several groups (`1d8+2d6+3`), and Atlas rolls its terms
 * in order, so the faces are sliced back by each group's `qty`. Where a die
 * names itself (`{ die: 'd6' }`) the name has to agree with the group it lands
 * in — a mismatch means the order is not the one assumed, and slicing anyway
 * would file a d8's face under the d6.
 */
export function facesOf(
  result: unknown,
  groups: readonly { qty: number; sides: number }[],
  modifier = 0,
): number[][] | null {
  if (!result || typeof result !== 'object') return null
  const rolls = (result as { rolls?: unknown }).rolls
  const expected = groups.reduce((n, g) => n + g.qty, 0)

  const numbers: number[] = []
  const names: (string | null)[] = []
  const push = (v: unknown, name: unknown): void => {
    const n = Number(v)
    if (Number.isFinite(n)) {
      numbers.push(n)
      names.push(typeof name === 'string' ? name : null)
    }
  }

  if (Array.isArray(rolls)) {
    for (const entry of rolls) {
      if (entry !== null && typeof entry === 'object') {
        // `{ value }`, `{ result }`, `{ roll }` — all three spellings have been
        // seen in dice libraries and none of them is documented here.
        const obj = entry as Record<string, unknown>
        push(obj.value ?? obj.result ?? obj.roll ?? obj.face, obj.die)
      } else {
        push(entry, null)
      }
    }
  }

  if (numbers.length === expected) {
    const out: number[][] = []
    let at = 0
    for (const group of groups) {
      for (let i = at; i < at + group.qty; i += 1) {
        if (names[i] !== null && names[i]!.toLowerCase() !== `d${group.sides}`) return null
      }
      out.push(numbers.slice(at, at + group.qty))
      at += group.qty
    }
    return out
  }

  // A single die whose only honest reading is the total. Accepted for one die
  // and refused for more, because splitting a total across several dice would
  // be invention — and the log would show faces nobody threw. The total
  // includes the modifier this sent, so it comes back off.
  if (numbers.length === 0 && expected === 1) {
    const total = Number((result as { total?: unknown }).total)
    if (Number.isFinite(total)) return [[total - modifier]]
  }

  return null
}

/**
 * Whether Atlas, asked for `side`, rolls `groups` the way the engine counts
 * advantage: one more d20 beside the roll's first d20, the better (worse) of
 * the two kept, the other marked `dropped`.
 *
 * Asked **before** throwing, because a throw that comes back without the pair
 * is dice on the table that the roll can no longer use. It holds when the
 * scene's dice set (`rollingDice()`, Atlas 0.9.1) is one d20, rolls high, and
 * has a plain `keep` rule for the side. Collection dice rules from before dice
 * sets have no rule; a `die` or `number` rule (Draw Steel's edge) adds rather
 * than keeps; a roll-under set keeps the *lower* die for advantage; and the
 * roll's first d20 group must be one die, since `2d20` with advantage keeps two
 * of three in Atlas and one of two in `applyKeep`.
 */
export function atlasKeepsD20(dice: AtlasDiceTool, groups: readonly EngineGroup[], side: AdvantageSide): boolean {
  if (groups.find(g => g.sides === 20)?.qty !== 1) return false
  if (typeof dice.rollingDice !== 'function') return false
  let rules: unknown
  try {
    rules = dice.rollingDice()
  } catch {
    return false
  }
  if (!rules || typeof rules !== 'object') return false
  const { dice: setDice, crit } = rules as { dice?: unknown; crit?: unknown }
  const rule = (rules as Record<string, unknown>)[side] as { kind?: unknown; tensOnly?: unknown } | undefined
  if (!rule || rule.kind !== 'keep' || rule.tensOnly) return false
  if (crit === 'roll-under') return false
  if (!Array.isArray(setDice) || setDice.length !== 1) return false
  const [only] = setDice as { count?: unknown; sides?: unknown }[]
  return only?.count === 1 && only?.sides === 20
}

/**
 * Faces out of a throw Atlas rolled with `side`, as the engine's groups: `groups`
 * in order, then the advantage d20 — which is the die Atlas marked `dropped`.
 *
 * `applyKeep` then keeps one of the pair again and writes `dropped` itself, so
 * the log is the engine's, not Atlas'. The two have to agree, and this checks
 * that they do: exactly one dropped d20, nothing re-rolled or added, and the
 * kept face the better (worse) of the two. Anything else is `null` — the same
 * decline as any throw `facesOf` cannot read.
 */
export function nativeFacesOf(
  result: unknown,
  groups: readonly { qty: number; sides: number }[],
  side: AdvantageSide,
  modifier = 0,
): number[][] | null {
  if (!result || typeof result !== 'object') return null
  const { rolls, advantage } = result as { rolls?: unknown; advantage?: unknown }
  if (advantage !== side || !Array.isArray(rolls)) return null

  const entries = rolls as unknown[]
  if (entries.some(e => e === null || typeof e !== 'object')) return null
  const dice = entries as Record<string, unknown>[]
  // A re-rolled die or one a `die` rule added is not the pair the engine keeps from.
  if (dice.some(d => d.rerolled || d.advantage)) return null
  const dropped = dice.filter(d => d.dropped)
  if (dropped.length !== 1 || dropped[0].die !== 'd20') return null
  const droppedFace = Number(dropped[0].value)
  if (!Number.isFinite(droppedFace)) return null

  const faces = facesOf({ ...result, rolls: dice.filter(d => !d.dropped) }, groups, modifier)
  if (!faces) return null
  const at = groups.findIndex(g => g.sides === 20)
  const kept = faces[at]?.[0]
  if (kept === undefined) return null
  if (side === 'advantage' ? kept < droppedFace : kept > droppedFace) return null
  return [...faces, [droppedFace]]
}

export interface AtlasRollerOptions {
  /**
   * The roll's flat modifier, sent with the dice so Atlas' popup shows the
   * total rather than the bare face (MYDND-75). `0` for a re-throw of one die,
   * where a modifier would be counted twice on the table.
   */
  modifier?: number
  /**
   * The engine appended an extra d20 for this side. It is always the **last**
   * group (`buildGroups`). Atlas rolls it with the rest where its dice set keeps
   * a d20 for the side (`atlasKeepsD20`); otherwise it is thrown on its own.
   */
  advantage?: AdvantageSide | null
  wait?: (ms: number) => Promise<void>
}

/**
 * The groups one roll is thrown as: everything together, and the advantage d20
 * apart.
 *
 * **Together, because Atlas' popup shows one total per throw.** One `rollDice`
 * per group put `1d8` and `2d6` in two popups and the modifier in neither; one
 * formula shows the number the roll comes to. Summing is only wrong for
 * advantage — `1d20+1d20` is not keep-highest — which is why the extra d20 is
 * the one group that goes alone, carrying the modifier too so both throws read
 * as a candidate total. That is the fallback since MYDND-119: where Atlas' dice
 * set keeps a d20, `createAtlasRoller` asks Atlas for the pair instead.
 */
export function throwsOf<G>(groups: readonly G[], extraD20: boolean): G[][] {
  if (extraD20 && groups.length > 1) return [groups.slice(0, -1), groups.slice(-1)]
  return groups.length > 0 ? [groups.slice()] : []
}

/**
 * Atlas' own bounds (`FORMULA_LIMITS` in its `parseFormula.ts`). Past either,
 * `rollDice` refuses the formula and shows an error — so a throw that would
 * cross one goes group by group instead, which is how every roll went before
 * MYDND-75 and which no real sheet formula comes near.
 */
export const ATLAS_MAX_CHARACTERS = 64
export const ATLAS_MAX_TERMS = 10

interface Throw {
  groups: EngineGroup[]
  modifier: number
}

/** The throws, each with the modifier it shows — split where Atlas would refuse. */
function planThrows(groups: EngineGroup[], extraD20: boolean, modifier: number): Throw[] {
  return throwsOf(groups, extraD20).flatMap(thrown => {
    const terms = thrown.length + (modifier === 0 ? 0 : 1)
    if (terms <= ATLAS_MAX_TERMS && atlasFormula(thrown, modifier).length <= ATLAS_MAX_CHARACTERS) {
      return [{ groups: thrown, modifier }]
    }
    // The modifier rides on the first piece only, so the popups still add up.
    return thrown.map((group, i) => ({ groups: [group], modifier: i === 0 ? modifier : 0 }))
  })
}

/**
 * A roller over an open Atlas scene, or one that declines when there is none.
 *
 * It always returns a function: `resolveAtlasDice` answering `null` is handled
 * per call rather than up front, because a scene can open or close between a
 * component mounting and a click.
 */
export function createAtlasRoller(
  app: App,
  label?: string | null,
  character?: RollContext | null,
  { modifier = 0, advantage = null, wait = sleep }: AtlasRollerOptions = {},
): (groups: EngineGroup[]) => Promise<EngineResult[] | null> {
  return async (groups: EngineGroup[]): Promise<EngineResult[] | null> => {
    const dice = resolveAtlasDice(app)
    if (!dice) return null

    const source: RollSource = { type: 'statblock' }
    if (label) source.abilityName = label
    if (character?.name) source.tokenName = character.name
    if (character?.notePath) source.statblockPath = character.notePath

    if (advantage && groups.length > 1) {
      const rest = groups.slice(0, -1)
      // One throw or none: past Atlas' limits it would be split, and a split
      // roll has no single formula to ask advantage of.
      if (planThrows(rest, false, modifier).length === 1 && atlasKeepsD20(dice, rest, advantage)) {
        const result = dice.rollDice(atlasFormula(rest, modifier), source, undefined, { advantage })
        const faces = nativeFacesOf(result, rest, advantage, modifier)
        // Declines the whole roll, as an unreadable throw always has.
        if (!faces) return null
        await wait(REVEAL_WAIT_MS)
        return faces.map(results => ({ results }))
      }
    }

    const throws = planThrows(groups, advantage !== null, modifier)
    const out: EngineResult[] = []
    for (let i = 0; i < throws.length; i += 1) {
      const thrown = throws[i]
      // Labelling the advantage pair is what makes Atlas' own log readable:
      // two d20s in a row say nothing about which one counted.
      const throwLabel =
        throws.length > 1 && label ? `${label} (${i + 1}/${throws.length})` : label ?? undefined
      const perThrow: RollSource = { ...source }
      if (throwLabel) perThrow.abilityName = throwLabel

      const result = dice.rollDice(atlasFormula(thrown.groups, thrown.modifier), perThrow)
      const faces = facesOf(result, thrown.groups, thrown.modifier)
      // A throw Atlas could not answer declines the *whole* roll rather than
      // half of it. The engine's `isValid` would reject a short array anyway,
      // and falling back wholesale keeps every face in one roll coming from one
      // source — the alternative is a log mixing read dice with invented ones.
      if (!faces) return null
      for (const results of faces) out.push({ results })
    }

    // Once, after the last throw, not per throw: the player is watching one
    // roll, and a pause between the advantage pair would read as two.
    await wait(REVEAL_WAIT_MS)
    return out
  }
}
