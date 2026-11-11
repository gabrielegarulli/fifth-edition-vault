import { useCallback, useState, type RefCallback } from 'react'

/**
 * An element's width, tracked with a `ResizeObserver`.
 *
 * **The pane is the viewport**, and unlike a browser window it can be a third of
 * one — Obsidian splits it, the sidebars take from it, and the user drags it. So
 * a media query is the wrong instrument here: `@media (min-width: 900px)` asks
 * about the *screen*, and the screen is wide while this pane is 380px and
 * laying out a two-column catalog into it.
 *
 * The measurement is taken in JS and the branch is made in React. One observer
 * per page.
 *
 * **A callback ref, so the observer follows the element** (MYDND-53). This was a
 * `useRef` read once in a mount effect, which watched whichever element was
 * there on the first render for the life of the component. `CharacterSheetPage`
 * renders a bare `<div ref>` while the roster loads and `<RollModeProvider><div
 * ref>` once it has — a different root type, so React mounts a new div, and the
 * observer stayed on the detached one. Every width-driven layout on the sheet
 * froze at the unmeasured 0: three stat columns in a 1300px pane. Attaching the
 * observer in the ref callback ties it to the element, not to the mount.
 */
export function useElementWidth<T extends HTMLElement>(): [RefCallback<T>, number] {
  const [width, setWidth] = useState(0)

  const ref = useCallback((element: T | null) => {
    if (!element) return

    // Measured once up front as well as on resize: the observer fires on its own
    // after layout, but reading here means the first paint is already correct
    // rather than briefly single-column.
    setWidth(element.getBoundingClientRect().width)

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) setWidth(entry.contentRect.width)
    })
    observer.observe(element)
    // React 19 calls this when the element detaches, instead of calling the ref
    // with `null`.
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}

/**
 * The width at which a catalog shows its list and its detail side by side.
 *
 * Below it the detail covers the list instead. 820px is where the list's own
 * columns — name, a badge, two metadata columns — stop fitting beside a readable
 * 400px of prose.
 */
export const SPLIT_WIDTH = 820
