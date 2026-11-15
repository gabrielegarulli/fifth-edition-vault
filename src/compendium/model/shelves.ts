import { CORE_CLASS_SOURCES, OFFICIAL_CLASS_SOURCES } from '../../platform'
import { sourceLabel } from './sourceNames'


export type ShelfKind = 'core' | 'official' | 'book' | 'legacy'

export interface Shelf<R> {
  /** Stable and safe as part of an element id: `core`, `official`, `legacy`, `book-<slug>`. */
  id: string
  kind: ShelfKind
  label: string
  /** The `source` keys on this shelf. */
  sources: string[]
  rows: R[]
}

export interface ShelfRow {
  name: string
  source: string | null
  edition?: string | null
}

export const isOfficialSource = (source: string | null): boolean =>
  !!source && (OFFICIAL_CLASS_SOURCES.has(source) || /^UA/.test(source))

/** `5.0e`, `5e`: the 2014 rules, as the exporters spell them. */
const isLegacyEdition = (edition: string | null | undefined): boolean => /^5(\.0)?e$/i.test(edition?.trim() ?? '')

/** The shelf a row goes on: `core`, `official`, `legacy`, or its book's source key. */
export function sourceShelfOf(row: ShelfRow): { kind: ShelfKind; source: string } {
  const source = row.source ?? ''
  if (isOfficialSource(row.source) && isLegacyEdition(row.edition)) return { kind: 'legacy', source }
  if (row.source && CORE_CLASS_SOURCES.has(row.source)) return { kind: 'core', source }
  if (isOfficialSource(row.source)) return { kind: 'official', source }
  return { kind: 'book', source }
}

const slug = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\p{M}'’]/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'other'

const LABELS: Record<Exclude<ShelfKind, 'book'>, string> = {
  core: 'Core',
  official: 'Official',
  legacy: 'Legacy (5e)',
}

/** Every shelf in order, each sorted by name; empty shelves left out. */
export function shelvesBySource<R extends ShelfRow>(rows: readonly R[]): Shelf<R>[] {
  const fixed = new Map<Exclude<ShelfKind, 'book'>, R[]>([['core', []], ['official', []], ['legacy', []]])
  const books = new Map<string, R[]>()
  for (const r of rows) {
    const { kind, source } = sourceShelfOf(r)
    if (kind === 'book') books.set(source, [...(books.get(source) ?? []), r])
    else fixed.get(kind)!.push(r)
  }
  const byName = (a: R, b: R) => a.name.localeCompare(b.name)
  const fixedShelf = (kind: Exclude<ShelfKind, 'book'>): Shelf<R> => {
    const on = fixed.get(kind)!.sort(byName)
    return { id: kind, kind, label: LABELS[kind], sources: [...new Set(on.map(r => r.source ?? ''))].sort(), rows: on }
  }
  const bookShelves = [...books]
    .map(([source, on]): Shelf<R> => ({
      id: `book-${slug(source)}`,
      kind: 'book',
      label: source ? sourceLabel(source) : 'No book named',
      sources: [source],
      rows: on.sort(byName),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
  return [fixedShelf('core'), fixedShelf('official'), ...bookShelves, fixedShelf('legacy')].filter(s => s.rows.length > 0)
}

export function booksInPlay<R extends ShelfRow & { id: string }>(
  rows: readonly R[],
  off: ReadonlySet<string>,
  keep: ReadonlyArray<string | null | undefined> = [],
): readonly R[] {
  if (off.size === 0) return rows
  return rows.filter(r => !r.source || !off.has(r.source) || keep.includes(r.id))
}

/**
 * The books a vault's rows come from, in shelf order (Core, Official, each
 * third-party book, Legacy), for the setting that turns them off: each with
 * its title and how many rows it holds. Built from the vault, so no list of
 * books is typed in anywhere. Rows naming no book are left out.
 */
export function booksOf(rows: readonly ShelfRow[]): { source: string; label: string; kind: ShelfKind; count: number }[] {
  const named = rows.filter(r => r.source)
  const count = (source: string) => named.filter(r => r.source === source).length
  // A book can sit on two shelves (a 2014 printing beside a newer one under one
  // key); it is listed once, on the first.
  const seen = new Set<string>()
  return shelvesBySource(named).flatMap(shelf =>
    [...new Set(shelf.rows.map(r => r.source!))]
      .filter(source => !seen.has(source) && !!seen.add(source))
      .map(source => ({ source, label: sourceLabel(source), kind: shelf.kind, count: count(source) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  )
}

/** Rows whose name or book answers a search, every word of it. */
export function searchShelfRows<R extends ShelfRow>(rows: readonly R[], query: string): R[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return [...rows]
  return rows.filter(r => {
    const hay = `${r.name} ${r.source ? sourceLabel(r.source) : ''} ${r.source ?? ''}`.toLowerCase()
    return words.every(w => hay.includes(w))
  })
}
