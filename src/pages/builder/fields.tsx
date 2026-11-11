import type { ReactNode } from 'react'

import type { BuilderDraft } from '../../builder/draft'
import type { CatalogRow } from '../../content/index'

/**
 * The builder's form primitives (MYDND-24, split out for MYDND-29's pickers).
 *
 * Native `<select>` throughout: the pane is ~380px, and a native list scrolls
 * and searches by typing for free. Drawn in the canvas's `.bst` palette since
 * MYDND-87, like the rest of the builder.
 */

export type SetDraft = (update: (d: BuilderDraft) => BuilderDraft) => void

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="bst-field">
      <span className="bst-field-label">{label}</span>
      {children}
    </label>
  )
}

/** A native select, grouped by book — 100 species is unreadable as one list. */
export function SourceSelect<R extends CatalogRow>({
  label,
  rows,
  value,
  onChange,
  empty,
}: {
  label: string
  rows: readonly R[]
  value: string
  onChange(row: R | null): void
  empty: string
}) {
  const groups = new Map<string, R[]>()
  for (const r of rows) {
    const key = r.source ?? 'Other'
    groups.set(key, [...(groups.get(key) ?? []), r])
  }
  return (
    <Field label={label}>
      <select
        className="bst-select"
        aria-label={label}
        value={value}
        onChange={e => onChange(rows.find(r => r.id === e.target.value) ?? null)}
      >
        <option value="">{rows.length === 0 ? empty : 'None'}</option>
        {[...groups].map(([source, items]) => (
          <optgroup key={source} label={source}>
            {items.map(r => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </Field>
  )
}

export interface Option {
  value: string
  label: string
  disabled?: boolean
  /** The `<optgroup>` it sits under; groups keep the order they first appear in. */
  group?: string
}

function OptionRows({ options }: { options: Option[] }) {
  return options.map(o => (
    <option key={o.value} value={o.value} disabled={o.disabled}>
      {o.label}
    </option>
  ))
}

export function OptionSelect({
  label,
  value,
  options,
  onChange,
  placeholder = '—',
}: {
  label: string
  value: string
  options: Option[]
  onChange(value: string): void
  placeholder?: string
}) {
  return (
    <Field label={label}>
      <select className="bst-select" aria-label={label} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        <OptionRows options={options.filter(o => !o.group)} />
        {[...new Set(options.flatMap(o => (o.group ? [o.group] : [])))].map(group => (
          <optgroup key={group} label={group}>
            <OptionRows options={options.filter(o => o.group === group)} />
          </optgroup>
        ))}
      </select>
    </Field>
  )
}

/**
 * The options plus the current pick when it is not among them — a select that
 * cannot find its value renders as blank, hiding a choice that is still saved.
 */
export function withCurrent(rows: readonly CatalogRow[], current: { id: string; name: string } | null) {
  if (!current || rows.some(r => r.id === current.id)) return rows
  return [...rows, { id: current.id, name: current.name, source: null, path: '' } as CatalogRow]
}

/**
 * `count` selects over one pool, each refusing what the others hold — the
 * shape of every "choose N" picker (skills, expertise, invocations…).
 *
 * Returned compacted, as the web builder's `setSlot` does — the json stores a
 * list of picks, not a list with holes in it.
 */
export function SlotSelects({
  count,
  label,
  picks,
  options,
  onChange,
  disabled,
  placeholder,
}: {
  count: number
  label(index: number): string
  picks: ReadonlyArray<string | null>
  options: Option[]
  onChange(picks: string[]): void
  /** Extra refusals beyond "taken by another slot" — eligibility, a pick elsewhere. */
  disabled?(value: string, index: number): boolean
  placeholder?: string
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const current = picks[i] ?? ''
        return (
          <OptionSelect
            key={i}
            label={label(i)}
            value={current}
            placeholder={placeholder}
            options={options.map(o => ({
              ...o,
              disabled:
                o.value !== current &&
                (Boolean(o.disabled) || picks.some((p, j) => j !== i && p === o.value) || Boolean(disabled?.(o.value, i))),
            }))}
            onChange={v => {
              const next = Array.from({ length: count }, (_, j) => picks[j] ?? null)
              next[i] = v || null
              onChange(next.filter((p): p is string => Boolean(p)))
            }}
          />
        )
      })}
    </>
  )
}

/** A bordered group — one feature's question, one kit option. */
export function Section({ title, children, open }: { title: ReactNode; children: ReactNode; open?: boolean }) {
  return (
    <div className={open ? 'bst-bsection bst-bsection--open' : 'bst-bsection'}>
      <span className="bst-bsection-title">{title}</span>
      {children}
    </div>
  )
}
