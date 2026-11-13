// The Spells catalog page: shelves, filters, and a spell's detail pane.

import { useCallback, useRef, useState } from 'react'

import { cardColumns, previewCount } from '../model/bestiary'
import { countValues, matchAnyField } from '../../platform'
import {
  schoolLabel,
  CAST_AS,
  castAsOf,
  spellShelfWhen,
  shelveSpells,
  type LevelShelf,
} from '../../compendium'
import { sourceLabel } from '../model/sourceNames'
import { useCompendium } from '../../compendium/host'
import type { SpellRow } from '../../compendium'
import { useCatalogPage } from './hooks/useCatalogPage'
import { useElementWidth, useFacetSet, type FacetSet, useCatalogRows } from '../../platform/host'
import { ActiveFilters, Check, facetFilters, FilterGroup, flagFilter } from './RailFilters'
import { SourcePicker } from './SourcePicker'
import { SpellCatalogDetail } from './SpellCatalogDetail'
import { SchoolIcon, SpellCard, SpellListRow } from './SpellCards'

/**
 * Spells — the "Spells Layout Proposal" canvas (MYDND-66). This page is a search
 * of everything the vault holds. Its board B, "For a character", went in
 * MYDND-163; a spell still goes on a character from the open spell.
 *
 * - **A · Shelves by level** (`WIDE_WIDTH` and up): a filter rail — search, Sources,
 *   Level, Cast as, Has, School, Class — then one shelf per spell level, each two
 *   rows of cards until "Show all", and the open spell beside them when there is
 *   room (`DETAIL_BESIDE_WIDTH`), over them when there is not.
 * - **C · Narrow**: search, Cast as, the levels as chips, rows grouped by level,
 *   and the open spell over the list.
 *
 * **Drawn in the canvas's own palette and IBM Plex, at its own sizes**, inside
 * the Bestiary's `.bst` root and with its classes — the three canvases share a
 * palette. The school is the icon Gabriele supplied (`assets/schools/`) in place
 * of the canvas's two-letter code, which stays for a school with no icon.
 *
 * Departure from the canvas, so nothing is unreachable: a note with no level gets
 * a last shelf.
 *
 * Every filter answers from frontmatter, so drawing the page reads no file.
 * Opening a spell reads one, for its prose.
 */

/** Below this the rail and a shelf grid do not fit side by side. */
export const WIDE_WIDTH = 920
/** Rail 320 + shelves ~580 + panel 380: below this the open spell covers the shelves. */
export const DETAIL_BESIDE_WIDTH = 1280

export default function SpellsPage() {
  const compendium = useCompendium()
  const rows = useCatalogRows(() => compendium.spells.list())

  const castAs = useFacetSet()
  const schools = useFacetSet()
  const [concOnly, setConcOnly] = useState(false)
  const [ritualOnly, setRitualOnly] = useState(false)
  const [damageOnly, setDamageOnly] = useState(false)
  const [className, setClassName] = useState('')
  const sources = useFacetSet()
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set())

  const catalog = useCatalogPage<SpellRow>({
    rows,
    // One page: shelves are their own way of keeping the list short.
    pageSize: Number.MAX_SAFE_INTEGER,
    match: matchAnyField<SpellRow>([r => r.name, r => r.classes, r => r.damageTypes]),
    facets: [
      {
        // Any of the pressed ways, not all of them: "what I can cast as a bonus or a reaction".
        predicate: s => !castAs.active || castAs.selected.has(castAsOf(s.castingTime) ?? ''),
        active: castAs.active,
        reset: castAs.clear,
        deps: [castAs.key],
      },
      {
        predicate: s => schools.has(schoolLabel(s.school)),
        active: schools.active,
        reset: schools.clear,
        deps: [schools.key],
      },
      {
        predicate: s => !concOnly || s.concentration,
        active: concOnly,
        reset: () => setConcOnly(false),
        deps: [concOnly],
      },
      {
        predicate: s => !ritualOnly || s.ritual,
        active: ritualOnly,
        reset: () => setRitualOnly(false),
        deps: [ritualOnly],
      },
      {
        predicate: s => !damageOnly || rollsDamage(s),
        active: damageOnly,
        reset: () => setDamageOnly(false),
        deps: [damageOnly],
      },
      {
        predicate: s => !className || s.classes.includes(className),
        active: !!className,
        reset: () => setClassName(''),
        deps: [className],
      },
      {
        predicate: s => sources.has(s.source),
        active: sources.active,
        reset: sources.clear,
        deps: [sources.key],
      },
    ],
  })

  const [paneRef, width] = useElementWidth<HTMLDivElement>()
  // Unmeasured (0) reads as wide, so the first paint does not flash the narrow form.
  const wide = width === 0 || width >= WIDE_WIDTH
  const beside = width === 0 || width >= DETAIL_BESIDE_WIDTH

  // The shelves' scroller: measured for the card grid, and scrolled by the level links.
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

  const allShelves = shelveSpells(catalog.filtered)
  const shelves = allShelves.filter(s => s.rows.length > 0)
  const selected = rows.find(s => s.id === catalog.selectedId) ?? null
  const columns = cardColumns(shelvesWidth)
  const toggleShelf = (id: string) =>
    setOpen(prev => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const detail = selected ? (
    <SpellCatalogDetail key={selected.id} spell={selected} onClose={() => catalog.select(null)} />
  ) : null

  const schoolOptions = countValues(rows, s => schoolLabel(s.school))
  const classOptions = countValues(rows, s => s.classes).sort((a, b) => a[0].localeCompare(b[0]))
  const sourceOptions = countValues(rows, s => s.source)
  const concCount = rows.filter(s => s.concentration).length
  const ritualCount = rows.filter(s => s.ritual).length
  const damageCount = rows.filter(rollsDamage).length

  const activeFilters = [
    ...facetFilters('Cast as', castAs, v => CAST_AS.find(c => c.id === v)?.label ?? v),
    ...flagFilter('Has: Concentration', concOnly, () => setConcOnly(false)),
    ...flagFilter('Has: Ritual', ritualOnly, () => setRitualOnly(false)),
    ...flagFilter('Has: Rolls damage', damageOnly, () => setDamageOnly(false)),
    ...facetFilters('School', schools),
    ...flagFilter(`Class: ${className}`, !!className, () => setClassName('')),
    ...facetFilters('Source', sources, sourceLabel),
  ]

  const search = (
    <input
      type="search"
      aria-label="Search spells"
      value={catalog.searchInput}
      onChange={e => catalog.setSearchInput(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Escape') catalog.clearSearch()
      }}
      placeholder={wide ? 'Search name, class or damage type' : 'Search spells'}
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
        <strong>No spells in this vault</strong>
        Spells are notes in a <code>{compendium.ruleFolder('spells')}/</code> folder. This vault has none — run the spell exporter, or open a vault
        that has them.
      </p>
    ) : shelves.length === 0 ? (
      <p className="bst-empty">
        <strong>No spells match these filters</strong>
      </p>
    ) : null

  return (
    <div ref={paneRef} className="bst">
      {wide ? (
        <>
          <header className="bst-header">
            <div className="bst-titles">
              <h2 className="bst-title">Spells</h2>
              <span className="bst-count">{countLabel(catalog.filtered.length, rows.length)}</span>
            </div>
            <ActiveFilters filters={activeFilters} onClear={catalog.hasActiveFilters ? catalog.clearFilters : null} />
          </header>

          <div className="bst-body">
            <aside aria-label="Filters" className="my-dnd-vault__scroll bst-rail bst-rail--filters">
              {search}

              <SourcePicker options={sourceOptions} sources={sources} />

              <FilterGroup title="Level" className="bst-group--tight bst-group--levels">
                <nav aria-label="Level" className="bst-group bst-group--tight bst-group--levels">
                  {allShelves.map(({ shelf, rows: onShelf }) => {
                    if (shelf.level < 0 && onShelf.length === 0) return null
                    return (
                      <button
                        key={shelf.id}
                        type="button"
                        disabled={onShelf.length === 0}
                        onClick={() => jumpTo(shelf.id)}
                        className="bst-plain bst-tier bst-tier--level"
                      >
                        <Dot shelf={shelf} />
                        <span className="bst-spacer">{shelf.railLabel}</span>
                        <span className="bst-tier-count">{onShelf.length}</span>
                      </button>
                    )
                  })}
                </nav>
              </FilterGroup>

              <FilterGroup title="Cast as" className="bst-group--has" active={castAs.selected.size}>
                {CAST_AS.map(c => (
                  <Check
                    key={c.id}
                    label={c.label}
                    count={rows.filter(s => castAsOf(s.castingTime) === c.id).length}
                    checked={castAs.selected.has(c.id)}
                    onChange={() => castAs.toggle(c.id)}
                  />
                ))}
              </FilterGroup>

              <FilterGroup title="Has" className="bst-group--has" active={[concOnly, ritualOnly, damageOnly].filter(Boolean).length}>
                <Check label="Concentration" count={concCount} checked={concOnly} onChange={setConcOnly} />
                <Check label="Ritual" count={ritualCount} checked={ritualOnly} onChange={setRitualOnly} />
                <Check label="Rolls damage" count={damageCount} checked={damageOnly} onChange={setDamageOnly} />
              </FilterGroup>

              <FilterGroup title="School" className="bst-group--levels" active={schools.selected.size}>
                {schoolOptions.map(([value, count]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={schools.selected.has(value)}
                    title={value}
                    onClick={() => schools.toggle(value)}
                    className="bst-plain bst-tier bst-tier--level bst-tier--school"
                  >
                    <SchoolIcon school={value} size="xs" />
                    <span className="bst-spacer bst-tier-name">{value}</span>
                    <span className="bst-tier-count">{count}</span>
                  </button>
                ))}
              </FilterGroup>

              <FilterGroup title="Class" active={className ? 1 : 0}>
                <select aria-label="Class" value={className} onChange={e => setClassName(e.target.value)} className="bst-select">
                  <option value="">All {classOptions.length} classes</option>
                  {classOptions.map(([value, count]) => (
                    <option key={value} value={value}>
                      {value} ({count})
                    </option>
                  ))}
                </select>
              </FilterGroup>
            </aside>

            <div ref={scrollerRef} className="my-dnd-vault__scroll bst-shelves bst-shelves--spells">
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
                        <span className="bst-shelf-when">{spellShelfWhen(shelf, onShelf.length)}</span>
                        <span className="bst-spacer" />
                        {onShelf.length > limit && (
                          <button type="button" className="bst-plain bst-link" onClick={() => toggleShelf(shelf.id)}>
                            {isOpen ? 'Show fewer' : `Show all ${onShelf.length} →`}
                          </button>
                        )}
                      </div>
                      <div className="bst-cards" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                        {shown.map(s => (
                          <SpellCard key={s.id} spell={s} selected={s.id === catalog.selectedId} onOpen={() => catalog.select(s.id)} />
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
              <h2 className="bst-title">Spells</h2>
              <span className="bst-count">{catalog.filtered.length.toLocaleString('en-US')}</span>
              <span className="bst-spacer" />
              {clear}
            </div>
            {search}
            <div role="group" aria-label="Cast as">
              <CastAsToggles castAs={castAs} />
            </div>
            <nav aria-label="Level" className="bst-chipnav">
              {shelves.map(({ shelf, rows: onShelf }) => (
                <button
                  key={shelf.id}
                  type="button"
                  aria-label={`${shelf.railLabel}, ${onShelf.length}`}
                  className="bst-plain bst-navchip"
                  onClick={() => jumpTo(shelf.id)}
                >
                  <Dot shelf={shelf} small />
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
                    <Dot shelf={shelf} />
                    {shelf.label}
                    <span className="bst-group-count">{onShelf.length}</span>
                  </h3>
                  {onShelf.map(s => (
                    <SpellListRow key={s.id} spell={s} selected={s.id === catalog.selectedId} onOpen={() => catalog.select(s.id)} />
                  ))}
                </section>
              ))}
          </div>
        </>
      )}

      {/* The open spell over the list when there is no room beside it. */}
      {detail && !(wide && beside) && (
        <div className="bst-overlay">
          <div className="bst-detail">{detail}</div>
        </div>
      )}
    </div>
  )
}

/** A spell that rolls damage: dice in its note, or a damage type when the dice are prose. */
const rollsDamage = (s: SpellRow): boolean => !!s.damageDice || s.damageTypes.length > 0

/** The narrow pane's Cast as: four toggles across, where the rail has checkboxes. Any of the pressed ways matches. */
function CastAsToggles({ castAs }: { castAs: FacetSet }) {
  return (
    <div className="bst-toggle-grid bst-toggle-grid--4">
      {CAST_AS.map(c => (
        <button
          key={c.id}
          type="button"
          aria-pressed={castAs.selected.has(c.id)}
          title={`Cast as ${c.label.toLowerCase()}`}
          onClick={() => castAs.toggle(c.id)}
          className="bst-plain bst-toggle"
        >
          {c.short}
        </button>
      ))}
    </div>
  )
}

function Dot({ shelf, large = false, small = false }: { shelf: LevelShelf; large?: boolean; small?: boolean }) {
  const size = large ? ' bst-dot--lg' : small ? ' bst-dot--sm' : ''
  return <span aria-hidden="true" className={`bst-dot${size} bst-dot--${shelf.tone}`} />
}

const countLabel = (shown: number, total: number): string =>
  shown === total
    ? `${total.toLocaleString('en-US')} spells`
    : `${shown.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} spells`
