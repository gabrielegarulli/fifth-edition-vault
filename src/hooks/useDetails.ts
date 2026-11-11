import { useEffect, useState } from 'react'

import type { Catalog, CatalogRow, Detail } from '../content/index'

/**
 * `useDetail` for several notes at once — the builder's every class, every
 * picked feat, every weapon a mastery may name (MYDND-29).
 *
 * A hook per id cannot do this: the number of classes changes as a player
 * multiclasses, and hooks may not be called a varying number of times. So the
 * ids are one key, and — as in `useDetail` — `loading` is **derived** from
 * whether the stored response belongs to that key, never held as a flag.
 *
 * Reads are sequential, not `Promise.all`: a detail is one `cachedRead`, and a
 * burst of a hundred concurrent reads buys nothing over a loop on a local disk.
 */
export interface DetailsState<F> {
  /** id → detail; an id with no note maps to null. Empty while loading. */
  details: ReadonlyMap<string, Detail<F> | null>
  loading: boolean
}

const EMPTY = new Map<string, never>()

export function useDetails<R extends CatalogRow, F>(catalog: Catalog<R, F>, ids: readonly string[]): DetailsState<F> {
  const key = [...new Set(ids)].sort().join('\u0001')
  const [loaded, setLoaded] = useState<{ key: string; value: Map<string, Detail<F> | null> } | null>(null)

  useEffect(() => {
    if (key === '') return
    let cancelled = false
    async function run() {
      const value = new Map<string, Detail<F> | null>()
      for (const id of key.split('\u0001')) value.set(id, await catalog.detail(id))
      if (!cancelled) setLoaded({ key, value })
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [catalog, key])

  if (key === '') return { details: EMPTY, loading: false }
  const ready = loaded?.key === key
  return { details: ready ? loaded.value : EMPTY, loading: !ready }
}
