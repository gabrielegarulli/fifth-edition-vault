import { useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'

import { sourceLabel, sourceMatches } from '../catalog/sourceNames'
import type { FacetSet } from '../hooks/useFacetSet'

import { Icon } from './Icon'

/**
 * Sources as one control, on every catalog with a book to filter by: a dropdown
 * you type in and tick several from (MYDND-163). Spells' list of checkboxes ran to
 * 34. Its heading does not fold, unlike the filters below it: closed, this is one
 * line already.
 *
 * It is the WAI-ARIA editable combobox over a multi-select listbox, so a keyboard
 * and a screen reader get what a mouse does: Down and Up move, Enter ticks, Escape
 * closes, and the list stays open through a tick so a second book is one key away.
 *
 * **The panel is positioned inside the rail, not against the window**, which is
 * invariant 4: it is `absolute` in this box, and the rail's own scroller grows to
 * hold it. **Moving through the list sets the list's `scrollTop`**, never
 * `scrollIntoView`, which would scroll the pane too.
 *
 * Focus never leaves the input while the list is used: a row cancels its
 * `mousedown`, and the list takes `tabIndex` so clicking its scrollbar is not a
 * blur that closes it, then hands the focus straight back so typing still works.
 */
export function SourcePicker({ options, sources }: { options: ReadonlyArray<readonly [string, number]>; sources: FacetSet }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(-1)
  const id = useId()
  const input = useRef<HTMLInputElement | null>(null)
  const list = useRef<HTMLUListElement | null>(null)

  const shown = options.filter(([key]) => sourceMatches(query, key))
  const picked = sources.selected.size

  const close = () => {
    setOpen(false)
    setQuery('')
    setActive(-1)
  }

  const move = (to: number) => {
    setOpen(true)
    setActive(to)
    const box = list.current
    const row = box?.children[to] as HTMLElement | undefined
    if (!box || !row) return
    if (row.offsetTop < box.scrollTop) box.scrollTop = row.offsetTop
    else if (row.offsetTop + row.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = row.offsetTop + row.offsetHeight - box.clientHeight
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (shown.length === 0) return
      const step = e.key === 'ArrowDown' ? 1 : -1
      move(active === -1 && step === -1 ? shown.length - 1 : (active + step + shown.length) % shown.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && shown[active]) sources.toggle(shown[active][0])
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation()
      close()
    }
  }

  // Tab, or a click anywhere else. A move inside this box is not leaving it.
  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget)) close()
  }

  return (
    <section className="bst-group">
      <h3 id={`${id}-label`} className="bst-label">
        Sources
      </h3>
      <div className="bst-picker" onBlur={onBlur}>
        <div className="bst-picker-field">
          <input
            ref={input}
            type="text"
            role="combobox"
            aria-labelledby={`${id}-label`}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={open ? `${id}-list` : undefined}
            aria-activedescendant={open && shown[active] ? `${id}-${active}` : undefined}
            autoComplete="off"
            value={query}
            placeholder={picked > 0 ? `${picked} selected` : `All ${options.length} sources`}
            onChange={e => {
              setQuery(e.target.value)
              setOpen(true)
              setActive(e.target.value ? 0 : -1)
              if (list.current) list.current.scrollTop = 0
            }}
            onClick={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="bst-picker-input"
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={open ? 'Hide sources' : 'Show sources'}
            onMouseDown={e => e.preventDefault()}
            onClick={() => {
              if (open) close()
              else {
                setOpen(true)
                input.current?.focus()
              }
            }}
            className="bst-plain bst-picker-toggle"
          >
            <Icon name="chevron-down" />
          </button>
        </div>

        {open ? (
          <div className="bst-picker-panel">
            <ul
              ref={list}
              id={`${id}-list`}
              role="listbox"
              aria-multiselectable="true"
              aria-labelledby={`${id}-label`}
              tabIndex={-1}
              onFocus={() => input.current?.focus()}
              className="bst-picker-list"
            >
              {shown.map(([key, count], i) => (
                <li
                  key={key}
                  id={`${id}-${i}`}
                  role="option"
                  aria-selected={sources.selected.has(key)}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => sources.toggle(key)}
                  className={i === active ? 'bst-picker-opt bst-picker-opt--active' : 'bst-picker-opt'}
                >
                  <span aria-hidden="true" className="bst-picker-box" />
                  <span className="bst-check-label">{sourceLabel(key)}</span>{' '}
                  <span className="bst-tier-count">{count.toLocaleString('en-US')}</span>
                </li>
              ))}
            </ul>
            {shown.length === 0 ? <p className="bst-picker-empty">No source matches</p> : null}
            <span role="status" className="bst-sr">
              {`${shown.length} of ${options.length} sources`}
            </span>
          </div>
        ) : null}
      </div>
    </section>
  )
}
