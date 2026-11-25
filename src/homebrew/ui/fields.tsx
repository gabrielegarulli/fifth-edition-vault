import { useId, type ReactNode } from 'react'

/**
 * The builders' form controls (MYDND-233), on the Character Builder's `.bst`
 * classes: a label above every input, the input named by it, a hint tied to
 * it with `aria-describedby`. Every control starts from `.bst-plain`.
 */

export function TextField({
  label,
  value,
  onChange,
  hint,
  placeholder,
  list,
  mono,
  inputMode,
  readOnly,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: ReactNode
  placeholder?: string
  /** A `<datalist>`'s id, for suggestions. */
  list?: string
  mono?: boolean
  inputMode?: 'numeric' | 'decimal' | 'text'
  /** Shown and focusable, not editable: Edit's locked name (MYDND-272). */
  readOnly?: boolean
}) {
  const id = useId()
  return (
    <div className="bst-field">
      <label className="bst-field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={`bst-plain bst-input bst-nb-input${mono ? ' bst-nb-mono' : ''}`}
        value={value}
        placeholder={placeholder}
        list={list}
        inputMode={inputMode}
        readOnly={readOnly}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={e => onChange(e.target.value)}
      />
      {hint ? (
        <p id={`${id}-hint`} className="bst-nb-hint">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function TextArea({
  label,
  value,
  onChange,
  hint,
  rows = 4,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: ReactNode
  rows?: number
}) {
  const id = useId()
  return (
    <div className="bst-field">
      <label className="bst-field-label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className="bst-plain bst-input bst-cb-textarea bst-nb-input"
        rows={rows}
        value={value}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={e => onChange(e.target.value)}
      />
      {hint ? (
        <p id={`${id}-hint`} className="bst-nb-hint">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function SelectField<V extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: V
  onChange: (value: V) => void
  options: ReadonlyArray<V | { value: V; label: string }>
}) {
  const id = useId()
  return (
    <div className="bst-field">
      <label className="bst-field-label" htmlFor={id}>
        {label}
      </label>
      <select id={id} className="bst-plain bst-select bst-nb-input" value={value} onChange={e => onChange(e.target.value as V)}>
        {options.map(o => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label || '—'}
            </option>
          )
        })}
      </select>
    </div>
  )
}

export function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="bst-check bst-nb-check">
      <input type="checkbox" className="bst-checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

/**
 * A set of toggles, each a pressed button: the kind of a feat, the scores an
 * increase may raise, a weapon's properties. `single` makes it a choice of one.
 */
export function ChipGroup<V extends string>({
  label,
  options,
  selected,
  onChange,
  single,
}: {
  label: string
  options: ReadonlyArray<{ value: V; label: string }>
  selected: readonly V[]
  onChange: (selected: V[]) => void
  single?: boolean
}) {
  const toggle = (v: V) => {
    if (single) onChange([v])
    else onChange(selected.includes(v) ? selected.filter(s => s !== v) : options.map(o => o.value).filter(o => o === v || selected.includes(o)))
  }
  return (
    <fieldset className="bst-nb-fieldset">
      <legend className="bst-field-label">{label}</legend>
      <div className="bst-nb-chips">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            className="bst-plain bst-nb-chip"
            aria-pressed={selected.includes(o.value)}
            onClick={() => toggle(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

/**
 * A list of names typed one at a time, each removable: a spell's classes, the
 * spells a magic item casts. `suggestions` fills a `<datalist>`, so a name
 * from the vault is one keystroke away and a new one is still allowed.
 */
export function NameList({
  label,
  values,
  onChange,
  suggestions,
  hint,
  addLabel,
}: {
  label: string
  values: readonly string[]
  onChange: (values: string[]) => void
  suggestions: readonly string[]
  hint?: ReactNode
  addLabel: string
}) {
  const id = useId()
  const add = (input: HTMLInputElement) => {
    const name = input.value.trim()
    if (name && !values.some(v => v.toLowerCase() === name.toLowerCase())) onChange([...values, name])
    input.value = ''
  }
  return (
    <div className="bst-field">
      <label className="bst-field-label" htmlFor={id}>
        {label}
      </label>
      {values.length > 0 ? (
        <ul className="bst-nb-chips" aria-label={label}>
          {values.map(v => (
            <li key={v}>
              <button type="button" className="bst-plain bst-nb-chip" aria-pressed="true" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter(x => x !== v))}>
                {v} <span aria-hidden="true">✕</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="bst-nb-row">
        <input
          id={id}
          className="bst-plain bst-input bst-nb-input"
          list={`${id}-list`}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(e.currentTarget)
            }
          }}
        />
        <button
          type="button"
          className="bst-plain bst-btn-secondary bst-btn-sm"
          onClick={e => {
            const input = e.currentTarget.parentElement?.querySelector('input')
            if (input) add(input)
          }}
        >
          {addLabel}
        </button>
      </div>
      <datalist id={`${id}-list`}>
        {suggestions.map(s => (
          <option key={s} value={s} />
        ))}
      </datalist>
      {hint ? (
        <p id={`${id}-hint`} className="bst-nb-hint">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
