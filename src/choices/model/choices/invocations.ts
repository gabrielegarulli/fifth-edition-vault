import { invocationsAtLevel } from '@vault/derive/classTable.js'
import { choicesComplete, originFeatSpec } from '@vault/derive/originFeatChoices.js'

import type { SpellRow } from '../../../compendium'
import { classData, type ClassSource } from '../draft'

import { asList } from './shared'

// Eldritch Invocations: the count, the options, their targets.
// One module of the builder's choices (MYDND-197); index.ts says what the folder is.

/**
 * Eldritch Invocation slots at a level, from the class table.
 *
 * Both spellings of the column count: the 2024 table says `Invocations`, the
 * 2014 one `Invocations Known`. The plugin read both itself from MYDND-29;
 * VAULT-243 moved that rule into `@vault/derive`'s `invocationsAtLevel`.
 */
export function invocationCountAt(source: ClassSource | null, level: number): number {
  return source ? invocationsAtLevel(classData(source), level) : 0
}

// --- Invocations --------------------------------------------------------------

export interface InvocationOption {
  name: string
  description?: string
  minLevel?: number
  requires?: string
  repeatable?: boolean
  /** The exporter's note on which cantrip the invocation names. */
  cantripNote?: string
}

export type InvocationTargetKind = 'cantrip' | 'origin_feat'

export interface InvocationTarget {
  kind: InvocationTargetKind
  id: string
  name: string
  source?: string | null
}

/** A picked invocation: the option as saved, and what it was pointed at. */
export interface InvocationPick extends InvocationOption {
  target?: InvocationTarget | null
  /** An Origin feat's own answers, when `target` is a feat that asks (Magic Initiate). */
  choices?: unknown
}

/**
 * What a repeatable invocation is pointed at (MYDND-175). The rule that lets
 * Agonizing Blast repeat is "choose a different eligible cantrip" each time, so
 * the repeat means nothing until it names one. Lessons of the First Ones says the
 * same of an Origin feat. A repeatable option naming neither asks nothing.
 */
export function invocationTargetKind(option: InvocationOption): InvocationTargetKind | null {
  if (!option.repeatable) return null
  if (option.cantripNote) return 'cantrip'
  return /\bOrigin feat\b/i.test(option.description ?? '') ? 'origin_feat' : null
}

/**
 * What an invocation may be pointed at. Cantrips are the class's damaging ones,
 * and Eldritch Spear's must reach 10 feet. Whether the character knows the cantrip
 * is not asked here: Spells comes after Features, so at this point it knows none.
 */
export function invocationTargets(
  option: InvocationOption,
  { cantrips, originFeats }: {
    cantrips: readonly Pick<SpellRow, 'id' | 'name' | 'level' | 'range' | 'damageTypes' | 'damageDice'>[]
    originFeats: ReadonlyArray<{ id: string; name: string; source: string | null }>
  },
): InvocationTarget[] {
  const kind = invocationTargetKind(option)
  if (kind === 'origin_feat') return originFeats.map(f => ({ kind, id: f.id, name: f.name, source: f.source }))
  if (kind !== 'cantrip') return []
  const reaches = /range of 10\+ feet/i.test(option.description ?? '')
  return cantrips
    .filter(s => s.level === 0 && (s.damageTypes.length > 0 || Boolean(s.damageDice)))
    .filter(s => !reaches || Number.parseInt(s.range ?? '', 10) >= 10)
    .map(s => ({ kind, id: s.id, name: s.name }))
}

/**
 * Whether a slot may take an option, given what the other slots hold. A repeat
 * needs a target left to name: `targetCount` is the size of the option's pool.
 */
export function invocationOffered(
  option: InvocationOption,
  picks: readonly InvocationPick[],
  slot: number,
  level: number,
  targetCount: number,
): boolean {
  const others = picks.filter((_, i) => i !== slot)
  const taken = others.filter(p => p.name === option.name).length
  if ((option.minLevel ?? 1) > level) return false
  if (option.requires && !others.some(p => p.name === option.requires)) return false
  if (!option.repeatable) return taken === 0
  return !invocationTargetKind(option) || taken < targetCount
}

/** Picks whose prerequisite is gone, dropped: Eldritch Smite can't outlive Pact of the Blade. */
export function keepingPrerequisites(picks: readonly InvocationPick[]): InvocationPick[] {
  const names = new Set(picks.map(p => p.name))
  const kept = picks.filter(p => !p.requires || names.has(p.requires))
  return kept.length === picks.length ? [...kept] : keepingPrerequisites(kept)
}

/** Every slot filled, and every pick that asks a follow-up answered. */
export function invocationsComplete(value: unknown, count: number): boolean {
  const picks = asList(value) as InvocationPick[]
  return (
    picks.length >= count &&
    picks.every(p => {
      if (!invocationTargetKind(p)) return true
      if (!p.target) return false
      return p.target.kind !== 'origin_feat' || choicesComplete(originFeatSpec(p.target.name), p.choices)
    })
  )
}

/** The pacts among an invocation list: the SRD has no Pact Boon feature, so they are options here. */
export function isPactInvocation(option: InvocationOption): boolean {
  return /^Pact of\b/i.test(option.name)
}
