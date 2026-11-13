import type { ReactNode } from 'react'

import type { Page } from '../model/filter'
import { Icon } from './Icon'

/**
 * The catalog toolbar's controls.
 *
 * **Obsidian owns how a control looks; these own where it sits.** `input`,
 * `select.dropdown`, `button` and `input[type=checkbox]` are already styled by
 * the app — background, border, radius, focus ring, hover, and the active
 * theme's accent — so the classes added here are layout only. Restyling them
 * would be the one part of the plugin that ignores the vault's theme, which is
 * exactly what ADR 0001 decided against.
 *
 * It also means every utility written here is `!important` (Tailwind's
 * `important: '.my-dnd-vault'`), so a colour utility on a native control does not
 * lose politely to Obsidian's rule — it wins, silently, in every theme.
 */

export function SearchField({
  value,
  onChange,
  onClear,
  placeholder,
}: {
  value: string
  onChange(value: string): void
  onClear(): void
  placeholder: string
}) {
  return (
    <div className="relative flex items-center">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-60 pr-7"
        spellCheck={false}
      />
      {value !== '' && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          // `clickable-icon` is Obsidian's own icon-button class. Positioned over
          // the input's right edge rather than beside it, so clearing the box
          // does not change the toolbar's width.
          className="clickable-icon absolute right-1"
        >
          <Icon name="x" />
        </button>
      )}
    </div>
  )
}

export interface ChipOption {
  value: string
  label: string
  count?: number
}

/**
 * A row of filter chips, with the count as part of each label (`General 197`)
 * rather than a badge beside it — VAULT-86's choice, kept.
 *
 * Multi-select is the default and single-select is a prop, because that is how
 * the pages actually divide: spells take several levels at once, feats take one
 * kind. Clicking a selected chip clears it either way, which is the only route
 * back to "all" on a row with no `All` chip.
 */
export function ChipFilter({
  label,
  options,
  selected,
  onToggle,
  onClear,
  allLabel,
}: {
  label: string
  options: ChipOption[]
  selected: ReadonlySet<string>
  onToggle(value: string): void
  onClear?(): void
  /** Shows a leading chip that clears the row — `All 1,785`. */
  allLabel?: string
}) {
  if (options.length === 0) return null

  return (
    <div className="flex items-baseline gap-2">
      <span className="w-20 shrink-0 pt-0.5 text-smallest uppercase tracking-wider text-faint">
        {label}
      </span>
      {/* `min-w-0 flex-1`, or this box is never narrower than its chips laid end
          to end — it overflows the pane instead of wrapping (MYDND-19). */}
      <div className="flex min-w-0 flex-1 flex-wrap gap-1">
        {allLabel && onClear && (
          <Chip selected={selected.size === 0} onClick={onClear}>
            {allLabel}
          </Chip>
        )}
        {options.map(option => (
          <Chip
            key={option.value}
            selected={selected.has(option.value)}
            onClick={() => onToggle(option.value)}
          >
            {option.label}
            {option.count != null && (
              <span className="ml-1 tabular-nums opacity-60">{option.count}</span>
            )}
          </Chip>
        ))}
      </div>
    </div>
  )
}

export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick(): void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={selected ? 'chip-filter-selected' : 'chip-filter'}
    >
      {children}
    </button>
  )
}

/**
 * A `select.dropdown` — Obsidian's own, so it opens as a native menu in the
 * theme's colours.
 *
 * Used where a chip row would be unreadable. The spell catalog spans 25 source
 * books; twenty-five chips is not a filter, it is a wall.
 */
export function Dropdown({
  value,
  onChange,
  options,
  placeholder,
  title,
}: {
  value: string
  onChange(value: string): void
  options: ChipOption[]
  /** Shown as the first, empty option — `All sources`. */
  placeholder: string
  title?: string
}) {
  return (
    <select
      className="dropdown"
      value={value}
      title={title ?? placeholder}
      aria-label={title ?? placeholder}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
          {option.count != null ? ` (${option.count})` : ''}
        </option>
      ))}
    </select>
  )
}

export function Toggle({
  label,
  checked,
  onChange,
  ariaLabel,
}: {
  label: string
  checked: boolean
  onChange(checked: boolean): void
  /**
   * The accessible name when `label` is empty — which is how a settings row
   * uses this, having already drawn the name itself. Without it the checkbox
   * has no name at all, and `getByLabelText` cannot find it either.
   */
  ariaLabel?: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-ui-smaller text-muted">
      <input
        type="checkbox"
        checked={checked}
        aria-label={label === '' ? ariaLabel : undefined}
        onChange={e => onChange(e.target.checked)}
      />
      {label}
    </label>
  )
}

/**
 * Pagination. First / previous / next / last, plus the range in words.
 *
 * `the-vault` uses MUI's numbered `Pagination`, which needs room for nine page
 * buttons; a 380px pane does not have it. The range text is what people actually
 * read off it, and search is how anyone reaches page 20 of 36.
 */
export function Pager<R>({
  page,
  onGo,
  noun,
}: {
  page: Page<R>
  onGo(page: number): void
  noun: string
}) {
  const { page: current, totalPages, first, last, total } = page

  return (
    <div className="flex items-center justify-between gap-2 border-t border-background-modifier-border px-3 py-1.5">
      <span className="text-smaller tabular-nums text-muted">
        {total === 0 ? `No ${noun}` : `${first.toLocaleString()}–${last.toLocaleString()} of ${total.toLocaleString()}`}
      </span>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <PagerButton icon="chevrons-left" label="First page" disabled={current === 1} onClick={() => onGo(1)} />
          <PagerButton icon="chevron-left" label="Previous page" disabled={current === 1} onClick={() => onGo(current - 1)} />
          <span className="px-1 text-smaller tabular-nums text-muted">
            {current} / {totalPages}
          </span>
          <PagerButton icon="chevron-right" label="Next page" disabled={current === totalPages} onClick={() => onGo(current + 1)} />
          <PagerButton icon="chevrons-right" label="Last page" disabled={current === totalPages} onClick={() => onGo(totalPages)} />
        </div>
      )}
    </div>
  )
}

function PagerButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: string
  label: string
  disabled: boolean
  onClick(): void
}) {
  return (
    <button
      type="button"
      className="clickable-icon"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} />
    </button>
  )
}

/**
 * What a catalog shows when it has nothing to show — and **why**, which is the
 * whole value of it here.
 *
 * Three of the six catalogs have no notes in any vault yet, because their
 * exporter has not been written. "No feats match the current filters" would be a
 * lie; "this vault has no `feats/` folder" sends you to the right place.
 */
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-6 py-12 text-center">
      <p className="text-ui-medium text-muted">{title}</p>
      {children && <p className="max-w-md text-smaller text-faint">{children}</p>}
    </div>
  )
}
