import { subclassCasting } from '@vault/derive/builderSpellCaps.js'

import type { Sheet } from '../ddb/sheet'
import type { CasterEntry } from '../spells/slots'
import { bakeVaultCharacter, type BakeCatalogs } from './bake'
import type { VaultCharacterJson } from './fence'
import { projectVaultSheet } from './project'

/**
 * Vault-native characters (MYDND-23, ADR 0007).
 *
 * A Vault character is one note with two fences: ` ```vault-character ` holds
 * what the player chose, and ` ```charsheet ` is projected from it on every
 * save. This module is the projection's front door — bake the effects from the
 * catalogs, derive the sheet — and it imports nothing from `obsidian`, so the
 * whole path runs in plain Node against a fixture vault.
 *
 * The write is `state.characters.saveVaultCharacter`, which takes the json *and*
 * the sheet built here and puts both in the note in one file write. The state
 * layer stays catalog-free; the catalogs stop here.
 */

export type { BakeCatalogs } from './bake'
export { featureId } from './bake'
export {
  VAULT_CHARACTER_FENCE,
  parseVaultCharacter,
  persistedVaultCharacter,
  readVaultCharacterFromNote,
  readVaultCharacterOrThrow,
  vaultCharacterProblems,
  type VaultCharacterJson,
} from './fence'
export { projectVaultSheet } from './project'
export { effectsToStore, scoresAreFinal } from './finals'

export interface BuiltSheet {
  sheet: Sheet
  /** Ids the json names that no note answers to — see `BakeResult.missing`. */
  missing: string[]
  /** See `BakeResult.abilityBonusSources`; only a conversion reads it. */
  abilityBonusSources: Array<string | null>
}

/**
 * Each class's spell-slot progression, from its class note (MYDND-36) — or, for
 * a class that does not cast, from its subclass's note (MYDND-182): the Eldritch
 * Knight and the Arcane Trickster are third casters by the subclass alone.
 *
 * Read here rather than in the projection because the projection is synchronous
 * and reads no catalog. A class whose note is missing contributes no slots — the
 * bake reports it as missing already.
 */
export async function casterEntries(json: VaultCharacterJson, catalogs: BakeCatalogs): Promise<CasterEntry[]> {
  const out: CasterEntry[] = []
  for (const cls of json.classes ?? []) {
    const fence = cls?.id ? (await catalogs.classes.detail(cls.id))?.fence : null
    const own = fence?.data?.casterProgression
    out.push({
      name: String(cls?.name ?? fence?.name ?? ''),
      level: Number(cls?.level) || 0,
      progression: typeof own === 'string' && own ? own : await subclassProgression(cls?.subclass?.id, catalogs),
    })
  }
  return out
}

/** A casting subclass's progression (`'1/3'`), or null when it has none or no note. */
async function subclassProgression(id: string | undefined, catalogs: BakeCatalogs): Promise<string | null> {
  if (!id) return null
  const casting = subclassCasting((await catalogs.subclasses.detail(id))?.fence ?? null) as { progression: string } | null
  return casting?.progression ?? null
}

/** Bake, then project. The one call a save or a rebuild makes. */
export async function buildVaultSheet(
  json: VaultCharacterJson,
  catalogs: BakeCatalogs,
  localId: string,
): Promise<BuiltSheet> {
  const baked = await bakeVaultCharacter(json, catalogs)
  const casters = await casterEntries(json, catalogs)
  return {
    sheet: projectVaultSheet(json, baked, localId, casters),
    missing: baked.missing,
    abilityBonusSources: baked.abilityBonusSources,
  }
}
