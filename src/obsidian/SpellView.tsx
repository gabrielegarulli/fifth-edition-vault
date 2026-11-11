import { ItemView, type ViewStateResult, type WorkspaceLeaf } from 'obsidian'
import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import { ContentProvider } from '../ContentContext'
import type { NoteFoldersSettings } from '../content/folders'
import type { Content } from '../content/index'
import { createVaultContent } from '../content/obsidian'
import { ObsidianProvider } from '../ObsidianContext'
import { SpellWindow } from '../ui/SpellDetail'
import { SPELL_VIEW_TYPE, type SpellViewState } from './spellWindow'

/**
 * One spell, alone in its own leaf — the window Ctrl+click opens (MYDND-60).
 *
 * Read-only, so it carries only the two providers the spell card reads through:
 * no `StateProvider`, no `RollProvider`, no router. A spell window that could
 * cast would need the character, and it does not know whose spell it is.
 *
 * The spell arrives through `setState`, not the constructor: Obsidian opens the
 * view first and hands it the state after, and on a restored workspace the state
 * is all there is. So `onOpen` renders nothing in particular, and every
 * `setState` re-renders with the id it brought.
 */
export class SpellItemView extends ItemView {
  private root: Root | null = null
  private spell: SpellViewState | null = null
  private readonly content: Content

  constructor(leaf: WorkspaceLeaf, folders?: () => NoteFoldersSettings) {
    super(leaf)
    // The plugin's folder settings, so the window finds the spell where the
    // pane does (MYDND-184).
    this.content = createVaultContent(this.app, folders)
  }

  getViewType(): string {
    return SPELL_VIEW_TYPE
  }

  getDisplayText(): string {
    return this.spell?.name ?? 'Spell'
  }

  getIcon(): string {
    return 'sparkles'
  }

  getState(): Record<string, unknown> {
    return this.spell ? { ...this.spell } : {}
  }

  async setState(state: unknown, result: ViewStateResult): Promise<void> {
    const s = state as Partial<SpellViewState> | null
    if (s && typeof s.id === 'string') {
      this.spell = { id: s.id, name: typeof s.name === 'string' ? s.name : s.id }
      this.render()
    }
    await super.setState(state, result)
  }

  async onOpen(): Promise<void> {
    // `.my-dnd-vault` is load-bearing here exactly as in the main view: it is
    // the selector every utility is scoped to.
    const host = this.contentEl.createDiv({ cls: 'my-dnd-vault' })
    this.root = createRoot(host)
    this.render()
  }

  async onClose(): Promise<void> {
    this.root?.unmount()
    this.root = null
    this.contentEl.empty()
  }

  private render(): void {
    this.root?.render(
      <StrictMode>
        <ObsidianProvider app={this.app}>
          <ContentProvider content={this.content}>
            <SpellWindow id={this.spell?.id ?? null} />
          </ContentProvider>
        </ObsidianProvider>
      </StrictMode>,
    )
  }
}
