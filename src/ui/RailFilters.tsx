import { useId, useRef, useState, type ReactNode } from 'react'

import type { FacetSet } from '../hooks/useFacetSet'

import { Icon } from './Icon'

/**
 * A filter on a catalog's rail, which folds away (MYDND-163). Every one starts
 * open, and none is remembered: which filters are out of the way is tonight's
 * question, like the lens's party.
 *
 * **`active` is what a folded filter is still doing.** It keeps filtering once it
 * is out of sight, so its heading says so; otherwise a short list has no visible
 * reason. Open, the ticks say it themselves.
 */
export function FilterGroup({
  title,
  className = '',
  active = 0,
  children,
}: {
  title: string
  /** A spacing modifier: `bst-group--has`, `bst-group--tight`, `bst-group--levels`. */
  className?: string
  /** How many of its options are on. */
  active?: number
  children: ReactNode
}) {
  const [open, setOpen] = useState(true)
  const body = useId()
  return (
    <section className={`bst-group ${className}`.trimEnd()}>
      <h3 className="bst-label">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? body : undefined}
          onClick={() => setOpen(o => !o)}
          className="bst-plain bst-fold"
        >
          <span className="bst-spacer">{title}</span>{' '}
          {!open && active > 0 ? <span className="bst-fold-on">{`${active} on`}</span> : null}
          <Icon name="chevron-down" className="bst-fold-icon" />
        </button>
      </h3>
      {open ? (
        <div id={body} className="bst-fold-body">
          {children}
        </div>
      ) : null}
    </section>
  )
}

/**
 * One option: a checkbox, its label in full, and how many it would show. The
 * space is the input's name: "Strength 77", where a flex gap alone gives
 * "Strength77".
 */
export function Check({ label, count, checked, onChange }: { label: string; count: number; checked: boolean; onChange(checked: boolean): void }) {
  return (
    <label className="bst-check">
      <input type="checkbox" className="bst-checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="bst-check-label">{label}</span>{' '}
      <span className="bst-tier-count">{count.toLocaleString('en-US')}</span>
    </label>
  )
}

/** One selected filter, as the page's header shows it. */
export interface ActiveFilter {
  key: string
  label: string
  remove(): void
}

/** A facet's ticks, each named `Group: value`. */
export const facetFilters = (group: string, facet: FacetSet, label: (value: string) => string = value => value): ActiveFilter[] =>
  [...facet.selected].map(value => ({ key: `${group}:${value}`, label: `${group}: ${label(value)}`, remove: () => facet.toggle(value) }))

/** A single on-or-off filter. */
export const flagFilter = (label: string, on: boolean, remove: () => void): ActiveFilter[] => (on ? [{ key: label, label, remove }] : [])

/**
 * What is narrowing the list, beside the page's title (MYDND-163). Each one takes
 * itself off, and the last chip, in red, takes them all.
 *
 * **`onClear` is its own prop, not "there are chips".** Search text counts as a
 * filter and has no chip, so Clear filters can be the only chip here.
 *
 * **Focus lands on the group.** A removed chip takes the focus with it, which
 * would send a keyboard user back to the top of the page, so the group stays in
 * the DOM with nothing in it.
 */
export function ActiveFilters({ filters, onClear }: { filters: readonly ActiveFilter[]; onClear: (() => void) | null }) {
  const group = useRef<HTMLDivElement | null>(null)
  return (
    <div ref={group} role="group" aria-label="Selected filters" tabIndex={-1} className="bst-active">
      {filters.map(f => (
        <button
          key={f.key}
          type="button"
          aria-label={`Remove filter ${f.label}`}
          onClick={() => {
            f.remove()
            group.current?.focus()
          }}
          className="bst-plain bst-active-chip"
        >
          <span>{f.label}</span>
          <Icon name="x" className="bst-active-x" />
        </button>
      ))}
      {onClear ? (
        <button
          type="button"
          onClick={() => {
            onClear()
            group.current?.focus()
          }}
          className="bst-plain bst-active-chip bst-active-chip--clear"
        >
          <span>Clear filters</span>
          <Icon name="x" className="bst-active-x" />
        </button>
      ) : null}
    </div>
  )
}
