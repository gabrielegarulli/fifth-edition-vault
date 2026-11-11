import { extractFence } from '../content/fence'
import { num, str } from '../content/catalog'
import { CAMPAIGNS_FOLDER } from './campaigns'
import { fromYaml, noteName, serialiseNote, setFence, uniqueName } from './note'
import type { StateVault } from './vault'

/**
 * The harvest log — one note per harvest.
 *
 * ## It is three stores and a manual JSON export in the web app
 *
 * Tracing `useHarvestPersistence.confirmDistribution`, one harvest writes to:
 *
 * | where | what | read back? |
 * | --- | --- | --- |
 * | `localStorage` | `logEntries[]`, the per-component detail | only by `exportHarvest()` |
 * | the `monster` table | one summary row, CR as a band | **never** — `monsters.js` says so outright |
 * | `activity_log` | a `component_harvested` event | by the GM log |
 *
 * The detail is the only record of *what* came off the creature and it is
 * trapped in one browser — `exportHarvest`/`importHarvest`, a JSON blob and a
 * file picker, exist precisely because it is. The summary row is durable and
 * holds almost nothing: a name, a CR band, a size. Neither store could be both
 * detailed and durable, so there were three.
 *
 * A note is both. So the three collapse into one note carrying the summary in
 * flat typed frontmatter and the components in a ` ```vault-harvest ` fence, and
 * two things follow from that rather than being features anyone built:
 * **`exportHarvest` and `importHarvest` delete themselves**, because the vault
 * is already the export; and the log stops being write-only, because a Base can
 * table the frontmatter and the note can link to the bestiary note and the
 * characters involved.
 *
 * ## The CR band is a string, always
 *
 * `cr_band` is `'3-6'`, `'12-17'` — a band, not a number, and the reason the
 * harvest log could never be merged into `content_monster`, whose `cr` is
 * numeric. `parseCr` in the content layer exists because `cr: 1/4` parsed as
 * `NaN` on 78 of 336 bestiary notes; here the band is never coerced at all, and
 * `note.ts` quotes every string it writes so no reader can make a number of it.
 */

export const HARVESTS_FOLDER = 'harvests'
export const HARVEST_FENCE = 'vault-harvest'

export interface HarvestComponent {
  name: string
  /** The component's own DC, as the harvest tables give it. */
  dc: number | null
  quantity: number
  kind: 'component' | 'essence'
  /**
   * Who received it — a character's name. Absent on a legacy import and on a
   * row nobody was given; the note keeps the row either way (MYDND-33).
   */
  to?: string | null
}

/** Who did the work. Names, not paths: the note links them as `[[Name]]`. */
export interface HarvestCrew {
  assessor: string | null
  carver: string | null
  helpers: string[]
}

/** A harvest as the log lists it — frontmatter only, so listing costs no file I/O. */
export interface HarvestRow {
  /** The note's slug. */
  id: string
  path: string
  /** ISO 8601, as written. `null` for a note whose date was edited to nonsense. */
  harvestedAt: string | null
  /** The campaign note's slug, or `null`. */
  campaign: string | null
  /** The creature's own name, when the GM gave it one. */
  creature: string | null
  creatureType: string | null
  /** A band — `'3-6'`. Never a number. */
  crBand: string | null
  size: string | null
  /** The combined Assessment + Carving total that resolved the tiers. */
  check: number | null
  componentCount: number
  totalQuantity: number
}

/** What the writer is handed. Everything optional except what came off the creature. */
export interface HarvestEntry {
  harvestedAt?: string
  campaign?: string | null
  creature?: string | null
  /**
   * The bestiary note the creature is, by vault path — `bestiary/owlbear.md`.
   * The body links that note rather than `[[creature]]`, because the exporter
   * names a note by slug and the name lives in `title` (MYDND-153). Absent,
   * the creature is named in plain text: a link to no note is a broken one.
   */
  creatureNote?: string | null
  creatureType?: string | null
  crBand?: string | null
  size?: string | null
  check?: number | null
  components: HarvestComponent[]
  /** Recorded in the fence and named in the opening line (MYDND-33). */
  crew?: HarvestCrew | null
  /**
   * Anything the importer could not map onto a key above, written into the fence
   * so that a one-way import never silently discards a field. The Supabase
   * `campaign_id` uuid lands here: it names a campaign this vault has no note
   * for, so it is not a `campaign`, but throwing it away would make the import
   * lossy.
   */
  carried?: Record<string, unknown>
}

export interface ImportResult {
  written: number
  /** Entries whose harvest already had a note — the import is idempotent. */
  skipped: number
  /** Entries too malformed to place, with the reason. */
  rejected: Array<{ reason: string; entry: unknown }>
  paths: string[]
}

export interface Harvests {
  list(): HarvestRow[]
  /** The component list, which needs the fence and therefore one file read. */
  components(path: string): Promise<HarvestComponent[]>
  log(entry: HarvestEntry): Promise<HarvestRow>
  /** `vault-harvest-log.json` from the web app, turned into notes. */
  importLegacy(entries: unknown): Promise<ImportResult>
}

const KEY = {
  harvested: 'harvested',
  campaign: 'campaign',
  creature: 'creature',
  creatureType: 'creature_type',
  crBand: 'cr_band',
  size: 'size',
  check: 'check',
  componentCount: 'component_count',
  totalQuantity: 'total_quantity',
} as const

export function createHarvests(vault: StateVault, campaignsFolder: () => string = () => CAMPAIGNS_FOLDER): Harvests {
  const campaignLink = (slug: string) => `[[${campaignsFolder()}/${slug}|${slug}]]`

  const rows = (): HarvestRow[] =>
    vault.notesIn(HARVESTS_FOLDER).map(note => {
      const fm = note.frontmatter
      return {
        id: note.slug,
        path: note.path,
        harvestedAt: isoOf(fm[KEY.harvested]),
        campaign: unlink(str(fm[KEY.campaign])),
        creature: unlink(str(fm[KEY.creature])),
        creatureType: str(fm[KEY.creatureType]),
        // Not through `num()` — a band is a string and coercing it is the bug.
        crBand: str(fm[KEY.crBand]),
        size: str(fm[KEY.size]),
        check: num(fm[KEY.check]),
        componentCount: num(fm[KEY.componentCount]) ?? 0,
        totalQuantity: num(fm[KEY.totalQuantity]) ?? 0,
      }
    })

  /**
   * Newest first — a log is read from the end.
   *
   * Tied on the slug, because two harvests *can* share a timestamp (an import
   * of one session, a second harvest logged in the same second) and leaving
   * those to `sort`'s stability would order them by however the vault happened
   * to enumerate its files.
   */
  const list = (): HarvestRow[] =>
    rows().sort(
      (a, b) =>
        (b.harvestedAt ?? '').localeCompare(a.harvestedAt ?? '') || a.id.localeCompare(b.id),
    )

  const write = async (entry: HarvestEntry, taken: Set<string>): Promise<HarvestRow> => {
    const harvestedAt = entry.harvestedAt ?? new Date().toISOString()
    const label = entry.creature ?? entry.creatureType ?? 'Harvest'
    const slug = uniqueName(noteName(`${harvestedAt.slice(0, 10)} ${label}`), taken)
    taken.add(slug)
    const path = `${HARVESTS_FOLDER}/${slug}.md`

    const components = entry.components
    const totalQuantity = components.reduce((sum, c) => sum + (c.quantity || 0), 0)

    // Keys written in a fixed order, and `undefined` dropped rather than
    // emitted as `null`: `component_qty: null` reads as a recorded zero, which
    // MYDND-4 already paid for once in the class exporter.
    const frontmatter = compact({
      [KEY.harvested]: harvestedAt,
      [KEY.campaign]: entry.campaign ? campaignLink(entry.campaign) : undefined,
      [KEY.creature]: entry.creature ?? undefined,
      [KEY.creatureType]: entry.creatureType ?? undefined,
      [KEY.crBand]: entry.crBand ?? undefined,
      [KEY.size]: entry.size ?? undefined,
      [KEY.check]: entry.check ?? undefined,
      [KEY.componentCount]: components.length,
      [KEY.totalQuantity]: totalQuantity,
      tags: ['harvest'],
    })

    await vault.write(path, () =>
      serialiseNote({
        frontmatter,
        body: setFence(
          body(entry, harvestedAt),
          HARVEST_FENCE,
          compact({ crew: entry.crew ?? undefined, components, ...(entry.carried ?? {}) }),
        ),
      }),
    )

    return {
      id: slug,
      path,
      harvestedAt,
      campaign: entry.campaign ?? null,
      creature: entry.creature ?? null,
      creatureType: entry.creatureType ?? null,
      crBand: entry.crBand ?? null,
      size: entry.size ?? null,
      check: entry.check ?? null,
      componentCount: components.length,
      totalQuantity,
    }
  }

  return {
    list,

    components: async path => {
      const markdown = await vault.read(path)
      if (markdown == null) return []
      const raw = extractFence(markdown, HARVEST_FENCE)
      if (raw === null) return []
      try {
        const fence = fromYaml(raw)
        const found = (fence as { components?: unknown })?.components
        return Array.isArray(found) ? found.map(toComponent).filter(isComponent) : []
      } catch {
        // A hand-broken fence loses the component list, not the note. Unlike the
        // write path, nothing is being overwritten here, so degrading is safe.
        return []
      }
    },

    log: entry => write(entry, new Set(vault.notesIn(HARVESTS_FOLDER).map(n => n.slug))),

    importLegacy: async raw => {
      const result: ImportResult = { written: 0, skipped: 0, rejected: [], paths: [] }
      if (!Array.isArray(raw)) {
        result.rejected.push({ reason: 'The file is not a JSON array of log entries.', entry: raw })
        return result
      }

      // **The dedupe key is the timestamp alone, and the grouping key below is
      // not.** They look like they should be the same key and must not be:
      //
      // - `buildHarvestPayload` stamps every row of one harvest with a single
      //   `now()`, so `saved_at` identifies a harvest exactly. It is also the
      //   one field nobody edits by hand — which is what a dedupe key needs,
      //   because a GM who corrects `creature_type` on a note must not thereby
      //   make a re-import write it again.
      // - Grouping takes the creature as well, so that two harvests which did
      //   somehow share a second become two notes rather than one note with two
      //   creatures merged into it. Splitting too far is recoverable; merging
      //   two harvests is not.
      const existing = new Set(list().map(r => r.harvestedAt).filter(Boolean))
      const taken = new Set(vault.notesIn(HARVESTS_FOLDER).map(n => n.slug))
      const grouped = new Map<string, { entry: HarvestEntry; count: number }>()

      for (const item of raw) {
        const entry = item as Record<string, unknown>
        const savedAt = isoOf(entry?.saved_at)
        const name = str(entry?.component_name)
        // `saved_at` is what makes several rows one harvest, so an entry without
        // one cannot be placed on the log at all. Rejected rather than given
        // "now", which would date a two-year-old harvest today.
        if (!savedAt) {
          result.rejected.push({ reason: 'No usable `saved_at`.', entry: item })
          continue
        }
        if (!name) {
          result.rejected.push({ reason: 'No `component_name`.', entry: item })
          continue
        }

        const key = groupKey(
          savedAt,
          str(entry?.creature_type),
          str(entry?.cr_band),
          str(entry?.creature_size),
        )

        // Already imported. Counted per source entry, so the number reported
        // matches what was in the file rather than what it grouped into.
        if (existing.has(savedAt)) {
          result.skipped += 1
          continue
        }

        const group = grouped.get(key) ?? {
          count: 0,
          entry: {
            harvestedAt: savedAt,
            creatureType: str(entry?.creature_type),
            crBand: str(entry?.cr_band),
            size: str(entry?.creature_size),
            components: [],
            // The Supabase campaign uuid names a campaign this vault has no
            // note for. Carried into the fence rather than dropped or guessed.
            carried: compact({ legacy_campaign_id: str(entry?.campaign_id) ?? undefined }),
          },
        }
        group.entry.components.push({
          name,
          dc: num(entry?.component_dc),
          quantity: num(entry?.quantity) ?? 1,
          // The legacy shape does not say. `isEssenceName` lives in the
          // harvesting workflow, which is Phase 5; calling everything a
          // component is wrong for a handful of rows and inventing a guess here
          // would be wrong in a way nobody could later tell from the data.
          kind: 'component',
        })
        group.count += 1
        grouped.set(key, group)
      }

      for (const { entry, count } of grouped.values()) {
        const row = await write(entry, taken)
        result.written += count
        result.paths.push(row.path)
      }

      return result
    },
  }
}

/**
 * The prose a harvest note opens with.
 *
 * A wikilink to the creature's bestiary note when there is one, because that is
 * the whole dividend of the log being notes: the bestiary note gains a backlink
 * saying this creature was harvested, which no row in the `monster` table could
 * ever do. Folder-qualified, as the lore wiki requires of every link — `druid`
 * is a class and a creature (MYDND-153).
 */
function body(entry: HarvestEntry, harvestedAt: string): string {
  const creature = entry.creature
    ? entry.creatureNote
      ? `[[${entry.creatureNote.replace(/\.md$/, '')}|${entry.creature}]]`
      : entry.creature
    : (entry.creatureType ?? 'a creature')
  const band = entry.crBand ? ` (CR ${entry.crBand})` : ''
  const size = entry.size ? `${entry.size} ` : ''
  const check = entry.check == null ? '' : ` Combined check ${entry.check}.`
  return `Harvested ${size}${creature}${band} on ${harvestedAt.slice(0, 10)}.${check}${crewLine(entry.crew)}\n`
}

/**
 * ` Assessed by [[Mara]], carved by [[Gibbs]], helped by [[Ash]].` — linked, so
 * each character's note gains a backlink to the harvests they worked on.
 */
function crewLine(crew: HarvestCrew | null | undefined): string {
  if (!crew) return ''
  const parts = [
    crew.assessor ? `assessed by ${link(crew.assessor)}` : null,
    crew.carver ? `carved by ${link(crew.carver)}` : null,
    crew.helpers.length ? `helped by ${crew.helpers.map(link).join(', ')}` : null,
  ].filter((p): p is string => p !== null)
  if (!parts.length) return ''
  const sentence = parts.join(', ')
  return ` ${sentence[0].toUpperCase()}${sentence.slice(1)}.`
}

const link = (slug: string) => `[[${slug}]]`

/** Which rows of an imported file are one harvest. See `importLegacy`. */
const groupKey = (...parts: Array<string | null>) => parts.map(p => p ?? '').join('|')

const unlink = (value: string | null): string | null => {
  if (value == null) return null
  const match = /^\[\[([^\]|]+)(?:\|[^\]]*)?\]\]$/.exec(value.trim())
  if (!match) return value
  const target = match[1].trim()
  return target.slice(target.lastIndexOf('/') + 1).trim()
}

/**
 * An ISO timestamp from whatever is in the key.
 *
 * Obsidian's YAML parses an unquoted `2026-10-03T21:13:42.705Z` into a `Date`,
 * and a bare `2026-10-03` into a `Date` at midnight — so this key arrives as a
 * string from a note we wrote (we quote) and as a `Date` from one a human
 * retyped. Both are the same instant and both must compare equal, which is what
 * the dedupe in `importLegacy` rests on.
 */
function isoOf(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString()
  const text = str(value)
  if (!text) return null
  const parsed = new Date(text)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function toComponent(value: unknown): HarvestComponent | null {
  const row = value as Record<string, unknown>
  const name = str(row?.name)
  if (!name) return null
  return {
    name,
    dc: num(row?.dc),
    quantity: num(row?.quantity) ?? 1,
    kind: str(row?.kind) === 'essence' ? 'essence' : 'component',
    ...(str(row?.to) ? { to: str(row?.to) } : {}),
  }
}

const isComponent = (c: HarvestComponent | null): c is HarvestComponent => c !== null

/** Drop `undefined` values, keeping key order. `null` is a value and survives. */
function compact<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value
  }
  return out
}
