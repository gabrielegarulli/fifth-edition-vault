import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

import { notePath, subfolderProblem, type NamedRow } from '../model/destination'
import type { BuiltNote } from '../model/emit'
import { BUILDER_LABEL, type BuilderKind } from '../model/kinds'
import { useHomebrew } from './context'

/**
 * Save: where the note goes, what is there, and the one write (MYDND-233,
 * ADR 0014). The folder is a subfolder of the homebrew folder, shown fixed in
 * front of the field, so a path out of it cannot be typed. A file already at
 * the path is said here, and the write refuses it again in case one appears
 * meanwhile. A name already in the catalog is a warning with a rename, never
 * a refusal: the GM may mean it.
 *
 * Held inside the page, as the Character Builder's confirm is (invariant 4):
 * `showModal()` would put it against the window and make Obsidian inert.
 */

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), [href]'

/** Tab wraps inside the dialog; the controls here are not only buttons, so `containTab` is not enough. */
function trapTab(evt: KeyboardEvent<HTMLElement>, close: () => void) {
  if (evt.key === 'Escape') {
    evt.preventDefault()
    close()
    return
  }
  if (evt.key !== 'Tab') return
  const stops = evt.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)
  const first = stops[0]
  const last = stops[stops.length - 1]
  if (!first) return
  const active = evt.currentTarget.ownerDocument.activeElement
  if (evt.shiftKey ? active === first : active === last) {
    evt.preventDefault()
    ;(evt.shiftKey ? last : first).focus()
  }
}

export function SaveDialog({
  kind,
  built,
  folder: initialFolder,
  clash,
  suggestion,
  onRename,
  onCancel,
  onSaved,
}: {
  kind: BuilderKind
  built: BuiltNote
  folder: string
  /** The catalog row the name collides with, or null. */
  clash: NamedRow | null
  suggestion: string
  onRename: (name: string) => void
  onCancel: () => void
  onSaved: (path: string, folder: string) => void
}) {
  const host = useHomebrew()
  const id = useId()
  const [folder, setFolder] = useState(initialFolder)
  const [taken, setTaken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const homebrew = host.homebrewFolder()
  const problem = homebrew === '' ? 'Set a homebrew folder in the plugin settings first: that is where every catalog looks for your notes.' : subfolderProblem(folder)
  const path = problem ? null : notePath(homebrew, folder, built.fileName)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!path) return
    let cancelled = false
    void host.exists(path).then(there => {
      if (!cancelled) setTaken(there ? path : null)
    })
    return () => {
      cancelled = true
    }
  }, [host, path])

  const isTaken = path !== null && taken === path
  const create = async () => {
    if (!path || isTaken || busy) return
    setBusy(true)
    setError(null)
    try {
      await host.create(path, built.text)
      onSaved(path, folder.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <div className="bst-cb-scrim">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="bst-cb-dialog bst-nb-dialog"
        onKeyDown={evt => trapTab(evt, onCancel)}
      >
        <div className="bst-cb-dlg-h">
          <h3 id={`${id}-title`}>Save “{built.frontmatter.title as string}”</h3>
        </div>
        <div className="bst-nb-dialog-body">
          <div className="bst-field">
            <label className="bst-field-label" htmlFor={`${id}-folder`}>
              Folder, inside your homebrew folder
            </label>
            <div className="bst-nb-prefixed">
              <span className="bst-nb-prefix" aria-hidden="true">
                {homebrew || '—'}/
              </span>
              <input
                ref={inputRef}
                id={`${id}-folder`}
                className="bst-plain bst-input bst-nb-input bst-nb-mono"
                value={folder}
                list={`${id}-folders`}
                aria-describedby={`${id}-folder-hint`}
                aria-invalid={problem !== null}
                onChange={e => setFolder(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void create()
                  }
                }}
              />
            </div>
            <datalist id={`${id}-folders`}>
              {host.subfolders().map(f => (
                <option key={f} value={f} />
              ))}
            </datalist>
            <p id={`${id}-folder-hint`} className="bst-nb-hint">
              Remembered for your next {BUILDER_LABEL[kind]}. Empty saves in “{homebrew}” itself.
            </p>
          </div>

          {problem ? (
            <p role="alert" className="bst-banner bst-banner--err">
              {problem}
            </p>
          ) : (
            <div className="bst-nb-will">
              <span className="bst-nb-hint">Will create</span>
              <code className="bst-nb-mono">{path}</code>
              {isTaken ? (
                <p role="alert" className="bst-banner bst-banner--err">
                  A file is already at {path}. A builder never writes over a note: change the name, or pick another folder.
                </p>
              ) : (
                <ul className="bst-nb-checks">
                  <li>✓ A new file: nothing is there</li>
                  <li>✓ Reads back as a {BUILDER_LABEL[kind]}, every field kept</li>
                </ul>
              )}
            </div>
          )}

          {clash ? (
            <div role="status" className="bst-banner bst-banner--warn bst-nb-col">
              <p>
                <strong>
                  “{clash.name}” is already a {BUILDER_LABEL[kind]} ({clash.path}).
                </strong>{' '}
                {clash.id === built.slug
                  ? 'Yours would have the same file name, so the catalog would list that one and hide yours.'
                  : 'A character or a link looking it up by name would find that one first.'}
              </p>
              <button type="button" className="bst-plain bst-btn-secondary bst-btn-sm bst-nb-self-start" onClick={() => onRename(suggestion)}>
                Rename to “{suggestion}”
              </button>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="bst-banner bst-banner--err">
              {error}
            </p>
          ) : null}
        </div>
        <div className="bst-nb-dialog-foot">
          <button type="button" className="bst-plain bst-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="bst-plain bst-btn-primary" disabled={!path || isTaken || busy} onClick={() => void create()}>
            {busy ? 'Creating…' : clash ? 'Create anyway' : 'Create note'}
          </button>
        </div>
      </div>
    </div>
  )
}
