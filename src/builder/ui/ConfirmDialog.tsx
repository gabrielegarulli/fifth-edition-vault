import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react'

import { Initial } from './ShelfList'

export interface DialogFact {
  label: string
  value: string
}

/**
 * The "is this the one?" step between a list row and the pick (MYDND-216), as
 * D&D Beyond shows a class before adding it: the name, the book, a line about
 * it, a few facts, what it brings at first level, then Cancel and the pick.
 *
 * **A real modal dialog**, held inside the pane: `role="dialog"` with
 * `aria-modal`, focus moved in on open and kept in (Tab wraps), Escape and the
 * scrim close it, and focus goes back to the row that opened it. Not a native
 * `<dialog>`: `showModal()` would put it in the top layer, against the window,
 * and make all of Obsidian inert (frame.md, MYDND-166). The scrim is absolute
 * over the builder's root, never fixed to the window (invariant 4).
 */
export function ConfirmDialog({
  title,
  name,
  book,
  pitch,
  facts,
  listTitle,
  children,
  confirmText,
  onConfirm,
  onClose,
  returnTo,
}: {
  /** The band's heading: "Add class", "Choose species". */
  title: string
  name: string
  book: string
  pitch: string | null
  facts: readonly DialogFact[]
  /** The heading over `children`, e.g. "Level 1 features". */
  listTitle: string
  children: ReactNode
  confirmText: string
  onConfirm: () => void
  onClose: () => void
  /** Where focus goes when the dialog closes: the row that opened it. */
  returnTo: HTMLElement | null
}) {
  const titleId = useId()
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    boxRef.current?.querySelector<HTMLElement>('button')?.focus()
    return () => {
      // The row may be gone (a confirmed pick swaps the list for the card); then
      // focus is left where the page put it.
      if (returnTo?.isConnected) returnTo.focus()
    }
  }, [returnTo])

  const onKeyDown = (evt: KeyboardEvent<HTMLDivElement>) => {
    if (evt.key === 'Escape') {
      evt.stopPropagation()
      onClose()
      return
    }
    if (evt.key !== 'Tab') return
    const stops = [...evt.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])')]
    const first = stops[0]
    const last = stops[stops.length - 1]
    if (!first) return
    const active = evt.currentTarget.ownerDocument.activeElement
    if (evt.shiftKey ? active === first : active === last) {
      evt.preventDefault()
      ;(evt.shiftKey ? last : first).focus()
    }
  }

  return (
    <div className="bst-cb-scrim" onClick={e => e.target === e.currentTarget && onClose()}>
      <div ref={boxRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="bst-cb-dialog" onKeyDown={onKeyDown}>
        <div className="bst-cb-dlg-h">
          <h3 id={titleId}>{title}</h3>
          <button type="button" aria-label="Close" className="bst-plain bst-cb-dlg-x" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="bst-cb-dlg-b">
          <div className="bst-cb-dlg-id">
            <div>
              <p className="bst-cb-dlg-name">{name}</p>
              <p className="bst-cb-dlg-book">{book}</p>
              {pitch ? <p className="bst-cb-dlg-pitch">{pitch}</p> : null}
            </div>
            <Initial name={name} large />
          </div>
          {facts.length > 0 ? (
            <dl className="bst-cb-facts">
              {facts.map(f => (
                <div key={f.label}>
                  <dt>{f.label}:</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <h4 className="bst-cb-sub">{listTitle}</h4>
          {children}
        </div>
        <div className="bst-cb-dlg-f">
          <button type="button" className="bst-plain bst-cb-dlg-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="bst-plain bst-cb-dlg-ok" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

/** A note's first sentence: the dialog's one-line pitch. */
export function firstSentence(prose: string): string | null {
  const para = prose
    .split(/\n\s*\n/)
    .map(p => p.replace(/^#+\s.*$/gm, '').trim())
    .find(p => p && !p.startsWith('|') && !p.startsWith('-') && !p.startsWith('>'))
  if (!para) return null
  const plain = para.replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2').replace(/[*_`]/g, '').replace(/\s+/g, ' ')
  const end = plain.search(/[.!?](\s|$)/)
  return end >= 0 ? plain.slice(0, end + 1) : plain
}

/** A feature's text, cut to its first paragraph, for a short preview. */
export function firstParagraph(text: string | null | undefined): string {
  return (text ?? '').split(/\n\s*\n/)[0]?.trim() ?? ''
}
