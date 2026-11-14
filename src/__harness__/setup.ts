import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

import { installObsidianDomExtensions, Notice } from './obsidian'

/**
 * Setup for the `ui` test project only.
 *
 * Two things jsdom does not have and Obsidian does:
 *
 * - **`HTMLElement.empty()` / `createDiv()`**, Obsidian's additions to the DOM
 *   prototype. Installed by the harness.
 * - **`ResizeObserver`.** `useElementWidth` measures the pane with one, because
 *   the pane is the viewport and a media query would ask about the screen. jsdom
 *   has no implementation, so without this the first catalog render throws.
 *
 * The stub never fires. That is deliberate: it leaves `width` at its initial 0,
 * and 0 means "not measured yet", which `CatalogShell` treats as wide. So the
 * tests exercise the split layout, and the narrow branch is not covered here —
 * stated plainly rather than faked with a width nothing produced.
 *
 * **`CharacterSheet` reads an unmeasured 0 the other way**, as narrow: three
 * ability columns rather than six. The two are not inconsistent — each picks
 * the layout that is merely *imperfect* rather than broken if the guess is
 * wrong, and for a grid that is narrow, where for a split pane it is wide. The
 * consequence for tests is that the sheet's wide branches are the uncovered
 * ones.
 *
 * `Notice` is recorded rather than shown, and cleared between tests below.
 */
installObsidianDomExtensions()

class NoopResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

window.ResizeObserver ??= NoopResizeObserver

afterEach(() => {
  cleanup()
  Notice.shown = []
})
