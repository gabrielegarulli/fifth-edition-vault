import type { ReactNode } from 'react'

import { Icon } from './Icon'
import { focusFirstButton, usePopup } from './usePopup'

/**
 * A button that opens a short menu beneath it (MYDND-44).
 *
 * Two callers: the sheet's ⋮ menu (Award XP, Re-sync, Open note) and a spell
 * row's cast-at-rank menu (MYDND-46).
 *
 * **Not Obsidian's `Menu`.** That one is a native-feeling context menu, but it
 * can only show a label and an icon per item, and the cast menu needs a second
 * column ("2 left · 9d6"). It is also absent from the jsdom harness, so every
 * test that opened it would need a stub that does nothing a real one does. A
 * popover in React is testable as it is.
 *
 * **Positioned against its own wrapper, never the window** — the pane is the
 * viewport (frame invariant 4). `usePopup` closes it and hands focus back.
 *
 * It is a menu to look at, not `role="menu"`: a group of buttons reached with
 * Tab, which is all it does (MYDND-166).
 */

export type MenuEntry =
  | {
      label: string
      detail?: string
      disabled?: boolean
      /** Stays open after a press: a cast with attacks still to aim (MYDND-172). */
      keepOpen?: boolean
      onSelect(): void
    }
  /** A line of text with no action — "synced 3 hours ago". */
  | { caption: string }

/**
 * The popup itself, for a caller whose trigger does more than open it: Cast
 * either casts or asks who at (MYDND-172). Must sit in a `relative` box.
 */
export function MenuPanel({
  label,
  items,
  close,
  align = 'right',
}: {
  label: string
  items: readonly MenuEntry[]
  close: () => void
  align?: 'left' | 'right'
}) {
  return (
    <div
      ref={focusFirstButton}
      role="group"
      aria-label={label}
      className={`absolute top-full z-menu mt-1 flex min-w-56 flex-col gap-0.5 rounded-obs-m border border-background-modifier-border bg-background-primary p-1 shadow-lg ${
        align === 'right' ? 'right-0' : 'left-0'
      }`}
    >
      {items.map((item, i) =>
        'caption' in item ? (
          <span key={i} aria-live="polite" className="px-2 py-1 text-smallest text-faint">
            {item.caption}
          </span>
        ) : (
          <button
            key={i}
            type="button"
            className="menu-item"
            disabled={item.disabled}
            onClick={() => {
              if (!item.keepOpen) close()
              item.onSelect()
            }}
          >
            <span>{item.label}</span>
            {item.detail ? <span className="text-smallest tabular-nums text-faint">{item.detail}</span> : null}
          </button>
        ),
      )}
    </div>
  )
}

export function MenuButton({
  label,
  items,
  icon = 'more-vertical',
  children,
  className,
  align = 'right',
  disabled = false,
}: {
  /** The accessible name of the trigger. */
  label: string
  items: readonly MenuEntry[]
  /** An icon trigger, unless `children` gives the trigger a text face instead. */
  icon?: string
  children?: ReactNode
  /** The trigger's class. Defaults to Obsidian's own `clickable-icon` for an icon trigger. */
  className?: string
  align?: 'left' | 'right'
  disabled?: boolean
}) {
  const { open, toggle, close, rootRef, triggerRef } = usePopup()

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        disabled={disabled}
        className={className ?? (children ? undefined : 'clickable-icon')}
        onClick={toggle}
      >
        {children ?? <Icon name={icon} />}
      </button>
      {open ? <MenuPanel label={label} items={items} close={close} align={align} /> : null}
    </div>
  )
}
