import type { ReactNode } from 'react'

import { stripPreamble } from '../../platform'
import {
  useCompendium,
  FeatBenefits,
  ItemFacts,
  ItemNotes,
  SpellFacts,
  SpellText,
} from '../../compendium/host'
import type { FeatRow, ItemRow, LineageFence, SpellRow } from '../../compendium'
import type { Catalog, CatalogRow } from '../../platform'
import { useDetail, Markdown } from '../../platform/host'

/**
 * What a pick does, in the builder (MYDND-155): the catalog's own feat, spell
 * and item bodies, without the panel around them. A panel has a close button, a
 * footer and "Add to a character…", none of which mean anything mid-choice.
 *
 * Each reads **one** note through `useDetail`, and only once it is mounted: a
 * select shows the pick's, and a list of hundreds shows a `ReadButton` and
 * mounts the preview when that is pressed. Every row comes from the caller's
 * memoised rows, never `list()` or `byId()` in a render.
 *
 * Inline rather than a drawer, so it works the same in a 380px pane and in the
 * level-up panel. Drawn in `.bst-*`, so it must sit inside a `.bst` root.
 */

function Frame({ name, children }: { name: string; children: ReactNode }) {
  return (
    <section aria-label={`About ${name}`} className="bst-bpreview">
      {children}
    </section>
  )
}

/** A feat's benefits, each marked as on the sheet or prose only. */
export function FeatPreview({ feat }: { feat: FeatRow | null | undefined }) {
  const compendium = useCompendium()
  const { detail, loading } = useDetail(compendium.feats, feat?.id ?? null)
  if (!feat) return null
  return (
    <Frame name={feat.name}>
      <FeatBenefits feat={feat} detail={detail} loading={loading} />
    </Frame>
  )
}

export function SpellPreview({ spell }: { spell: SpellRow | null | undefined }) {
  const compendium = useCompendium()
  const { detail, loading } = useDetail(compendium.spells, spell?.id ?? null)
  if (!spell) return null
  return (
    <Frame name={spell.name}>
      <SpellFacts spell={spell} />
      <SpellText spell={spell} detail={detail} loading={loading} />
    </Frame>
  )
}

export function ItemPreview({ item }: { item: ItemRow }) {
  const compendium = useCompendium()
  const { detail, loading } = useDetail(compendium.items, item.id)
  const prose = detail ? stripPreamble(detail.prose) : ''
  return (
    <Frame name={item.name}>
      <ItemFacts item={item} />
      <ItemNotes item={item} />
      {loading ? (
        <p className="bst-note">Reading the note…</p>
      ) : prose ? (
        <Markdown markdown={prose} sourcePath={item.path} className="bst-prose bst-entry-desc" />
      ) : null}
    </Frame>
  )
}

/**
 * A species' or background's traits, from its fence. **Not its prose**: a
 * background's facts are the `- **Key:** value` list that `stripPreamble`
 * removes, and the fence carries them as its overview. The prose is the
 * fallback for a hand-written note with no fence.
 */
export function TraitsPreview<R extends CatalogRow>({
  catalog,
  row,
}: {
  catalog: Catalog<R, LineageFence>
  row: R | null
}) {
  const { detail, loading } = useDetail(catalog, row?.id ?? null)
  if (!row) return null
  const traits = (detail?.fence?.traits ?? []).filter(t => t.text)
  const prose = detail ? stripPreamble(detail.prose) : ''
  return (
    <Frame name={row.name}>
      {loading ? (
        <p className="bst-note">Reading the note…</p>
      ) : traits.length > 0 ? (
        traits.map((t, i) => (
          <div key={t.name ?? i} className="bst-col">
            {t.name ? <strong className="bst-entry-name">{t.name}</strong> : null}
            <Markdown markdown={t.text ?? ''} sourcePath={row.path} className="bst-entry-desc" />
          </div>
        ))
      ) : prose ? (
        <Markdown markdown={prose} sourcePath={row.path} className="bst-prose bst-entry-desc" />
      ) : (
        <p className="bst-note">The note says nothing more.</p>
      )}
    </Frame>
  )
}

/** Opens a row's preview. Its name carries the row's, as a list has dozens. */
export function ReadButton({ name, open, onToggle }: { name: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={`Read about ${name}`}
      className="bst-plain bst-link"
      onClick={onToggle}
    >
      {open ? 'Hide' : 'Read'}
    </button>
  )
}
