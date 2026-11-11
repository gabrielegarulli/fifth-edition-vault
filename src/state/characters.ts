import { readSheetFromNote } from '../ddb/charsheet'
import { CHARSHEET_FENCE } from '../ddb/charsheet'
import { SHEET_VERSION, type Sheet } from '../ddb/sheet'
import {
  VAULT_CHARACTER_FENCE,
  persistedVaultCharacter,
  readVaultCharacterOrThrow,
  vaultCharacterProblems,
  type VaultCharacterJson,
} from '../vaultCharacter/fence'
import { extractInventoryFromNote, writeInventoryToNote, type InventoryCurrency, type InventoryItem } from './inventory'
import { fromYaml, parseNote, serialiseNote, setFence, toYaml } from './note'
import type { StateVault } from './vault'
import { extractVitalsFromNote, seedFromSheet, setXp, writeVitalsToNote } from './vitals'

/**
 * Writing a character note.
 *
 * Ported from `obsidian-vault-characters`' section 4 (MYDND-7). It is the
 * reason that plugin had to be absorbed rather than left alongside this one:
 * two plugins writing one file, on top of Obsidian rewriting frontmatter as a
 * side effect of the vault being open, is how state gets lost — and nothing in
 * the lore vault is in any repository, so there is no undo.
 *
 * **The managed region is the contract.** Everything between the two markers
 * belongs to this plugin and is replaced wholesale on re-sync. Everything else
 * in the note — prose below it, frontmatter keys this plugin does not own — is
 * the player's and must survive. That is invariant 1, and the tests for this
 * module exist mostly to hold it.
 *
 * ## What is inherited rather than chosen
 *
 * The `vc_` frontmatter prefix, the ` ```charsheet ` fence and
 * `vc_sheet_version` all come from the plugin this replaces, and notes carrying
 * them exist in the author's vault today — read by Atlas as well as by us.
 * They are kept deliberately: renaming them would rewrite real
 * files to no benefit. See ADR 0004.
 */

const BEGIN_MARKER = '<!-- vault-characters:begin — managed, replaced on re-sync -->'
const END_MARKER = '<!-- vault-characters:end -->'

/** The frontmatter key that makes a note a character. Identity, not the folder. */
export const DDB_ID_KEY = 'vc_ddb_id'

/**
 * The D&D Beyond id a Vault character was converted from (MYDND-105).
 *
 * Provenance, not identity: a converted character's `vc_ddb_id` is a fresh
 * `local:` id, which is what makes every surface treat it as a Vault
 * character. This key is what Re-convert fetches, and what stops a second
 * import of the same sheet from creating a second note.
 */
export const DDB_SOURCE_KEY = 'vc_ddb_source'

/** What the writer needs to know about how the user wants notes written. */
export interface CharacterNoteSettings {
  /** Folder new character notes are created in. */
  folder: string
  /** Write `statblock: true`, which is what lets an Atlas token link here. */
  exposeToAtlas: boolean
}

/** Characters Obsidian will not accept in a filename. */
export function sanitiseFileName(name: unknown): string {
  return (
    String(name)
      .replace(/[\\/:*?"<>|#^[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim() || 'Character'
  )
}

/**
 * The frontmatter this plugin owns.
 *
 * `statblock: true` is the load-bearing key: it is what makes Atlas resolve
 * this note as a linkable creature (`frontmatterSource`), which is how a token
 * on a map picks up the character's name and hit points, and what lists it in
 * Atlas' own creature pickers. Where Fantasy Statblocks is installed, it also
 * puts the character in that plugin's bestiary.
 *
 * `syncedAt` is passed in rather than read from the clock here, because this
 * feeds a `Vault.process` transform and that **must be pure**: Obsidian re-runs
 * the transform if the file changed underneath, and a `new Date()` inside would
 * write a different timestamp on the retry than the one already reported.
 */
export function managedFrontmatter(
  sheet: Sheet,
  settings: CharacterNoteSettings,
  syncedAt: string,
): Record<string, unknown> {
  const fm: Record<string, unknown> = {
    name: sheet.name,
    [DDB_ID_KEY]: sheet.ddb_id,
    vc_synced: syncedAt,
    vc_sheet_version: SHEET_VERSION,
  }
  if (settings.exposeToAtlas) fm.statblock = true
  if (typeof sheet.ac === 'number') fm.ac = sheet.ac
  if (typeof sheet.hp?.max === 'number') fm.hp = sheet.hp.max
  return fm
}

/** The collections a re-sync is checked against, with how to name a loss. */
const TRACKED_COLLECTIONS = [
  { key: 'attacks', one: 'attack', many: 'attacks' },
  { key: 'feature_dice', one: 'feature die', many: 'feature dice' },
  { key: 'spells', one: 'spell level', many: 'spell levels' },
  { key: 'hit_dice', one: 'hit-dice line', many: 'hit-dice lines' },
] as const

/**
 * What a re-sync is about to take away.
 *
 * Found by testing rather than by design: re-syncing Gibbs the day he was
 * imported silently emptied his attacks, because D&D Beyond had stopped
 * reporting both Psychic Blades entries — the payload was otherwise identical.
 * A Soulknife whose only attacks disappear without a word is the sort of thing
 * noticed mid-combat, so a shrinking collection now says so.
 *
 * It deliberately does **not** keep the old values. The sheet mirrors D&D
 * Beyond, and silently preserving data that is no longer there would strand a
 * weapon on the sheet forever once it is sold. Warn, and let the player decide.
 */
export function describeSheetLosses(before: Sheet | null, after: Sheet | null): string[] {
  if (!before || !after) return []
  const losses: string[] = []
  const count = (sheet: Sheet, key: string): number => {
    const v = (sheet as unknown as Record<string, unknown>)[key]
    return Array.isArray(v) ? v.length : 0
  }

  for (const { key, one, many } of TRACKED_COLLECTIONS) {
    const was = count(before, key)
    const now = count(after, key)
    if (was > 0 && now < was) {
      const gone = was - now
      losses.push(`${gone} ${gone === 1 ? one : many} (${was} → ${now})`)
    }
  }
  return losses
}

/**
 * The note text for a sheet, preserving anything already in the file.
 *
 * Pure, and the single place the note's shape is decided — which is what lets
 * it be handed straight to `StateVault.write` as its transform.
 *
 * @throws when the existing note's frontmatter cannot be parsed. `parseNote`
 *   refuses rather than degrading to `{}`, because writing `{}` back would
 *   delete whatever the player was midway through typing.
 */
export function renderNote(
  sheet: Sheet,
  settings: CharacterNoteSettings,
  existing: string,
  syncedAt: string,
): string {
  const { frontmatter: oldFm, body: oldBody } = parseNote(existing || '')

  const fm = { ...oldFm, ...managedFrontmatter(sheet, settings, syncedAt) }
  // Turning the Atlas toggle off has to *remove* the flag, not just stop
  // writing it — otherwise a note imported while it was on stays linkable.
  if (!settings.exposeToAtlas) delete fm.statblock

  // `notePath` is runtime-only and must not reach the file: a note recording
  // its own path would be wrong the moment it were renamed.
  const persisted: Sheet = { ...sheet }
  delete persisted.notePath

  const managed = [
    BEGIN_MARKER,
    '```' + CHARSHEET_FENCE,
    toYaml(persisted).trimEnd(),
    '```',
    END_MARKER,
  ].join('\n')

  let body: string
  const begin = oldBody.indexOf(BEGIN_MARKER)
  const end = oldBody.indexOf(END_MARKER)
  if (begin !== -1 && end !== -1 && end > begin) {
    body = oldBody.slice(0, begin) + managed + oldBody.slice(end + END_MARKER.length)
  } else if (oldBody.trim()) {
    // An existing note with no managed region: put the sheet on top and keep
    // everything that was there below it.
    body = `${managed}\n\n${oldBody.replace(/^\n+/, '')}`
  } else {
    body = `${managed}\n\n## Notes\n\n`
  }

  // The leading newline is what puts a blank line between the frontmatter and
  // the body, matching the notes already in the vault.
  return serialiseNote({ frontmatter: fm, body: `\n${body.replace(/^\n+/, '')}` })
}

export interface SaveResult {
  path: string
  /** Collections D&D Beyond no longer reports. Empty on a first import. */
  losses: string[]
  created: boolean
}

/** The prefix that marks a character as authored here rather than imported. */
export const LOCAL_ID_PREFIX = 'local:'

/** Whether an id names a Vault character — one D&D Beyond has no say over. */
export function isLocalId(id: unknown): boolean {
  return typeof id === 'string' && id.startsWith(LOCAL_ID_PREFIX)
}

/** A fresh `local:` id. Random, so two machines never mint the same one. */
export function mintLocalId(): string {
  return (
    LOCAL_ID_PREFIX +
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`)
  )
}

/**
 * A Vault character's note text: the managed charsheet region, then the
 * ` ```vault-character ` fence, from one existing text (MYDND-23).
 *
 * Pure, and composed from the two writers that already exist — `renderNote` for
 * the sheet and `setFence` for the choices — so the vault-character fence is
 * placed exactly like ` ```vault-inventory ` and ` ```vault-vitals `: replaced
 * where it is, appended when it is not, and never inside the managed region
 * that a re-render replaces wholesale.
 */
export function renderVaultCharacterNote(
  json: VaultCharacterJson,
  sheet: Sheet,
  settings: CharacterNoteSettings,
  existing: string,
  syncedAt: string,
): string {
  const { frontmatter, body } = parseNote(renderNote(sheet, settings, existing, syncedAt))
  return serialiseNote({
    frontmatter,
    body: setFence(body, VAULT_CHARACTER_FENCE, persistedVaultCharacter(json)),
  })
}

/** Everything a conversion writes, built by the caller from the reviewed plan (MYDND-105). */
export interface DdbConversion {
  /** The choices, with `ddbImport` stamped. */
  json: VaultCharacterJson
  /** Projected from `json`; `ddb_id` is the character's `local:` id. */
  sheet: Sheet
  /** The D&D Beyond id it came from. */
  ddbId: string
  /** The sheet as D&D Beyond reported it, which the vitals overlay seeds from. */
  ddbSheet: Sheet
  xp: number | null
  /** What D&D Beyond says it carries, as inventory rows and a purse. */
  items: InventoryItem[]
  currency: InventoryCurrency
}

/**
 * A converted character's note text, from one existing text (MYDND-105).
 *
 * Pure, and composed from the writers that already exist, so it can be handed
 * to `StateVault.write` as one transform: the whole conversion is one file
 * write (ADR 0003).
 *
 * 1. The charsheet and the ` ```vault-character ` fence (`renderVaultCharacterNote`).
 * 2. `vc_ddb_source`.
 * 3. On a **first** conversion only: the ` ```vault-vitals ` overlay seeded from
 *    D&D Beyond's hit points, never over a fence the vault already has (after
 *    the handover the vault is where the character is played, ADR 0006); and
 *    D&D Beyond's items and purse **added** to ` ```vault-inventory `.
 *
 * A re-conversion (`firstConversion: false`) replaces only the choices and the
 * sheet. By then inventory and vitals are the vault's, and adding D&D Beyond's
 * items a second time would duplicate every one.
 */
export function renderConvertedNote(
  conversion: DdbConversion,
  settings: CharacterNoteSettings,
  existing: string,
  syncedAt: string,
  firstConversion: boolean,
): string {
  let text = renderVaultCharacterNote(conversion.json, conversion.sheet, settings, existing, syncedAt)
  const { frontmatter, body } = parseNote(text)
  text = serialiseNote({ frontmatter: { ...frontmatter, [DDB_SOURCE_KEY]: conversion.ddbId }, body })
  if (!firstConversion) return text

  const vitals = extractVitalsFromNote(text)
  if (!vitals.present) {
    let seeded = seedFromSheet(vitals, conversion.ddbSheet)
    if (conversion.xp !== null) seeded = setXp(seeded, conversion.xp)
    text = writeVitalsToNote(text, seeded, syncedAt)
  }

  if (conversion.items.length > 0 || Object.values(conversion.currency).some(n => n > 0)) {
    const inv = extractInventoryFromNote(text)
    const c = conversion.currency
    text = writeInventoryToNote(text, {
      currency: {
        pp: (inv.currency.pp || 0) + c.pp,
        gp: (inv.currency.gp || 0) + c.gp,
        sp: (inv.currency.sp || 0) + c.sp,
        cp: (inv.currency.cp || 0) + c.cp,
      },
      items: [...inv.items, ...conversion.items],
    })
  }
  return text
}

export interface ConversionResult extends SaveResult {
  /** False when the note was already this Vault character: a Re-convert. */
  firstConversion: boolean
}

export interface CharacterStore {
  /** The vault path of the note holding `ddbId`, or `null` when there is none. */
  findByDdbId(ddbId: string): string | null
  /** Write a sheet to its note, creating or re-syncing as appropriate. */
  save(sheet: Sheet, settings: CharacterNoteSettings, targetPath?: string | null): Promise<SaveResult>
  /**
   * Write a Vault character — its choices and the sheet projected from them —
   * in one file write (MYDND-23).
   *
   * The sheet is built by the caller (`vaultCharacter.buildVaultSheet`), which
   * is what keeps this layer free of the catalogs. `sheet.ddb_id` is the
   * character's identity and must be a `local:` id.
   */
  saveVaultCharacter(
    json: VaultCharacterJson,
    sheet: Sheet,
    settings: CharacterNoteSettings,
    targetPath?: string | null,
  ): Promise<SaveResult>
  /**
   * A Vault character's choices, read back for the builder's edit mode
   * (MYDND-24). **Throws** on a missing note or a fence that will not parse —
   * an editor opened on a blank draft would save a blank character over it.
   */
  readVaultCharacter(path: string): Promise<VaultCharacterJson>
  /** The Vault character converted from this D&D Beyond id, or `null` (MYDND-105). */
  findByDdbSource(ddbId: string): string | null
  /**
   * Write a D&D Beyond conversion in one file write (MYDND-105).
   *
   * Lands on, in order: `targetPath`; the Vault character already converted
   * from this id (a Re-convert); the note imported the old way under this id
   * (Convert in place); or a fresh path. **Refuses** a note that belongs to
   * any other character.
   */
  convertFromDdb(
    conversion: DdbConversion,
    settings: CharacterNoteSettings,
    targetPath?: string | null,
  ): Promise<ConversionResult>
}

export function createCharacterStore(vault: StateVault, now: () => Date = () => new Date()): CharacterStore {
  /**
   * The note carrying this D&D Beyond id, searched by **frontmatter**.
   *
   * A character is identified by `vc_ddb_id`, never by its folder or filename —
   * so a player who renames `Gibbs.md` to `Gibbs the Bold.md` is re-synced in
   * place. Resolving by the sanitised sheet name instead, which is what the
   * plugin this replaces did when not invoked from the open note, would create
   * a second file beside the first and leave two notes claiming one character.
   */
  const findByDdbId = (ddbId: string): string | null => {
    const want = String(ddbId)
    for (const note of vault.allNotes()) {
      if (String(note.frontmatter[DDB_ID_KEY] ?? '') === want) return note.path
    }
    return null
  }

  const save = async (
    sheet: Sheet,
    settings: CharacterNoteSettings,
    targetPath?: string | null,
  ): Promise<SaveResult> => {
    const path =
      targetPath ||
      findByDdbId(sheet.ddb_id) ||
      `${settings.folder}/${sanitiseFileName(sheet.name)}.md`

    // Read before writing, so the warning can describe what is about to go.
    // A read plus a write rather than one operation, but only the write
    // mutates — the "one mutation is one file write" rule is intact.
    const existing = await vault.read(path)
    const losses = describeSheetLosses(readSheetFromNote(existing ?? '', fromYaml), sheet)

    const syncedAt = now().toISOString()
    await vault.write(path, markdown => renderNote(sheet, settings, markdown, syncedAt))

    return { path, losses, created: existing === null }
  }

  /**
   * A path for a **new** Vault character that no note already occupies.
   *
   * `save` above writes `<folder>/<name>.md` for a D&D Beyond import whether or
   * not that file exists, and for an import that is right: it is the same
   * character arriving again. A *new* local character called "Gibbs" is not the
   * imported Gibbs, and writing to his file would replace his sheet with this
   * one's. So a taken name becomes `Gibbs 2`, the way Obsidian names a
   * duplicate. Compared case-insensitively, because Windows and macOS file
   * systems are.
   */
  const freshPath = (folder: string, name: string): string => {
    const taken = new Set(vault.notesIn(folder).map(n => n.slug.toLowerCase()))
    const base = sanitiseFileName(name)
    let candidate = base
    for (let n = 2; taken.has(candidate.toLowerCase()); n += 1) candidate = `${base} ${n}`
    return `${folder}/${candidate}.md`
  }

  const saveVaultCharacter = async (
    json: VaultCharacterJson,
    sheet: Sheet,
    settings: CharacterNoteSettings,
    targetPath?: string | null,
  ): Promise<SaveResult> => {
    // A writer refuses (ADR 0003). Both checks are cheap, and both guard a file
    // nothing else holds a copy of.
    if (!isLocalId(sheet.ddb_id)) {
      throw new Error(`a Vault character needs a local id, not "${sheet.ddb_id}"`)
    }
    const problems = vaultCharacterProblems(json)
    if (problems.length > 0) throw new Error(`cannot save this character: ${problems.join('; ')}`)

    const path = targetPath || findByDdbId(sheet.ddb_id) || freshPath(settings.folder, sheet.name)
    const existing = await vault.read(path)

    // The note at the path must be this character or nothing. A rebuild run
    // against the wrong note — a D&D Beyond character's — would otherwise
    // replace its imported sheet with a Vault projection, and there is no undo.
    if (existing !== null) {
      const fmId = parseNote(existing).frontmatter[DDB_ID_KEY]
      if (fmId !== undefined && String(fmId) !== sheet.ddb_id) {
        throw new Error(`${path} belongs to character ${String(fmId)}, not ${sheet.ddb_id}`)
      }
    }

    const syncedAt = now().toISOString()
    await vault.write(path, markdown => renderVaultCharacterNote(json, sheet, settings, markdown, syncedAt))
    return { path, losses: [], created: existing === null }
  }

  const findByDdbSource = (ddbId: string): string | null => {
    const want = String(ddbId)
    for (const note of vault.allNotes()) {
      if (isLocalId(note.frontmatter[DDB_ID_KEY]) && String(note.frontmatter[DDB_SOURCE_KEY] ?? '') === want) {
        return note.path
      }
    }
    return null
  }

  const convertFromDdb = async (
    conversion: DdbConversion,
    settings: CharacterNoteSettings,
    targetPath?: string | null,
  ): Promise<ConversionResult> => {
    const { sheet, ddbId } = conversion
    if (!isLocalId(sheet.ddb_id)) {
      throw new Error(`a converted character needs a local id, not "${sheet.ddb_id}"`)
    }
    const problems = vaultCharacterProblems(conversion.json)
    if (problems.length > 0) throw new Error(`cannot convert this character: ${problems.join('; ')}`)

    const path =
      targetPath || findByDdbSource(ddbId) || findByDdbId(ddbId) || freshPath(settings.folder, sheet.name)
    const existing = await vault.read(path)

    // The note must be this character: unclaimed, the old import of this D&D
    // Beyond id, or the Vault character already converted from it, under the
    // same local id the caller built the sheet with. Anything else is another
    // character's note, and there is no undo.
    let firstConversion = true
    if (existing !== null) {
      const fm = parseNote(existing).frontmatter
      const fmId = fm[DDB_ID_KEY] === undefined ? undefined : String(fm[DDB_ID_KEY])
      if (fmId !== undefined && isLocalId(fmId)) {
        if (String(fm[DDB_SOURCE_KEY] ?? '') !== ddbId) {
          throw new Error(`${path} is Vault character ${fmId}, which was not converted from D&D Beyond ${ddbId}`)
        }
        if (fmId !== sheet.ddb_id) throw new Error(`${path} is ${fmId}, not ${sheet.ddb_id}`)
        firstConversion = false
      } else if (fmId !== undefined && fmId !== ddbId) {
        throw new Error(`${path} belongs to character ${fmId}, not ${ddbId}`)
      }
    }

    const syncedAt = now().toISOString()
    await vault.write(path, markdown => renderConvertedNote(conversion, settings, markdown, syncedAt, firstConversion))
    return { path, losses: [], created: existing === null, firstConversion }
  }

  const readVaultCharacter = async (path: string): Promise<VaultCharacterJson> => {
    const markdown = await vault.read(path)
    if (markdown === null) throw new Error('the note no longer exists')
    return readVaultCharacterOrThrow(markdown)
  }

  return {
    findByDdbId,
    save,
    saveVaultCharacter,
    readVaultCharacter,
    findByDdbSource,
    convertFromDdb,
  }
}
