import { copperLabel } from '../../compendium'
import type { ItemRow, MagicItemRow } from '../../compendium'
import type { SheetItem } from './sheet/sheet'
import type { AddItemInput, InventoryCurrency, InventoryItem } from './inventory'

/**
 * The pure half of a character's inventory panel (MYDND-37): which tab a row
 * belongs in, what the pouch is worth, and what the "Add item" picker offers.
 *
 * the-vault's sheet splits a character's things into three sub-tabs —
 * `EquipmentPanel` (mundane gear from the `inventory` table), `ItemsPanel`
 * (magic items, plus a D&D Beyond character's payload inventory) and
 * `ComponentsPanel` (what harvesting produced). The split is kept, because it
 * is how a player looks for something: a sword, a ring, a dragon scale.
 */

export type BagTab = 'equipment' | 'items' | 'components'

/**
 * A row's tab. Components first: a harvested part never carries a magic or
 * catalog id, but checking it first keeps a hand-edited row that has both in
 * the place the crafting surfaces look for it.
 */
export function tabOf(item: InventoryItem): BagTab {
  if (item.component_id || item.essence_id) return 'components'
  if (item.magic_item_id) return 'items'
  return 'equipment'
}

export function splitBag(items: readonly InventoryItem[]): Record<BagTab, InventoryItem[]> {
  const out: Record<BagTab, InventoryItem[]> = { equipment: [], items: [], components: [] }
  for (const item of items) out[tabOf(item)].push(item)
  return out
}

/** The pouch in copper — `@vault/derive/currency.js`' `currencyToCp`, typed. */
export function pouchCp(c: InventoryCurrency): number {
  return (c.pp || 0) * 1000 + (c.gp || 0) * 100 + (c.sp || 0) * 10 + (c.cp || 0)
}

/** Whole gold pieces, floored — what the web sheet's `TOTAL` cell shows. */
export function pouchGp(c: InventoryCurrency): number {
  return Math.floor(pouchCp(c) / 100)
}

/**
 * D&D Beyond's list in the order a player scans it: what is worn or held,
 * then the magic, then everything else, each alphabetically. The payload's own
 * order is the order things were added, which is no order at all.
 */
export function sortDdbItems(items: readonly SheetItem[]): SheetItem[] {
  const rank = (i: SheetItem) => (i.equipped ? 0 : i.magic ? 1 : 2)
  return [...items].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
}

/** A component that is an essence — the harvest writes both by name. */
export const isEssence = (item: InventoryItem): boolean =>
  Boolean(item.essence_id) || /\bessence\b/i.test(item.component_id || item.name || '')

/** What a row is called: the player's own name, then the catalog's, then its id. */
export function rowLabel(item: InventoryItem, catalogName?: string | null): string {
  return item.custom_name || catalogName || item.name || item.magic_item_id || item.content_item_id || item.component_id || 'Item'
}

// ---------------------------------------------------------------------------
// The picker
// ---------------------------------------------------------------------------

export interface PickerOption {
  kind: 'item' | 'magic'
  /** The note's slug — what the row stores, so it hydrates against the catalog. */
  id: string
  name: string
  /** `Martial weapon · 15 gp`, `Rare ring` … */
  detail: string
}

/**
 * Catalog rows matching a query, mundane and magic together, best first.
 *
 * **Why a picker at all.** The old free-text form stored
 * `content_item_id: name.toLowerCase()`, so "Leather Armor" became the id
 * `leather armor` against a catalog slug of `leather-armor` — it hydrated only
 * because `byName` happened to be tried second, and a typo hydrated as nothing,
 * silently dropping the item off the paper doll. A row picked from the catalog
 * stores the slug.
 *
 * A name that starts with the query outranks one that merely contains it, and
 * mundane outranks magic on a tie — "dagger" should offer the Dagger before the
 * Dagger of Venom.
 */
export function pickerMatches(
  query: string,
  items: readonly ItemRow[],
  magicItems: readonly MagicItemRow[],
  limit = 30,
): PickerOption[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const scored: Array<{ option: PickerOption; score: number }> = []
  for (const item of items) {
    const name = item.name.toLowerCase()
    const at = name.indexOf(q)
    if (at < 0) continue
    const cost = copperLabel(item.costCp)
    scored.push({
      option: {
        kind: 'item',
        id: item.id,
        name: item.name,
        detail: [item.weaponCategory ? `${item.weaponCategory} ${item.itemType ?? 'weapon'}` : item.itemType, cost]
          .filter(Boolean)
          .join(' · '),
      },
      score: at === 0 ? 0 : 2,
    })
  }
  for (const item of magicItems) {
    const name = item.name.toLowerCase()
    const at = name.indexOf(q)
    if (at < 0) continue
    scored.push({
      option: {
        kind: 'magic',
        id: item.id,
        name: item.name,
        detail: [item.rarity, item.itemType, item.requiresAttunement ? 'attunement' : null].filter(Boolean).join(' · '),
      },
      score: (at === 0 ? 0 : 2) + 1,
    })
  }
  return scored
    .sort((a, b) => a.score - b.score || a.option.name.localeCompare(b.option.name))
    .slice(0, limit)
    .map(s => s.option)
}

/**
 * The store input for a picked option. `baseId` is the mundane item a generic
 * magic item is made from (MYDND-278), which the row then hydrates against.
 */
export function addInputFor(option: PickerOption, quantity: number, baseId?: string | null): AddItemInput {
  const qty = Math.max(1, Math.floor(quantity) || 1)
  return option.kind === 'magic'
    ? { magic_item_id: option.id, name: option.name, quantity: qty, ...(baseId ? { base_content_item_id: baseId } : {}) }
    : { content_item_id: option.id, name: option.name, quantity: qty }
}

/** What a generic magic item is made from. */
export type GenericBaseKind = 'weapon' | 'armor' | 'shield' | 'ammunition'

/**
 * Whether a magic item is a "+1 Weapon"-style generic variant that needs a
 * mundane base chosen, and of what kind (MYDND-278).
 *
 * A `Generic Variant` note names no base (`base_item` is for the items that are
 * exactly one weapon, a Dagger of Venom), and nothing structured says what
 * kind: its summary does, in the book's own words — "this magic weapon", "this
 * armor", "this Shield", "this piece of magic ammunition". Without a base the
 * row is neither weapon nor armour on the sheet: a +1 Longsword with no dice,
 * an Armor of Resistance with no AC.
 */
export function genericBaseKind(
  magic: Pick<MagicItemRow, 'itemType' | 'name' | 'summary' | 'baseItemType'>,
): GenericBaseKind | null {
  if ((magic.itemType ?? '').toLowerCase() !== 'generic variant') return null
  const text = `${magic.name} ${magic.summary ?? ''} ${magic.baseItemType ?? ''}`
  if (/ammunition|\barrows?\b|\bbolts?\b/i.test(text)) return 'ammunition'
  if (/\bshield\b/i.test(text)) return 'shield'
  if (/\barmou?r\b|\bplate\b|\bmail\b/i.test(text)) return 'armor'
  if (/weapon|sword|blade|\baxe\b|scimitar|\bbow\b|mace|hammer|spear/i.test(text)) return 'weapon'
  return null
}

const BASE_TYPES: Record<GenericBaseKind, readonly string[]> = {
  weapon: ['Melee Weapon', 'Ranged Weapon'],
  armor: ['Light Armor', 'Medium Armor', 'Heavy Armor'],
  shield: ['Shield'],
  ammunition: ['Ammunition'],
}

/** The mundane items a generic magic item of this kind can be made from, by name. */
export function baseOptions(kind: GenericBaseKind, items: readonly ItemRow[]): ItemRow[] {
  const types = BASE_TYPES[kind]
  return items.filter(i => types.includes(i.itemType ?? '')).sort((a, b) => a.name.localeCompare(b.name))
}

