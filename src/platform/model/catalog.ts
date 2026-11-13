import { extractFence, proseOf } from './fence'
import { nameKey } from './names'
import type { NoteRef, ParseYaml, VaultSource } from './source'

/**
 * The shared machinery behind every catalog. Each content type supplies a folder,
 * a fence name, and a function mapping frontmatter to a list row; this provides
 * the two-tier access on top.
 *
 * **Tier 1 — `list()`** maps frontmatter only, from `metadataCache`. No file
 * reads, no YAML parsing, no promises.
 *
 * **Tier 2 — `detail(id)`** reads one note's body and returns its prose plus its
 * parsed fence.
 *
 * That split is a deliberate divergence from `the-vault`'s `lib/db/*.list()`,
 * which returns the whole `data` jsonb per row. Reproducing that would mean
 * reading 1785 files to draw one list — the exact cost being local is supposed
 * to remove. Consumers that read `row.data.*` in list context must instead rely
 * on frontmatter, including derived keys.
 */

/** Anything a list row is guaranteed to have. */
export interface CatalogRow {
  /** The note's slug. Stable, addressable, and *not* a uuid — see below. */
  id: string
  name: string
  source: string | null
  path: string
}

export interface Detail<F> {
  id: string
  /** Body text with frontmatter and all fenced blocks stripped. */
  prose: string
  /** The parsed fence, or `null` when the note has none. */
  fence: F | null
}

export interface Catalog<R extends CatalogRow, F> {
  list(): R[]
  byId(id: string): R | undefined
  byName(name: string): R | undefined
  byNames(names: string[]): R[]
  detail(id: string): Promise<Detail<F> | null>
}

export interface CatalogSpec<R extends CatalogRow> {
  folder: string
  /** Info string of the fence holding this type's deep structure. */
  fence: string
  /**
   * Admit notes from **outside** `folder` as well (MYDND-15).
   *
   * A folder is the right definition for content a script writes: `spells/` holds
   * the spells because the exporter put them there. It is the wrong definition
   * for content a GM *authors*, because it makes the answer to "is this a feat"
   * depend on where the file happens to sit. Characters already work the other
   * way — a character is any note carrying `vc_ddb_id`, and moving it does not
   * stop it being one.
   *
   * So a catalog may offer both: the folder is scanned first and **wins on a
   * duplicate slug**, which puts the published note ahead of a stray with the
   * same filename. Membership here is a claim the note makes about itself, so it
   * should be read off something explicit — a tag, not a guess at the path.
   *
   * **This costs nothing extra.** `notesIn` already iterates every markdown file
   * and filters by prefix, so `allNotes()` is the same walk without the filter.
   */
  admits?(note: NoteRef): boolean
  /**
   * Frontmatter → list row. Return `null` to exclude the note, which is how a
   * template or a stray file in a content folder is skipped rather than
   * surfacing as a nameless entry.
   */
  row(note: NoteRef): R | null
}

export function createCatalog<R extends CatalogRow, F = unknown>(
  source: VaultSource,
  parseYaml: ParseYaml,
  spec: CatalogSpec<R>,
): Catalog<R, F> {
  // Built once per call rather than memoised. Obsidian mutates its metadata
  // cache as files change, and a cached array would go stale with no event to
  // invalidate it — `getMarkdownFiles()` is already an in-memory walk, so the
  // honest thing is cheaper than the clever thing.
  const rows = (): R[] => {
    const out: R[] = []
    // Deduped on `id`, not on `path`. `id` is the slug, and it is what
    // `sourceFeatureId` and therefore a saved toggle key are built from — so two
    // notes sharing a slug must not both become rows, or one character's
    // activation would address both. The folder is scanned first, so the
    // published note is the one that survives.
    const seen = new Set<string>()
    const consider = (note: NoteRef): void => {
      const row = spec.row(note)
      if (!row || seen.has(row.id)) return
      seen.add(row.id)
      out.push(row)
    }

    for (const note of source.notesIn(spec.folder)) consider(note)
    if (spec.admits) {
      const prefix = spec.folder.endsWith('/') ? spec.folder : `${spec.folder}/`
      for (const note of source.allNotes()) {
        // Already covered by the folder pass — including its subfolders, which
        // `notesIn` deliberately excludes. Skipping them here would make
        // `admits` the way to smuggle `feats/homebrew/` in through the back
        // door, so they are considered, just not twice.
        if (note.path.startsWith(prefix) && !note.path.slice(prefix.length).includes('/')) continue
        if (spec.admits(note)) consider(note)
      }
    }
    return out
  }

  const list = (): R[] => rows().sort(byName)

  return {
    list,
    byId: id => rows().find(r => r.id === id),
    byName: name => {
      const want = norm(name)
      return rows().find(r => norm(r.name) === want)
    },
    byNames: names => {
      const want = new Set(names.map(norm))
      return rows().filter(r => want.has(norm(r.name))).sort(byName)
    },
    detail: async id => {
      const row = rows().find(r => r.id === id)
      if (!row) return null
      const body = await source.readBody(row.path)
      const raw = extractFence(body, spec.fence)
      return {
        id: row.id,
        prose: proseOf(body),
        // A malformed fence must not take out the detail view: the prose is
        // still worth showing, and `fence: null` is a state every caller
        // already has to handle for notes that have no fence at all.
        fence: raw === null ? null : (safeParse(parseYaml, raw) as F | null),
      }
    },
  }
}

function safeParse(parseYaml: ParseYaml, text: string): unknown {
  try {
    return parseYaml(text)
  } catch {
    return null
  }
}

const byName = (a: CatalogRow, b: CatalogRow) => a.name.localeCompare(b.name)
// Quotes folded, so D&D Beyond's `’` meets the exporter's `'` (MYDND-40).
const norm = nameKey

// --- frontmatter coercion -------------------------------------------------
//
// Frontmatter is authored by a generator but *edited* by a human in Obsidian,
// so every read is defensive. These helpers exist so no catalog has to repeat
// the "what if someone typed a string where a number goes" dance.

export const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : null

export const num = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  // `cr: "10"` in the statblock fences, and any number a human retypes with
  // quotes around it. A numeric string is the author's intent either way.
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export const bool = (v: unknown): boolean => {
  if (typeof v === 'boolean') return v
  // YAML 1.1's `yes`/`no`/`on`/`off` survive here only if a parser kept them as
  // strings. Obsidian's `parseYaml` is YAML 1.2, where they are strings — so
  // without this, `concentration: yes` reads as truthy-string, not true.
  if (typeof v === 'string') return /^(true|yes|on|1)$/i.test(v.trim())
  return false
}

export const strList = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(str).filter((s): s is string => s !== null)
  const one = str(v)
  return one ? [one] : []
}
