import { type App, Notice } from 'obsidian'

import type { NoteFoldersSettings } from '../content/folders'
import { createVaultContent } from '../content/obsidian'
import { planInventoryRows, planToVaultJson, type ConversionPlan, type PlanSources } from '../ddb/convert'
import type { DdbSettings } from '../ddb/settings'
import type { Sheet } from '../ddb/sheet'
import { DDB_ID_KEY, isLocalId, mintLocalId } from '../state/characters'
import { generateItemId } from '../state/inventory'
import { parseNote } from '../state/note'
import { createVaultState } from '../state/obsidian'
import { buildVaultSheet, readVaultCharacterOrThrow, type VaultCharacterJson } from '../vaultCharacter/index'

/**
 * Saving and rebuilding a Vault character, given a host `App`.
 *
 * Out of `main.ts` (MYDND-101) so the web build runs the same two functions
 * against its in-memory vault: the builder and level-up are how a player
 * changes their character online, and a second copy of this would be a second
 * place for the projection to drift. The plugin's methods are now one-line
 * delegations.
 */

/**
 * Bake, project and write a Vault character (MYDND-23, ADR 0007).
 *
 * With no `targetPath` it is a new character and gets a fresh `local:` id;
 * with one, the note's own id is kept, so a rebuild rewrites the character in
 * place rather than minting a second identity for it. Content and state are
 * built per call, the way the view builds them per mount — both are stateless.
 *
 * Returns the note's path, or `null` when the write was refused; the reason
 * is always on screen.
 */
export async function saveVaultCharacter(
  app: App,
  ddb: DdbSettings,
  json: VaultCharacterJson,
  targetPath: string | null = null,
  folders?: () => NoteFoldersSettings,
): Promise<string | null> {
  try {
    const content = createVaultContent(app, folders)
    const state = createVaultState(app, folders)
    const existingId = targetPath ? await noteId(app, targetPath) : null
    const id = isLocalId(existingId) ? String(existingId) : mintLocalId()
    const { sheet, missing } = await buildVaultSheet(json, content, id)
    const result = await state.characters.saveVaultCharacter(json, sheet, ddb, targetPath)
    await state.inventory.syncSheet(result.path, content)
    // Saved either way: a missing note is a gap in the catalog, not a broken
    // character, and refusing would block every save on an unexported book.
    // But it is said, because the sheet is short of whatever that note grants.
    if (missing.length > 0) {
      new Notice(
        `${sheet.name} saved, but no note was found for: ${missing.join(', ')}. ` +
          'Its sheet is missing whatever those grant — export the content or fix the id.',
        20000,
      )
    }
    return result.path
  } catch (err) {
    console.error('[my-dnd-vault] saving a Vault character failed', err)
    new Notice(`Could not save the character: ${err instanceof Error ? err.message : String(err)}`, 20000)
    return null
  }
}

/**
 * The `vc_ddb_id` of the note at `path`, from the metadata cache — or from the
 * note itself while the cache has not caught up. Obsidian indexes a write
 * asynchronously, so the builder's second save, a moment after its first
 * (MYDND-116), can find no frontmatter cached; minting a fresh id then would
 * have the write refused as another character's note.
 */
async function noteId(app: App, path: string): Promise<unknown> {
  const cached = app.metadataCache.getCache(path)?.frontmatter?.[DDB_ID_KEY]
  if (cached !== undefined) return cached
  const file = app.vault.getFileByPath(path)
  return file ? parseNote(await app.vault.read(file)).frontmatter[DDB_ID_KEY] : undefined
}

/** Re-project a Vault character's charsheet from its own vault-character fence. */
export async function rebuildVaultCharacter(
  app: App,
  ddb: DdbSettings,
  path: string,
  folders?: () => NoteFoldersSettings,
): Promise<boolean> {
  let json: VaultCharacterJson
  try {
    const file = app.vault.getFileByPath(path)
    if (!file) throw new Error('the note no longer exists')
    json = readVaultCharacterOrThrow(await app.vault.read(file))
  } catch (err) {
    // Refused rather than rebuilt from nothing: an empty json would replace a
    // whole sheet with a blank one and look like success.
    new Notice(`Could not rebuild ${path}: ${err instanceof Error ? err.message : String(err)}`, 20000)
    return false
  }
  const written = await saveVaultCharacter(app, ddb, json, path, folders)
  if (written) new Notice(`Rebuilt ${json.name}'s sheet from its choices.`)
  return written !== null
}

/** What the review page hands over once the GM presses Convert (MYDND-105). */
export interface ConvertInput {
  plan: ConversionPlan
  sources: PlanSources
  /** The note to convert in place; null for a new import or a Re-convert found by its source. */
  targetPath?: string | null
  /** Saves the D&D Beyond portrait into the vault. Injected: it needs the host's binary write and the network. */
  savePortrait?: (sheet: Sheet) => Promise<string | null>
}

/**
 * Turn a reviewed plan into a Vault character and write it (MYDND-105).
 *
 * Bakes twice, on purpose. The first bake is the conversion's one chance to see
 * every ability-score bonus *before* `effectsToStore` strips them; its sources
 * are stamped into `ddbImport.finalizedBonusSources`, and the second bake reads
 * that stamp exactly as every later save will. A Re-convert stamps afresh,
 * because it brings D&D Beyond's current finals with it.
 *
 * Returns the note's path, or `null` when the write was refused; the reason is
 * always on screen.
 */
export async function convertDdbCharacter(
  app: App,
  ddb: DdbSettings,
  input: ConvertInput,
  folders?: () => NoteFoldersSettings,
): Promise<string | null> {
  const { plan } = input
  try {
    const content = createVaultContent(app, folders)
    const state = createVaultState(app, folders)

    // The id is decided before the sheet is built, because the sheet carries
    // it. A Re-convert keeps the local id the character already has.
    const existingPath = input.targetPath || state.characters.findByDdbSource(plan.ddbId)
    const existingId = existingPath ? app.metadataCache.getCache(existingPath)?.frontmatter?.[DDB_ID_KEY] : null
    const id = isLocalId(existingId) ? String(existingId) : mintLocalId()

    let json = planToVaultJson(plan, input.sources)
    const first = await buildVaultSheet(json, content, id)
    json = { ...json, ddbImport: { ...(json.ddbImport as object), finalizedBonusSources: first.abilityBonusSources } }

    if (ddb.downloadAvatar && input.savePortrait) {
      try {
        const saved = await input.savePortrait(plan.ddbSheet)
        if (saved) json = { ...json, portrait: saved }
      } catch (err) {
        // A missing portrait is not worth failing a conversion over.
        console.warn('[my-dnd-vault] portrait download failed', err)
      }
    }

    const { sheet, missing } = await buildVaultSheet(json, content, id)
    const result = await state.characters.convertFromDdb(
      {
        json,
        sheet,
        ddbId: plan.ddbId,
        ddbSheet: plan.ddbSheet,
        xp: plan.xp,
        items: planInventoryRows(plan, generateItemId),
        currency: plan.currency,
      },
      ddb,
      existingPath ?? null,
    )
    new Notice(
      `${sheet.name} ${result.firstConversion ? 'is now a Vault character' : 're-converted from D&D Beyond'}.` +
        (missing.length > 0 ? ` No note was found for: ${missing.join(', ')}.` : ''),
      missing.length > 0 ? 20000 : undefined,
    )
    return result.path
  } catch (err) {
    console.error('[my-dnd-vault] converting a D&D Beyond character failed', err)
    new Notice(`Could not convert the character: ${err instanceof Error ? err.message : String(err)}`, 20000)
    return null
  }
}
