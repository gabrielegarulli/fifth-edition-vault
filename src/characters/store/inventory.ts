import {
  bearingMax as calculateBearingMax,
  equipBlockedReason,
  isCursed,
  itemName,
  projectedRows,
  unequipBlockedReason,
} from '@vault/derive/loadout.js'
import { attunementBlockedReason } from '@vault/derive/attunement.js'

import {
  CHARSHEET_FENCE,
  readSheetFromNote,
  extractInventoryFromNote,
  generateItemId,
  hydrateRow,
  writeInventoryToNote,
  type AddItemInput,
  type CharacterInventory,
  type EquipInput,
  type InventoryCatalogs,
  type InventoryCurrency,
  type InventoryItem,
  type ToggleInput,
  type TransferInput,
  type UnequipInput,
  preloadCatalogs,
  projectSheetWithInventory,
  readVaultCharacterFromNote,
  extractVitalsFromNote,
} from '../../characterModel'
import type { Sheet } from '../../characterModel'
import { fromYaml, parseNote, serialiseNote, setFence } from '../../platform'
import type { StateVault } from '../../platform'

/**
 * The ` ```vault-inventory ` store: every `Vault.process` write over a
 * character's bag and pouch, and the rules that must hold whoever calls them
 * (attunement, the loadout's slots, cursed items), enforced inside the write
 * (ADR 0005).
 *
 * The fence's shape, its parsing and serialising, and hydrating a row against
 * the catalogs are the pure half, `characterModel/model/inventory.ts`
 * (MYDND-200). This half is the state layer's, and ADR 0003's rules apply to it.
 */

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
