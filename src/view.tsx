import { ItemView, Keymap, Menu, Platform, type ViewStateResult, type WorkspaceLeaf } from 'obsidian'
import { StrictMode, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router-dom'

import { App } from './App'
import { ContentProvider } from './ContentContext'
import { ObsidianProvider } from './ObsidianContext'
import { PaneProvider, type PaneHost } from './pane'
import { restoredPath, tabFor } from './routes'
import { StateProvider } from './StateContext'
import { RollProvider } from './dice/RollContext'
import type { Content } from './content/index'
import { createVaultContent } from './content/obsidian'
import type { State } from './state/index'
import { createVaultState } from './state/obsidian'
import type MyDndVaultPlugin from './main'

export const VIEW_TYPE = 'my-dnd-vault-view'

/**
 * The plugin's view. Everything the app does happens inside one of these — and
 * since MYDND-61 there can be several, one per section, each its own Obsidian
 * tab that can be pinned, split or popped out on its own.
 *
 * `MemoryRouter`, not `BrowserRouter`: there is no URL to own. Obsidian's own
 * location is `app://obsidian.md/index.html`, and pushing to it would be both
 * meaningless and destructive. Memory history gives the pathname that
 * `App.tsx`'s dispatch reads, with working back/forward, and nothing leaks to
 * the address bar because there isn't one.
 *
 * ## The tab owns its route (MYDND-61)
 *
 * The route is the view's **state** — `getState()`/`setState()` — which is what
 * makes it a tab of its own rather than a window onto a shared app: Obsidian
 * saves it in the layout, so a pinned Bestiary tab reopens on the Bestiary, and
 * `setViewState({ state: { path } })` is how anything opens a section in a new
 * tab. In-pane navigation writes back through `RouteReporter`.
 *
 * **`setState` arrives after `onOpen`** when Obsidian opens or restores a leaf,
 * so the router has already mounted on Home by the time the real route is
 * known. A route handed in from outside therefore remounts the router (`key`)
 * on it rather than navigating — one render, no Home entry in the history, and
 * nothing to race. The providers above the router are untouched, so the roll
 * log survives it.
 *
 * `.my-dnd-vault` on the root is load-bearing — it is the selector Tailwind's
 * `important` setting scopes every utility to. Without it no utility applies.
 */
/** On the view root when the Vault look is on. `styles/index.css` keys every rule of it off this. */
export const VAULT_LOOK_CLASS = 'my-dnd-vault--vault-look'

export class VaultItemView extends ItemView {
  private root: Root | null = null
  private host: HTMLElement | null = null
  private content: Content | null = null
  private state: State | null = null
  /** The route this tab shows. */
  private path = '/'
  /** Bumped when the route is handed in from outside, to remount the router on it. */
  private routerKey = 0

  /**
   * How a click in this tab reaches another one. Built once: a fresh object per
   * render would change every `useGo` callback's identity for nothing.
   */
  private readonly pane: PaneHost = {
    isPinned: () => this.leaf.getViewState().pinned === true,
    modTarget: evt => Keymap.isModEvent(evt),
    open: (path, target) => {
      void this.plugin.openRoute(path, target)
    },
    menu: (path, evt) => {
      const menu = new Menu()
      menu.addItem(item =>
        item.setTitle('Open in new tab').setIcon('file-plus').onClick(() => this.pane.open(path, 'tab')),
      )
      menu.addItem(item =>
        item.setTitle('Open to the right').setIcon('separator-vertical').onClick(() => this.pane.open(path, 'split')),
      )
      // A popout window is desktop-only; on mobile Obsidian throws rather than
      // falling back, so the item is not offered there at all.
      if (Platform.isDesktopApp) {
        menu.addItem(item =>
          item
            .setTitle('Open in new window')
            .setIcon('picture-in-picture-2')
            .onClick(() => this.pane.open(path, 'window')),
        )
      }
      menu.showAtMouseEvent(evt)
    },
  }

  /**
   * The plugin is here for `data.json`, for the campaign every tab shares, and
   * for opening other tabs. Nothing else about it reaches React —
   * `StateProvider` and `PaneProvider` take callbacks, not this object, so every
   * page under them mounts in the test harness with no plugin at all.
   */
  constructor(
    leaf: WorkspaceLeaf,
    private readonly plugin: MyDndVaultPlugin,
  ) {
    super(leaf)
  }

  /** The route this tab shows — for the plugin, to find a tab already on a section. */
  get route(): string {
    return this.path
  }

  getViewType(): string {
    return VIEW_TYPE
  }

  getDisplayText(): string {
    return tabFor(this.path).title
  }

  getIcon(): string {
    return tabFor(this.path).icon
  }

  getState(): Record<string, unknown> {
    return { ...super.getState(), path: this.path }
  }

  async setState(state: unknown, result: ViewStateResult): Promise<void> {
    const path = restoredPath(state)
    if (path !== this.path) {
      this.path = path
      this.routerKey += 1
      this.render()
      this.refreshHeader()
    }
    await super.setState(state, result)
  }

  async onOpen(): Promise<void> {
    // Obsidian pads `.view-content`, which framed the ember background in a
    // strip of the theme's colour (MYDND-121). A class, which
    // `styles/index.css` unpads (the directory refuses inline styles): the stylesheet can't reach it, because the scoping post-pass
    // prefixes every selector with `.my-dnd-vault`, and this is its parent.
    this.contentEl.addClass('my-dnd-vault-host')
    const host = this.contentEl.createDiv({ cls: 'my-dnd-vault' })
    this.host = host
    this.applyLook(this.plugin.settings.vaultLook)
    this.root = createRoot(host)
    // Built here rather than in the plugin: the readers and writers are
    // stateless and hold no cache, so one per view costs nothing and keeps
    // `App` out of main.ts.
    this.content = createVaultContent(this.app, this.plugin.noteFolders)
    this.state = createVaultState(this.app, this.plugin.noteFolders)
    this.render()
  }

  /**
   * The Vault look is one class on the root (MYDND-143); the stylesheet does the
   * rest. On the root and not in React, so turning it on repaints a pane without
   * re-rendering a page or losing a scroll position.
   */
  applyLook(on: boolean): void {
    this.host?.classList.toggle(VAULT_LOOK_CLASS, on)
  }

  /**
   * Re-render with the plugin's current settings. The tree keeps its shape, so a
   * page stays mounted and keeps its scroll position. Unlike the look, the embers
   * go through React: only unmounting the canvas gives back its WebGL context.
   */
  refresh(): void {
    this.render()
  }

  async onClose(): Promise<void> {
    // Unmount before Obsidian empties `contentEl`, or React tries to clean up
    // nodes that are already gone and throws on the way out.
    this.root?.unmount()
    this.root = null
    this.contentEl.empty()
  }

  /** In-pane navigation: remember it, retitle the tab, and let the layout save it. */
  private readonly routed = (path: string): void => {
    if (path === this.path) return
    this.path = path
    this.refreshHeader()
    this.app.workspace.requestSaveLayout()
  }

  /**
   * Re-read the tab's title and icon. `updateHeader` is not in `obsidian.d.ts`
   * but is what Obsidian itself calls after a file rename; without it the tab
   * keeps the title it opened with. Optional-called, so if a release drops it
   * the cost is a stale title, not a throw.
   */
  private refreshHeader(): void {
    const leaf = this.leaf as WorkspaceLeaf & { updateHeader?: () => void }
    leaf.updateHeader?.()
  }

  private render(): void {
    const { root, content, state } = this
    if (!root || !content || !state) return
    // `null` in the SRD edition: no import, no convert, no Sync (MYDND-133).
    const { online, srdNotes } = this.plugin

    root.render(
      <StrictMode>
        {/* Three providers, and the split between them is the architecture. The
            content and state layers take a `VaultSource` / `StateVault` and are
            testable in plain Node; `ObsidianProvider` carries the real `App`,
            which the *view* needs for rendering markdown, resolving attachments
            and opening notes. */}
        <ObsidianProvider app={this.app}>
          <ContentProvider content={content}>
            <StateProvider
              state={state}
              initialCampaignId={this.plugin.settings.activeCampaignId}
              onCampaignChange={this.plugin.setActiveCampaign}
              subscribeCampaign={this.plugin.subscribeCampaign}
              importCharacter={
                online
                  ? async (ddbId, targetPath) => {
                      const file = targetPath ? this.app.vault.getFileByPath(targetPath) : null
                      const outcome = await online.importDdbCharacter(ddbId, file)
                      return outcome !== null
                    }
                  : undefined
              }
              saveVaultCharacter={(json, targetPath) => this.plugin.saveVaultCharacter(json, targetPath ?? null)}
              rebuildVaultCharacter={path => this.plugin.rebuildVaultCharacter(path)}
              fetchDdbPayload={online ? id => online.fetchDdbPayload(id) : undefined}
              convertDdbCharacter={online ? input => online.convertDdbCharacter(input) : undefined}
              // The SRD edition's own notes (MYDND-185); `null` in the full plugin.
              srdNotes={
                srdNotes
                  ? {
                      notes: srdNotes.notes,
                      install: onProgress => srdNotes.install(onProgress),
                      openSettings: () => this.plugin.openSettingTab(),
                    }
                  : undefined
              }
            >
              {/* Inside `ObsidianProvider` because it needs the host `App` for
                  the Atlas walk, and outside the router because the roll log is
                  per *session*, not per route — navigating away from the sheet
                  and back must not empty it. It is per *tab*, though: a roll
                  made in one tab is logged in that tab (and in Atlas). */}
              <RollProvider>
                <PaneProvider pane={this.pane}>
                  <MemoryRouter key={this.routerKey} initialEntries={[this.path]}>
                    <RouteReporter onChange={this.routed} />
                    <App account={online?.account} embers={this.plugin.settings.embers} />
                  </MemoryRouter>
                </PaneProvider>
              </RollProvider>
            </StateProvider>
          </ContentProvider>
        </ObsidianProvider>
      </StrictMode>,
    )
  }
}

/** Tells the view where its router went, so the tab's state follows it. */
function RouteReporter({ onChange }: { onChange(path: string): void }) {
  const { pathname } = useLocation()
  useEffect(() => onChange(pathname), [pathname, onChange])
  return null
}
