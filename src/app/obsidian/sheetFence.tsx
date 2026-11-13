import { MarkdownRenderChild, type MarkdownPostProcessorContext } from 'obsidian'
import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'

import { createVaultContent, createVaultState } from './vault'
import type MyDndVaultPlugin from '../../main'
import { PaneProvider, watchDetach } from '../../platform/host'
import { CharacterSheetView } from '../../characters/host'
import { sheetPath } from '../../platform'
import { HostProviders, paneHost } from './hostProviders'

export { SHEET_FENCE } from '../../characters/host'

/**
 * Draws the interactive sheet of the note at `ctx.sourcePath` (MYDND-191) —
 * the note this fence is rendered *for*, which is not always the note it is
 * written in.
 *
 * An Atlas VTT statblock template holds this fence as its own text (see
 * `atlasTemplate.ts`). Atlas renders a template's markdown with Obsidian's
 * `MarkdownRenderer`, passing the character note's path, so our sheet is drawn
 * inside Atlas's card with no patch to Atlas. Unlike ` ```charsheet `, the
 * fence carries nothing: it is the sheet page, mounted with the view's
 * providers, so spending a slot or taking damage writes `vault-vitals` exactly
 * as the pane does, and the vault's change events redraw it.
 *
 * **The router never moves.** Its pane host reports the card as pinned, so
 * every link on it — Characters, a conversion, a level-up — opens the plugin's
 * pane instead of replacing the sheet (`paneTarget`).
 */
export function renderSheetFence(plugin: MyDndVaultPlugin, el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
  // `.my-dnd-vault` is load-bearing: Tailwind's `important` scopes every utility to it.
  const host = el.createDiv({ cls: 'my-dnd-vault' })
  const child = new SheetChild(host, createRoot(host), plugin, ctx.sourcePath)
  child.draw()
  ctx.addChild(child)
}

class SheetChild extends MarkdownRenderChild {
  private stopped = false
  /** Loaded by its host: reading view or Live Preview, which will unload it too. */
  private hosted = false
  private readonly unwatch: () => void

  constructor(
    containerEl: HTMLElement,
    private readonly root: Root,
    private readonly plugin: MyDndVaultPlugin,
    private readonly path: string,
  ) {
    super(containerEl)
    // Atlas never loads the component its card renders into, so neither
    // `onload` nor `onunload` runs there: stop once the block leaves the page.
    // A host that did load us owns the lifecycle — reading view detaches
    // off-screen sections and re-attaches them, and must find them drawn.
    this.unwatch = watchDetach(containerEl, () => {
      if (!this.hosted) this.stop()
    })
  }

  onload(): void {
    this.hosted = true
    this.unwatch()
  }

  onunload(): void {
    this.stop()
  }

  stop(): void {
    if (this.stopped) return
    this.stopped = true
    this.unwatch()
    this.root.unmount()
  }

  draw(): void {
    const { app } = this.plugin
    // One reader and one writer per card, as per tab: both are stateless.
    const content = createVaultContent(app, this.plugin.noteFolders)
    const state = createVaultState(app, this.plugin.noteFolders)
    const pane = paneHost(this.plugin, () => true)
    this.root.render(
      <StrictMode>
        <HostProviders app={app} plugin={this.plugin} content={content} state={state}>
          <PaneProvider pane={pane}>
            <MemoryRouter initialEntries={[sheetPath(this.path)]}>
              <CharacterSheetView notePath={this.path} inCard />
            </MemoryRouter>
          </PaneProvider>
        </HostProviders>
      </StrictMode>,
    )
  }
}
