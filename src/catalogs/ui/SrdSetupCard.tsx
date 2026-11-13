import { useState } from 'react'

import type { SeedReport } from '../../compendium'
import { describeSeedReport } from '../../compendium'

/** What the SRD edition's host hands Home: the bundle's notes, and how to install them (MYDND-185). */
export interface SrdNotesHost {
  /** How many notes the bundle carries. */
  notes: number
  install(onProgress?: (done: number, total: number) => void): Promise<SeedReport | null>
  openSettings(): void
}

type Status = { kind: 'idle' } | { kind: 'running'; done: number; total: number } | { kind: 'done'; report: SeedReport } | { kind: 'failed' }

/**
 * The card's first sentence, which must stay true while the card stays up: it
 * said "no rules notes yet" after a finished install (MYDND-188).
 */
function lead(status: Status): string {
  switch (status.kind) {
    case 'running':
      return 'Writing the System Reference Document 5.2.1 into this vault. Nothing of yours is overwritten.'
    case 'done':
      return 'The SRD 5.2.1 rules notes are in this vault, and the library below reads them. Installing again restores any you have deleted, and leaves the ones you have edited alone.'
    case 'failed':
      return 'The install stopped before it finished. Any notes it wrote stay where they are, and installing again writes the rest.'
    case 'idle':
      return 'This vault has no rules notes yet. The plugin carries the System Reference Document 5.2.1 and can write it into the vault: no download, and nothing of yours is overwritten.'
  }
}

/**
 * Home's first-run card in the SRD edition (MYDND-185): an empty vault is the
 * normal state of a plugin just installed from the Community list, since
 * Obsidian delivers none of the notes. It offers to install them, or to set the
 * note folders first, for a vault that is already laid out its own way.
 *
 * Shown while the library is empty, and kept up once a run has started, so the
 * card does not vanish as the counts rise mid-install.
 */
export function SrdSetupCard({ srd, total }: { srd: SrdNotesHost; total: number }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  if (total > 0 && status.kind === 'idle') return null

  const install = async () => {
    setStatus({ kind: 'running', done: 0, total: 0 })
    const report = await srd.install((done, all) => setStatus({ kind: 'running', done, total: all }))
    setStatus(report ? { kind: 'done', report } : { kind: 'failed' })
  }

  const running = status.kind === 'running'
  return (
    <section aria-label="Install the SRD 5.2.1 rules notes" className="mb-3 flex flex-col gap-2 rounded-obs-m border border-background-modifier-border p-3">
      <p className="text-smaller">{lead(status)}</p>
      <p className="flex flex-wrap gap-2">
        {/* `bst-btn-primary` is the component layer's filled button; `btn-ui-primary` is a muted nav style and read as text (MYDND-188). */}
        <button type="button" className="bst-btn-primary flex-none" disabled={running} onClick={() => void install()}>
          {`Install SRD 5.2.1 rules notes (${srd.notes.toLocaleString()} notes)`}
        </button>
        <button type="button" className="bst-btn-ghost" onClick={() => srd.openSettings()}>
          Change note folders…
        </button>
      </p>
      <p role="status" className="text-smallest text-muted">
        {status.kind === 'running'
          ? status.total > 0
            ? `Installing… ${status.done.toLocaleString()} of ${status.total.toLocaleString()}`
            : 'Installing…'
          : status.kind === 'done'
            ? describeSeedReport(status.report)
            : status.kind === 'failed'
              ? 'The notes could not be installed. The notice says why.'
              : ''}
      </p>
    </section>
  )
}
