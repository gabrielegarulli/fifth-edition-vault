import { Platform, type App } from 'obsidian'

/** The spell window's view type (MYDND-60). Registered in `main.ts`. */
export const SPELL_VIEW_TYPE = 'my-dnd-vault-spell'

/** What the spell window saves, and so what Obsidian restores it from. */
export interface SpellViewState {
  id: string
  /** For the window's title before the catalog has answered. */
  name: string
}

/**
 * Opens one spell in a window of its own, showing only the spell (MYDND-60).
 *
 * The note itself would open with its properties block — the exporter's flat
 * frontmatter, every key the catalog filters on — and that is noise when all
 * you want at the table is what the spell does. So this opens our own view,
 * which draws what the `/spells` detail pane draws and nothing else.
 *
 * **A popout window is desktop-only, and Obsidian throws rather than falls
 * back:** `openPopoutLeaf` raises a "desktop only" error on mobile (read from
 * the 1.14.4 bundle). So mobile gets the same view in a tab, checked up front,
 * so it never sees the error toast first.
 */
export function openSpellWindow(app: App, state: SpellViewState): void {
  const leaf = Platform.isDesktopApp
    ? app.workspace.openPopoutLeaf({ size: { width: 520, height: 680 } })
    : app.workspace.getLeaf('tab')
  void leaf.setViewState({ type: SPELL_VIEW_TYPE, active: true, state: { ...state } })
}
