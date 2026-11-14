import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from 'react'

/**
 * How every popup in the app holds and returns focus (MYDND-166). Each of the
 * five had its own copy, and each lost focus to `<body>` on Escape: the focused
 * item goes with the popup, and nothing put focus anywhere else.
 *
 * Popups here are disclosures, not ARIA menus. `role="menu"` promises arrow keys
 * and a roving tabindex; a button that shows a group of buttons promises only
 * what Tab already does.
 *
 * Everything reads the popup's own document, never the global one, so a popout
 * window behaves the same (frame invariant 4).
 */

/**
 * Hands focus back to `trigger` when `open` goes false, if focus was lost.
 *
 * A layout effect, so it runs in the commit that closed the popup: if the same
 * click opened a dialog, the dialog then records the trigger as its opener
 * rather than `<body>`. Only lost focus is handed back, so an item that moved
 * focus somewhere on purpose, or a press on another control, keeps it.
 */
export function useFocusReturn(open: boolean, trigger: RefObject<HTMLElement | null>): void {
  const wasOpen = useRef(false)

  useLayoutEffect(() => {
    const el = trigger.current
    if (wasOpen.current && !open && el) {
      const { activeElement, body } = el.ownerDocument
      if (!activeElement || activeElement === body) el.focus()
    }
    wasOpen.current = open
  }, [open, trigger])
}

/** A ref callback: focus moves in as the popup mounts, so Tab and Escape start there. */
export function focusFirstButton(el: HTMLElement | null): void {
  el?.querySelector<HTMLElement>('button:not(:disabled)')?.focus()
}

/**
 * Keeps Tab inside a modal surface that holds only buttons, wrapping at both
 * ends. For the surfaces that cannot be a native `<dialog>`: in a pane,
 * `showModal()` would put the sheet in the top layer, against the window, and
 * make all of Obsidian inert.
 */
export function containTab(evt: ReactKeyboardEvent<HTMLElement>): void {
  if (evt.key !== 'Tab') return
  const box = evt.currentTarget
  const stops = box.querySelectorAll<HTMLElement>('button:not(:disabled)')
  const first = stops[0]
  const last = stops[stops.length - 1]
  if (!first) return

  const active = box.ownerDocument.activeElement
  if (evt.shiftKey ? active === first || active === box : active === last) {
    evt.preventDefault()
    ;(evt.shiftKey ? last : first).focus()
  }
}

/**
 * A popup that hangs off a trigger: it closes on Escape, on a press outside
 * `rootRef`, and when focus leaves `rootRef`, since a popup left open over the
 * page could cover whatever Tab lands on next (2.4.11). `rootRef` must hold the
 * trigger too, or a press on it closes the popup and the click reopens it.
 */
export function usePopup<Root extends HTMLElement = HTMLDivElement>() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<Root | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  useFocusReturn(open, triggerRef)

  useEffect(() => {
    // The root's own document, so a popup in a popout window listens there.
    // With no root mounted there is nothing a press could land outside of.
    const doc = rootRef.current?.ownerDocument
    if (!open || !doc) return
    const closeIfOutside = (evt: Event) => {
      if (!rootRef.current?.contains(evt.target as Node)) setOpen(false)
    }
    const onKey = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') setOpen(false)
    }
    doc.addEventListener('pointerdown', closeIfOutside)
    doc.addEventListener('focusin', closeIfOutside)
    doc.addEventListener('keydown', onKey)
    return () => {
      doc.removeEventListener('pointerdown', closeIfOutside)
      doc.removeEventListener('focusin', closeIfOutside)
      doc.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = useCallback(() => setOpen(o => !o), [])
  const close = useCallback(() => setOpen(false), [])

  return { open, toggle, close, rootRef, triggerRef }
}
