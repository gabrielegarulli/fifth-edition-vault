/**
 * A character's other ability modifiers and overrides (MYDND-216): the fence's
 * half. The builder's operations on them are `choices/model/abilityAdjustments`.
 *
 * **In the fence** as `ability_adjustments: [{ ability, value, reason }]` and
 * `ability_overrides: { str: 19 }` — choices the player made, like the scores
 * themselves (ADR 0007). The bake turns each adjustment into an ordinary
 * `ability_score_bonus` effect, capped at 30 (`adjustmentEffects`), so the sheet
 * and Atlas both see it; derive reads an override as the final score
 * (`vaultAbilityScores`). A reader degrades (`read…` keep the well-formed
 * lines); the fence's check refuses (`adjustmentProblems`).
 */

const KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const

export type AdjustmentAbility = (typeof KEYS)[number]

export interface AbilityAdjustment {
  ability: AdjustmentAbility
  /** Signed, never 0. */
  value: number
  reason: string
}

export type AbilityOverrides = Partial<Record<AdjustmentAbility, number>>

/** The highest an adjustment may take a score, as an Epic Boon's. */
export const ADJUSTMENT_CAP = 30
export const OVERRIDE_MIN = 1
export const OVERRIDE_MAX = 30

const isAbility = (v: unknown): v is AdjustmentAbility => typeof v === 'string' && (KEYS as readonly string[]).includes(v)

/** The json's adjustments, the well-formed ones only: a reader degrades. */
export function readAdjustments(raw: unknown): AbilityAdjustment[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap(a => {
    const r = a as { ability?: unknown; value?: unknown; reason?: unknown } | null
    const value = Number(r?.value)
    if (!isAbility(r?.ability) || !Number.isInteger(value) || value === 0) return []
    return [{ ability: r.ability, value, reason: typeof r?.reason === 'string' ? r.reason : '' }]
  })
}

/** The json's overrides, the well-formed ones only. */
export function readOverrides(raw: unknown): AbilityOverrides {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: AbilityOverrides = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(v)
    if (isAbility(k) && Number.isInteger(n) && n >= OVERRIDE_MIN && n <= OVERRIDE_MAX) out[k] = n
  }
  return out
}

/** What is wrong with the json's adjustments and overrides, for the fence's refusal. */
export function adjustmentProblems(json: Record<string, unknown>): string[] {
  const problems: string[] = []
  const adj = json.ability_adjustments
  if (adj !== undefined) {
    if (!Array.isArray(adj)) problems.push('`ability_adjustments` is not a list')
    else if (readAdjustments(adj).length !== adj.length) {
      problems.push('an `ability_adjustments` line needs an ability and a whole, non-zero value')
    }
  }
  const ov = json.ability_overrides
  if (ov !== undefined) {
    if (!ov || typeof ov !== 'object' || Array.isArray(ov)) problems.push('`ability_overrides` is not a mapping')
    else if (Object.keys(readOverrides(ov)).length !== Object.keys(ov).length) {
      problems.push(`an \`ability_overrides\` score must be a whole number from ${OVERRIDE_MIN} to ${OVERRIDE_MAX}`)
    }
  }
  return problems
}

/** The ordinary effects an adjustment bakes into, so the sheet and Atlas see it. */
export function adjustmentEffects(json: Record<string, unknown>): Array<Record<string, unknown>> {
  return readAdjustments(json.ability_adjustments).map(a => ({
    type: 'ability_score_bonus',
    ability: a.ability,
    amount: a.value,
    max: ADJUSTMENT_CAP,
    source: a.reason.trim() || 'Other modifier',
  }))
}

