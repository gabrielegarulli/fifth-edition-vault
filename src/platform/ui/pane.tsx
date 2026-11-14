import { createContext, useCallback, useContext, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { paneTarget, type PaneTarget } from '../model/routes'

/**
 * The Obsidian tab this app is mounted in, as far as navigation cares (MYDND-61).
 *
 * Every section can be its own tab now, so "go to /spells" has two answers:
 * change what *this* tab shows, or open another one. Which it is depends on the
 * click (a modifier asks for a new tab, split or window) and on the tab (a
 * pinned one never changes what it shows) — both of which only the host knows.
 *
 * Injected, like `StateProvider`'s callbacks, so nothing here imports
 * `obsidian`: `view.tsx` supplies the real one, and with no provider — every
 * page test — `useGo` is plain `navigate`, which is exactly what it was before.
 */
export interface PaneHost {
  /** Whether the tab is pinned right now. Read per click: pinning is a tab-bar action. */
  isPinned(): boolean
  /** Obsidian's `Keymap.isModEvent`: which pane a modified click asks for, or `false`. */
  modTarget(evt: MouseEvent): PaneTarget | boolean
  /** Open `path` in another tab, split or window. */
  open(path: string, target: PaneTarget): void
  /** The right-click menu for a link to `path`. */
  menu(path: string, evt: MouseEvent): void
}

const PaneContext = createContext<PaneHost | null>(null)

export function PaneProvider({ pane, children }: { pane: PaneHost; children: ReactNode }) {
  return <PaneContext.Provider value={pane}>{children}</PaneContext.Provider>
}

/**
 * `navigate`, but pane-aware. **Every navigation in the app goes through this**
 * rather than `useNavigate`, because a pinned tab that only refused to move from
 * the top nav would still be carried off by the roster's character rows.
 *
 * Pass the click when there is one, so a modifier is honoured; a navigation with
 * no click (a cancel button's, say) still respects a pinned tab.
 */
export function useGo(): (path: string, evt?: ReactMouseEvent | null) => void {
  const pane = useContext(PaneContext)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return useCallback(
    (path, evt) => {
      const target = pane
        ? paneTarget(evt ? pane.modTarget(evt.nativeEvent) : false, pane.isPinned(), path === pathname)
        : null
      if (target && pane) pane.open(path, target)
      else void navigate(path)
    },
    [pane, navigate, pathname],
  )
}

/**
 * The handlers that make a button behave like a link to `path`: click (with
 * modifiers and pinning, via `useGo`), middle-click for a new tab, and
 * right-click for Obsidian's open-in menu. Spread onto the element.
 *
 * Middle-click is caught on `mousedown` as well as `auxclick` — Chromium starts
 * autoscroll on the down, before the click ever arrives.
 */
export function useRouteLink(): (path: string) => {
  onClick: (evt: ReactMouseEvent) => void
  onMouseDown(evt: ReactMouseEvent): void
  onAuxClick(evt: ReactMouseEvent): void
  onContextMenu(evt: ReactMouseEvent): void
} {
  const pane = useContext(PaneContext)
  const go = useGo()

  return useCallback(
    path => ({
      onClick: evt => go(path, evt),
      onMouseDown: evt => {
        if (pane && evt.button === 1) evt.preventDefault()
      },
      onAuxClick: evt => {
        if (!pane || evt.button !== 1) return
        evt.preventDefault()
        pane.open(path, 'tab')
      },
      onContextMenu: evt => {
        if (!pane) return
        evt.preventDefault()
        pane.menu(path, evt.nativeEvent)
      },
    }),
    [pane, go],
  )
}
