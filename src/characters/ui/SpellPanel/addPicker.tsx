import { useState } from 'react'
import { LEVEL_LABEL } from '@vault/derive/spellUtils.js'

import { useCompendium } from '../../../compendium/host'
import type { SpellRow } from '../../../compendium'
import { useCatalogRows, Icon } from '../../../platform/host'

import { PLAIN_BUTTON } from './shared'
import { SpellLine } from './spellLine'

// Adding a spell to a Vault character, and removing one.
// One file of the sheet's spell panel (MYDND-197); index.ts says what the panel is.

export function AddButton({
  open,
  busy,
  label = 'Add',
  onToggle,
}: {
  open: boolean
  busy: boolean
  label?: string
  onToggle(): void
}) {
  return (
    <button type="button" className="btn-ui-link h-auto" disabled={busy} onClick={onToggle} aria-expanded={open}>
      {open ? 'Close' : `+ ${label}`}
    </button>
  )
}

export function RemoveButton({ name, busy, onRemove }: { name: string; busy: boolean; onRemove(): void }) {
  return (
    <button
      type="button"
      className={`${PLAIN_BUTTON} text-faint`}
      disabled={busy}
      aria-label={`Remove ${name}`}
      title={`Remove ${name}`}
      onClick={onRemove}
    >
      <Icon name="x" />
    </button>
  )
}

/** How many candidates to draw at once — a class list at one level is rarely more. */
const PICKER_LIMIT = 40

/**
 * The spells a character may add at one level: their classes' lists — and
 * Magical Secrets' extra lists, for levelled spells only — less what they know.
 */
export function AddPicker({
  level,
  classNames,
  known,
  busy,
  onAdd,
}: {
  level: number
  classNames: string[]
  known: ReadonlySet<string>
  busy: boolean
  onAdd(row: SpellRow): void
}) {
  const compendium = useCompendium()
  const [query, setQuery] = useState('')
  const listKey = classNames.join('\u0001')
  const all = useCatalogRows(() => compendium.spells.forClasses(listKey ? listKey.split('\u0001') : []))
  const q = query.trim().toLowerCase()
  const candidates = all.filter(s => s.level === level && !known.has(s.id) && (!q || s.name.toLowerCase().includes(q)))

  return (
    <div className="flex flex-col gap-1 border-b border-background-modifier-border bg-background-primary p-2">
      <input
        type="search"
        value={query}
        placeholder={`Search ${level === 0 ? 'cantrips' : `${LEVEL_LABEL(level) as string} spells`}…`}
        aria-label="Search spells to add"
        onChange={e => setQuery(e.target.value)}
      />
      {candidates.length === 0 ? (
        <span className="text-smaller text-faint">
          {classNames.length === 0
            ? 'No casting class to take spells from.'
            : `Nothing left on the ${classNames.join(' / ')} list at this level.`}
        </span>
      ) : null}
      <div className="flex max-h-72 flex-col overflow-y-auto">
        {candidates.slice(0, PICKER_LIMIT).map(row => (
          <SpellLine key={row.id} name={row.name} row={row}>
            <button type="button" className="btn-ui-link h-auto" disabled={busy} onClick={() => onAdd(row)}>
              Add
            </button>
          </SpellLine>
        ))}
      </div>
      {candidates.length > PICKER_LIMIT ? (
        <span className="text-smallest text-faint">
          {candidates.length - PICKER_LIMIT} more — narrow the search.
        </span>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Granted and free-cast spells
// ---------------------------------------------------------------------------
