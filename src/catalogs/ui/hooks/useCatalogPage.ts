import { useEffect, useMemo, useState } from 'react'

import { applyFacets, paginate, type Facet, type Page } from '../../../platform'
import type { CatalogRow } from '../../../platform'

/**
 * The scaffolding every catalog page shares: a debounced search box, a set of
 * filters, pagination, and which row is open.
 *
 * This is `the-vault`'s `hooks/useCatalogPage.js` with its first half deleted.
 * There, the hook opened with `useCachedFetch` — a cache key, a TTL, a loading
 * flag, a refetch and a mutate — because a catalog list was a PostgREST request.
 * Rows now arrive synchronously from `metadataCache`, so **there is no loading
 * state at all**, and `lib/cacheEnvelope.js`, `lib/cacheKeys.js` and
 * `useCachedFetch` have no counterpart here. That deletion is the point of the
 * port, not an omission from it.
 *
 * What is kept is kept deliberately: the debounce still earns its place because
 * filtering 1785 rows per keystroke is real work, and pagination still earns its
 * place because 1785 DOM rows is more.
 */

/** A `Facet` plus what the hook needs to know when it changed. */
export interface PageFacet<R> extends Facet<R> {
  /**
   * The state this facet reads. Changing any of it returns the list to page 1 —
   * being left on page 7 of a list that now has two pages is disorienting even
   * though `paginate` clamps it.
   */
  deps?: readonly unknown[]
}

export interface CatalogPageOptions<R> {
  rows: readonly R[]
  facets?: ReadonlyArray<PageFacet<R>>
  /** Which fields the search box matches. Defaults to the name alone. */
  match?: (row: R, lowercased: string) => boolean
  pageSize?: number
  debounceMs?: number
  /**
   * Queries shorter than this do not filter. `MagicItemsPage` waits for four
   * characters before narrowing 2080 rows; most pages filter from the first.
   */
  minSearchLength?: number
}

export interface CatalogPageState<R> {
  /** What is in the box right now — never debounced, or typing would lag. */
  searchInput: string
  setSearchInput(value: string): void
  clearSearch(): void
  /** Rows surviving the search and every facet, before paging. */
  filtered: R[]
  page: Page<R>
  goToPage(page: number): void
  /** True when the user has narrowed something they can be offered a way out of. */
  hasActiveFilters: boolean
  clearFilters(): void
  selectedId: string | null
  select(id: string | null): void
}

export function useCatalogPage<R extends CatalogRow>({
  rows,
  facets = [],
  match,
  pageSize = 50,
  debounceMs = 250,
  minSearchLength = 0,
}: CatalogPageOptions<R>): CatalogPageState<R> {
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.length >= minSearchLength ? searchInput : '')
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [searchInput, debounceMs, minSearchLength])

  // Every facet's state, flattened into one comparable fingerprint. Used as the
  // memo key and as the signal to return to page 1.
  const depsKey = JSON.stringify([debouncedSearch, ...facets.flatMap(f => f.deps ?? [])])

  const filtered = useMemo(
    () =>
      applyFacets(rows, facets, {
        query: debouncedSearch,
        match: match ?? ((row, q) => row.name.toLowerCase().includes(q)),
      }),
    // `facets` and `match` are rebuilt every render; `depsKey` is what actually
    // changes their behaviour, and `rows` is already memoised per vault
    // generation. Listing the closures would recompute on every render.
    [rows, depsKey], // eslint-disable-line react-hooks/exhaustive-deps -- depsKey stands in for facets and match, rebuilt every render
  )

  const [pageNumber, setPageNumber] = useState(1)

  // Adjusted during render rather than in an effect — react.dev's "you might not
  // need an effect", and the shape `react-hooks/set-state-in-effect` exists to
  // push you towards. An effect here would render one frame of the wrong page.
  const [prevDepsKey, setPrevDepsKey] = useState(depsKey)
  if (depsKey !== prevDepsKey) {
    setPrevDepsKey(depsKey)
    setPageNumber(1)
  }

  const page = paginate(filtered, pageNumber, pageSize)

  const [selectedId, setSelectedId] = useState<string | null>(null)

  function clearSearch() {
    setSearchInput('')
    setDebouncedSearch('')
  }

  return {
    searchInput,
    setSearchInput,
    clearSearch,
    filtered,
    page,
    goToPage: setPageNumber,
    // `searchInput` as well as the debounced value, so the Clear button appears
    // on the first keystroke instead of a quarter-second later.
    hasActiveFilters: !!searchInput || !!debouncedSearch || facets.some(f => f.active),
    clearFilters() {
      for (const facet of facets) facet.reset?.()
      clearSearch()
    },
    selectedId,
    select: setSelectedId,
  }
}
