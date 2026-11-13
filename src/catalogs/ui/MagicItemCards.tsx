import {
  categoryOf,
  effectLine,
  itemFlagsOf,
  iconOf,
  kindLabel,
  rowCorner,
  rowFlags,
  shelfOf,
  weightLabel,
  type ItemIcon,
} from '../../compendium'
import type { MagicItemRow } from '../../compendium'
import { Chevron } from './BestiaryCards'

/**
 * The magic-item catalog's list shapes (MYDND-76): a card on a shelf when the
 * pane is wide (design A), a row in a group when it is narrow (design C). Both
 * are `<button>`s, announced as something to open, drawn in the canvas's own
 * palette — `.bst-*` in `styles/index.css` — inside the page's `.bst` root, as
 * the Bestiary, Feats and Spells are.
 */

/**
 * One stroke path per icon, on a 24px grid, drawn in `currentColor` — the tile
 * sets the rarity's colour. The canvas's own icons, plus the ones it had no
 * item for (a sword, armour, a scroll, an arrow, an instrument).
 */
export const ITEM_ICON_PATHS: Record<ItemIcon, string> = {
  potion: 'M9 2h6 M10 2v6.5L5 17.5A2.5 2.5 0 0 0 7.2 21h9.6a2.5 2.5 0 0 0 2.2-3.5L14 8.5V2 M7 15h10',
  amulet: 'M5 3l7 8 7-8 M8 15.5a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
  cloak: 'M9 3h6l1 4 4 14H4l4-14z M9 3c0 2 1.3 3 3 3s3-1 3-3',
  bag: 'M6 8h12l1.5 13h-15z M9 8V6a3 3 0 0 1 6 0v2',
  wand: 'M3 21L14 10 M18 2l1 3 3 1-3 1-1 3-1-3-3-1 3-1z',
  rod: 'M4 20L17 7 M15 4l5 5 M18 3l3 3',
  gem: 'M6 3h12l4 6-10 12L2 9z M2 9h20 M9.5 3L8 9l4 12 4-12-1.5-6',
  stones: 'M3 15a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M13 9a4 4 0 1 0 8 0a4 4 0 1 0-8 0',
  ring: 'M5 14a7 7 0 1 0 14 0a7 7 0 1 0-14 0 M9 3h6l-3 4z',
  staff: 'M5 22L15 8 M14 5a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
  belt: 'M2 9h20v6H2z M10 8h4v8h-4z',
  book: 'M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z M8 7h7',
  gauntlet:
    'M7 21v-6L4 11V6a1.5 1.5 0 0 1 3 0V4a1.5 1.5 0 0 1 3 0v-.5a1.5 1.5 0 0 1 3 0V4a1.5 1.5 0 0 1 3 0v8l2-2a1.5 1.5 0 0 1 2 2l-4 5v4z',
  sword: 'M14.5 17.5L3 6V3h3l11.5 11.5 M13 19l6-6 M16 16l4 4 M19 21l2-2',
  armor: 'M8 3l4 2 4-2 4 3-2 5v9a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-9L4 6z M12 5v16',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  scroll: 'M8 21h11a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4 M19 17V5a2 2 0 0 0-2-2H4',
  arrow: 'M4 20L20 4 M20 4h-6 M20 4v6 M4 20l2-5 M4 20l5-2',
  music: 'M9 18V5l12-2v13 M6 18a3 3 0 1 0 0.01 0 M18 16a3 3 0 1 0 0.01 0',
  boots: 'M7 3h5v9l6 3a2 2 0 0 1 1 1.7V21H7z M7 17h12',
}

/**
 * An item's tile: its icon in its rarity's colour on that colour's tint. `md`
 * is a card (40px), `sm` a row or lens card (36px), `lg` the open item (56px).
 */
export function ItemTile({ item, size = 'md' }: { item: MagicItemRow; size?: 'sm' | 'md' | 'lg' }) {
  const tone = shelfOf(item.rarity).tone
  const px = size === 'lg' ? 30 : size === 'sm' ? 20 : 22
  return (
    <span aria-hidden="true" className={`bst-itile bst-itile--${size} bst-itile--${tone}`}>
      <svg width={px} height={px} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={ITEM_ICON_PATHS[iconOf(item)]} />
      </svg>
    </span>
  )
}

export function MagicItemCard({ item, selected, onOpen }: { item: MagicItemRow; selected: boolean; onOpen(): void }) {
  const line = effectLine(item)
  const weight = weightLabel(item.weight)
  return (
    <button type="button" onClick={onOpen} aria-pressed={selected} className="bst-plain bst-card bst-card--item">
      <span className="bst-card-top">
        <ItemTile item={item} />
        <span className="bst-card-names">
          <span className="bst-card-name">{item.name}</span>
          <span className="bst-card-kind">{kindLabel(item)}</span>
        </span>
      </span>
      {line ? (
        <span className="bst-card-stats bst-item-line">{line}</span>
      ) : item.summary ? (
        <span className="bst-item-summary">{item.summary}</span>
      ) : null}
      <span className="bst-card-foot bst-item-foot">
        {itemFlagsOf(item).map(f => (
          <span key={f.text} title={f.title} className={`bst-flag bst-flag--${f.tone}`}>
            {f.text}
          </span>
        ))}
        <span className="bst-spacer" />
        {weight && <span className="bst-item-weight">{weight}</span>}
      </span>
    </button>
  )
}

/**
 * Design C's row: tile, name, `Wand · Cast Fireball` (the first sentence when
 * there is nothing shorter to say), the charges or weight, and `ATT CURSE`.
 */
export function MagicItemListRow({ item, selected, onOpen }: { item: MagicItemRow; selected: boolean; onOpen(): void }) {
  const second = [categoryOf(item) === 'Wondrous' ? 'Wondrous' : kindLabel(item), effectLine(item) ?? item.summary]
    .filter(Boolean)
    .join(' · ')
  const flags = rowFlags(item)
  return (
    <button type="button" onClick={onOpen} aria-pressed={selected} className="bst-plain bst-row">
      <ItemTile item={item} size="sm" />
      <span className="bst-row-main">
        <span className="bst-row-name">{item.name}</span>
        <span className="bst-row-kind">{second}</span>
      </span>
      <span className="bst-row-cr">
        <span className="bst-row-crv">{rowCorner(item)}</span>
        {flags && <span className="bst-row-moves">{flags}</span>}
      </span>
      <Chevron />
    </button>
  )
}
