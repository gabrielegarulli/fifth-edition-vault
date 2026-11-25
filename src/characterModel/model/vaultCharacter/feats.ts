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

/**
 * The key a new copy of a feat is stored under: `feat_<id>` the first time,
 * `feat_<id>_2` and on for a repeatable feat taken again (MYDND-274), so a
 * second Magic Initiate does not overwrite the first's answer.
 */
function freeSheetKey(choices: Record<string, unknown>, featId: string): string {
  let key = sheetFeatKey(featId)
  for (let n = 2; key in choices; n += 1) key = `${sheetFeatKey(featId)}_${n}`
  return key
}

/** Whether a `featureChoices` key is one of this feat's sheet copies. */
function isSheetKeyOf(key: string, featId: string): boolean {
  const base = sheetFeatKey(featId)
  return key === base || (key.startsWith(`${base}_`) && /^\d+$/.test(key.slice(base.length + 1)))
}

export interface FeatAddition {
  /** The feat's own ability increase, when it asks which. */
  abilityBonus?: string | null
  /**
   * Its sub-choices (MYDND-274): Magic Initiate's list, ability and spells,
   * Skilled's three proficiencies. The bake reads them from the answer, so a
   * feat added without them grants nothing they decide.
   */
  choices?: unknown
  /**
   * Take it again although it is held: only for a feat whose note says
   * Repeatable. Without it a held feat is left as it is.
   */
  repeat?: boolean
}

export function withFeatAdded(
  json: VaultCharacterJson,
  feat: FeatPick,
  addition: FeatAddition | string | null = {},
): VaultCharacterJson {
  // A bare string is the ability, as every caller before MYDND-274 passed it.
  const { abilityBonus, choices, repeat }: FeatAddition =
    typeof addition === 'string' || addition === null ? { abilityBonus: addition } : addition
  const feats = Array.isArray(json.feats) ? json.feats : []
  if (!repeat && feats.some(f => f?.id === feat.id)) return json
  const held = (json.featureChoices) ?? {}
  return {
    ...json,
    feats: [...feats, { id: feat.id, name: feat.name, source: feat.source ?? null }],
    featureChoices: {
      ...held,
      [freeSheetKey(held, feat.id)]: {
        type: 'feat',
        featId: feat.id,
        featName: feat.name,
        featSource: feat.source ?? null,
        ...(abilityBonus ? { abilityBonus } : {}),
        ...(choices != null ? { choices } : {}),
      },
    },
  }
}

/**
 * Removes the feat and every `featureChoices` entry naming it, under whatever
 * key — including an Ability Score Improvement that took it, which is then
 * unanswered again, as on the web sheet.
 *
 * With `key` (MYDND-274), one copy of a feat held more than once: that answer
 * and one entry in `feats`, and the other copies stay.
 */
export function withFeatRemoved(json: VaultCharacterJson, featId: string, key?: string): VaultCharacterJson {
  const feats = Array.isArray(json.feats) ? json.feats : []
  const choices = (json.featureChoices) ?? {}
  if (key && key in choices) {
    const at = feats.map(f => f?.id).lastIndexOf(featId)
    return {
      ...json,
      feats: feats.filter((_, i) => i !== at),
      featureChoices: Object.fromEntries(Object.entries(choices).filter(([k]) => k !== key)),
    }
  }
  return {
    ...json,
    feats: feats.filter(f => f?.id !== featId),
    featureChoices: Object.fromEntries(
      Object.entries(choices).filter(([, v]) => (v as { featId?: string } | null)?.featId !== featId),
    ),
  }
}

/**
 * The feats a player may remove from the sheet: those in `feats`, not the
 * origin feat. A feat held more than once is one row per copy, and a copy the
 * sheet added names its `featureChoices` key, so Remove takes that copy alone.
 */
export function removableFeats(json: VaultCharacterJson | null | undefined): Array<FeatPick & { key?: string }> {
  const feats = Array.isArray(json?.feats) ? (json.feats as Array<{ id?: string; name?: string; source?: string }>) : []
  const choiceKeys = Object.keys(json?.featureChoices ?? {})
  const seen = new Map<string, number>()
  return feats
    .filter(f => f?.id)
    .map(f => {
      const id = f.id!
      const copies = feats.filter(g => g?.id === id).length
      const n = seen.get(id) ?? 0
      seen.set(id, n + 1)
      const row: FeatPick & { key?: string } = { id, name: f.name ?? id, source: f.source ?? null }
      if (copies > 1) {
        // The sheet's own copies come last, oldest first; a copy an Ability
        // Score Improvement took has no sheet key, and keeps the whole-feat Remove.
        const own = choiceKeys.filter(k => isSheetKeyOf(k, id))
        const key = own[n - (copies - own.length)]
        if (key) row.key = key
      }
      return row
    })
}
