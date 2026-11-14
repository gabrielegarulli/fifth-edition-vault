import { type App, MarkdownRenderChild, type MarkdownPostProcessorContext, parseYaml } from 'obsidian'
import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import type { Compendium } from '../../compendium'
import { CompendiumProvider } from '../../compendium/host'
import { overlayNote, itemDataSource } from '../../characterModel'
import type { Sheet } from '../../characterModel'
import { ObsidianProvider } from '../../platform/host'
import { CharacterSheet } from '../ui/CharacterSheet'

/**
 * Draws a ` ```charsheet ` fence wherever Obsidian renders the note, with the
 * note's equipped items laid over it.
 *
 * This is the feature that makes a character note useful *as a note* — the
 * sheet is there in reading view, in a split, in an embed, next to whatever the
 * player has written underneath it. The catalog pane is not the only way in.
 *
 * ## Why React is mounted here rather than drawing plain DOM
 *
 * `obsidian-vault-characters` drew the sheet as plain DOM because it had no
 * framework. The absorbed version has one, and `CharacterSheet` is where the
 * sheet is defined — so the fence mounts a small React root rather than keeping
 * a second renderer that would then have to be kept in step. One definition of
 * the sheet, two places it appears.
 *
 * The root is unmounted through a `Component` registered on the render context.
 * Obsidian unloads a block's children when the note re-renders, which is what
 * tears this down; without it every re-render would leak a root.
 *
 * **The fence is the sheet**: this reads the YAML in front of it, plus the
 * note's own ` ```vault-inventory ` for what is equipped, so a hand-edited
 * number renders, and keeps rendering until the next re-sync overwrites the
 * managed region.
 */
export function renderCharsheetFence(
  app: App,
  compendium: Compendium,
  source: string,
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext,
): void {
  let sheet: Sheet
  try {
    const parsed: unknown = parseYaml(source)
    if (!parsed || typeof parsed !== 'object') {
      el.createDiv({ cls: 'my-dnd-vault', text: 'This charsheet block is empty.' })
      return
    }
    sheet = parsed as Sheet
  } catch (err) {
    el.createDiv({
      cls: 'my-dnd-vault',
      text: `Could not read this charsheet block: ${err instanceof Error ? err.message : String(err)}`,
    })
    return
  }

  // `ctx.sourcePath` is carried onto the sheet so a roll can tell Atlas which
  // note it came from. Never written back — see `Sheet.notePath`.
  sheet.notePath = ctx.sourcePath

  // The fence holds the *base* sheet; what is equipped is laid over it on read,
  // exactly as the roster does (MYDND-37). `getSectionInfo` hands back the whole
  // note's text, which is where the ` ```vault-inventory ` fence is. It answers
  // null in some embeds — then the base sheet is drawn, which is the fence as
  // written and never a wrong number.
  const noteText = ctx.getSectionInfo(el)?.text

  // `.my-dnd-vault` is load-bearing: it is the selector Tailwind's `important`
  // setting scopes every utility to. Without it the sheet renders unstyled, and
  // the failure looks like plain HTML rather than an error.
  const host = el.createDiv({ cls: 'my-dnd-vault' })
  const root = createRoot(host)
  ctx.addChild(new ReactRootChild(host, root))

  // Drawn once the worn items' notes are read (MYDND-57) — their dice and armour
  // class are in fences only an async read reaches. One tick, not a flash: the
  // block is empty until then rather than showing the base sheet and changing.
  const draw = (shown: Sheet) =>
    root.render(
      <StrictMode>
        <ObsidianProvider app={app}>
          {/* Provided so spell names link to their notes (MYDND-36). The readers
              are stateless, so one instance shared by every block costs nothing. */}
          <CompendiumProvider compendium={compendium}>
            <CharacterSheet sheet={shown} />
          </CompendiumProvider>
        </ObsidianProvider>
      </StrictMode>,
    )
  if (!noteText) {
    draw(sheet)
    return
  }
  overlayNote(sheet, noteText, itemDataSource(compendium)).then(draw, () => draw(sheet))
}

/**
 * Unmounts a React root when Obsidian unloads the block.
 *
 * `MarkdownRenderChild`, not a bare `Component`: `addChild` requires one, and
 * it is the type that carries the container element Obsidian needs to detach.
 * The plugin this was ported from passed a `Component` with `onunload`
 * reassigned, which happens to work at runtime and does not typecheck — one of
 * the things being in TypeScript catches.
 */
class ReactRootChild extends MarkdownRenderChild {
  constructor(
    containerEl: HTMLElement,
    private readonly root: Root,
  ) {
    super(containerEl)
  }

  onunload(): void {
    this.root.unmount()
  }
}
