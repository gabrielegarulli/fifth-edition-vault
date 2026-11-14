import type { LevelItem } from './types'
import { asRecord, asList } from './shared'

// Optional features: maneuvers, runes, arcane shots (MYDND-181).
// One module of the builder's choices (MYDND-197); index.ts says what the folder is.

// --- Optional features: maneuvers, runes, arcane shots (MYDND-181) -------------

/** One option of an `optional_features` choice, as the fence writes it. */
export interface OptionalFeatureOption {
  name: string
  description?: string
  minLevel?: number
}

/**
 * How many a subclass's optional-feature choice has the character know at a
 * class level: the largest total its `progression` reaches by then — Battle
 * Master `{ 3: 3, 7: 5, 10: 7, 15: 9 }` is 5 at level 9. One question that grows,
 * as invocations do, because the 2024 Battle Master has no feature at 7, 10 or 15
 * to hang the extra picks on.
 */
export function optionalFeatureCount(choices: Record<string, unknown> | null | undefined, level: number): number {
  const progression = asRecord(choices?.progression) ?? {}
  return Object.entries(progression)
    .filter(([at]) => Number(at) <= level)
    .reduce((most, [, n]) => Math.max(most, Number(n) || 0), 0)
}

/** The options a choice offers at a level: an option with a higher `minLevel` waits. */
export function optionalFeatureOptions(choices: Record<string, unknown> | null | undefined, level: number): OptionalFeatureOption[] {
  return (asList(choices?.options) as OptionalFeatureOption[]).filter(
    o => typeof o?.name === 'string' && (o.minLevel ?? 1) <= level,
  )
}

/**
 * The options the choice gives without asking — Four Elements' Elemental
 * Attunement. They count toward the total, as the book's "you know Elemental
 * Attunement and one other" does.
 */
export function requiredOptionalFeatures(choices: Record<string, unknown> | null | undefined): string[] {
  return (asList(choices?.required)).filter((n): n is string => typeof n === 'string')
}

/** The names an answer holds, required ones first. */
export function optionalFeaturePicks(answer: unknown): string[] {
  return (asList(asRecord(answer)?.picks) as Array<{ name?: unknown }>)
    .map(p => p?.name)
    .filter((n): n is string => typeof n === 'string' && n.length > 0)
}

/**
 * The answer an `optional_features` question stores: each pick with its text, so
 * the sheet can show it without reading the subclass note, as metamagic and
 * invocations are stored. The required options are always in it.
 */
export function optionalFeatureAnswer(
  item: Pick<LevelItem, 'feature'>,
  names: readonly string[],
): { type: 'optional_features'; label: string; picks: OptionalFeatureOption[] } {
  const choices: Record<string, unknown> = item.feature.choices ?? {}
  const all = asList(choices.options) as OptionalFeatureOption[]
  const wanted = [...new Set([...requiredOptionalFeatures(choices), ...names.filter(Boolean)])]
  return {
    type: 'optional_features',
    label: typeof choices.name === 'string' ? choices.name : item.feature.name,
    // A required option is kept by name even when the list lacks it, or the
    // question could never be complete.
    picks: wanted.flatMap(n => {
      const o = all.find(x => x.name === n)
      if (o) return [{ name: o.name, description: o.description }]
      return requiredOptionalFeatures(choices).includes(n) ? [{ name: n }] : []
    }),
  }
}
