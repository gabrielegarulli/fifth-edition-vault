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

/**
 * A note the catalog does not list because another note has its slug
 * (MYDND-237). The catalog keeps one row per slug, so this is the only place
 * the dropped one is still named.
 */
export interface HiddenNote {
  /** The slug both notes share: their filename without `.md`. */
  id: string
  /** The note that is not listed. */
  path: string
  /** The note listed in its place, the one read first. */
  behind: string
}

export interface Catalog<R extends CatalogRow, F> {
  list(): R[]
  /**
   * Every note this catalog would have listed but for a slug clash, in the
   * order read: a homebrew `fireball.md` behind the exported one, a tagged
   * note in a folder's subfolder behind one at its top, or the second of two
   * homebrew notes with one filename. Empty for every exported vault.
   */
  hidden(): HiddenNote[]
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
   * The **bare** tag that says a note is one of these (`spell`, `magic-item`),
   * which admits it from outside the folder's direct children (MYDND-15,
   * MYDND-234).
   *
   * A folder's direct children are the right definition for content a script
   * writes: `spells/` holds the spells because the exporter put them there. They
   * are the wrong definition for content a GM *authors*. So a note carrying
   * this tag is admitted from two more places, at any depth: the folder's own
   * subfolders, and **the homebrew folder** (`VaultSource.homebrewFolder`).
   * Membership there is a claim the note makes about itself, so it is read off
   * something explicit — a tag, not a guess at the path. Every exported note
   * already carries its own (measured 2026-11-17, all ten folders).
   *
   * Only the bare tag counts: `feat/crafter` on a background means it *grants*
   * Crafter (`content-layer.md`). The folder is scanned first and **wins on a
   * duplicate slug**, so an exported note hides a homebrew one of the same
   * filename; `Catalog.hidden()` names it (MYDND-237). Until MYDND-226 a tagged feat was admitted **anywhere in the
   * vault**, which meant listing every file; named folders are the limit now
   * (ADR 0013).
   */
  tag: string
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
  // invalidate it — a folder's `children` are already in memory, so the
  // honest thing is cheaper than the clever thing.
  const read = (): { rows: R[]; hidden: HiddenNote[] } => {
    const out: R[] = []
    const hidden: HiddenNote[] = []
    // Deduped on `id`, not on `path`. `id` is the slug, and it is what
    // `sourceFeatureId` and therefore a saved toggle key are built from — so two
    // notes sharing a slug must not both become rows, or one character's
    // activation would address both. The folder is scanned first, so the
    // published note is the one that survives. The loser is kept by name in
    // `hidden`, so a page can say it is there (MYDND-237).
    const seen = new Map<string, string>()
    const consider = (note: NoteRef): void => {
      const row = spec.row(note)
      if (!row) return
      const behind = seen.get(row.id)
      if (behind !== undefined) {
        hidden.push({ id: row.id, path: row.path, behind })
        return
      }
      seen.set(row.id, row.path)
      out.push(row)
    }

    // Paths the folder pass already read, so the next one neither maps them a
    // second time nor needs them tagged.
    const direct = new Set<string>()
    const admitted = (note: NoteRef) => !direct.has(note.path) && hasBareTag(note.frontmatter, spec.tag)

    for (const note of source.notesIn(spec.folder)) {
      direct.add(note.path)
      consider(note)
    }
    // The folder's subfolders, which `notesIn` deliberately excludes: a tagged
    // note in `feats/homebrew/` is admitted, an untagged one is not.
    for (const note of source.notesUnder(spec.folder)) if (admitted(note)) consider(note)
    // The homebrew folder, last, so an exported note wins a slug clash
    // (MYDND-234). `notesUnder('')` is `[]`, so a source with no homebrew
    // folder walks nothing (ADR 0013).
    for (const note of source.notesUnder(source.homebrewFolder?.() ?? '')) if (admitted(note)) consider(note)
    return { rows: out, hidden }
  }
  const rows = (): R[] => read().rows

  const list = (): R[] => rows().sort(byName)

  return {
    list,
    hidden: () => read().hidden,
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

/**
 * Whether a note's `tags` carry `tag` exactly: `#feat` and ` Feat ` count,
 * `feat/general` does not (MYDND-15; `content-layer.md`, the `feat/` tag
 * namespace).
 */
export function hasBareTag(fm: Record<string, unknown>, tag: string): boolean {
  const want = tag.toLowerCase()
  return strList(fm.tags).some(t => t.replace(/^#/, '').trim().toLowerCase() === want)
}
