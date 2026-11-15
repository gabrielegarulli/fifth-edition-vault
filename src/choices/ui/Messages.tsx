import type { ReactNode } from 'react'

/**
 * The builder's two kinds of message (MYDND-216), each with its own colour
 * **and** its own shape, so colour is never the only signal (WCAG 1.4.1):
 *
 * - **an error**, a filled circle with ✕: it blocks the save (no name, no
 *   species, no class);
 * - **a warning**, a filled triangle with !: a choice still open. Saving works.
 *
 * The icons are decoration (`aria-hidden`); the words beside them, or the
 * accessible name of the control that carries one, say which it is.
 */

export type MessageKind = 'error' | 'warning'

export function ErrorIcon({ className = 'bst-ic' }: { className?: string }) {
  return (
    <svg className={`${className} bst-ic--err`} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path className="bst-ic-mark" d="M9 9l6 6M15 9l-6 6" fill="none" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function WarningIcon({ className = 'bst-ic' }: { className?: string }) {
  return (
    <svg className={`${className} bst-ic--warn`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.3 3.4L1.6 18.2A2 2 0 003.3 21.2h17.4a2 2 0 001.7-3L13.7 3.4a2 2 0 00-3.4 0z" fill="currentColor" />
      <path className="bst-ic-mark" d="M12 9.5v4M12 17.2h.01" fill="none" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function MessageIcon({ kind, className }: { kind: MessageKind; className?: string }) {
  return kind === 'error' ? <ErrorIcon className={className} /> : <WarningIcon className={className} />
}

/** A message under the control it is about. `id` is for that control's `aria-describedby`. */
export function Message({ kind, id, children }: { kind: MessageKind; id?: string; children: ReactNode }) {
  return (
    <p id={id} className={kind === 'error' ? 'bst-msg bst-msg--err' : 'bst-msg bst-msg--warn'}>
      <MessageIcon kind={kind} />
      <span>{children}</span>
    </p>
  )
}

/** A step-wide message, at the top of the step it is about. */
export function Banner({ kind, children }: { kind: MessageKind; children: ReactNode }) {
  return (
    <p role="status" className={kind === 'error' ? 'bst-banner bst-banner--err' : 'bst-banner bst-banner--warn'}>
      <MessageIcon kind={kind} />
      <span>{children}</span>
    </p>
  )
}
