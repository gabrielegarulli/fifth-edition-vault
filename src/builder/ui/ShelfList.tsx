import { useId, useState, type ReactNode } from 'react'

import { booksInPlay, searchShelfRows, shelvesBySource, sourceLabel, type Shelf, type ShelfRow } from '../../compendium'
import { useSourcesOff } from '../../platform/host'

export interface ListRow extends ShelfRow {
  id: string
}

/**
 * A pickable list grouped by book (MYDND-216): a search box, *Collapse all /
 * Expand all*, then one collapsible shelf per `shelvesBySource` shelf, each with
 * its count, and a row per option. The Class and Species steps both use it, and
 * it replaces the grouped `<select>` they had.
 *
 * A single shelf (the SRD edition) draws no header: one heading over everything
 * says nothing. The books the active campaign turned off are not on it
 * (`sources_off`, MYDND-219), except a row named in `keep`, and a line under
 * the search says how many are hidden so an empty shelf is never a mystery. Shelves are open until closed; a search shows every match,
 * whatever was closed, because a hidden match reads as no match.
 */
export function ShelfList<R extends ListRow>({
  noun,
  rows,
  onOpen,
  tools,
  hideShelf,
  keep,
}: {
  /** "class", "species": the search box's name and the empty message. */
  noun: string
  rows: readonly R[]
  /** A row was pressed; the element is where focus goes back to. */
  onOpen: (row: R, from: HTMLElement) => void
  /** Extra controls on the tool row, e.g. the legacy switch. */
  tools?: ReactNode
  /** Leave a shelf out, e.g. Legacy while the switch is off. */
  hideShelf?: (shelf: Shelf<R>) => boolean
  /** Ids that stay listed whatever the campaign turned off: the current pick. */
  keep?: ReadonlyArray<string | null | undefined>
}) {
  const [query, setQuery] = useState('')
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set())
  const baseId = useId()
  const off = useSourcesOff()
  const playable = booksInPlay(rows, off, keep)
  const hiddenBooks = new Set(rows.filter(r => !playable.includes(r)).map(r => r.source)).size
  const shelves = shelvesBySource(searchShelfRows(playable, query)).filter(s => !hideShelf?.(s))
  const searching = query.trim().length > 0
  const single = shelves.length === 1

  return (
    <div className="bst-cb-shelves">
      <div className="bst-cb-search">
        <SearchIcon />
        <input
          type="search"
          aria-label={`Search ${noun === 'species' ? 'species' : `${noun}es`}`}
          placeholder={`Search ${noun === 'species' ? 'species' : `${noun}es`}…`}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') setQuery('')
          }}
          className="bst-input"
        />
      </div>
      {hiddenBooks > 0 ? (
        <p className="bst-note">
          {hiddenBooks === 1 ? '1 book is' : `${hiddenBooks} books are`} turned off for this campaign, in Settings.
        </p>
      ) : null}
      <div className="bst-cb-toolrow">
        {tools}
        {single ? null : (
          <span className="bst-cb-toolrow-end">
            <button type="button" className="bst-plain bst-cb-link" onClick={() => setClosed(new Set(shelves.map(s => s.id)))}>
              Collapse all
            </button>
            <button type="button" className="bst-plain bst-cb-link" onClick={() => setClosed(new Set())}>
              Expand all
            </button>
          </span>
        )}
      </div>
      {shelves.length === 0 ? (
        <p className="bst-cb-empty">
          {rows.length === 0
            ? `No ${noun} notes in this vault.`
            : playable.length === 0
              ? `Every book with a ${noun} is turned off for this campaign.`
              : `No ${noun} matches “${query}”.`}
        </p>
      ) : (
        shelves.map(shelf => {
          const open = single || searching || !closed.has(shelf.id)
          const listId = `${baseId}-${shelf.id}`
          return (
            <section key={shelf.id} className="bst-cb-shelf" aria-label={single ? undefined : shelf.label}>
              {single ? null : (
                <h4 className="bst-cb-shelf-h">
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={open ? listId : undefined}
                    className="bst-plain bst-cb-shelf-btn"
                    onClick={() =>
                      setClosed(c => {
                        const next = new Set(c)
                        if (next.has(shelf.id)) next.delete(shelf.id)
                        else next.add(shelf.id)
                        return next
                      })
                    }
                  >
                    <span className="bst-cb-shelf-t">{shelf.label}</span>
                    <span className="bst-cb-shelf-n">
                      <span className="bst-cb-sr">, </span>
                      {shelf.rows.length} {shelf.rows.length === 1 ? 'option' : 'options'}
                    </span>
                    <Chevron open={open} />
                  </button>
                </h4>
              )}
              {open ? (
                <ul id={listId} className="bst-cb-rows">
                  {shelf.rows.map(r => (
                    <li key={r.id}>
                      <button type="button" className="bst-plain bst-cb-row" onClick={e => onOpen(r, e.currentTarget)}>
                        <Initial name={r.name} />
                        <span className="bst-cb-row-text">
                          <span className="bst-cb-row-name">{r.name}</span>
                          <span className="bst-cb-row-book">
                            <span className="bst-cb-sr">, </span>
                            {r.source ? sourceLabel(r.source) : 'No book named'}
                          </span>
                        </span>
                        <Chevron open={false} side />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          )
        })
      )}
    </div>
  )
}

/**
 * A class's or species' tile: its initial on one of six tints, picked by name so
 * a row keeps its colour. The vault has no class icons (MYDND-216 kept the
 * initial rather than exporting art).
 */
export function Initial({ name, large = false }: { name: string; large?: boolean }) {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return (
    <span aria-hidden="true" className={`bst-cb-ini bst-cb-ini--${(hash % 6) + 1}${large ? ' bst-cb-ini--lg' : ''}`}>
      {name.trim().charAt(0).toUpperCase()}
    </span>
  )
}

export function Chevron({ open, side = false }: { open: boolean; side?: boolean }) {
  const d = side ? 'M9 18l6-6-6-6' : open ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'
  return (
    <svg className="bst-cb-chev" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}
