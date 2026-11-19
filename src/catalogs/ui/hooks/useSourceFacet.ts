import { useCallback, useMemo, useState } from 'react'

import { sourceLabel } from '../../../compendium'
import { useSourcesOff, type FacetSet } from '../../../platform/host'
import type { ActiveFilter } from '../RailFilters'

/** A Source facet, and the one chip that says what it is doing. */
export interface SourceFacet extends FacetSet {
  /** For `ActiveFilters`: a chip per book picked, or one for the campaign's. */
  filters: ActiveFilter[]
}

/**
 * A catalog's Source facet, **starting from the campaign's books** (MYDND-223).
 *
 * The books the active campaign turned off (`sources_off`, MYDND-219) start
 * unticked, so their rows leave the list, and one click on the chip, or Clear
 * filters, brings them back. A catalog is reference: a book is hidden by
 * default, never out of reach, unlike the builder's lists where it is gone.
 *
 * - **Until the reader touches it, the selection is the campaign's**: every
 *   book on offer but the ones turned off. Unticked, so the picker shows the
 *   truth, and **one chip** for the lot ("3 books off for this campaign")
 *   rather than a chip per book still ticked.
 * - **A tick or an untick makes it the reader's**, starting from what was
 *   shown, and from there it is an ordinary `useFacetSet`.
 * - **A row naming no book is kept** while the selection is the campaign's:
 *   there is no key to turn off, as `booksInPlay` has it.
 * - **Nothing off, or no book on offer that is off, is no filter at all**, so a
 *   vault with no campaign behaves exactly as it did.
 *
 * `options` are the page's `countValues(rows, r => r.source)`: only a book this
 * catalog holds can be unticked, so an empty catalog is never "filtered".
 */
export function useSourceFacet(options: ReadonlyArray<readonly [string, number]>): SourceFacet {
  const sourcesOff = useSourcesOff()
  // `null` until the reader picks: then the campaign decides.
  const [picked, setPicked] = useState<ReadonlySet<string> | null>(null)

  const keys = options.map(([key]) => key).join('\u0000')
  const off = useMemo(() => {
    const present = keys === '' ? [] : keys.split('\u0000')
    return new Set(present.filter(key => sourcesOff.has(key)))
  }, [keys, sourcesOff])
  const byCampaign = picked === null && off.size > 0

  const selected = useMemo<ReadonlySet<string>>(() => {
    if (picked !== null) return picked
    if (off.size === 0) return new Set()
    return new Set(keys.split('\u0000').filter(key => !off.has(key)))
  }, [picked, off, keys])

  const toggle = useCallback(
    (value: string) => {
      const next = new Set(selected)
      if (!next.delete(value)) next.add(value)
      setPicked(next)
    },
    [selected],
  )
  const clear = useCallback(() => setPicked(new Set()), [])

  const key = byCampaign ? `campaign\u0001${[...off].sort().join('\u0000')}` : [...selected].sort().join('\u0000')

  const has = useCallback(
    (value: string | null | undefined) => {
      if (byCampaign) return value == null || value === '' || !off.has(value)
      return selected.size === 0 || (value != null && selected.has(value))
    },
    [byCampaign, off, selected],
  )

  const filters: ActiveFilter[] = byCampaign
    ? [
        {
          key: 'Source:campaign',
          label: `Source: ${off.size === 1 ? `${sourceLabel([...off][0])} off` : `${off.size} books off`} for this campaign`,
          remove: clear,
        },
      ]
    : [...selected].map(value => ({
        key: `Source:${value}`,
        label: `Source: ${sourceLabel(value)}`,
        remove: () => toggle(value),
      }))

  return { selected, toggle, clear, active: byCampaign || selected.size > 0, key, has, filters }
}
