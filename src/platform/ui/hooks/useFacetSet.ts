import { useCallback, useMemo, useState } from 'react'

/**
 * A multi-select chip row's state.
 *
 * Values are held as strings even where the underlying field is a number — a
 * spell's level is `'3'` here — so one hook serves every chip row and the Set's
 * membership test stays a string comparison. Callers parse at the predicate.
 *
 * `key` exists for `useCatalogPage`'s dependency fingerprint: a Set is a new
 * object on every change, so its identity says nothing about whether the
 * selection differs, and `JSON.stringify` of a Set is `{}`. Sorted and joined, it
 * compares by value.
 */
export interface FacetSet {
  selected: ReadonlySet<string>
  toggle(value: string): void
  clear: () => void
  /** True when anything is selected — a facet's `active`. */
  active: boolean
  /** Stable, value-based fingerprint of the selection. */
  key: string
  /** `true` when nothing is selected, i.e. the facet admits everything. */
  has(value: string | null | undefined): boolean
}

export function useFacetSet(): FacetSet {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set())

  const toggle = useCallback((value: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (!next.delete(value)) next.add(value)
      return next
    })
  }, [])

  const clear = useCallback(() => setSelected(new Set()), [])

  const key = useMemo(() => [...selected].sort().join('\u0000'), [selected])

  const has = useCallback(
    (value: string | null | undefined) =>
      // An empty selection matches everything, which is what makes the predicate
      // read as `facet.has(row.school)` with no "or nothing is selected" clause
      // at every call site.
      selected.size === 0 || (value != null && selected.has(value)),
    [selected],
  )

  return { selected, toggle, clear, active: selected.size > 0, key, has }
}
