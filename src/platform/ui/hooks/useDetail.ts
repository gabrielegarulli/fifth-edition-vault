import { useEffect, useState } from 'react'

import type { Catalog, CatalogRow, Detail } from '../../model/catalog'

/**
 * The second tier, on demand: one note's prose and its parsed fence.
 *
 * This is the only asynchronous read in the plugin. A list costs nothing because
 * Obsidian already parsed the frontmatter, but a detail means `cachedRead` of one
 * file and a `parseYaml` of its fence — so it is loaded when something is opened
 * and never before. 1785 spells, one file read.
 *
 * `loading` is **derived from which id the stored response belongs to**, not held
 * as its own flag. A separate boolean has to be set true, set false, and reset on
 * every path out — and the one that gets forgotten leaves a spinner over the
 * previous spell's text. Here, "the response in hand is for a different spell"
 * and "still loading" are the same statement, so they cannot disagree.
 */
export interface DetailState<F> {
  detail: Detail<F> | null
  loading: boolean
}

export function useDetail<R extends CatalogRow, F>(
  catalog: Catalog<R, F>,
  id: string | null,
): DetailState<F> {
  const [loaded, setLoaded] = useState<{ key: string; value: Detail<F> | null } | null>(null)

  useEffect(() => {
    if (id === null) return
    const noteId = id
    let cancelled = false
    // Wrapped in a local async function rather than making the effect itself
    // async: an effect must return its cleanup, and an async one returns a
    // promise, which React cannot call.
    async function run() {
      const value = await catalog.detail(noteId)
      // Clicking down a list faster than the disk answers would otherwise let an
      // earlier read land on top of a later one.
      if (!cancelled) setLoaded({ key: noteId, value })
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [catalog, id])

  const ready = id !== null && loaded?.key === id
  return {
    detail: ready ? loaded.value : null,
    loading: id !== null && !ready,
  }
}
