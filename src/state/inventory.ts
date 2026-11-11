import {
  bearingMax as calculateBearingMax,
  equipBlockedReason,
  isCursed,
  itemName,
  projectedRows,
  SLOTS,
  unequipBlockedReason,
} from '@vault/derive/loadout.js'
import { attunementBlockedReason } from '@vault/derive/attunement.js'

import { extractFence } from '../content/fence'
import { projectSheetWithInventory } from '../content/sheetProjection'
import { preloadCatalogs, type ItemDataSource } from '../sheet/equipment'
import { readVaultCharacterFromNote } from '../vaultCharacter/fence'
import { extractVitalsFromNote } from './vitals'
import { CHARSHEET_FENCE, readSheetFromNote } from '../ddb/charsheet'
import type { Sheet } from '../ddb/sheet'
import { fromYaml, parseNote, serialiseNote, setFence } from './note'
import type { StateVault } from './vault'

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

export interface InventoryStore {
  getInventory(characterPath: string): Promise<CharacterInventory>
  addToInventory(characterPath: string, input: AddItemInput): Promise<InventoryItem>
  addEquipmentToInventory(
    characterPath: string,
    input: { contentItemId: string; quantity?: number },
  ): Promise<InventoryItem>
  transferInventory(input: TransferInput): Promise<void>
  equipItem(input: EquipInput): Promise<{ error?: string | null }>
  unequipItem(input: UnequipInput): Promise<{ error?: string | null }>
  updateCurrency(characterPath: string, deltas: Partial<InventoryCurrency>): Promise<InventoryCurrency>
  removeItem(characterPath: string, itemId: string): Promise<void>
  updateItem(characterPath: string, itemId: string, updates: Partial<InventoryItem>): Promise<InventoryItem>
  /**
   * Equip or unequip **without a slot** — how a campaign that plays
   * attunement-to-three holds a sword (MYDND-37). `equipItem` refuses outright
   * when the loadout system is off, so before this the sheet had no way to put
   * a weapon in hand. A curse still refuses the unequip.
   */
  setEquipped(input: ToggleInput): Promise<{ error?: string | null }>
  /**
   * Lay the loadout over a sheet just re-projected from its choices, which
   * comes back with no attacks (MYDND-171).
   */
  syncSheet(characterPath: string, content?: InventoryCatalogs): Promise<void>
  /**
   * Attune or break attunement, enforcing `@vault/derive/attunement.js`'s
   * three-item limit here rather than in the panel — the same reason
   * `equipItem` enforces Bearing: the rule must hold whoever calls it.
   */
  setAttuned(input: ToggleInput): Promise<{ error?: string | null }>
}

/**
 * Keep the frontmatter `ac` in step with what the sheet shows, and a Vault
 * character's `attacks` in step in the charsheet fence, for Atlas (MYDND-171).
 *
 * The fence holds the *base* sheet and `projectSheetWithInventory` lays the
 * loadout over it on every read (`content/characters.ts`, and the in-note
 * renderer). Equip and unequip used to write the projected sheet back into the
 * fence, so the next projection ran over an already-projected base: an
 * unequipped sword kept its attack line and doffed armour kept its AC until a
 * re-sync (found in MYDND-37). Frontmatter `ac` is still written, because
 * Atlas reads the number there.
 *
 * Atlas reads `attacks` from the fence and nowhere else, so a Vault character's
 * are written there. That is safe where MYDND-37's was not: this path of the
 * projection drops every `source: 'item'` line and the Unarmed Strike before it
 * adds them again, and only `attacks` is written. A D&D Beyond sheet's attacks
 * are its own, and a projection over them keeps a line it should drop, so that
 * fence is still left alone.
 */
function withSheetProjection(markdown: string, inv: CharacterInventory, catalogs?: InventoryCatalogs): string {
  const sheet = readSheetFromNote(markdown, fromYaml)
  if (!sheet) return markdown
  const projected: Sheet = JSON.parse(JSON.stringify(sheet))
  projectSheetWithInventory(projected, inv, catalogs, {
    vaultJson: projected.vault_bake ? readVaultCharacterFromNote(markdown) : null,
    activeEffects: extractVitalsFromNote(markdown).activeEffects,
  })
  if (typeof projected.ac !== 'number') return markdown
  const { frontmatter, body } = parseNote(markdown)
  const attacksMoved = Boolean(sheet.vault_bake) && JSON.stringify(sheet.attacks ?? []) !== JSON.stringify(projected.attacks ?? [])
  if (frontmatter.ac === projected.ac && !attacksMoved) return markdown
  frontmatter.ac = projected.ac
  return serialiseNote({
    frontmatter,
    body: attacksMoved ? setFence(body, CHARSHEET_FENCE, { ...sheet, attacks: projected.attacks }) : body,
  })
}

export function createInventory(vault: StateVault): InventoryStore {
  /**
   * The catalogs `withSheetProjection` reads, with every item in the note loaded first:
   * the write's transform is synchronous, and an armour's AC is in its fence.
   */
  const acCatalogs = async (characterPath: string, content?: InventoryCatalogs): Promise<InventoryCatalogs | undefined> => {
    if (!content?.source) return content
    const md = await vault.read(characterPath)
    return preloadCatalogs(md ? extractInventoryFromNote(md).items : [], content.source, content)
  }

  const getInventory = async (characterPath: string): Promise<CharacterInventory> => {
    const md = await vault.read(characterPath)
    if (!md) return { currency: { pp: 0, gp: 0, sp: 0, cp: 0 }, items: [] }
    return extractInventoryFromNote(md)
  }

  const addToInventory = async (characterPath: string, input: AddItemInput): Promise<InventoryItem> => {
    let resultItem: InventoryItem | null = null
    await vault.write(characterPath, md => {
      const inv = extractInventoryFromNote(md)
      const qty = Math.max(1, input.quantity || 1)

      // **Quirks defeat stacking.** `craft_item` takes `p_has_quirks` and skips
      // the merge for the same reason: two daggers with different flaws are two
      // rows, and `quirkedSellCp` would otherwise price a stack of two by one
      // of their quirk sets.
      const hasQuirks = Array.isArray(input.quirks) && input.quirks.length > 0

      // Stacking checks: component, essence, or unslotted mundane equipment
      let existing: InventoryItem | undefined
      if (hasQuirks) {
        existing = undefined
      } else if (input.component_id) {
        existing = inv.items.find(i => i.component_id === input.component_id)
      } else if (input.essence_id) {
        existing = inv.items.find(i => i.essence_id === input.essence_id)
      } else if (input.content_item_id && !input.magic_item_id) {
        existing = inv.items.find(
          i =>
            i.content_item_id === input.content_item_id &&
            !i.loadout_slot &&
            !i.equipped &&
            !i.custom_name,
        )
      }

      if (existing) {
        existing.quantity += qty
        existing.updated_at = new Date().toISOString()
        resultItem = { ...existing }
      } else {
        const newItem: InventoryItem = {
          id: generateItemId(),
          quantity: qty,
          name: input.name ?? null,
          custom_name: input.custom_name ?? null,
          content_item_id: input.content_item_id ?? null,
          magic_item_id: input.magic_item_id ?? null,
          component_id: input.component_id ?? null,
          essence_id: input.essence_id ?? null,
          base_content_item_id: input.base_content_item_id ?? null,
          equipped: false,
          attuned: false,
          loadout_slot: null,
          updated_at: new Date().toISOString(),
        }
        if (hasQuirks) newItem.quirks = input.quirks!.map(q => ({ ...q }))
        inv.items.push(newItem)
        resultItem = { ...newItem }
      }

      return writeInventoryToNote(md, inv)
    })

    return resultItem!
  }

  const addEquipmentToInventory = (
    characterPath: string,
    input: { contentItemId: string; quantity?: number },
  ) => {
    return addToInventory(characterPath, {
      content_item_id: input.contentItemId,
      quantity: input.quantity,
    })
  }

  const transferInventory = async (input: TransferInput): Promise<void> => {
    const { fromCharacterPath, toCharacterPath, itemId, quantity, content } = input
    if (quantity <= 0) return

    // 1. Read sender note and validate
    const senderMd = await vault.read(fromCharacterPath)
    if (senderMd === null) throw new Error(`Sender character note not found: ${fromCharacterPath}`)
    const senderInv = extractInventoryFromNote(senderMd)
    const senderItem = senderInv.items.find(i => i.id === itemId)
    if (!senderItem) throw new Error(`Item ${itemId} not found in sender inventory`)
    if (senderItem.quantity < quantity) {
      throw new Error(`Insufficient quantity: has ${senderItem.quantity}, requested ${quantity}`)
    }

    // Curse check
    if (senderItem.loadout_slot || senderItem.equipped) {
      const hydrated = hydrateRow(senderItem, content)
      if (isCursed(hydrated)) {
        throw new Error(`${itemName(hydrated, 'Item')} is cursed and cannot be removed.`)
      }
    }

    // 2. Read receiver note
    const receiverMd = await vault.read(toCharacterPath)
    if (receiverMd === null) {
      throw new Error(`Receiver character note not found: ${toCharacterPath}`)
    }
    const receiverInv = extractInventoryFromNote(receiverMd)

    // Stack into receiver if applicable
    let receiverStack: InventoryItem | undefined
    if (senderItem.component_id) {
      receiverStack = receiverInv.items.find(i => i.component_id === senderItem.component_id)
    } else if (senderItem.essence_id) {
      receiverStack = receiverInv.items.find(i => i.essence_id === senderItem.essence_id)
    } else if (senderItem.content_item_id && !senderItem.magic_item_id && !senderItem.custom_name) {
      receiverStack = receiverInv.items.find(
        i =>
          i.content_item_id === senderItem.content_item_id &&
          !i.loadout_slot &&
          !i.equipped &&
          !i.custom_name,
      )
    }

    if (receiverStack) {
      receiverStack.quantity += quantity
      receiverStack.updated_at = new Date().toISOString()
    } else {
      receiverInv.items.push({
        ...senderItem,
        id: generateItemId(),
        quantity,
        equipped: false,
        attuned: false,
        loadout_slot: null,
        updated_at: new Date().toISOString(),
      })
    }

    // 3. ATOMIC WRITE TO RECEIVER FIRST
    await vault.write(toCharacterPath, md => writeInventoryToNote(md, receiverInv))

    // 4. ATOMIC WRITE TO SENDER SECOND
    await vault.write(fromCharacterPath, md => {
      const inv = extractInventoryFromNote(md)
      const it = inv.items.find(i => i.id === itemId)
      if (!it) return md
      if (it.quantity === quantity) {
        inv.items = inv.items.filter(i => i.id !== itemId)
      } else {
        it.quantity -= quantity
        it.updated_at = new Date().toISOString()
      }
      return writeInventoryToNote(md, inv)
    })
  }

  const equipItem = async (input: EquipInput): Promise<{ error?: string | null }> => {
    const { characterPath, itemId, slot, campaign, bearingMax, content } = input

    if (campaign && campaign.loadoutSystem === false) {
      return { error: 'This campaign does not use the loadout system' }
    }

    const md = await vault.read(characterPath)
    if (md === null) return { error: `Character note not found: ${characterPath}` }

    const inv = extractInventoryFromNote(md)
    const targetItem = inv.items.find(i => i.id === itemId)
    if (!targetItem) return { error: 'Item not found in inventory' }

    // Hydrated from the notes, not the frontmatter lookup: `isTwoHanded` reads a
    // weapon's properties, which only the fence has. With `data: {}` a
    // greatsword never blocked the off hand (MYDND-57).
    const catalogs = await acCatalogs(characterPath, content)
    const rows = inv.items.map(it => hydrateRow(it, catalogs))
    const row = hydrateRow(targetItem, catalogs)

    const sheet = readSheetFromNote(md, fromYaml)
    const effectiveMax = bearingMax != null ? bearingMax : calculateBearingMax(sheet, rows)

    const reason = equipBlockedReason({ rows, row, slot, max: effectiveMax })
    if (reason) {
      return { error: reason }
    }

    const nextRows = projectedRows({ rows: inv.items, row: targetItem, slot }) as Array<{
      id: string
      loadout_slot?: string | null
      equipped?: boolean
    }>
    inv.items = nextRows.map(nr => {
      const orig = inv.items.find(i => i.id === nr.id)!
      return {
        ...orig,
        loadout_slot: nr.loadout_slot ?? null,
        equipped: Boolean(nr.equipped),
        updated_at: new Date().toISOString(),
      }
    })

    await vault.write(characterPath, currentMd => withSheetProjection(writeInventoryToNote(currentMd, inv), inv, catalogs))

    return { error: null }
  }

  const unequipItem = async (input: UnequipInput): Promise<{ error?: string | null }> => {
    const { characterPath, itemId, content } = input

    const md = await vault.read(characterPath)
    if (md === null) return { error: `Character note not found: ${characterPath}` }

    const inv = extractInventoryFromNote(md)
    const targetItem = inv.items.find(i => i.id === itemId)
    if (!targetItem) return { error: 'Item not found in inventory' }

    const hydrated = hydrateRow(targetItem, content)
    const reason = unequipBlockedReason(hydrated)
    if (reason) {
      return { error: reason }
    }

    targetItem.loadout_slot = null
    targetItem.equipped = false
    targetItem.updated_at = new Date().toISOString()

    const catalogs = await acCatalogs(characterPath, content)
    await vault.write(characterPath, currentMd => withSheetProjection(writeInventoryToNote(currentMd, inv), inv, catalogs))

    return { error: null }
  }

  const updateCurrency = async (
    characterPath: string,
    deltas: Partial<InventoryCurrency>,
  ): Promise<InventoryCurrency> => {
    let resultCurrency: InventoryCurrency = { pp: 0, gp: 0, sp: 0, cp: 0 }
    await vault.write(characterPath, md => {
      const inv = extractInventoryFromNote(md)
      inv.currency = {
        pp: Math.max(0, (inv.currency.pp || 0) + (deltas.pp || 0)),
        gp: Math.max(0, (inv.currency.gp || 0) + (deltas.gp || 0)),
        sp: Math.max(0, (inv.currency.sp || 0) + (deltas.sp || 0)),
        cp: Math.max(0, (inv.currency.cp || 0) + (deltas.cp || 0)),
      }
      resultCurrency = { ...inv.currency }
      return writeInventoryToNote(md, inv)
    })
    return resultCurrency
  }

  const removeItem = async (characterPath: string, itemId: string): Promise<void> => {
    await vault.write(characterPath, md => {
      const inv = extractInventoryFromNote(md)
      inv.items = inv.items.filter(i => i.id !== itemId)
      return writeInventoryToNote(md, inv)
    })
  }

  const updateItem = async (
    characterPath: string,
    itemId: string,
    updates: Partial<InventoryItem>,
  ): Promise<InventoryItem> => {
    let updated: InventoryItem | null = null
    await vault.write(characterPath, md => {
      const inv = extractInventoryFromNote(md)
      const it = inv.items.find(i => i.id === itemId)
      if (it) {
        Object.assign(it, updates)
        it.updated_at = new Date().toISOString()
        updated = { ...it }
      }
      return writeInventoryToNote(md, inv)
    })
    if (!updated) throw new Error(`Item ${itemId} not found in inventory`)
    return updated
  }

  // Both decide inside the write, against the note as it is then, so a second
  // toggle racing the first cannot attune a fourth item.
  const setEquipped = async ({ characterPath, itemId, on, content }: ToggleInput) => {
    let error: string | null = null
    const catalogs = await acCatalogs(characterPath, content)
    await vault.write(characterPath, md => {
      const inv = extractInventoryFromNote(md)
      const it = inv.items.find(i => i.id === itemId)
      if (!it) {
        error = 'Item not found in inventory'
        return md
      }
      // `unequipBlockedReason` answers "not worn" for anything without a slot —
      // in loadout.js, worn *means* slotted — so the curse is checked directly.
      if (!on && (it.equipped || it.loadout_slot)) {
        const row = hydrateRow(it, content)
        if (isCursed(row)) {
          error = `${itemName(row, 'This item')} is cursed — it cannot be removed.`
          return md
        }
      }
      it.equipped = on
      // Taking it off empties its slot too; putting it on never picks one.
      if (!on) it.loadout_slot = null
      it.updated_at = new Date().toISOString()
      return withSheetProjection(writeInventoryToNote(md, inv), inv, catalogs)
    })
    return { error }
  }

  const setAttuned = async ({ characterPath, itemId, on, content }: ToggleInput) => {
    let error: string | null = null
    // Attunement licenses an item's effects, a Ring of Protection's +1 AC among
    // them (MYDND-57), so the frontmatter AC follows it as it follows equipping.
    const catalogs = await acCatalogs(characterPath, content)
    await vault.write(characterPath, md => {
      const inv = extractInventoryFromNote(md)
      const it = inv.items.find(i => i.id === itemId)
      if (!it) {
        error = 'Item not found in inventory'
        return md
      }
      if (on) {
        const rows = inv.items.map(i => hydrateRow(i, content))
        const row = rows.find(r => r.id === itemId)!
        error = attunementBlockedReason(row, rows) ?? null
        if (error) return md
      }
      it.attuned = on
      it.updated_at = new Date().toISOString()
      return withSheetProjection(writeInventoryToNote(md, inv), inv, catalogs)
    })
    return { error }
  }

  const syncSheet = async (characterPath: string, content?: InventoryCatalogs): Promise<void> => {
    const catalogs = await acCatalogs(characterPath, content)
    await vault.write(characterPath, md => withSheetProjection(md, extractInventoryFromNote(md), catalogs))
  }

  return {
    setEquipped,
    syncSheet,
    setAttuned,
    getInventory,
    addToInventory,
    addEquipmentToInventory,
    transferInventory,
    equipItem,
    unequipItem,
    updateCurrency,
    removeItem,
    updateItem,
  }
}
