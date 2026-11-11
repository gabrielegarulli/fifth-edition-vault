import { useCallback, useRef, useState } from 'react'

import { countValues, matchAnyField } from '../catalog/filter'
import { fullyApplied, previewCount, shelfColumns, shelve, SHELVES, type Shelf } from '../catalog/featShelves'
import { ABILITY_LABELS } from '../catalog/labels'
import { sourceLabel } from '../catalog/sourceNames'
import { useContent } from '../ContentContext'
import type { FeatRow } from '../content/feats'
import { useCatalogPage } from '../hooks/useCatalogPage'
import { useElementWidth } from '../hooks/useElementWidth'
import { useCatalogRows } from '../hooks/useVaultGeneration'
import { useFacetSet, type FacetSet } from '../hooks/useFacetSet'
import { FeatCard, FeatListRow } from '../ui/FeatCards'
import { FeatDetail } from '../ui/FeatDetail'
import { ActiveFilters, Check, facetFilters, FilterGroup, flagFilter } from '../ui/RailFilters'
import { SourcePicker } from '../ui/SourcePicker'

/**
 * Feats, as shelves by kind — design A of the "Feats Layout Proposal" canvas,
 * and its narrow form C (MYDND-62).
 *
 * **Wide** (`WIDE_WIDTH` and up): a filter rail — Sources, Raises, Kind, "On the
 * sheet" — then one shelf per kind, each a grid of cards showing two rows until
 * "Show all", then the open feat beside them when there is room for it too.
 * **Narrow**: the same filters stacked above one column of rows grouped by kind,
 * and the open feat over the list. Measured on the pane, never the window: the
 * pane is the viewport (`docs/lessons/frame.md`).
 *
 * Every filter answers from frontmatter — `kind`, `abilities`, `source`,
 * `benefit_count`, `modelled_count` — so drawing the page reads no file. Only
 * opening a feat reads one, for its fence.
 *
 * Gone from the list version: the Tags chips. Every feat's tags are its kind,
 * its edition and its book, all three of which are filters here already.
 *
 * **Drawn in the canvas's own palette** (MYDND-65), inside the Bestiary's `.bst`
 * root and with its classes: the canvas's colours and hovers, IBM Plex, and its
 * 11–15px sizes, with a light twin. MYDND-62 had translated the canvas into
 * Obsidian's theme instead, and every surface came out a different grey. The
 * narrow form is artboard C as drawn — search, Raises, Kind — so Source and
 * "On the sheet" live in the wide rail only; Clear filters shows in both.
 */

/** Below this the rail and a shelf grid do not fit side by side. */
export const WIDE_WIDTH = 920
/** And below this the open feat covers the shelves instead of sitting beside them. */
export const DETAIL_BESIDE_WIDTH = 1200

export default function FeatsPage() {
  const content = useContent()
  const rows = useCatalogRows(() => content.feats.list())

  const raises = useFacetSet()
  const sources = useFacetSet()
  const [fullOnly, setFullOnly] = useState(false)
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set())

  const catalog = useCatalogPage<FeatRow>({
    rows,
    // One page: shelves are their own way of keeping the list short.
    pageSize: Number.MAX_SAFE_INTEGER,
    match: matchAnyField<FeatRow>([r => r.name, r => r.prerequisite]),
    facets: [
      {
        // Any of the picked scores, not all of them: "what raises STR or DEX".
        predicate: f => !raises.active || f.abilities.some(a => raises.selected.has(a)),
        active: raises.active,
        reset: raises.clear,
        deps: [raises.key],
      },
      {
        predicate: f => sources.has(f.source),
        active: sources.active,
        reset: sources.clear,
        deps: [sources.key],
      },
      {
        predicate: f => !fullOnly || fullyApplied(f),
        active: fullOnly,
        reset: () => setFullOnly(false),
        deps: [fullOnly],
      },
    ],
  })

  const [paneRef, width] = useElementWidth<HTMLDivElement>()
  // Unmeasured (0) reads as wide, so the first paint does not flash the narrow form.
  const wide = width === 0 || width >= WIDE_WIDTH
  const beside = width === 0 || width >= DETAIL_BESIDE_WIDTH

  // The shelves' scroller: measured for the card grid, and scrolled by the Kind links.
  const scroller = useRef<HTMLDivElement | null>(null)
  const [measureShelves, shelvesWidth] = useElementWidth<HTMLDivElement>()
  const scrollerRef = useCallback(
    (el: HTMLDivElement | null) => {
      scroller.current = el
      return measureShelves(el)
    },
    [measureShelves],
  )
  /** Scrolls the shelves' own box — never the window, never `scrollIntoView`. */
  const jumpTo = (id: string) => {
    const box = scroller.current
    const target = box?.querySelector<HTMLElement>(`[data-shelf="${id}"]`)
    if (!box || !target) return
    box.scrollTop += target.getBoundingClientRect().top - box.getBoundingClientRect().top
  }

  const shelves = shelve(catalog.filtered).filter(s => s.rows.length > 0)
  const selected = rows.find(f => f.id === catalog.selectedId) ?? null
  const columns = shelfColumns(shelvesWidth)
  const toggleShelf = (id: string) =>
    setOpen(prev => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const sourceOptions = countValues(rows, f => f.source)
  const activeFilters = [
    ...facetFilters('Raises', raises, v => ABILITY_LABELS.find(a => a.key === v)?.label ?? v),
    ...facetFilters('Source', sources, sourceLabel),
    ...flagFilter('Fully applied', fullOnly, () => setFullOnly(false)),
  ]

  const search = (
    <input
      type="search"
      aria-label="Search feats"
      value={catalog.searchInput}
      onChange={e => catalog.setSearchInput(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Escape') catalog.clearSearch()
      }}
      placeholder={wide ? 'Search name or prerequisite' : 'Search feats'}
      className="bst-search"
    />
  )
  const clear = catalog.hasActiveFilters ? (
    <button type="button" className="bst-plain bst-btn-ghost" onClick={catalog.clearFilters}>
      Clear filters
    </button>
  ) : null

  const body =
    rows.length === 0 ? (
      <p className="bst-empty">
        <strong>No feats in this vault</strong>
        Feats are notes in a <code>{content.ruleFolder('feats')}/</code> folder, each with a <code>vault-feat</code> block in its body. Run
        the feat exporter, or open a vault that has them.
      </p>
    ) : shelves.length === 0 ? (
      <p className="bst-empty">
        <strong>No feats match these filters</strong>
      </p>
    ) : null

  const detail = selected ? <FeatDetail feat={selected} onClose={() => catalog.select(null)} /> : null

  return (
    <div ref={paneRef} className="bst">
      {wide ? (
        <>
          <header className="bst-header">
            <div className="bst-titles">
              <h2 className="bst-title">Feats</h2>
              <span className="bst-count">{countLabel(catalog.filtered.length, rows.length)}</span>
            </div>
            <ActiveFilters filters={activeFilters} onClear={catalog.hasActiveFilters ? catalog.clearFilters : null} />
          </header>

          <div className="bst-body">
            <aside aria-label="Filters" className="my-dnd-vault__scroll bst-rail bst-rail--filters">
              {search}

              <SourcePicker options={sourceOptions} sources={sources} />

              <FilterGroup title="Raises" className="bst-group--has" active={raises.selected.size}>
                {ABILITY_LABELS.map(a => (
                  <Check
                    key={a.key}
                    label={a.label}
                    count={rows.filter(f => f.abilities.includes(a.key)).length}
                    checked={raises.selected.has(a.key)}
                    onChange={() => raises.toggle(a.key)}
                  />
                ))}
              </FilterGroup>

              <FilterGroup title="Kind" className="bst-group--tight bst-group--levels">
                <nav aria-label="Kind" className="bst-group bst-group--tight bst-group--levels">
                  {SHELVES.map(shelf => {
                    const count = shelves.find(s => s.shelf.id === shelf.id)?.rows.length ?? 0
                    if (shelf.id === 'other' && count === 0) return null
                    return (
                      <button
                        key={shelf.id}
                        type="button"
                        disabled={count === 0}
                        onClick={() => jumpTo(shelf.id)}
                        className="bst-plain bst-tier bst-tier--level"
                      >
                        <Dot shelf={shelf} />
                        <span className="bst-spacer">{shelf.label}</span>
                        <span className="bst-tier-count">{count}</span>
                      </button>
                    )
                  })}
                </nav>
              </FilterGroup>

              <FilterGroup title="On the sheet" active={fullOnly ? 1 : 0}>
                <label className="bst-check bst-check--top">
                  <input
                    type="checkbox"
                    className="bst-checkbox"
                    checked={fullOnly}
                    onChange={e => setFullOnly(e.target.checked)}
                  />
                  Only feats the sheet fully applies
                </label>
              </FilterGroup>
            </aside>

            <div ref={scrollerRef} className="my-dnd-vault__scroll bst-shelves">
              {body ??
                shelves.map(({ shelf, rows: onShelf }) => {
                  const limit = previewCount(columns)
                  const isOpen = open.has(shelf.id)
                  const shown = isOpen ? onShelf : onShelf.slice(0, limit)
                  return (
                    <section key={shelf.id} data-shelf={shelf.id} aria-labelledby={`shelf-${shelf.id}`} className="bst-shelf">
                      <div className="bst-shelf-head">
                        <Dot shelf={shelf} large />
                        <h3 id={`shelf-${shelf.id}`} className="bst-shelf-title">
                          {shelf.label}
                        </h3>
                        <span className="bst-shelf-when">{shelf.when}</span>
                        <span className="bst-spacer" />
                        {onShelf.length > limit && (
                          <button type="button" className="bst-plain bst-link" onClick={() => toggleShelf(shelf.id)}>
                            {isOpen ? 'Show fewer' : `Show all ${onShelf.length} →`}
                          </button>
                        )}
                      </div>
                      <div className="bst-cards" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                        {shown.map(feat => (
                          <FeatCard
                            key={feat.id}
                            feat={feat}
                            selected={feat.id === catalog.selectedId}
                            onOpen={() => catalog.select(feat.id)}
                          />
                        ))}
                      </div>
                    </section>
                  )
                })}
            </div>

            {detail && beside && (
              <aside aria-label={selected?.name} className="bst-detail">
                {detail}
              </aside>
            )}
          </div>
        </>
      ) : (
        <>
          <header className="bst-header bst-header--narrow">
            <div className="bst-titles">
              <h2 className="bst-title">Feats</h2>
              <span className="bst-count">{catalog.filtered.length.toLocaleString('en-US')}</span>
              <span className="bst-spacer" />
              {clear}
            </div>
            {search}
            <div role="group" aria-label="Raises">
              <RaisesToggles raises={raises} />
            </div>
            <nav aria-label="Kind" className="bst-chipnav">
              {shelves.map(({ shelf }) => (
                <button key={shelf.id} type="button" className="bst-plain bst-navchip" onClick={() => jumpTo(shelf.id)}>
                  <Dot shelf={shelf} small />
                  {shelf.label}
                </button>
              ))}
            </nav>
          </header>

          <div ref={scrollerRef} className="my-dnd-vault__scroll">
            {body ??
              shelves.map(({ shelf, rows: onShelf }) => (
                <section key={shelf.id} data-shelf={shelf.id} aria-labelledby={`shelf-${shelf.id}`}>
                  <h3 id={`shelf-${shelf.id}`} className="bst-group-head">
                    <Dot shelf={shelf} />
                    {shelf.label}
                    <span className="bst-group-count">{onShelf.length}</span>
                  </h3>
                  {onShelf.map(feat => (
                    <FeatListRow
                      key={feat.id}
                      feat={feat}
                      selected={feat.id === catalog.selectedId}
                      onOpen={() => catalog.select(feat.id)}
                    />
                  ))}
                </section>
              ))}
          </div>
        </>
      )}

      {/* The open feat over the list when there is no room beside it. */}
      {detail && !(wide && beside) && (
        <div className="bst-overlay">
          <div className="bst-detail">{detail}</div>
        </div>
      )}
    </div>
  )
}

/** The narrow pane's Raises: STR → CHA across, where the rail has checkboxes. Any of the pressed scores matches. */
function RaisesToggles({ raises }: { raises: FacetSet }) {
  return (
    <div className="bst-toggle-grid bst-toggle-grid--6">
      {ABILITY_LABELS.map(a => (
        <button
          key={a.key}
          type="button"
          aria-pressed={raises.selected.has(a.key)}
          title={`Raises ${a.label}`}
          onClick={() => raises.toggle(a.key)}
          className="bst-plain bst-toggle"
        >
          {a.short}
        </button>
      ))}
    </div>
  )
}

function Dot({ shelf, large = false, small = false }: { shelf: Shelf; large?: boolean; small?: boolean }) {
  const size = large ? ' bst-dot--lg' : small ? ' bst-dot--sm' : ''
  return <span aria-hidden="true" className={`bst-dot${size} bst-dot--${shelf.tone}`} />
}

const countLabel = (shown: number, total: number): string =>
  shown === total
    ? `${total.toLocaleString('en-US')} feats`
    : `${shown.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} feats`
