// The Magic Items catalog page: rarity shelves, filters, and an item's detail
// pane.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { cardColumns, previewCount } from '../model/bestiary'
import { countValues, matchAnyField } from '../../platform'
import {
  categoryLabel,
  categoryOf,
  itemValueCp,
  itemShelfWhen,
  shelveItems,
  type Category,
  type RarityShelf,
} from '../../compendium'
import { sourceLabel } from '../model/sourceNames'
import { useCompendium } from '../../compendium/host'
import type { MagicItemRow } from '../../compendium'
import {
  useCampaignValuePercent,
  useElementWidth,
  useFacetSet,
  useCatalogRows,
  useVaultGeneration,
} from '../../platform/host'
import { useCatalogPage } from './hooks/useCatalogPage'
import { useRoster, useCharacters } from '../../characters/host'
import type { CharacterInventory } from '../../characterModel'
import { MagicItemCatalogDetail } from './MagicItemCatalogDetail'
import { MagicItemCard, MagicItemListRow } from './MagicItemCards'
import { ActiveFilters, Check, facetFilters, FilterGroup, flagFilter } from './RailFilters'
import { SourcePicker } from './SourcePicker'

const RARITY_ESSENCE_MAP: Record<string, string> = {
  uncommon: 'frail',
  rare: 'robust',
  'very rare': 'potent',
  legendary: 'mythic',
}

function isCraftable(
  item: MagicItemRow,
  harvestedKeys: Set<string>,
  essenceRarities: Set<string>,
  equipmentRows: Array<{ name: string; itemType: string | null }>,
): boolean {
  if (item.rarity?.toLowerCase() === 'artifact') return false

  const component = item.craftComponent?.toLowerCase()
  const creatureType = item.craftCreatureType?.toLowerCase()

  if (component && creatureType) {
    let ok = false
    for (const key of harvestedKeys) {
      const [ct, cn] = key.split('::')
      if (ct === creatureType && cn.includes(component)) {
        ok = true
        break
      }
    }
    if (!ok) return false
  } else if (component) {
    let ok = false
    for (const key of harvestedKeys) {
      if (key.includes(component)) {
        ok = true
        break
      }
    }
    if (!ok) return false
  }

  // Essence requirement
  const rarity = item.rarity?.toLowerCase() ?? ''
  if (RARITY_ESSENCE_MAP[rarity]) {
    if (!essenceRarities.has(rarity)) return false
  }

  // Base item requirement
  if (item.baseItemType && equipmentRows.length > 0) {
    const want = item.baseItemType.toLowerCase()
    const baseOk = equipmentRows.some(r => {
      const n = r.name.toLowerCase()
      const t = (r.itemType ?? '').toLowerCase()
      return n.includes(want) || t.includes(want)
    })
    if (!baseOk) return false
  }

  return true
}

/**
 * Magic items — the "Magic Items Layout Proposal" canvas, as drawn (MYDND-76).
 * 1,916 notes since MYDND-4's exporter, the biggest catalog here.
 *
 * - **A · Shelves by rarity** (`WIDE_WIDTH` and up): a filter rail — Rarity,
 *   Sources, Attunement, Has, Type — then one shelf per rarity, each two rows of
 *   cards until "Show all", and the open item beside them when there is room
 *   (`DETAIL_BESIDE_WIDTH`), over them when there is not.
 * - **C · Narrow**: search, four toggles, the rarities as chips, rows grouped
 *   by rarity, and the open item over the list.
 *
 * **Drawn in the canvas's own palette and IBM Plex, at its own sizes**, inside
 * the Bestiary's `.bst` root and with its classes, as Feats and Spells are.
 *
 * Departures from the canvas, each so nothing is unreachable or invented: "Varies"
 * (417 notes) and "Unknown" get shelves of their own; the rail's Has keeps
 * "Craftable", the filter this page had before; and a card with no charge, bonus
 * or spell to show shows its note's first sentence. Board B, "For a character",
 * went in MYDND-163.
 *
 * Every filter answers from frontmatter, so drawing the page reads no file.
 * Opening an item reads one, for its prose.
 */

/** Below this the rail and a shelf grid do not fit side by side. */
export const WIDE_WIDTH = 920
/** Rail 320 + shelves ~580 + panel 380: below this the open item covers the shelves. */
export const DETAIL_BESIDE_WIDTH = 1280

/** Not needed, needed, or needed and only some can (`by a wizard`). Any of the ticked ones matches. */
const ATTUNE = [
  { id: 'none', label: 'Not needed' },
  { id: 'any', label: 'Needed' },
  { id: 'class', label: 'Only for some' },
] as const

export default function MagicItemsPage() {
  const compendium = useCompendium()
  const rows = useCatalogRows(() => compendium.magicItems.list())
  const percent = useCampaignValuePercent()
  const { entries: roster } = useRoster()
  const { inventory } = useCharacters()
  const generation = useVaultGeneration()

  const [inventories, setInventories] = useState<Record<string, CharacterInventory>>({})

  useEffect(() => {
    let cancelled = false
    async function loadPartyInventories() {
      const nextMap: Record<string, CharacterInventory> = {}
      for (const char of roster) {
        try {
          const inv = await inventory.getInventory(char.path)
          nextMap[char.path] = inv
        } catch {
          // ignore unreadable
        }
      }
      if (!cancelled) setInventories(nextMap)
    }
    if (roster.length > 0) {
      void loadPartyInventories()
    }
    return () => {
      cancelled = true
    }
  }, [roster, generation, inventory])

  const harvestedKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const inv of Object.values(inventories)) {
      for (const item of inv.items) {
        if (item.component_id) {
          keys.add(item.component_id.toLowerCase())
        }
        if (item.name) {
          keys.add(item.name.toLowerCase())
        }
      }
    }
    return keys
  }, [inventories])

  const essenceRarities = useMemo(() => {
    const set = new Set<string>()
    for (const inv of Object.values(inventories)) {
      for (const item of inv.items) {
        const name = (item.name || item.essence_id || '').toLowerCase()
        if (name.includes('frail') || name.includes('uncommon')) set.add('uncommon')
        if (name.includes('robust') || name.includes('rare')) set.add('rare')
        if (name.includes('potent') || name.includes('very rare')) set.add('very rare')
        if (name.includes('mythic') || name.includes('legendary')) set.add('legendary')
      }
    }
    return set
  }, [inventories])

  const equipmentRows = useMemo(() => {
    const eq: Array<{ name: string; itemType: string | null }> = []
    for (const inv of Object.values(inventories)) {
      for (const item of inv.items) {
        if (item.content_item_id || item.name) {
          eq.push({ name: item.name || item.content_item_id || '', itemType: null })
        }
      }
    }
    return eq
  }, [inventories])

  const attunes = useFacetSet()
  const [chargesOnly, setChargesOnly] = useState(false)
  const [sentientOnly, setSentientOnly] = useState(false)
  const [cursedOnly, setCursedOnly] = useState(false)
  const [craftableOnly, setCraftableOnly] = useState(false)
  const types = useFacetSet()
  const sources = useFacetSet()
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set())

  const catalog = useCatalogPage<MagicItemRow>({
    rows,
    // One page: shelves are their own way of keeping the list short.
    pageSize: Number.MAX_SAFE_INTEGER,
    match: matchAnyField<MagicItemRow>([r => r.name, r => r.itemType, r => r.summary, r => r.casts]),
    facets: [
      {
        predicate: i => !attunes.active || [...attunes.selected].some(a => attuneMatches(i, a)),
        active: attunes.active,
        reset: attunes.clear,
        deps: [attunes.key],
      },
      {
        predicate: i => !chargesOnly || i.charges !== null,
        active: chargesOnly,
        reset: () => setChargesOnly(false),
        deps: [chargesOnly],
      },
      {
        predicate: i => !sentientOnly || i.sentient,
        active: sentientOnly,
        reset: () => setSentientOnly(false),
        deps: [sentientOnly],
      },
      {
        predicate: i => !cursedOnly || i.cursed,
        active: cursedOnly,
        reset: () => setCursedOnly(false),
        deps: [cursedOnly],
      },
      {
        predicate: i => !craftableOnly || isCraftable(i, harvestedKeys, essenceRarities, equipmentRows),
        active: craftableOnly,
        reset: () => setCraftableOnly(false),
        deps: [craftableOnly, harvestedKeys, essenceRarities, equipmentRows],
      },
      {
        predicate: i => types.has(categoryOf(i)),
        active: types.active,
        reset: types.clear,
        deps: [types.key],
      },
      {
        predicate: i => sources.has(i.source),
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

  // The shelves' scroller: measured for the card grid, and scrolled by the rarity links.
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

  const allShelves = shelveItems(catalog.filtered)
  const shelves = allShelves.filter(s => s.rows.length > 0)
  const selected = rows.find(i => i.id === catalog.selectedId) ?? null
  const columns = cardColumns(shelvesWidth)
  const toggleShelf = (id: string) =>
    setOpen(prev => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  /** The rarity's price in this campaign: the band, scaled. */
  const band = (shelf: RarityShelf): number | null =>
    shelf.rarity ? itemValueCp({ rarity: shelf.rarity, valueCp: null }, percent) : null

  const detail = selected ? (
    <MagicItemCatalogDetail key={selected.id} item={selected} onClose={() => catalog.select(null)} />
  ) : null

  const typeOptions = countValues(rows, i => categoryOf(i)) as Array<[Category, number]>
  const sourceOptions = countValues(rows, i => i.source)
  const chargesCount = rows.filter(i => i.charges !== null).length
  const sentientCount = rows.filter(i => i.sentient).length
  const cursedCount = rows.filter(i => i.cursed).length
  const craftableCount = useMemo(
    () => rows.filter(i => isCraftable(i, harvestedKeys, essenceRarities, equipmentRows)).length,
    [rows, harvestedKeys, essenceRarities, equipmentRows],
  )

  const activeFilters = [
    ...facetFilters('Attunement', attunes, v => ATTUNE.find(a => a.id === v)?.label ?? v),
    ...flagFilter('Has: Charges', chargesOnly, () => setChargesOnly(false)),
    ...flagFilter('Has: Sentience', sentientOnly, () => setSentientOnly(false)),
    ...flagFilter('Has: A curse', cursedOnly, () => setCursedOnly(false)),
    ...flagFilter('Has: Craftable', craftableOnly, () => setCraftableOnly(false)),
    ...facetFilters('Type', types, v => categoryLabel(v as Category)),
    ...facetFilters('Source', sources, sourceLabel),
  ]

  const search = (
    <input
      type="search"
      aria-label="Search magic items"
      value={catalog.searchInput}
      onChange={e => catalog.setSearchInput(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Escape') catalog.clearSearch()
      }}
      placeholder={wide ? 'Search name, type or effect' : 'Search magic items'}
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
        <strong>No magic items in this vault</strong>
        Magic items are notes in a <code>{compendium.ruleFolder('magic-items')}/</code> folder. This vault has none — run the item exporter, or open
        a vault that has them.
      </p>
    ) : shelves.length === 0 ? (
      <p className="bst-empty">
        <strong>No magic items match these filters</strong>
      </p>
    ) : null

  return (
    <div ref={paneRef} className="bst">
      {wide ? (
        <>
          <header className="bst-header">
            <div className="bst-titles">
              <h2 className="bst-title">Magic items</h2>
              <span className="bst-count">{countLabel(catalog.filtered.length, rows.length)}</span>
            </div>
            <ActiveFilters filters={activeFilters} onClear={catalog.hasActiveFilters ? catalog.clearFilters : null} />
          </header>

          <div className="bst-body">
            <aside aria-label="Filters" className="my-dnd-vault__scroll bst-rail bst-rail--filters">
              {search}

              <SourcePicker options={sourceOptions} sources={sources} />

              <FilterGroup title="Rarity" className="bst-group--tight bst-group--levels">
                <nav aria-label="Rarity" className="bst-group bst-group--tight bst-group--levels">
                  {allShelves.map(({ shelf, rows: onShelf }) => {
                    if (shelf.tone === 'none' && onShelf.length === 0) return null
                    return (
                      <button
                        key={shelf.id}
                        type="button"
                        disabled={onShelf.length === 0}
                        onClick={() => jumpTo(shelf.id)}
                        className="bst-plain bst-tier bst-tier--level"
                      >
                        <Dot shelf={shelf} />
                        <span className="bst-spacer">{shelf.label}</span>
                        <span className="bst-tier-count">{onShelf.length}</span>
                      </button>
                    )
                  })}
                </nav>
              </FilterGroup>

              <FilterGroup title="Attunement" className="bst-group--has" active={attunes.selected.size}>
                {ATTUNE.map(a => (
                  <Check
                    key={a.id}
                    label={a.label}
                    count={rows.filter(i => attuneMatches(i, a.id)).length}
                    checked={attunes.selected.has(a.id)}
                    onChange={() => attunes.toggle(a.id)}
                  />
                ))}
              </FilterGroup>

              <FilterGroup title="Has" className="bst-group--has" active={[chargesOnly, sentientOnly, cursedOnly, craftableOnly].filter(Boolean).length}>
                <Check label="Charges" count={chargesCount} checked={chargesOnly} onChange={setChargesOnly} />
                <Check label="Sentience" count={sentientCount} checked={sentientOnly} onChange={setSentientOnly} />
                <Check label="A curse" count={cursedCount} checked={cursedOnly} onChange={setCursedOnly} />
                <Check label="Craftable" count={craftableCount} checked={craftableOnly} onChange={setCraftableOnly} />
              </FilterGroup>

              <FilterGroup title="Type" className="bst-group--has" active={types.selected.size}>
                {typeOptions.map(([value, count]) => (
                  <Check key={value} label={categoryLabel(value)} count={count} checked={types.selected.has(value)} onChange={() => types.toggle(value)} />
                ))}
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
                        <span className="bst-shelf-when">{itemShelfWhen(shelf, onShelf.length, band(shelf))}</span>
                        <span className="bst-spacer" />
                        {onShelf.length > limit && (
                          <button type="button" className="bst-plain bst-link" onClick={() => toggleShelf(shelf.id)}>
                            {isOpen ? 'Show fewer' : `Show all ${onShelf.length} →`}
                          </button>
                        )}
                      </div>
                      <div className="bst-cards" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                        {shown.map(i => (
                          <MagicItemCard key={i.id} item={i} selected={i.id === catalog.selectedId} onOpen={() => catalog.select(i.id)} />
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
              <h2 className="bst-title">Magic items</h2>
              <span className="bst-count">{catalog.filtered.length.toLocaleString('en-US')}</span>
              <span className="bst-spacer" />
              {clear}
            </div>
            {search}
            <div role="group" aria-label="Narrow to" className="bst-toggle-grid bst-toggle-grid--4">
              <Toggle label="ATTUNE" title="Needs attunement" on={attunes.selected.has('any')} onClick={() => attunes.toggle('any')} />
              <Toggle label="NO ATT." title="Needs no attunement" on={attunes.selected.has('none')} onClick={() => attunes.toggle('none')} />
              <Toggle label="CHARGES" title="Has charges" on={chargesOnly} onClick={() => setChargesOnly(c => !c)} />
              <Toggle label="CURSED" title="Carries a curse" on={cursedOnly} onClick={() => setCursedOnly(c => !c)} />
            </div>
            <nav aria-label="Rarity" className="bst-chipnav">
              {shelves.map(({ shelf, rows: onShelf }) => (
                <button
                  key={shelf.id}
                  type="button"
                  aria-label={`${shelf.label}, ${onShelf.length}`}
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
                  {onShelf.map(i => (
                    <MagicItemListRow key={i.id} item={i} selected={i.id === catalog.selectedId} onOpen={() => catalog.select(i.id)} />
                  ))}
                </section>
              ))}
          </div>
        </>
      )}

      {/* The open item over the list when there is no room beside it. */}
      {detail && !(wide && beside) && (
        <div className="bst-overlay">
          <div className="bst-detail">{detail}</div>
        </div>
      )}
    </div>
  )
}

function attuneMatches(i: MagicItemRow, attune: string): boolean {
  if (attune === 'none') return !i.requiresAttunement
  if (attune === 'any') return i.requiresAttunement
  return i.requiresAttunement && !!i.attunementRestriction
}

function Toggle({ label, title, on, onClick }: { label: string; title: string; on: boolean; onClick(): void }) {
  return (
    <button type="button" aria-pressed={on} title={title} className="bst-plain bst-toggle" onClick={onClick}>
      {label}
    </button>
  )
}

function Dot({ shelf, large = false, small = false }: { shelf: RarityShelf; large?: boolean; small?: boolean }) {
  const size = large ? ' bst-dot--lg' : small ? ' bst-dot--sm' : ''
  return <span aria-hidden="true" className={`bst-dot${size} bst-dot--r-${shelf.tone}`} />
}

const countLabel = (shown: number, total: number): string =>
  shown === total
    ? `${total.toLocaleString('en-US')} items`
    : `${shown.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} items`
