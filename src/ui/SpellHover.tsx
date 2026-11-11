import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { HoverPopover, type HoverParent } from 'obsidian'

import type { SpellRow } from '../content/spells'
import { SpellDetail } from './SpellDetail'

/**
 * Ctrl+hover on a spell shows its card in a hover popover (MYDND-63).
 *
 * ## Obsidian's popover, our card
 *
 * The link is a React button, not an internal link, so the Page Preview
 * plugin never sees it — and if it did, it would preview the *note*: the
 * properties block and the exporter's preamble that MYDND-60 went to the
 * trouble of leaving out. So the chrome is Obsidian's own `HoverPopover` (it
 * looks, positions and closes like every other preview, including staying open
 * while the pointer moves into it) and the body is `SpellDetail`, the same card
 * the `/spells` pane and the spell window draw.
 *
 * The card is **portalled** into the popover rather than mounted as a second
 * React root, so it keeps this tree's context — the content layer it reads the
 * spell through, and the host `App` its "open note" button needs.
 *
 * ## Ctrl on arrival, or pressed while there
 *
 * Obsidian's own preview opens either way, so this does too: a held modifier
 * on `mouseenter`, or a `keydown` of Control/Meta while the pointer is still on
 * the link. The key listener exists only between enter and leave. Ctrl is
 * always required — the sheet is hovered constantly, and a card on every pass
 * would be in the way.
 */
export function useSpellHover(row: SpellRow | null): {
  handlers: {
    onMouseEnter(evt: ReactMouseEvent<HTMLElement>): void
    onMouseLeave(): void
  }
  popover: ReactNode
} {
  const [hoverEl, setHoverEl] = useState<HTMLElement | null>(null)
  // The popover's parent: Obsidian reads and writes `hoverPopover` on it, and
  // replaces whatever popover was there when a new one opens.
  const parent = useRef<HoverParent>({ hoverPopover: null })
  const target = useRef<HTMLElement | null>(null)
  const onKey = useRef<((evt: KeyboardEvent) => void) | null>(null)

  const open = useCallback(() => {
    if (!row || !target.current || parent.current.hoverPopover) return
    const popover = new HoverPopover(parent.current, target.current)
    popover.register(() => {
      if (parent.current.hoverPopover === popover) parent.current.hoverPopover = null
      setHoverEl(el => (el === popover.hoverEl ? null : el))
    })
    setHoverEl(popover.hoverEl)
  }, [row])

  const stopListening = useCallback(() => {
    if (onKey.current) document.removeEventListener('keydown', onKey.current)
    onKey.current = null
  }, [])

  // Leaving the sheet with a popover open — a route change, a closed tab —
  // closes it rather than leaving a card floating over whatever comes next.
  useEffect(() => {
    const host = parent.current
    return () => {
      stopListening()
      host.hoverPopover?.unload()
    }
  }, [stopListening])

  return {
    handlers: {
      onMouseEnter: evt => {
        target.current = evt.currentTarget
        if (evt.ctrlKey || evt.metaKey) open()
        stopListening()
        onKey.current = keyEvt => {
          if (keyEvt.key === 'Control' || keyEvt.key === 'Meta') open()
        }
        document.addEventListener('keydown', onKey.current)
      },
      onMouseLeave: stopListening,
    },
    popover:
      hoverEl && row
        ? createPortal(
            // `.my-dnd-vault` is the selector every utility is scoped to, so
            // the card renders unstyled without it; the modifier sizes it to
            // Obsidian's own popover instead of to a pane.
            <div className="my-dnd-vault my-dnd-vault--hover">
              <SpellDetail row={row} />
            </div>,
            hoverEl,
          )
        : null,
  }
}
