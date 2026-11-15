import {
  readOverrides,
  type AbilityAdjustment,
  type AbilityOverrides,
} from '../../characterModel'
import type { AbilityKey, BuilderDraft } from './draft'

/**
 * The builder's operations on a character's other ability modifiers and
 * overrides (MYDND-216), as D&D Beyond's ability step has them: *Other
 * modifiers* are lines of a signed amount and a reason ("+2 · Manual of Gainful
 * Exercise", "−2 · Hag's curse"), and an *Override score* replaces the total.
 * Their fence half — reading, checking, baking — is
 * `characterModel/model/vaultCharacter/adjustments.ts`. A D&D Beyond conversion
 * maps `bonusStats` and `overrideStats` onto them (`convert.ts`, ADR 0010).
 */

export type { AbilityAdjustment, AbilityOverrides }

/** The json keys for a draft's adjustments and overrides; an empty one is left out. */
export function adjustmentKeys(draft: Pick<BuilderDraft, 'abilityAdjustments' | 'abilityOverrides'>): Record<string, unknown> {
  const adjustments = (draft.abilityAdjustments ?? []).filter(a => a.value !== 0)
  const overrides = readOverrides(draft.abilityOverrides ?? {})
  return {
    ...(adjustments.length > 0 ? { ability_adjustments: adjustments.map(a => ({ ability: a.ability, value: a.value, reason: a.reason.trim() })) } : {}),
    ...(Object.keys(overrides).length > 0 ? { ability_overrides: overrides } : {}),
  }
}

export function withAdjustmentAdded(draft: BuilderDraft, ability: AbilityKey): BuilderDraft {
  return { ...draft, abilityAdjustments: [...(draft.abilityAdjustments ?? []), { ability, value: 1, reason: '' }] }
}

/** Changes one line; a value that would reach 0 skips over it, since a line is never 0. */
export function withAdjustment(draft: BuilderDraft, index: number, patch: Partial<AbilityAdjustment>): BuilderDraft {
  const list = [...(draft.abilityAdjustments ?? [])]
  const was = list[index]
  if (!was) return draft
  let value = patch.value ?? was.value
  if (value === 0) value = was.value > 0 ? -1 : 1
  list[index] = { ...was, ...patch, value }
  return { ...draft, abilityAdjustments: list }
}

export function withAdjustmentRemoved(draft: BuilderDraft, index: number): BuilderDraft {
  return { ...draft, abilityAdjustments: (draft.abilityAdjustments ?? []).filter((_, i) => i !== index) }
}

export function withOverride(draft: BuilderDraft, ability: AbilityKey, score: number | null): BuilderDraft {
  const next: AbilityOverrides = { ...(draft.abilityOverrides ?? {}) }
  if (score === null || !Number.isFinite(score)) delete next[ability]
  else next[ability] = Math.round(score)
  return { ...draft, abilityOverrides: next }
}
