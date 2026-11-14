import type { VaultCharacterJson } from './fence'

/**
 * Ability scores that are D&D Beyond's **finals** (MYDND-105).
 *
 * The web app's `effectsToStore` family (`apps/vault/src/lib/ddbToVault.js`,
 * VAULT-186/187), ported because a converted character is now a Vault character
 * and every bake of one goes through it.
 *
 * `vaultAbilityScores` adds every `ability_score_bonus` effect on top of
 * `json.abilityScores`. A character built here stores **base** scores, so that
 * is right. A character converted from D&D Beyond stores the scores D&D Beyond
 * showed, which already include those bonuses, so adding them counts each one
 * twice. Primal Champion (+4 STR/CON at Barbarian 20) is the live case.
 *
 * The strip is **by source, not by effect type**. A bonus the character arrived
 * with is inside the number; a half-feat picked at a later level-up is not, and
 * stripping it would make it show once and vanish at the next save. So the
 * conversion records which sources its first bake saw
 * (`ddbImport.finalizedBonusSources`) and only those are stripped.
 */

interface DdbImportRecord {
  finalizedBonusSources?: unknown
}

const ddbImportOf = (json: VaultCharacterJson | null | undefined): DdbImportRecord | null => {
  const rec = (json as { ddbImport?: unknown } | null | undefined)?.ddbImport
  return rec && typeof rec === 'object' ? (rec) : null
}

/**
 * Whether `json.abilityScores` already holds the bonuses its effects describe.
 * True for a D&D Beyond conversion and nothing else: `ddbImport` is written by
 * the conversion and by no other path.
 *
 * **Not `abilityMethod === 'manual'`.** In the builder `manual` means "the
 * player typed a *base* score", and keying on it would delete real bonuses
 * from hand-built characters (VAULT-186).
 */
export function scoresAreFinal(json: VaultCharacterJson | null | undefined): boolean {
  return ddbImportOf(json) !== null
}

/**
 * The `sourceFeatureId`s whose bonus is inside the finals, or `null` when the
 * conversion did not record them. `null` is not `[]`: `[]` is a conversion that
 * baked no ability bonus at all, `null` means "assume every one is inside".
 */
export function finalizedBonusSources(json: VaultCharacterJson | null | undefined): Array<string | null> | null {
  const ids = ddbImportOf(json)?.finalizedBonusSources
  return Array.isArray(ids) ? (ids as Array<string | null>) : null
}

/**
 * The distinct sources of the `ability_score_bonus` effects in a **raw** bake,
 * before `effectsToStore` drops any. The conversion's one chance to record
 * what D&D Beyond's finals contain. An unattributed bonus is recorded as
 * `null`, because JSON has no `undefined` and `Set.has(undefined)` would not
 * match it on the way back.
 */
export function abilityBonusSources(effects: readonly Record<string, unknown>[]): Array<string | null> {
  return [
    ...new Set(
      effects
        .filter(e => e?.type === 'ability_score_bonus')
        .map(e => (typeof e.sourceFeatureId === 'string' ? e.sourceFeatureId : null)),
    ),
  ]
}

/** The effects a bake hands the projection: for a converted character, without the bonuses already inside its scores. */
export function effectsToStore(
  json: VaultCharacterJson | null | undefined,
  effects: readonly Record<string, unknown>[],
): Array<Record<string, unknown>> {
  if (!scoresAreFinal(json)) return [...effects]
  const ids = finalizedBonusSources(json)
  if (ids === null) return effects.filter(e => e?.type !== 'ability_score_bonus')
  const inFinals = new Set(ids)
  return effects.filter(
    e =>
      e?.type !== 'ability_score_bonus' ||
      !inFinals.has(typeof e.sourceFeatureId === 'string' ? e.sourceFeatureId : null),
  )
}
