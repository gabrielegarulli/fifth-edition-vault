import { applicableEffects } from '@vault/derive/effects.js'
import {
  applyFloor,
  applyReroll,
  applyTwice,
  interventions,
  rebundleDice,
  rerollDice,
} from '@vault/derive/rollEngine.js'

import type { ResolvedEffect } from '../../compendium'
import type { EngineGroup, EngineResult } from './groups'

/**
 * Dice interventions, as the pane needs them.
 *
 * **Every decision about what may be offered, and what a roll becomes, is in
 * `rollEngine.js`** — `interventions()`, `applyFloor`, `applyReroll`,
 * `applyTwice`. This file is the adapter: it gates the effects, asks the engine,
 * and knows how to re-throw dice through the *same* roller so a reroll is
 * genuinely visible rather than an RNG draw next to the dice on the table.
 *
 * Nothing here decides a rule. If something in this file starts looking like a
 * rule, it belongs upstream in `@vault/derive`.
 *
 * ## The offer is never applied on its own
 *
 * Every book case is "you can" — Great Weapon Fighting, Piercer, Savage
 * Attacker. So the engine hands back a *description of a choice*, and declining
 * has to remain possible right up to the component. `apply` is only ever called
 * from a click.
 *
 * ## It arrives after the faces are visible
 *
 * The ~400ms reveal wait lives in `roller.ts`, deliberately before this is
 * reached: a prompt that asks "reroll the 2?" before Atlas has shown the 2 is a
 * prompt about nothing. That ordering is this phase's done-when, and it is
 * structural — the roller resolves late, so everything downstream is late too.
 */

export interface RollState {
  dice: EngineDieGroup[]
  total: number
  modifier: number
}

export interface EngineDieGroup extends EngineGroup {
  count: number
  results: number[]
  dropped?: number[]
  replaced?: { index: number; from: number; to: number }[]
}

export interface InterventionTarget {
  groupIndex: number
  dieIndex: number
  face: number
  sides: number
  damageType: string | null
}

export interface InterventionOffer {
  key: string
  mode: 'floor' | 'reroll' | 'twice'
  source: string | null
  benefitKey: string | null
  frequency: string | null
  prompt: string | null
  to: number | null
  targets: InterventionTarget[]
  total: number
  /** The total if accepted — only knowable up front for a `floor`. */
  nextTotal: number | null
}

export interface InterventionContext {
  /** `'attack'`, `'damage'`, `'check'`, `'save'` — matched against `scope`. */
  rollType?: string | null
  /** Keys of activated effects switched on, from the vitals fence. */
  activeKeys?: Iterable<string>
  modifier?: number
}

/**
 * What a roll may be offered, most-preferred first.
 *
 * **The head of the list is the one prompted**, which is the engine's own rule:
 * at most one intervention per roll, in bake order, because ranking them by
 * gain would be the app choosing which of a player's feats they use.
 *
 * `applicableEffects` is the activation gate — an activated effect nobody has
 * switched on is not on offer. With no active keys, only passive effects pass,
 * which is the correct default for a character nobody has toggled anything for.
 */
export function offersFor(
  roll: RollState,
  effects: readonly ResolvedEffect[],
  ctx: InterventionContext = {},
): InterventionOffer[] {
  const activeKeys = new Set(ctx.activeKeys ?? [])
  const gated = applicableEffects(effects, activeKeys)

  // The engine's offers, in the adapter's own, stricter spelling of them.
  return interventions(roll.dice, gated, {
    rollType: ctx.rollType,
    modifier: ctx.modifier ?? roll.modifier,
  }) as InterventionOffer[]
}

/** The dice a `reroll` or `twice` offer needs thrown again, in engine shape. */
export function diceToRethrow(roll: RollState, offer: InterventionOffer): EngineGroup[] {
  const terms =
    offer.mode === 'twice'
      ? (rebundleDice(roll.dice) as { count: number; sides: number; damageType?: string | null }[])
      : (rerollDice(roll.dice, offer) as { count: number; sides: number; damageType?: string | null }[])
  return terms.map(t => ({ qty: t.count, sides: t.sides, damageType: t.damageType ?? null }))
}

/**
 * Accept an offer.
 *
 * `rethrow` is the roller — the *same* one that produced the original faces, so
 * the second throw is as visible as the first. A `floor` never calls it, which
 * is Great Weapon Fighting's whole point and the reason this is the one mode
 * that resolves with no dice at all.
 *
 * A `rethrow` that declines (`null`, no scene) leaves the roll **unchanged**
 * rather than falling back to RNG. The engine's fallback exists so a roll
 * happens at all; here the roll has already happened, and quietly substituting
 * invented faces for the ones a player asked to see again would be the log
 * lying about where a number came from.
 */
export async function applyOffer(
  roll: RollState,
  offer: InterventionOffer,
  rethrow: (groups: EngineGroup[]) => Promise<EngineResult[] | null>,
): Promise<{ roll: RollState; applied: boolean }> {
  if (offer.mode === 'floor') {
    const next = applyFloor({ dice: roll.dice, modifier: roll.modifier }, offer)
    return { roll: { ...next, modifier: roll.modifier }, applied: true }
  }

  const groups = diceToRethrow(roll, offer)
  const rolled = await rethrow(groups)
  if (!rolled) return { roll, applied: false }

  if (offer.mode === 'reroll') {
    const faces = rolled.map(r => r.results[0]).filter((n): n is number => typeof n === 'number')
    const next = applyReroll({ dice: roll.dice, modifier: roll.modifier }, offer, faces)
    return { roll: { ...next, modifier: roll.modifier }, applied: true }
  }

  // `twice` — the whole bundle again, and the engine keeps the second.
  const second = groups.map((group, i) => ({
    count: group.qty,
    qty: group.qty,
    sides: group.sides,
    damageType: group.damageType ?? null,
    results: rolled[i]?.results ?? [],
  }))
  const next = applyTwice({ dice: roll.dice, modifier: roll.modifier }, second)
  return { roll: { ...next, modifier: roll.modifier }, applied: true }
}

/** A one-line description of an offer, for the prompt's title. */
export function describeOffer(offer: InterventionOffer): string {
  if (offer.prompt) return offer.prompt
  const faces = offer.targets.map(t => t.face).join(', ')
  switch (offer.mode) {
    case 'floor':
      return `Treat ${offer.targets.length === 1 ? `the ${faces}` : `${faces}`} as ${offer.to}?`
    case 'reroll':
      return `Reroll the ${faces}?`
    case 'twice':
      return 'Roll the damage again and keep the second?'
    default:
      return 'Use this?'
  }
}

/** What the roll log records about an accepted offer. */
export function interventionRecord(
  offer: InterventionOffer,
  before: RollState,
  after: RollState,
): { mode: string; source: string | null; from: number; to: number } {
  return {
    mode: offer.mode,
    source: offer.source ?? null,
    from: before.total,
    to: after.total,
  }
}
