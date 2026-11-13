import { num, str } from '../model/catalog'
import { extractFence } from '../model/fence'
import { DEFAULT_SESSIONS_FOLDER } from '../model/folders'
import { fromYaml, noteName, parseNote, serialiseNote, setFence, uniqueName } from './note'
import type { StateVault } from './vault'

/**
 * The activity log and the session notes — the two GM surfaces that are just
 * writing things down.
 *
 * ## One module, because they are one shape
 *
 * `the-vault` keeps them in two tables for two different reasons.
 * `activity_log` is append-only machine-written events (`component_harvested`,
 * `item_bought`); `campaign_note` is prose a human typed, with a `kind` column
 * separating GM notes from **player-facing broadcasts**. Realtime is enabled on
 * the second one, which is the whole reason it is a table rather than a text
 * field.
 *
 * Single-player deletes the half that made them different. With one seat there
 * is nobody to broadcast *to*, so `kind` collapses, the banner has no analogue,
 * and what is left on both sides is "append an entry under a campaign, with a
 * timestamp". That is one shape, so it is one module — and a vault is better at
 * it than Postgres was, because the entries are then searchable, linkable and in
 * the same graph as the lore they are about.
 *
 * ## A day is the note, and an entry is a line in it
 *
 * **Not a note per event.** A session generates dozens of them — every harvest,
 * every purchase, every rest — and a thousand two-line notes would make the
 * vault's file list useless and its graph unreadable. A note per *day* per
 * campaign is what a GM would have written anyway, and it is the granularity
 * Obsidian's daily-note habit already expects.
 *
 * So the log is `log/<campaign>/<date>.md`, entries in a ` ```vault-log ` fence,
 * newest last. One `append` is one `vault.write`, which reads the day's note,
 * adds a line and writes it back — the primitive ADR 0003 insists on.
 *
 * ## Session notes are notes, not records
 *
 * A session note is prose, so it lives in the **body** and not in a fence. The
 * only structure is its frontmatter — the campaign, the date, a title — because
 * that is what a Base can table. Writing a GM's prose into YAML would make it
 * unreadable in the one application whose whole point is reading markdown.
 */

export const LOG_FOLDER = 'log'
export const LOG_FENCE = 'vault-log'
/** The default sessions folder. The one in use is `Activity.sessionsFolder()` (MYDND-184). */
export const SESSIONS_FOLDER = DEFAULT_SESSIONS_FOLDER

/** The event kinds the app itself writes. A GM's own note is `note`. */
export const ACTIVITY_KINDS = [
  'note',
  'rest',
  'damage',
  'heal',
  'level',
  'harvest',
  'craft',
  'buy',
  'sell',
  'transfer',
  'encounter',
  // A thrown roll, as the dice landed (MYDND-27). Written by `RollProvider`,
  // one line per roll, after any intervention has been settled.
  'roll',
] as const

export type ActivityKind = (typeof ACTIVITY_KINDS)[number]

export interface ActivityEntry {
  /** ISO 8601. Written, never inferred at read time. */
  at: string
  kind: ActivityKind
  /** One line, as it should read in the log. */
  text: string
  /** The character it happened to, as a note name. `null` for a party event. */
  character?: string | null
  /** Anything worth keeping that is not prose — a price, a count, a DC. */
  detail?: Record<string, unknown>
}

export interface LogDay {
  /** The note's slug — the date, `2026-10-07`. */
  date: string
  path: string
  entries: ActivityEntry[]
}

export interface SessionNoteRow {
  /** The note's slug, which is its identity. */
  id: string
  path: string
  title: string
  /** ISO date, or `null` when somebody edited it to nonsense. */
  date: string | null
  campaignId: string | null
  /** Session number, when the GM numbered it. */
  session: number | null
}

export interface Activity {
  /** Where session notes are read from and created, as the settings have it (MYDND-184). */
  sessionsFolder(): string
  /** Every logged day for a campaign, newest first. No file reads. */
  days(campaignId: string): string[]
  /** One day's entries. One file read. */
  day(campaignId: string, date: string): Promise<LogDay>
  /** Recent entries across days, newest first. Reads `limit` days at most. */
  recent(campaignId: string, days?: number): Promise<ActivityEntry[]>
  /** Append one entry to today's note. One file write. */
  append(campaignId: string, entry: Omit<ActivityEntry, 'at'> & { at?: string }): Promise<ActivityEntry>

  /** Session notes for a campaign, newest first. Frontmatter only. */
  sessions(campaignId: string | null): SessionNoteRow[]
  /** Create a session note. Returns its path. */
  createSession(input: { campaignId: string | null; title?: string; session?: number | null }): Promise<string>
  /**
   * A session note's body, frontmatter taken off, for the preview and the
   * card's first lines (MYDND-93). One file read. **A reader degrades**: a note
   * whose frontmatter will not parse still shows its text, and a missing note
   * is `null`. Nothing here writes.
   */
  readSession(path: string): Promise<string | null>
}

/** `2026-10-07` from a Date, in local time — a GM's day, not UTC's. */
export function dayKey(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const isKind = (v: unknown): v is ActivityKind =>
  typeof v === 'string' && (ACTIVITY_KINDS as readonly string[]).includes(v)

/**
 * Entries out of a fence.
 *
 * **A reader degrades** (ADR 0003): a malformed fence is an empty day, not an
 * exception, because a log somebody broke by hand must not take out the GM page.
 * An entry missing its text is dropped — a blank line in a log is worse than a
 * shorter log.
 */
export function parseEntries(text: string | null | undefined): ActivityEntry[] {
  if (!text) return []
  let parsed: unknown
  try {
    parsed = fromYaml(text)
  } catch {
    return []
  }
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { entries?: unknown })?.entries)
      ? ((parsed as { entries: unknown[] }).entries as unknown[])
      : []

  const out: ActivityEntry[] = []
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue
    const row = raw as Record<string, unknown>
    const text = str(row.text)
    if (!text) continue
    out.push({
      at: str(row.at) ?? '',
      // An unrecognised kind becomes `note` rather than being passed through:
      // the filter chips are a closed vocabulary and a typo'd kind renders as a
      // chip nobody can ever match. Same rule `feats.ts` follows for `kind`.
      kind: isKind(row.kind) ? row.kind : 'note',
      text,
      character: str(row.character),
      detail:
        row.detail && typeof row.detail === 'object' && !Array.isArray(row.detail)
          ? (row.detail as Record<string, unknown>)
          : undefined,
    })
  }
  return out
}

/** The fence body for a day. Entries only — the date is the note's name. */
export function serialiseEntries(entries: readonly ActivityEntry[]): Record<string, unknown> {
  return {
    entries: entries.map(e => {
      const row: Record<string, unknown> = { at: e.at, kind: e.kind, text: e.text }
      if (e.character) row.character = e.character
      if (e.detail && Object.keys(e.detail).length > 0) row.detail = e.detail
      return row
    }),
  }
}

export function createActivity(
  vault: StateVault,
  now: () => Date = () => new Date(),
  sessionsFolder: () => string = () => SESSIONS_FOLDER,
): Activity {
  const folderFor = (campaignId: string): string => `${LOG_FOLDER}/${campaignId}`

  const days = (campaignId: string): string[] =>
    vault
      .notesIn(folderFor(campaignId))
      .map(n => n.slug)
      // Lexicographic on `YYYY-MM-DD` is chronological, which is the whole
      // reason the date is the note's name in that order.
      .sort((a, b) => b.localeCompare(a))

  const day = async (campaignId: string, date: string): Promise<LogDay> => {
    const path = `${folderFor(campaignId)}/${date}.md`
    const markdown = await vault.read(path)
    return { date, path, entries: parseEntries(extractFence(markdown ?? '', LOG_FENCE)) }
  }

  const recent = async (campaignId: string, limit = 14): Promise<ActivityEntry[]> => {
    const out: ActivityEntry[] = []
    for (const date of days(campaignId).slice(0, limit)) {
      const loaded = await day(campaignId, date)
      out.push(...loaded.entries)
    }
    // Newest first across days. Entries within a day are stored oldest-first
    // because that is how a log reads when you open the note itself.
    return out.sort((a, b) => b.at.localeCompare(a.at))
  }

  const append = async (
    campaignId: string,
    entry: Omit<ActivityEntry, 'at'> & { at?: string },
  ): Promise<ActivityEntry> => {
    // Stamped here, once, and closed over — never inside the transform.
    // `Vault.process` re-runs a transform if the file changed underneath.
    const stamp = now()
    const at = entry.at ?? stamp.toISOString()
    const full: ActivityEntry = { ...entry, at }
    const path = `${folderFor(campaignId)}/${dayKey(stamp)}.md`

    await vault.write(path, markdown => {
      const doc = parseNote(markdown)
      const existing = parseEntries(extractFence(markdown, LOG_FENCE))
      const frontmatter = {
        ...doc.frontmatter,
        // Written so a Base can table the log without parsing a fence, and so
        // the note says what it is when opened on its own.
        title: dayKey(stamp),
        campaign: campaignId,
        date: dayKey(stamp),
        entry_count: existing.length + 1,
      }
      const body = setFence(doc.body, LOG_FENCE, serialiseEntries([...existing, full]))
      return serialiseNote({ frontmatter, body })
    })

    return full
  }

  const sessions = (campaignId: string | null): SessionNoteRow[] =>
    vault
      .notesIn(sessionsFolder())
      .map(note => ({
        id: note.slug,
        path: note.path,
        title: str(note.frontmatter.title) ?? note.slug,
        date: str(note.frontmatter.date),
        campaignId: str(note.frontmatter.campaign),
        session: num(note.frontmatter.session),
      }))
      // A session note with no campaign is shown under every campaign rather
      // than nowhere: it is far likelier to be one somebody wrote before
      // choosing a campaign than one that belongs to a different table.
      .filter(row => campaignId === null || row.campaignId === null || row.campaignId === campaignId)
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || b.id.localeCompare(a.id))

  const createSession = async (input: {
    campaignId: string | null
    title?: string
    session?: number | null
  }): Promise<string> => {
    const stamp = now()
    const date = dayKey(stamp)
    const base = noteName(input.title?.trim() || `Session ${date}`)
    const taken = new Set(vault.notesIn(sessionsFolder()).map(n => n.slug))
    const name = uniqueName(base, taken)
    const path = `${sessionsFolder()}/${name}.md`

    await vault.write(path, markdown => {
      // Appends to an existing note rather than replacing it — `uniqueName`
      // should have prevented a collision, but a GM may have created the file
      // between the listing and the write, and a session's prose has no undo.
      const doc = parseNote(markdown)
      const frontmatter: Record<string, unknown> = {
        ...doc.frontmatter,
        title: name,
        date,
      }
      if (input.campaignId) frontmatter.campaign = input.campaignId
      if (typeof input.session === 'number') frontmatter.session = input.session

      // Prose in the body, never in a fence. Writing a GM's notes into YAML
      // would make them unreadable in the one application whose point is
      // reading markdown.
      const body = doc.body.trim() === '' ? `\n# ${name}\n\n## What happened\n\n\n## Threads\n\n\n` : doc.body
      return serialiseNote({ frontmatter, body })
    })

    return path
  }

  const readSession = async (path: string): Promise<string | null> => {
    const markdown = await vault.read(path)
    if (markdown === null) return null
    try {
      return parseNote(markdown).body
    } catch {
      // `parseNote` refuses frontmatter it could not write back; reading it is fine.
      return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
    }
  }

  return { sessionsFolder, days, day, recent, append, sessions, createSession, readSession }
}
