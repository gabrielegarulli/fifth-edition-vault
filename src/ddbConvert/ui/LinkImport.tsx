import { useId, useState } from 'react'

import { convertPath } from '../../platform'
import { useGo } from '../../platform/host'
import { extractDdbId } from '../model/fetch'

/**
 * The roster's "Import a character" (MYDND-105): paste a D&D Beyond link or
 * id, and the conversion review opens on it. The review fetches; nothing is
 * written until its Convert. The characters domain's `LinkImport` slot, filled
 * wherever the host can fetch — both plugin editions since MYDND-295, never the
 * web build.
 *
 * It asks inline rather than opening Obsidian's modal: the pane is open, and a
 * field in it is one less layer. The full edition's command still opens the
 * modal, which is the right shape when the pane is not open.
 *
 * It says that it reaches D&D Beyond before anything is sent, because the
 * request is this edition's only one besides the update check.
 */
export function LinkImport() {
  const go = useGo()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const errorId = useId()
  const noteId = useId()

  if (!open) {
    return (
      <button type="button" className="bst-plain bst-btn-secondary" onClick={() => setOpen(true)}>
        Import a character
      </button>
    )
  }

  const submit = (): void => {
    const id = extractDdbId(value.trim())
    if (!id) {
      setError('That does not look like a D&D Beyond character link or id.')
      return
    }
    go(convertPath(id))
  }

  const close = (): void => {
    setOpen(false)
    setError(null)
  }

  return (
    <div className="bst-import">
      <input
        type="text"
        value={value}
        autoFocus
        aria-label="D&D Beyond link or id"
        aria-describedby={error ? `${noteId} ${errorId}` : noteId}
        aria-invalid={error ? true : undefined}
        onChange={e => {
          setValue(e.target.value)
          setError(null)
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') close()
        }}
        placeholder="D&D Beyond link or id"
        className="bst-input"
      />
      <button type="button" className="bst-plain bst-btn-secondary" disabled={value.trim() === ''} onClick={submit}>
        Import
      </button>
      <button type="button" className="bst-plain bst-btn-ghost" onClick={close}>
        Cancel
      </button>
      <span id={noteId} className="bst-note">
        Fetches the character from D&D Beyond. The sheet must be public (Share → Anyone with the link).
      </span>
      {error ? (
        <span id={errorId} role="alert" className="bst-note bst-note--warn">
          {error}
        </span>
      ) : null}
    </div>
  )
}
