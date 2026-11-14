// A character's inventory, its fence: the types, parse and serialise, and the
// pure operations and hydration the store and sheet share.

import { SLOTS } from '@vault/derive/loadout.js'

import { extractFence, fromYaml, parseNote, serialiseNote, setFence } from '../../platform'
import type { ItemDataSource } from './sheet/equipment'

export const INVENTORY_FENCE = 'vault-inventory'

export interface InventoryCurrency {
  pp: number
  gp: number
  sp: number
  cp: number
}

export interface InventoryItem {
  id: string
  quantity: number
  name?: string | null
  content_item_id?: string | null
  magic_item_id?: string | null
  component_id?: string | null
  essence_id?: string | null
  base_content_item_id?: string | null
  equipped?: boolean
  attuned?: boolean
  loadout_slot?: string | null
  switch_mode?: number | null
  custom_name?: string | null
  /**
   * Charges spent from a magic item with charges (MYDND-76, MYDND-164) — spent,
   * not left, so a row written before it existed, or an item whose maximum
   * changes on a re-export, reads as full. The sheet's Inventory tab draws and
   * sets it; the maximum is the catalog's `charges`.
   */
  charges_used?: number
  /**
   * The quirks this row was crafted with.
   *
   * `the-vault` keeps them in an `inventory_quirk` table keyed
   * `(inventory_id, quirk_slug)`; here they ride on the row, because the row is
   * already a YAML object in a fence and a second collection keyed by an id
   * would need an id to key it by.
   *
   * **Quirks defeat stacking** — see `AddItemInput.quirks`.
   */
  quirks?: Quirk[]
  updated_at?: string
}

/** One crafting quirk, as `@vault/derive/craftingQuirks.js` draws it. */
export interface Quirk {
  slug: string
  name: string
  phase: string
  kind: string
  stackCount: number
  rolled?: Record<string, unknown>
}

export interface CharacterInventory {
  currency: InventoryCurrency
  items: InventoryItem[]
}

export interface AddItemInput {
  component_id?: string | null
  essence_id?: string | null
  content_item_id?: string | null
  magic_item_id?: string | null
  base_content_item_id?: string | null
  quantity?: number
  name?: string | null
  custom_name?: string | null
  /**
   * Quirks to craft this row with.
   *
   * **Their presence skips the stacking merge**, which is `craft_item`'s
   * `p_has_quirks` parameter reproduced: two daggers that came out of the forge
   * with different flaws are two rows, and merging them would average away the
   * thing that distinguishes them — and `quirkedSellCp` would then price a stack
   * of two by one of their quirk sets.
   */
  quirks?: Quirk[]
}

export interface ItemCatalogLookupInfo {
  id?: string
  name?: string
  itemType?: string | null
  weaponCategory?: string | null
  costCp?: number | null
  data?: Record<string, unknown>
}

export interface MagicItemCatalogLookupInfo {
  id?: string
  name?: string
  itemType?: string | null
  rarity?: string | null
  requiresAttunement?: boolean
  bearingCost?: number | null
  bearingBonus?: number | null
  cursed?: boolean
  loadoutSlot?: string | null
  setName?: string | null
  data?: Record<string, unknown>
}

export interface InventoryCatalogs {
  /**
   * Reads an item note's fence — its dice, properties, armour class (MYDND-57).
   * Without it the frontmatter `ac` written after an equip change is worked out
   * from names alone, with no armour's AC to read.
   */
  source?: ItemDataSource
  items?: {
    byId(id: string): ItemCatalogLookupInfo | undefined | null
    byName?(name: string): ItemCatalogLookupInfo | undefined | null
  }
  magicItems?: {
    byId(id: string): MagicItemCatalogLookupInfo | undefined | null
    byName?(name: string): MagicItemCatalogLookupInfo | undefined | null
  }
}

export interface TransferInput {
  fromCharacterPath: string
  toCharacterPath: string
  itemId: string
  quantity: number
  content?: InventoryCatalogs
}

export interface EquipInput {
  characterPath: string
  itemId: string
  slot: string
  campaign?: { loadoutSystem?: boolean } | null
  bearingMax?: number | null
  content?: InventoryCatalogs
}

export interface UnequipInput {
  characterPath: string
  itemId: string
  content?: InventoryCatalogs
}

export interface ToggleInput {
  characterPath: string
  itemId: string
  /** The new state — `true` equips / attunes, `false` takes it off. */
  on: boolean
  content?: InventoryCatalogs
}

export function generateItemId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `inv-${crypto.randomUUID()}`
  }
  return `inv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

/** Quirks off a row, keeping only what has a slug. */
function parseQuirks(value: unknown): Quirk[] | undefined {
  if (!Array.isArray(value)) return undefined
  const out: Quirk[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const row = raw as Record<string, unknown>
    const slug = typeof row.slug === 'string' ? row.slug.trim() : ''
    if (slug === '') continue
    out.push({
      slug,
      name: typeof row.name === 'string' ? row.name : slug,
      phase: typeof row.phase === 'string' ? row.phase : 'manufacturing',
      kind: typeof row.kind === 'string' ? row.kind : 'flaw',
      // A stack of one is the floor: `quirkValueFactor` multiplies by it, and a
      // zero would make a flaw free.
      stackCount: Math.max(1, Math.floor(Number(row.stackCount) || 1)),
      rolled:
        row.rolled && typeof row.rolled === 'object' && !Array.isArray(row.rolled)
          ? (row.rolled as Record<string, unknown>)
          : undefined,
    })
  }
  return out.length > 0 ? out : undefined
}

export function parseInventory(text: string | null | undefined): CharacterInventory {
  if (!text) {
    return {
      currency: { pp: 0, gp: 0, sp: 0, cp: 0 },
      items: [],
    }
  }
  try {
    const parsed = fromYaml(text) as Record<string, unknown> | null
    const cur = (parsed?.currency as Record<string, unknown>) ?? {}
    const items = Array.isArray(parsed?.items) ? parsed.items : []
    return {
      currency: {
        pp: Math.max(0, Number(cur.pp) || 0),
        gp: Math.max(0, Number(cur.gp) || 0),
        sp: Math.max(0, Number(cur.sp) || 0),
        cp: Math.max(0, Number(cur.cp) || 0),
      },
      items: items.map((it: Record<string, unknown>) => ({
        id: String(it.id || generateItemId()),
        quantity: Math.max(1, Number(it.quantity) || 1),
        name: it.name != null ? String(it.name) : null,
        content_item_id: it.content_item_id != null ? String(it.content_item_id) : null,
        magic_item_id: it.magic_item_id != null ? String(it.magic_item_id) : null,
        component_id: it.component_id != null ? String(it.component_id) : null,
        essence_id: it.essence_id != null ? String(it.essence_id) : null,
        base_content_item_id: it.base_content_item_id != null ? String(it.base_content_item_id) : null,
        equipped: Boolean(it.equipped),
        attuned: Boolean(it.attuned),
        loadout_slot: it.loadout_slot != null ? String(it.loadout_slot) : null,
        switch_mode: typeof it.switch_mode === 'number' ? it.switch_mode : null,
        custom_name: it.custom_name != null ? String(it.custom_name) : null,
        // Absent on almost every row; a zero is not written back as a key.
        ...(Number(it.charges_used) > 0 ? { charges_used: Math.floor(Number(it.charges_used)) } : {}),
        // **Mapped explicitly, or it is lost.** `parseInventory` builds a new
        // object from named keys, so anything absent here is dropped on every
        // read-modify-write — and a crafted item would quietly shed its quirks
        // the first time its quantity changed.
        quirks: parseQuirks(it.quirks),
        updated_at: it.updated_at ? String(it.updated_at) : undefined,
      })),
    }
  } catch {
    return {
      currency: { pp: 0, gp: 0, sp: 0, cp: 0 },
      items: [],
    }
  }
}

export function extractInventoryFromNote(markdown: string): CharacterInventory {
  const fence = extractFence(markdown, INVENTORY_FENCE)
  return parseInventory(fence)
}

export function writeInventoryToNote(markdown: string, inventory: CharacterInventory): string {
  const { frontmatter, body } = parseNote(markdown)
  const updatedBody = setFence(body, INVENTORY_FENCE, inventory)
  return serialiseNote({ frontmatter, body: updatedBody })
}

function inferItemType(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('shield')) return 'Shield'
  if (lower.includes('armor') || lower.includes('plate') || lower.includes('mail') || lower.includes('leather'))
    return 'Medium Armor'
  if (lower.includes('ring')) return 'Ring'
  if (
    lower.includes('sword') ||
    lower.includes('bow') ||
    lower.includes('axe') ||
    lower.includes('dagger') ||
    lower.includes('mace') ||
    lower.includes('hammer') ||
    lower.includes('spear')
  ) {
    return 'Melee Weapon'
  }
  return 'Wondrous Item'
}

export interface HydratedRow {
  id: string
  loadout_slot?: string | null
  equipped?: boolean
  attuned?: boolean
  quantity: number
  magic_item?: {
    id?: string | null
    name?: string | null
    item_type?: string | null
    rarity_id?: string | null
    /** What `@vault/derive/attunement.js` reads — the 3-item limit is keyed on it. */
    requires_attunement?: boolean
    loadout_slot?: string | null
    bearing_cost?: number | null
    bearing_bonus?: number | null
    cursed?: boolean
    set_name?: string | null
    /** `magic_item.data` — its `effects` are what `@vault/derive` fires (MYDND-57). */
    data?: Record<string, unknown>
    base_item?: {
      id?: string | null
      name?: string | null
      item_type?: string | null
      weapon_category?: string | null
      data?: Record<string, unknown>
    } | null
  }
  content_item?: {
    id?: string | null
    name?: string | null
    item_type?: string | null
    weapon_category?: string | null
    cost_cp?: number | null
    data?: Record<string, unknown>
  }
  base_content_item?: {
    id?: string | null
    name?: string | null
    item_type?: string | null
    weapon_category?: string | null
    data?: Record<string, unknown>
  }
  [k: string]: unknown
}

export function hydrateRow(
  item: InventoryItem,
  catalogs?: InventoryCatalogs,
): HydratedRow {
  const row: HydratedRow = {
    id: item.id,
    loadout_slot: item.loadout_slot ?? null,
    equipped: Boolean(item.equipped),
    attuned: Boolean(item.attuned),
    quantity: item.quantity,
  }

  const rawName = item.custom_name || item.name || item.magic_item_id || item.content_item_id || 'Item'

  if (item.magic_item_id) {
    const mi =
      catalogs?.magicItems?.byId(item.magic_item_id) ||
      catalogs?.magicItems?.byName?.(item.magic_item_id)
    const baseContent =
      item.base_content_item_id && catalogs?.items
        ? catalogs.items.byId(item.base_content_item_id) ||
          catalogs.items.byName?.(item.base_content_item_id)
        : null

    const type = mi?.itemType || inferItemType(rawName)
    row.magic_item = {
      id: item.magic_item_id,
      name: mi?.name ?? rawName,
      item_type: type,
      rarity_id: mi?.rarity ? String(mi.rarity).toLowerCase() : 'common',
      requires_attunement: Boolean(mi?.requiresAttunement),
      loadout_slot: mi?.loadoutSlot ?? (SLOTS.includes(type.toLowerCase()) ? type.toLowerCase() : null),
      bearing_cost: mi?.bearingCost ?? null,
      bearing_bonus: mi?.bearingBonus ?? null,
      cursed: Boolean(
        mi?.cursed ||
          rawName.toLowerCase().includes('cursed') ||
          rawName.toLowerCase().includes('vulnerability'),
      ),
      set_name: mi?.setName ?? null,
      data: mi?.data ?? {},
      base_item: baseContent
        ? {
            id: baseContent.id,
            name: baseContent.name,
            item_type: baseContent.itemType,
            weapon_category: baseContent.weaponCategory,
            data: baseContent.data ?? {},
          }
        : null,
    }
  }

  if (item.content_item_id) {
    const ci =
      catalogs?.items?.byId(item.content_item_id) ||
      catalogs?.items?.byName?.(item.content_item_id)
    const type = ci?.itemType || inferItemType(rawName)
    row.content_item = {
      id: item.content_item_id,
      name: ci?.name ?? rawName,
      item_type: type,
      weapon_category: ci?.weaponCategory ?? null,
      cost_cp: ci?.costCp ?? null,
      data: ci?.data ?? {},
    }
  }

  if (!item.magic_item_id && !item.content_item_id) {
    // Ad-hoc item
    row.content_item = {
      id: item.id,
      name: rawName,
      item_type: inferItemType(rawName),
      weapon_category: null,
      cost_cp: null,
      data: {},
    }
  }

  if (item.base_content_item_id && catalogs?.items) {
    const bci =
      catalogs.items.byId(item.base_content_item_id) ||
      catalogs.items.byName?.(item.base_content_item_id)
    if (bci) {
      row.base_content_item = {
        id: bci.id,
        name: bci.name,
        item_type: bci.itemType,
        weapon_category: bci.weaponCategory,
        data: bci.data ?? {},
      }
    }
  }

  return row
}
