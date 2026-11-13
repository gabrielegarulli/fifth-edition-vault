/**
 * Filtering, faceting and paging — the whole of a catalog page's logic, as pure
 * functions over an array.
 *
 * This is what is left of `the-vault`'s `hooks/useCatalogPage.js` once the data
 * is local. That hook's first job was `useCachedFetch` — a cache key, a TTL, a
 * loading flag and a refetch — because every list cost a PostgREST round-trip.
 * Reading `metadataCache` costs nothing and returns synchronously, so all of it
 * goes, and what remains is arithmetic with no React in it at all.
 *
 * Keeping it out of the hook is deliberate: there is no DOM here, so this is the
 * part of Phase 2 that unit tests can actually hold onto.
 */

/**
 * One filter, self-contained as in `useCatalogPage`'s `filters` array: it knows
 * how to test a row, whether it is doing anything, and how to clear itself.
 *
 * `active: false` with a live `predicate` is a legitimate combination and not a
 * contradiction — it is how a filter the user did not choose still narrows the
 * list. `the-vault` uses it for source visibility, so that "Clear filters" does
 * not offer to clear a GM setting from another page.
 */
export interface Facet<R> {
  predicate?: (row: R) => boolean
  active: boolean
  reset?: () => void
}

/** Rows passing the search *and* every facet. Facets are ANDed, as in the web app. */
export function applyFacets<R>(
  rows: readonly R[],
  facets: ReadonlyArray<Facet<R>>,
  search?: { query: string; match: (row: R, lowercased: string) => boolean },
): R[] {
  const q = search?.query.trim().toLowerCase() ?? ''
  return rows.filter(row => {
    if (q && search && !search.match(row, q)) return false
    for (const facet of facets) {
      if (facet.predicate && !facet.predicate(row)) return false
    }
    return true
  })
}

export interface Page<R> {
  items: R[]
  /** Clamped into range, so a filter that shrinks the list cannot strand you. */
  page: number
  totalPages: number
  /** 1-indexed position of the first and last row shown, for "51–100 of 1,785". */
  first: number
  last: number
  total: number
}

export function paginate<R>(rows: readonly R[], page: number, pageSize: number): Page<R> {
  const total = rows.length
  // One page, not zero, when the list is empty: `totalPages: 0` makes "page 1 of
  // 0" and every comparison against it read strangely.
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), totalPages)
  const start = (current - 1) * pageSize
  const items = rows.slice(start, start + pageSize)
  return {
    items,
    page: current,
    totalPages,
    first: total === 0 ? 0 : start + 1,
    last: start + items.length,
    total,
  }
}

/**
 * Facet counts — `[['XPHB', 391], ['PHB', 361], …]`, commonest first.
 *
 * Counted over the rows handed in, which for every page here means the
 * *unfiltered* catalog rather than the currently filtered view. A count that
 * moved as you narrowed would stop being "how many of these the catalog holds",
 * which is what the number on a chip claims to be (VAULT-86).
 *
 * Ties break alphabetically so the order is stable between renders; a Map's
 * insertion order would make it depend on which note Obsidian indexed first.
 */
export function countValues<R>(
  rows: readonly R[],
  pick: (row: R) => string | string[] | null | undefined,
): Array<[string, number]> {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const picked = pick(row)
    const values = picked == null ? [] : Array.isArray(picked) ? picked : [picked]
    for (const value of values) {
      if (typeof value !== 'string' || value.trim() === '') continue
      const key = value.trim()
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

/** The distinct values of a field, alphabetically. For a dropdown's options. */
export function distinctValues<R>(
  rows: readonly R[],
  pick: (row: R) => string | string[] | null | undefined,
): string[] {
  return countValues(rows, pick)
    .map(([value]) => value)
    .sort((a, b) => a.localeCompare(b))
}

/**
 * Case-insensitive substring match across several of a row's fields.
 *
 * Built per page rather than fixed, because the pages genuinely differ:
 * `MagicItemsPage` searches name + source + component, while `SpellsPage`
 * searches the name alone.
 */
export function matchAnyField<R>(
  fields: ReadonlyArray<(row: R) => string | string[] | null | undefined>,
): (row: R, lowercased: string) => boolean {
  return (row, q) =>
    fields.some(field => {
      const value = field(row)
      if (value == null) return false
      if (Array.isArray(value)) return value.some(v => v?.toLowerCase().includes(q))
      return value.toLowerCase().includes(q)
    })
}
