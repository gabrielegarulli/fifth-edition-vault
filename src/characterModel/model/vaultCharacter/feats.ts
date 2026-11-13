import type { VaultCharacterJson } from './fence'

/**
 * Adding and removing a Vault character's feats from the sheet (MYDND-58) —
 * the web sheet's `addFeat` / `removeFeat` (`apps/vault/src/lib/characterJson.js`).
 *
 * Two differences, both on purpose:
 *
 * - **No `resolvedEffects`.** The web functions append or strip baked effects;
 *   here nothing baked is stored in the choices (ADR 0007 §2). The save that
 *   follows re-bakes from the feat notes.
 * - **The `featureChoices` entry is written for every feat, not only one with
 *   an ability pick.** `finalVaultJson` rebuilds `feats` from `featureChoices`
 *   entries of type `feat`, so a feat that is only in `feats` is dropped the
 *   next time the character is saved from the builder. The web app writes the
 *   entry only with an `abilityBonus`, and loses such a feat on its next edit.
 */

export interface FeatPick {
  id: string
  name: string
  source?: string | null
}

/** The `featureChoices` key a feat added from the sheet is stored under — the web app's. */
export const sheetFeatKey = (featId: string): string => `feat_${featId}`

export function withFeatAdded(json: VaultCharacterJson, feat: FeatPick, abilityBonus?: string | null): VaultCharacterJson {
  const feats = Array.isArray(json.feats) ? json.feats : []
  if (feats.some(f => f?.id === feat.id)) return json
  return {
    ...json,
    feats: [...feats, { id: feat.id, name: feat.name, source: feat.source ?? null }],
    featureChoices: {
      ...((json.featureChoices as Record<string, unknown> | undefined) ?? {}),
      [sheetFeatKey(feat.id)]: {
        type: 'feat',
        featId: feat.id,
        featName: feat.name,
        featSource: feat.source ?? null,
        ...(abilityBonus ? { abilityBonus } : {}),
      },
    },
  }
}

/**
 * Removes the feat and every `featureChoices` entry naming it, under whatever
 * key — including an Ability Score Improvement that took it, which is then
 * unanswered again, as on the web sheet.
 */
export function withFeatRemoved(json: VaultCharacterJson, featId: string): VaultCharacterJson {
  const feats = Array.isArray(json.feats) ? json.feats : []
  const choices = (json.featureChoices as Record<string, unknown> | undefined) ?? {}
  return {
    ...json,
    feats: feats.filter(f => f?.id !== featId),
    featureChoices: Object.fromEntries(
      Object.entries(choices).filter(([, v]) => (v as { featId?: string } | null)?.featId !== featId),
    ),
  }
}

/** The feats a player may remove from the sheet: those in `feats`, not the origin feat. */
export function removableFeats(json: VaultCharacterJson | null | undefined): FeatPick[] {
  const feats = Array.isArray(json?.feats) ? (json!.feats as Array<{ id?: string; name?: string; source?: string }>) : []
  return feats.filter(f => f?.id).map(f => ({ id: f.id!, name: f.name ?? f.id!, source: f.source ?? null }))
}
