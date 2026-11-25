import { useId, useRef, useState } from 'react'

import { PUBLIC_REPO } from '../../platform'
import { readDdbFile, type DdbFile } from '../model/file'

/**
 * Where the steps for saving a character's file are written (MYDND-257): the
 * public edition's README. The plugin names no D&D Beyond address itself, so
 * the bundle check's "no server" rule holds as it stands.
 */
export const FILE_HELP_URL = `https://github.com/${PUBLIC_REPO}#bringing-a-character-from-dd-beyond`

/**
 * A button that opens the system's file dialog and reads the picked file as a
 * D&D Beyond character. Nothing is written: `onFile` gets the character, or
 * the reason the file is not one is shown beside the button.
 *
 * The `<input type="file">` is the real control, visually hidden, with the
 * button as its face, so the dialog is the platform's own.
 */
export function FilePicker({
  label = 'Import from a file',
  onFile,
  className = 'bst-plain bst-btn-secondary',
}: {
  label?: string
  onFile: (file: DdbFile) => void
  className?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const errorId = useId()

  const read = async (picked: File | undefined): Promise<void> => {
    if (!picked) return
    setReading(true)
    setError(null)
    try {
      onFile(readDdbFile(await picked.text()))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setReading(false)
      // The same file picked again must fire `change` again.
      if (input.current) input.current.value = ''
    }
  }

  return (
    <span className="bst-file-pick">
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        className="bst-visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={e => void read(e.target.files?.[0])}
      />
      <button
        type="button"
        className={className}
        disabled={reading}
        aria-describedby={error ? errorId : undefined}
        onClick={() => input.current?.click()}
      >
        {reading ? 'Reading…' : label}
      </button>
      {/* `_blank`: Electron hands it to the system browser rather than navigating the pane. */}
      <a className="bst-link" href={FILE_HELP_URL} target="_blank" rel="noopener noreferrer">
        How to save the file
      </a>
      {error ? (
        <span id={errorId} role="alert" className="bst-note bst-note--warn">
          {error}
        </span>
      ) : null}
    </span>
  )
}
