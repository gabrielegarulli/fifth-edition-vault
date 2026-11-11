import { createContext, useContext, type ReactNode } from 'react'
import type { App } from 'obsidian'

/**
 * The host's `App`, provided once by the view.
 *
 * The content layer deliberately does **not** take an `App` — it takes a
 * `VaultSource`, which is what makes it testable in plain Node. But the *view*
 * layer genuinely needs the real thing, for three jobs the content layer has no
 * business knowing about:
 *
 * - **Rendering markdown** through `MarkdownRenderer`, so a note's wikilinks,
 *   tables and embeds render as Obsidian renders them.
 * - **Resolving an attachment** to a displayable URL (`getResourcePath`), which
 *   is how a bestiary note's `image:` becomes a token on screen.
 * - **Opening the note itself**, which is the point of being in Obsidian: the
 *   catalog is a browser, and the note is the thing being browsed.
 *
 * `import type { App }` is a type-only import and vanishes at compile time, so
 * this file stays loadable outside Obsidian. Anything importing a *value* from
 * `obsidian` does not — see the note at the top of `content/index.ts`.
 */
const ObsidianContext = createContext<App | null>(null)

export function ObsidianProvider({ app, children }: { app: App; children: ReactNode }) {
  return <ObsidianContext.Provider value={app}>{children}</ObsidianContext.Provider>
}

export function useObsidian(): App {
  const app = useContext(ObsidianContext)
  if (!app) throw new Error('useObsidian must be used inside an ObsidianProvider')
  return app
}

/**
 * Opens a vault note in a new Obsidian tab, leaving this pane where it is.
 *
 * `openLinkText` rather than `getLeaf().openFile()` because it takes the same
 * path a wikilink would and resolves it the same way, so a path that works in a
 * note works here. The second argument is the *source* path a relative link
 * would resolve against; ours are vault-absolute, so it is empty.
 */
export function openNote(app: App, path: string): void {
  void app.workspace.openLinkText(path, '', 'tab')
}

/**
 * A vault-relative attachment path → a URL an `<img>` can load.
 *
 * Returns `null` for a missing file rather than an unloadable path, so a caller
 * can render its fallback instead of a broken image. Absolute URLs are passed
 * through: frontmatter may carry either, and the bestiary notes carry paths.
 */
export function resourceUrl(app: App, path: string | null): string | null {
  if (!path) return null
  if (/^(https?|data|app):/i.test(path)) return path
  const file = app.vault.getFileByPath(path)
  if (!file) return null
  return app.vault.getResourcePath(file)
}
