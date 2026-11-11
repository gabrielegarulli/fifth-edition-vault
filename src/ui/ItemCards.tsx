import { copperLabel } from '../catalog/labels'
import {
  damageCell,
  itemLine,
  kindOf,
  kindShelf,
  poundsLabel,
  propertiesCell,
  type KindShelf,
} from '../catalog/itemKinds'
import type { ItemRow } from '../content/items'
import { Chevron } from './BestiaryCards'
import { ITEM_ICON_PATHS } from './MagicItemCards'

/**
 * The mundane-item catalog's list shapes (MYDND-85): the weapons table, a card
 * on every other shelf (design A), and a row in a group when the pane is
 * narrow (C). Drawn with the magic items' tile and tone classes — a kind takes
 * a rarity's colour, so `bst-itile--legendary` is a weapon's orange.
 */

export function KindTile({ shelf, size = 'md' }: { shelf: KindShelf; size?: 'sm' | 'md' | 'lg' }) {
  const px = size === 'lg' ? 30 : size === 'sm' ? 20 : 22
  return (
    <span aria-hidden="true" className={`bst-itile bst-itile--${size} bst-itile--${shelf.tone}`}>
      <svg width={px} height={px} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={ITEM_ICON_PATHS[shelf.icon]} />
      </svg>
    </span>
  )
}

export function KindDot({ shelf, large = false, small = false }: { shelf: KindShelf; large?: boolean; small?: boolean }) {
  const size = large ? ' bst-dot--lg' : small ? ' bst-dot--sm' : ''
  return <span aria-hidden="true" className={`bst-dot${size} bst-dot--r-${shelf.tone}`} />
}

/**
 * The weapons shelf as the canvas draws it: one row per weapon, compared across
 * NAME · DAMAGE · MASTERY · PROPERTIES · COST · WT. A row is a button so it opens
 * like a card does; `aria-pressed` marks the open one.
 */
export function WeaponTable({ rows, selectedId, onOpen }: { rows: ItemRow[]; selectedId: string | null; onOpen(id: string): void }) {
  return (
    <table className="bst-wtable">
      <thead>
        <tr>
          <th scope="col">NAME</th>
          <th scope="col">DAMAGE</th>
          <th scope="col">MASTERY</th>
          <th scope="col">PROPERTIES</th>
          <th scope="col" className="bst-wtable-num">
            COST
          </th>
          <th scope="col" className="bst-wtable-num">
            WT
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(w => (
          <tr key={w.id} className={w.id === selectedId ? 'bst-wtable-row bst-wtable-row--open' : 'bst-wtable-row'}>
            <th scope="row">
              <button type="button" aria-pressed={w.id === selectedId} className="bst-plain bst-wtable-open" onClick={() => onOpen(w.id)}>
                {w.name}
                {w.weaponCategory && <span className="bst-wtable-cat">{w.weaponCategory}</span>}
              </button>
            </th>
            <td className="bst-mono">{damageCell(w) ?? '—'}</td>
            <td>{w.mastery ? <span className="bst-mastery">{w.mastery}</span> : <span className="bst-muted">—</span>}</td>
            <td className="bst-wtable-props">{propertiesCell(w)}</td>
            <td className="bst-mono bst-wtable-num">{copperLabel(w.costCp) ?? '—'}</td>
            <td className="bst-mono bst-wtable-num bst-wtable-wt">{w.weight ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function MundaneCard({ item, selected, onOpen }: { item: ItemRow; selected: boolean; onOpen(): void }) {
  const shelf = kindShelf(kindOf(item))
  const line = itemLine(item)
  return (
    <button type="button" onClick={onOpen} aria-pressed={selected} className="bst-plain bst-card bst-card--item">
      <span className="bst-card-top">
        <KindTile shelf={shelf} size="sm" />
        <span className="bst-card-names">
          <span className="bst-card-name">{item.name}</span>
          <span className="bst-card-kind">{item.itemType ?? shelf.label}</span>
        </span>
      </span>
      {line && <span className="bst-card-stats bst-item-line">{line}</span>}
      <span className="bst-card-foot bst-item-foot bst-mitem-foot">
        <span>{copperLabel(item.costCp) ?? ''}</span>
        <span className="bst-spacer" />
        <span>{poundsLabel(item.weight) ?? ''}</span>
      </span>
    </button>
  )
}

/**
 * Design C's row: name, the damage and properties (else the type), the cost,
 * and the mastery under it in the weapons' orange.
 */
export function MundaneListRow({ item, selected, onOpen }: { item: ItemRow; selected: boolean; onOpen(): void }) {
  const second = itemLine(item) ?? item.itemType ?? ''
  return (
    <button type="button" onClick={onOpen} aria-pressed={selected} className="bst-plain bst-row">
      <span className="bst-row-main">
        <span className="bst-row-name">{item.name}</span>
        <span className="bst-row-kind">{second}</span>
      </span>
      <span className="bst-row-cr">
        <span className="bst-row-crv">{copperLabel(item.costCp) ?? ''}</span>
        {item.mastery && <span className="bst-row-moves bst-row-mastery">{item.mastery.toUpperCase()}</span>}
      </span>
      <Chevron />
    </button>
  )
}
