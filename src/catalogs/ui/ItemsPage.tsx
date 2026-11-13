import { useCallback, useRef, useState } from 'react'

import { cardColumns, previewCount } from '../model/bestiary'
import { countValues, matchAnyField } from '../../platform'
import { humanise, kindOf, shelveByKind, type ItemKind } from '../../compendium'
import { sourceLabel } from '../model/sourceNames'
import { useCompendium } from '../../compendium/host'
import type { ItemRow } from '../../compendium'
import { useCatalogPage } from './hooks/useCatalogPage'
import { useElementWidth, useFacetSet, useCatalogRows } from '../../platform/host'
import { ItemCatalogDetail } from './ItemCatalogDetail'
import { KindDot, MundaneCard, MundaneListRow, WeaponTable } from './ItemCards'
import { ActiveFilters, Check, facetFilters, FilterGroup } from './RailFilters'
import { SourcePicker } from './SourcePicker'

/**
 * Mundane items — the "Items · shelves by kind" board of the all-sections
 * canvas, as drawn (MYDND-85). 460 notes since the item exporter (MYDND-4).
 *
 * - **A · Shelves by kind** (`WIDE_WIDTH` and up): a filter rail — Sources,
 *   Kind, Weapon, Mastery, Property — then the weapons as a table, because a
 *   weapon is chosen by comparing its columns, and every other kind as a shelf
 *   of cards. The open item sits beside them when there is room
 *   (`DETAIL_BESIDE_WIDTH`), over them when there is not.
 * - **C · Narrow**: search, four toggles, the kinds as chips, rows grouped by
 *   kind, the open item over the list.
 *
 * **Drawn in the canvas's own palette and IBM Plex**, inside the Bestiary's
 * `.bst` root and with its classes, as the other catalogs are.
 *
 * Departures from the canvas: the "For a character" tab is not drawn, because
 * the canvas has no board for it and a tab that leads nowhere is worse than
 * none; the open item's mastery is its name and a link to the rules note
 * rather than a pasted paragraph; "Give to a character…" is left to Magic
 * items, whose inventory rows it was built for.
 *
 * Every filter answers from frontmatter. The weapon and armour numbers are
 * frontmatter since this ticket's exporter pass (MCP server, same key).
 */

/** Below this the rail and the table do not fit side by side. */
export const WIDE_WIDTH = 920
/** Rail 320 + shelves ~600 + panel 360. */
export const DETAIL_BESIDE_WIDTH = 1280
/** A closed weapons table shows this many rows until "Show all". */
const TABLE_PREVIEW = 8

const PROPERTY_FILTERS = ['Finesse', 'Light', 'Heavy', 'Two-Handed', 'Thrown', 'Versatile', 'Ammunition', 'Reach'] as const

export default function ItemsPage() {
  const compendium = useCompendium()
  const rows = useCatalogRows(() => compendium.items.list())

  const kinds = useFacetSet()
  const categories = useFacetSet()
  const masteries = useFacetSet()
  const properties = useFacetSet()
  const sources = useFacetSet()
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set())

  const catalog = useCatalogPage<ItemRow>({
    rows,
    pageSize: Number.MAX_SAFE_INTEGER,
    match: matchAnyField<ItemRow>([r => r.name, r => r.itemType, r => r.mastery, r => r.properties.join(' ')]),
    facets: [
      { predicate: i => kinds.has(kindOf(i)), active: kinds.active, reset: kinds.clear, deps: [kinds.key] },
      { predicate: i => categories.has(i.weaponCategory), active: categories.active, reset: categories.clear, deps: [categories.key] },
      { predicate: i => masteries.has(i.mastery), active: masteries.active, reset: masteries.clear, deps: [masteries.key] },
      {
        // Every pressed property must be on the weapon: "Finesse" and "Light" is a dagger, not a rapier.
        predicate: i => [...properties.selected].every(p => i.properties.some(q => q.toLowerCase() === String(p).toLowerCase())),
        active: properties.active,
        reset: properties.clear,
        deps: [properties.key],
      },
      { predicate: i => sources.has(i.source), active: sources.active, reset: sources.clear, deps: [sources.key] },
    ],
  })

  const [paneRef, width] = useElementWidth<HTMLDivElement>()
  const wide = width === 0 || width >= WIDE_WIDTH
  const beside = width === 0 || width >= DETAIL_BESIDE_WIDTH

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

  const allShelves = shelveByKind(catalog.filtered)
  const shelves = allShelves.filter(s => s.rows.length > 0)
  const everyKind = shelveByKind(rows)
  const selected = rows.find(i => i.id === catalog.selectedId) ?? null
  const columns = cardColumns(shelvesWidth)
  const toggleShelf = (id: string) =>
    setOpen(prev => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const masteryOptions = countValues(rows, i => i.mastery)
  const sourceOptions = countValues(rows, i => i.source)
  const weaponCount = (cat: string) => rows.filter(i => i.weaponCategory === cat).length
  const propertyCount = (p: string) => rows.filter(i => i.properties.some(q => q.toLowerCase() === p.toLowerCase())).length

  const detail = selected ? <ItemCatalogDetail key={selected.id} item={selected} onClose={() => catalog.select(null)} /> : null

  const activeFilters = [
    ...facetFilters('Kind', kinds, v => everyKind.find(k => k.shelf.id === v)?.shelf.chipLabel ?? v),
    ...facetFilters('Weapon', categories, humanise),
    ...facetFilters('Mastery', masteries),
    ...facetFilters('Property', properties),
    ...facetFilters('Source', sources, sourceLabel),
  ]

  const search = (
    <input
      type="search"
      aria-label="Search items"
      value={catalog.searchInput}
      onChange={e => catalog.setSearchInput(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Escape') catalog.clearSearch()
      }}
      placeholder={wide ? 'Search name, property or mastery' : 'Search items'}
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
        <strong>No items in this vault</strong>
        Items are notes in an <code>{compendium.ruleFolder('items')}/</code> folder. This vault has none — run the item exporter, or open a vault
        that has them.
      </p>
    ) : shelves.length === 0 ? (
      <p className="bst-empty">
        <strong>No items match these filters</strong>
      </p>
    ) : null

  const shelfBody = (kind: ItemKind, onShelf: ItemRow[]) => {
    const isOpen = open.has(kind)
    if (kind === 'weapons') {
      const shown = isOpen ? onShelf : onShelf.slice(0, TABLE_PREVIEW)
      return <WeaponTable rows={shown} selectedId={catalog.selectedId} onOpen={id => catalog.select(id)} />
    }
    const limit = previewCount(columns)
    const shown = isOpen ? onShelf : onShelf.slice(0, limit)
    return (
      <div className="bst-cards" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {shown.map(i => (
          <MundaneCard key={i.id} item={i} selected={i.id === catalog.selectedId} onOpen={() => catalog.select(i.id)} />
        ))}
      </div>
    )
  }

  return (
    <div ref={paneRef} className="bst">
      {wide ? (
        <>
          <header className="bst-header">
            <div className="bst-titles">
              <h2 className="bst-title">Items</h2>
              <span className="bst-count">{countLabel(catalog.filtered.length, rows.length)}</span>
            </div>
            <ActiveFilters filters={activeFilters} onClear={catalog.hasActiveFilters ? catalog.clearFilters : null} />
          </header>

          <div className="bst-body">
            <aside aria-label="Filters" className="my-dnd-vault__scroll bst-rail bst-rail--filters">
              {search}

              <SourcePicker options={sourceOptions} sources={sources} />

              <FilterGroup title="Kind" className="bst-group--tight bst-group--levels" active={kinds.selected.size}>
                {everyKind.map(({ shelf, rows: ofKind }) => {
                  if (ofKind.length === 0) return null
                  const shown = allShelves.find(s => s.shelf.id === shelf.id)?.rows.length ?? 0
                  return (
                    <button
                      key={shelf.id}
                      type="button"
                      aria-pressed={kinds.selected.has(shelf.id)}
                      onClick={() => kinds.toggle(shelf.id)}
                      className="bst-plain bst-tier bst-tier--level"
                    >
                      <KindDot shelf={shelf} />
                      <span className="bst-spacer" title={shelf.label}>
                        {shelf.chipLabel}
                      </span>
                      <span className="bst-tier-count">{shown}</span>
                    </button>
                  )
                })}
              </FilterGroup>

              <FilterGroup title="Weapon" className="bst-group--has" active={categories.selected.size}>
                {(['simple', 'martial'] as const).map(cat => (
                  <Check
                    key={cat}
                    label={humanise(cat)}
                    count={weaponCount(cat)}
                    checked={categories.selected.has(cat)}
                    onChange={() => categories.toggle(cat)}
                  />
                ))}
              </FilterGroup>

              {masteryOptions.length > 0 && (
                <FilterGroup title="Mastery" className="bst-group--has" active={masteries.selected.size}>
                  {masteryOptions.map(([value, count]) => (
                    <Check key={value} label={value} count={count} checked={masteries.selected.has(value)} onChange={() => masteries.toggle(value)} />
                  ))}
                </FilterGroup>
              )}

              <FilterGroup title="Property" className="bst-group--has" active={properties.selected.size}>
                {PROPERTY_FILTERS.filter(p => propertyCount(p) > 0).map(p => (
                  <Check key={p} label={p} count={propertyCount(p)} checked={properties.selected.has(p)} onChange={() => properties.toggle(p)} />
                ))}
              </FilterGroup>
            </aside>

            <div ref={scrollerRef} className="my-dnd-vault__scroll bst-shelves bst-shelves--spells">
              {body ??
                shelves.map(({ shelf, rows: onShelf }) => {
                  const limit = shelf.id === 'weapons' ? TABLE_PREVIEW : previewCount(columns)
                  const isOpen = open.has(shelf.id)
                  return (
                    <section key={shelf.id} data-shelf={shelf.id} aria-labelledby={`shelf-${shelf.id}`} className="bst-shelf">
                      <div className="bst-shelf-head">
                        <KindDot shelf={shelf} large />
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
                      {shelfBody(shelf.id, onShelf)}
                    </section>
                  )
                })}
            </div>

            {detail && beside && (
              <aside aria-label={selected?.name} className="bst-detail bst-detail--item">
                {detail}
              </aside>
            )}
          </div>
        </>
      ) : (
        <>
          <header className="bst-header bst-header--narrow">
            <div className="bst-titles">
              <h2 className="bst-title">Items</h2>
              <span className="bst-count">{catalog.filtered.length.toLocaleString('en-US')}</span>
              <span className="bst-spacer" />
              {clear}
            </div>
            {search}
            <div role="group" aria-label="Narrow to" className="bst-toggle-grid bst-toggle-grid--4">
              <Toggle label="SIMPLE" on={categories.selected.has('simple')} onClick={() => categories.toggle('simple')} />
              <Toggle label="MARTIAL" on={categories.selected.has('martial')} onClick={() => categories.toggle('martial')} />
              <Toggle label="ARMOR" on={kinds.selected.has('armor')} onClick={() => kinds.toggle('armor')} />
              <Toggle label="TOOLS" on={kinds.selected.has('tools')} onClick={() => kinds.toggle('tools')} />
            </div>
            <nav aria-label="Kind" className="bst-chipnav">
              {shelves.map(({ shelf, rows: onShelf }) => (
                <button
                  key={shelf.id}
                  type="button"
                  aria-label={`${shelf.label}, ${onShelf.length}`}
                  className="bst-plain bst-navchip"
                  onClick={() => jumpTo(shelf.id)}
                >
                  <KindDot shelf={shelf} small />
                  {shelf.chipLabel}
                </button>
              ))}
            </nav>
          </header>

          <div ref={scrollerRef} className="my-dnd-vault__scroll">
            {body ??
              shelves.map(({ shelf, rows: onShelf }) => (
                <section key={shelf.id} data-shelf={shelf.id} aria-labelledby={`shelf-${shelf.id}`}>
                  <h3 id={`shelf-${shelf.id}`} className="bst-group-head">
                    <KindDot shelf={shelf} />
                    {shelf.label}
                    <span className="bst-group-count">{onShelf.length}</span>
                  </h3>
                  {onShelf.map(i => (
                    <MundaneListRow key={i.id} item={i} selected={i.id === catalog.selectedId} onOpen={() => catalog.select(i.id)} />
                  ))}
                </section>
              ))}
          </div>
        </>
      )}

      {detail && !(wide && beside) && (
        <div className="bst-overlay">
          <div className="bst-detail bst-detail--item">{detail}</div>
        </div>
      )}
    </div>
  )
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick(): void }) {
  return (
    <button type="button" aria-pressed={on} className="bst-plain bst-toggle" onClick={onClick}>
      {label}
    </button>
  )
}

const countLabel = (shown: number, total: number): string =>
  shown === total
    ? `${total.toLocaleString('en-US')} items`
    : `${shown.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} items`
