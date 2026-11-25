import { useMemo } from 'react'

import { FeatDetail, ItemCatalogDetail, MagicItemCatalogDetail, SpellCatalogDetail } from '../../catalogs/host'
import type { FeatRow, ItemRow, MagicItemRow, SpellRow } from '../../compendium'
import { CompendiumProvider } from '../../compendium/host'
import { Markdown } from '../../platform/host'
import { previewCompendium } from '../model/check'
import type { BuiltNote } from '../model/emit'
import { BUILDER_CATALOG } from '../model/kinds'

/**
 * The note as its catalog will draw it (MYDND-233): the catalog's own detail
 * pane, mounted over a compendium that holds this note and nothing else
 * (`previewCompendium`), the same one the read-back reads. So what is shown is
 * what `/feats` will show, not a likeness that drifts from it.
 *
 * **It is `inert`**: the pane's Close, "Add to a character" and "Open note"
 * belong to a saved note, and this one is not saved yet. Everything it says is
 * in the form beside it, and in the markdown under "Show the markdown".
 *
 * A condition has no catalog page, so it is its prose.
 */
export function NotePreview({ built }: { built: BuiltNote }) {
  const compendium = useMemo(() => previewCompendium(built), [built])
  // One note: listing it is the read-back's work, not a vault walk.
  const row = useMemo(() => compendium[BUILDER_CATALOG[built.kind]].list()[0] ?? null, [compendium, built.kind])
  const close = () => {}

  if (!row) {
    return <p className="bst-nb-hint">Nothing to show yet: the catalog would not list this note. The checks below say why.</p>
  }
  return (
    <div className="bst-detail bst-nb-detail" inert>
      <CompendiumProvider compendium={compendium}>
        {built.kind === 'feat' ? (
          <FeatDetail feat={row as FeatRow} onClose={close} />
        ) : built.kind === 'spell' ? (
          <SpellCatalogDetail spell={row as SpellRow} onClose={close} />
        ) : built.kind === 'item' ? (
          <ItemCatalogDetail item={row as ItemRow} onClose={close} />
        ) : built.kind === 'magic-item' ? (
          <MagicItemCatalogDetail item={row as MagicItemRow} onClose={close} />
        ) : (
          <div className="bst-nb-prose">
            <Markdown markdown={built.text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')} sourcePath={built.fileName} className="bst-prose" />
          </div>
        )}
      </CompendiumProvider>
    </div>
  )
}

/** The note's text, as it will be written: the format, learnt by using it. */
export function NoteMarkdown({ built }: { built: BuiltNote }) {
  return (
    <pre className="bst-nb-markdown" tabIndex={0} aria-label={`${built.fileName}, as it will be written`}>
      {built.text}
    </pre>
  )
}
