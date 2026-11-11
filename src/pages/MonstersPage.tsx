import { useCallback, useRef, useState } from 'react'

import { cardColumns, previewCount, shelveMonsters, type Tier } from '../catalog/bestiary'
import { countValues, matchAnyField } from '../catalog/filter'
import { humanise } from '../catalog/labels'
import { sourceLabel } from '../catalog/sourceNames'
import { useContent } from '../ContentContext'
import { MOVE_MODES, type MonsterRow } from '../content/monsters'
import { useAddMonster } from '../hooks/useAddMonster'
import { useCatalogPage } from '../hooks/useCatalogPage'
import { useElementWidth } from '../hooks/useElementWidth'
import { useEncounter } from '../hooks/useGm'
import { useCatalogRows } from '../hooks/useVaultGeneration'
import { useFacetSet, type FacetSet } from '../hooks/useFacetSet'
import { useStateHost } from '../StateContext'
import { MonsterCard, MonsterListRow } from '../ui/BestiaryCards'
import { MonsterDetail } from '../ui/BestiaryDetail'
import { ActiveFilters, Check, facetFilters, FilterGroup, flagFilter } from '../ui/RailFilters'
import { SourcePicker } from '../ui/SourcePicker'

/**
 * The Bestiary — the "Bestiary Layout Proposal" canvas, as drawn (MYDND-64).
 *
 * - **A · Shelves by challenge** (`WIDE_WIDTH` and up): a filter rail —
 *   Sources, Challenge, Moves by, Has, Type — then one shelf per CR tier, each two
 *   rows of cards until "Show all", and the open monster beside them when there
 *   is room (`DETAIL_BESIDE_WIDTH`), over them when there is not.
 * - **C · Narrow**: search, Moves by, the tiers as chips, rows grouped by tier,
 *   and the open monster over the list.
 *
 * **Drawn in the canvas's own palette and IBM Plex, at its own sizes** — the
 * one page that does not take Obsidian's theme, by Gabriele's call; the `.bst`
 * block in `styles/index.css` says why, and how the light twin is chosen.
 *
 * One departure from the canvas, so nothing is unreachable: the 22 monsters with
 * no CR get a last shelf (the canvas counts them in the rail and shelves them
 * nowhere). Board B, "For an encounter", went in MYDND-163: its budget is on
 * `/gm/party`, and a monster joins the encounter from the open monster.
 *
 * Every filter answers from frontmatter, the card keys included, so drawing the
 * page reads no file. Opening a monster reads one, for its fence.
 */

/** Below this the rail and a shelf grid do not fit side by side. */
export const WIDE_WIDTH = 920
/** Rail 320 + shelves ~580 + panel 380: below this the open monster covers the shelves. */
export const DETAIL_BESIDE_WIDTH = 1280


export default function MonstersPage() {
  const content = useContent()
  const rows = useCatalogRows(() => content.monsters.list())
  const { activeCampaignId } = useStateHost()
  const { encounter, busy, update } = useEncounter()
  const addMonster = useAddMonster(update)

  const moves = useFacetSet()
  const types = useFacetSet()
  const [legendaryOnly, setLegendaryOnly] = useState(false)
  const [castersOnly, setCastersOnly] = useState(false)
  const sources = useFacetSet()
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set())

  const catalog = useCatalogPage<MonsterRow>({
    rows,
    // One page: shelves are their own way of keeping the list short.
    pageSize: Number.MAX_SAFE_INTEGER,
    match: matchAnyField<MonsterRow>([r => r.name, r => r.creatureType]),
    facets: [
      {
        // Any of the pressed modes, not all of them: "what flies or swims".
        predicate: m => !moves.active || m.moves.some(x => moves.selected.has(x)),
        active: moves.active,
        reset: moves.clear,
        deps: [moves.key],
      },
      {
        predicate: m => types.has(m.creatureType?.toLowerCase()),
        active: types.active,
        reset: types.clear,
        deps: [types.key],
      },
      {
        predicate: m => !legendaryOnly || m.legendary,
        active: legendaryOnly,
        reset: () => setLegendaryOnly(false),
        deps: [legendaryOnly],
      },
      {
        predicate: m => !castersOnly || m.spellcasting,
        active: castersOnly,
        reset: () => setCastersOnly(false),
        deps: [castersOnly],
      },
      {
        predicate: m => sources.has(m.source),
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

  // The shelves' scroller: measured for the card grid, and scrolled by the tier links.
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

  const allShelves = shelveMonsters(catalog.filtered)
  const shelves = allShelves.filter(s => s.rows.length > 0)
  const selected = rows.find(m => m.id === catalog.selectedId) ?? null
  const columns = cardColumns(shelvesWidth)
  const toggleShelf = (id: string) =>
    setOpen(prev => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const inEncounter = (id: string) =>
    encounter.combatants.filter(c => c.kind === 'monster' && c.monsterId === id).length
  const detail = selected ? (
    <MonsterDetail
      key={selected.id}
      monster={selected}
      onClose={() => catalog.select(null)}
      encounter={
        activeCampaignId ? { add: () => addMonster(selected), count: inEncounter(selected.id), busy } : null
      }
    />
  ) : null

  const typeOptions = countValues(rows, m => m.creatureType?.toLowerCase())
  const sourceOptions = countValues(rows, m => m.source)
  const legendaryCount = rows.filter(m => m.legendary).length
  const casterCount = rows.filter(m => m.spellcasting).length

  const activeFilters = [
    ...facetFilters('Moves by', moves, humanise),
    ...flagFilter('Has: Legendary actions', legendaryOnly, () => setLegendaryOnly(false)),
    ...flagFilter('Has: Spellcasting', castersOnly, () => setCastersOnly(false)),
    ...facetFilters('Type', types, humanise),
    ...facetFilters('Source', sources, sourceLabel),
  ]

  const search = (
    <input
      type="search"
      aria-label="Search monsters"
      value={catalog.searchInput}
      onChange={e => catalog.setSearchInput(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Escape') catalog.clearSearch()
      }}
      placeholder="Search name or type"
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
        <strong>No monsters in this vault</strong>
        The bestiary is notes in a <code>{content.ruleFolder('bestiary')}/</code> folder, each with a <code>statblock</code> block in its body.
      </p>
    ) : shelves.length === 0 ? (
      <p className="bst-empty">
        <strong>No monsters match these filters</strong>
      </p>
    ) : null

  return (
    <div ref={paneRef} className="bst">
      {wide ? (
        <>
          <header className="bst-header">
            <div className="bst-titles">
              <h2 className="bst-title">Bestiary</h2>
              <span className="bst-count">{countLabel(catalog.filtered.length, rows.length)}</span>
            </div>
            <ActiveFilters filters={activeFilters} onClear={catalog.hasActiveFilters ? catalog.clearFilters : null} />
          </header>

          <div className="bst-body">
            <aside aria-label="Filters" className="my-dnd-vault__scroll bst-rail bst-rail--filters">
              {search}

              <SourcePicker options={sourceOptions} sources={sources} />

              <FilterGroup title="Challenge" className="bst-group--tight bst-group--levels">
                <nav aria-label="Challenge" className="bst-group bst-group--tight bst-group--levels">
                  {allShelves.map(({ tier, rows: onShelf }) => {
                    if (tier.id === 'cr-none' && onShelf.length === 0) return null
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        disabled={onShelf.length === 0}
                        onClick={() => jumpTo(tier.id)}
                        className={tier.id === 'cr-none' ? 'bst-plain bst-tier bst-tier--level bst-tier--none' : 'bst-plain bst-tier bst-tier--level'}
                      >
                        <Dot tier={tier} />
                        <span className="bst-spacer">{tier.label}</span>
                        <span className="bst-tier-count">{onShelf.length}</span>
                      </button>
                    )
                  })}
                </nav>
              </FilterGroup>

              <FilterGroup title="Moves by" className="bst-group--has" active={moves.selected.size}>
                {MOVE_MODES.map(mode => (
                  <Check
                    key={mode}
                    label={humanise(mode)}
                    count={rows.filter(m => m.moves.includes(mode)).length}
                    checked={moves.selected.has(mode)}
                    onChange={() => moves.toggle(mode)}
                  />
                ))}
              </FilterGroup>

              <FilterGroup title="Has" className="bst-group--has" active={[legendaryOnly, castersOnly].filter(Boolean).length}>
                <Check label="Legendary actions" count={legendaryCount} checked={legendaryOnly} onChange={setLegendaryOnly} />
                <Check label="Spellcasting" count={casterCount} checked={castersOnly} onChange={setCastersOnly} />
              </FilterGroup>

              <FilterGroup title="Type" className="bst-group--has" active={types.selected.size}>
                {typeOptions.map(([value, count]) => (
                  <Check key={value} label={humanise(value)} count={count} checked={types.selected.has(value)} onChange={() => types.toggle(value)} />
                ))}
              </FilterGroup>
            </aside>

            <div ref={scrollerRef} className="my-dnd-vault__scroll bst-shelves">
              {body ??
                shelves.map(({ tier, rows: onShelf }) => {
                  const limit = previewCount(columns)
                  const isOpen = open.has(tier.id)
                  const shown = isOpen ? onShelf : onShelf.slice(0, limit)
                  return (
                    <section key={tier.id} data-shelf={tier.id} aria-labelledby={`shelf-${tier.id}`} className="bst-shelf">
                      <div className="bst-shelf-head">
                        <Dot tier={tier} large />
                        <h3 id={`shelf-${tier.id}`} className="bst-shelf-title">
                          {tier.label}
                        </h3>
                        <span className="bst-shelf-when">{tier.when}</span>
                        <span className="bst-spacer" />
                        {onShelf.length > limit && (
                          <button type="button" className="bst-plain bst-link" onClick={() => toggleShelf(tier.id)}>
                            {isOpen ? 'Show fewer' : `Show all ${onShelf.length} →`}
                          </button>
                        )}
                      </div>
                      <div className="bst-cards" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                        {shown.map(m => (
                          <MonsterCard
                            key={m.id}
                            monster={m}
                            selected={m.id === catalog.selectedId}
                            onOpen={() => catalog.select(m.id)}
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
              <h2 className="bst-title">Bestiary</h2>
              <span className="bst-count">{catalog.filtered.length.toLocaleString('en-US')}</span>
              <span className="bst-spacer" />
              {clear}
            </div>
            {search}
            <div role="group" aria-label="Moves by">
              <MoveToggles moves={moves} />
            </div>
            <nav aria-label="Challenge" className="bst-chipnav">
              {shelves.map(({ tier, rows: onShelf }) => (
                <button key={tier.id} type="button" className="bst-plain bst-navchip" onClick={() => jumpTo(tier.id)}>
                  <Dot tier={tier} small />
                  {tier.label}
                  <span className="bst-tier-count">{onShelf.length}</span>
                </button>
              ))}
            </nav>
          </header>

          <div ref={scrollerRef} className="my-dnd-vault__scroll">
            {body ??
              shelves.map(({ tier, rows: onShelf }) => (
                <section key={tier.id} data-shelf={tier.id} aria-labelledby={`shelf-${tier.id}`}>
                  <h3 id={`shelf-${tier.id}`} className="bst-group-head">
                    <Dot tier={tier} />
                    {tier.label}
                    <span className="bst-group-count">{onShelf.length}</span>
                  </h3>
                  {onShelf.map(m => (
                    <MonsterListRow
                      key={m.id}
                      monster={m}
                      selected={m.id === catalog.selectedId}
                      onOpen={() => catalog.select(m.id)}
                    />
                  ))}
                </section>
              ))}
          </div>
        </>
      )}

      {/* The open monster over the list when there is no room beside it. */}
      {detail && !(wide && beside) && (
        <div className="bst-overlay">
          <div className="bst-detail">{detail}</div>
        </div>
      )}
    </div>
  )
}

/** The narrow pane's Moves by: FLY → BURROW across, where the rail has checkboxes. Any of the pressed modes matches. */
function MoveToggles({ moves }: { moves: FacetSet }) {
  return (
    <div className="bst-toggle-grid bst-toggle-grid--4">
      {MOVE_MODES.map(mode => (
        <button
          key={mode}
          type="button"
          aria-pressed={moves.selected.has(mode)}
          title={`Moves by ${mode}`}
          onClick={() => moves.toggle(mode)}
          className="bst-plain bst-toggle"
        >
          {mode.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

function Dot({ tier, large = false, small = false }: { tier: Tier; large?: boolean; small?: boolean }) {
  const size = large ? ' bst-dot--lg' : small ? ' bst-dot--sm' : ''
  return <span aria-hidden="true" className={`bst-dot${size} bst-dot--${tier.tone}`} />
}

const countLabel = (shown: number, total: number): string =>
  shown === total
    ? `${total.toLocaleString('en-US')} monsters`
    : `${shown.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} monsters`
