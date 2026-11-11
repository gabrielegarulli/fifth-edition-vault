import { readSheetWithReason, type SheetProblem } from '../ddb/charsheet'
import type { Sheet } from '../ddb/sheet'
import { extractVitalsFromNote, type Vitals } from '../state/vitals'
import { applyVitalsToSheet } from './vitalsProjection'
import { str } from './catalog'
import type { ItemDataSource } from '../sheet/equipment'
import { overlayNote } from './sheetProjection'
import type { ParseYaml, VaultSource } from './source'

/**
 * The roster — which notes in the vault are characters, and what their sheets
 * say.
 *
 * Ported from `obsidian-vault-characters`' section 7 (MYDND-7).
 *
 * **This is the one content type that is not a folder.** Every catalog is
 * "the notes in `spells/`"; a character is **any note carrying `vc_ddb_id` in
 * its frontmatter**. Moving one out of `characters/` keeps it a character, and
 * dropping an unrelated note into that folder does not make it one. So this
 * does not go through `createCatalog`, and it is the only caller of
 * `VaultSource.allNotes()`.
 *
 * **Nothing is hidden because it is broken.** A note whose fence is missing or
 * malformed is still listed, with `sheet: null` and the reason attached,
 * because hiding it would make the character that needs fixing invisible —
 * which is the opposite of what a roster is for. That is invariant 4, and it is
 * why `entries()` returns a reason rather than filtering.
 *
 * Unlike a catalog list, this **does** read files: the sheet lives in the body,
 * not in frontmatter, and there is no flat projection of it to filter on. That
 * is affordable where a catalog's would not be — a party is five notes, not
 * 1,785 — but it is why the roster is `async` and a catalog list is not.
 */

/** The frontmatter key that makes a note a character. */
export const DDB_ID_KEY = 'vc_ddb_id'

/** The D&D Beyond id a Vault character was converted from; the state layer's `DDB_SOURCE_KEY` (MYDND-105). */
const DDB_SOURCE_KEY = 'vc_ddb_source'

export interface RosterEntry {
  path: string
  /** Display name, from the sheet, then frontmatter, then the filename. */
  name: string
  /** The parsed sheet, or `null` when the note has no readable one. */
  sheet: Sheet | null
  /** Why there is no sheet. `null` when there is one. */
  error: SheetProblem | null
  /** ISO timestamp of the last sync, or `null` if never. */
  synced: string | null
  ddbId: string
  /** The D&D Beyond id a Vault character was converted from, or `null` (MYDND-105). */
  ddbSource: string | null
  /**
   * The note's `vault-vitals`, as read alongside the sheet — the card's spent
   * slots and resource uses (MYDND-132). Absent when there is no sheet, or on
   * an entry built by hand.
   */
  vitals?: Vitals
}

/** Whether a note's frontmatter marks it as an imported character. */
export function isCharacterNote(frontmatter: Record<string, unknown>): boolean {
  return str(frontmatter[DDB_ID_KEY]) !== null || typeof frontmatter[DDB_ID_KEY] === 'number'
}

export interface Roster {
  /** Every character note's path and frontmatter. No file reads. */
  list(): { path: string; name: string; ddbId: string; synced: string | null }[]
  /** Every character, with its sheet read. One file read per character. */
  entries(): Promise<RosterEntry[]>
}

/**
 * `items` reads the worn items' notes for the loadout overlay (MYDND-57). Without
 * it a weapon has no dice — the overlay still runs, from names alone.
 */
export function createCharacters(source: VaultSource, parseYaml: ParseYaml, items?: ItemDataSource): Roster {
  /** Character notes, by frontmatter, anywhere in the vault. */
  const notes = (): { path: string; slug: string; frontmatter: Record<string, unknown> }[] =>
    source.allNotes().filter(n => isCharacterNote(n.frontmatter))

  const idOf = (fm: Record<string, unknown>): string => String(fm[DDB_ID_KEY] ?? '')

  const list = (): { path: string; name: string; ddbId: string; synced: string | null }[] =>
    notes()
      .map(n => ({
        path: n.path,
        name: str(n.frontmatter.name) ?? n.slug,
        ddbId: idOf(n.frontmatter),
        synced: str(n.frontmatter.vc_synced),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

  return {
    list,

    entries: async () => {
      const out: RosterEntry[] = []
      for (const note of notes()) {
        const body = await source.readBody(note.path)
        const { sheet, error } = readSheetWithReason(body, parseYaml)
        let vitals: Vitals | undefined
        // Attached after reading and never persisted, so a roll can tell Atlas
        // which note it came from. See `Sheet.notePath`.
        if (sheet) {
          sheet.notePath = note.path
          await overlayNote(sheet, body, items)
          // Vitals *after* inventory, because inventory can change the maximum
          // nothing yet but will (a Belt of Giant Strength), and `hp.current`
          // is derived from whatever the maximum ended up being.
          vitals = extractVitalsFromNote(body)
          applyVitalsToSheet(sheet, vitals)
        }

        out.push({
          path: note.path,
          name: sheet?.name || str(note.frontmatter.name) || note.slug,
          sheet,
          error,
          synced: str(note.frontmatter.vc_synced),
          ddbId: idOf(note.frontmatter),
          ddbSource: str(note.frontmatter[DDB_SOURCE_KEY]),
          ...(vitals ? { vitals } : {}),
        })
      }
      return out.sort((a, b) => a.name.localeCompare(b.name))
    },
  }
}

/** Filters a roster by a free-text query over name, race and class line. */
export function filterRoster(roster: RosterEntry[], query: string): RosterEntry[] {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return roster
  return roster.filter(entry =>
    [entry.name, entry.sheet?.race, entry.sheet?.classes]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q),
  )
}

export interface InitiativeResult {
  name: string
  total: number
  modifier?: number
}

/**
 * Turn order from a set of rolled initiatives, highest first.
 *
 * Ties keep the higher initiative *modifier* ahead, which is the usual table
 * tiebreak, and fall back to name so the order is never arbitrary — an
 * unstable turn order is worse than a slightly wrong one.
 */
export function initiativeOrder<T extends InitiativeResult>(results: T[]): T[] {
  return [...results].sort(
    (a, b) => b.total - a.total || (b.modifier ?? 0) - (a.modifier ?? 0) || a.name.localeCompare(b.name),
  )
}

/** `3 minutes ago`, `yesterday`, `12 Mar` — for a sync timestamp. */
export function formatRelativeTime(iso: string | null | undefined, now: number = Date.now()): string {
  const then = Date.parse(iso || '')
  if (!Number.isFinite(then)) return 'never'
  const seconds = Math.max(0, Math.round((now - then) / 1000))
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  return new Date(then).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}
