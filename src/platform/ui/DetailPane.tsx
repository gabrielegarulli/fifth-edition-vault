import type { ReactNode } from 'react'

import { openNote, useObsidian } from '../obsidian/ObsidianContext'
import { Icon } from './Icon'
import { Markdown } from './Markdown'
import { stripPreamble } from '../model/preamble'

/**
 * The detail view's frame: a title bar that can open the real note, and a body
 * that scrolls on its own.
 *
 * **"Open note" is the single most Obsidian-native thing in this plugin.** The
 * catalog is a browser over notes that already exist, so the detail view never
 * has to be the final word — it can hand you the note, where backlinks, the graph,
 * local search, tags and your own added prose are all waiting. `the-vault`'s
 * drawers have no equivalent because there is nothing behind them but a row.
 */
export function DetailPane({
  title,
  subtitle,
  path,
  onClose,
  children,
}: {
  title: string
  subtitle?: ReactNode
  /** Vault path of the note this detail came from. */
  path: string
  /** Absent where there is nothing to close back to — the spell window (MYDND-60). */
  onClose?(): void
  children: ReactNode
}) {
  const app = useObsidian()

  return (
    <>
      <div className="flex shrink-0 items-start gap-2 border-b border-background-modifier-border px-3 py-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-ui-medium font-semibold text-normal">{title}</h3>
          {subtitle && <div className="mt-0.5 text-smaller text-muted">{subtitle}</div>}
        </div>
        <button
          type="button"
          className="clickable-icon"
          aria-label="Open note"
          title="Open note in a new tab"
          onClick={() => openNote(app, path)}
        >
          <Icon name="file-symlink" />
        </button>
        {onClose && (
          <button type="button" className="clickable-icon" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        )}
      </div>

      <div className="my-dnd-vault__scroll px-3 py-2.5">{children}</div>
    </>
  )
}

/** A labelled line of the detail view — `Casting Time    1 action`. */
export function PropRow({ label, value }: { label: string; value: ReactNode }) {
  if (value == null || value === '' || value === '—') return null
  return (
    <div className="flex gap-2 py-0.5">
      <span className="w-28 shrink-0 text-smaller text-muted">{label}</span>
      <span className="min-w-0 flex-1 text-smaller text-normal">{value}</span>
    </div>
  )
}

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mt-3 border-t border-background-modifier-border pt-2.5 first:mt-0 first:border-none first:pt-0">
      {title && (
        <h4 className="mb-1 text-smallest uppercase tracking-wider text-faint">{title}</h4>
      )}
      {children}
    </section>
  )
}

/**
 * A note's prose, with the exporter's restatement of its own frontmatter removed
 * — see `platform/model/preamble.ts`. Renders nothing at all when the note is only a
 * fence, which is every one of the 335 bestiary notes.
 */
export function Prose({ prose, path }: { prose: string; path: string }) {
  const body = stripPreamble(prose)
  if (!body) return null
  return <Markdown markdown={body} sourcePath={path} className="text-smaller" />
}

/**
 * Shown while a detail loads. One file read, so this is usually invisible —
 * which is the reason it is a line of text and not a spinner: a spinner that
 * flashes for 8ms reads as a glitch.
 */
export function DetailLoading() {
  return <p className="px-3 py-6 text-center text-smaller text-faint">Reading the note…</p>
}
