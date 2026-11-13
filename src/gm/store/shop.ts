import { currencyToCp, formatCp } from '@vault/derive/currency.js'
import {
  canBeBought,
  inventoryValueCp,
  magicItemBuyCp,
  unbuyableReason,
} from '@vault/derive/magicItemValue.js'

import type { InventoryCurrency, InventoryItem } from '../../characterModel'
import type { InventoryStore } from '../../characters'
import { hydrateRow, type InventoryCatalogs } from '../../characterModel'

/**
 * The shop — `buy_item` and `sell_item`, in JS.
 *
 * Two of the eleven RPCs MYDND-5 left for Phase 5. Single-player makes them
 * tractable for the reason the plan gives: there is no concurrency, so
 * read-modify-write on one file is acceptable where a transaction was required.
 *
 * ## Every price comes from `@vault/derive`
 *
 * `magicItemBuyCp`, `inventoryValueCp`, `canBeBought` and `unbuyableReason` are
 * the authority, and `magicItemValue.js` says so explicitly — the plpgsql
 * `buy_item` and the JS had to agree because the anon key shipped in the web
 * app's bundle, so "a price the browser names is not a price". **Here there is
 * no server at all**, which does not make the client the authority so much as
 * make the shared library the only one. Nothing in this file computes a price.
 *
 * `BUY_PRICE_MULTIPLIER` is 2: the world sells at twice what it pays, so
 * crafting an item and selling it loses three quarters of the craft cost, which
 * is what a middleman is for.
 *
 * **The campaign percentage reaches only the magic branch** (VAULT-42). A
 * campaign saying magic is cheap here has said nothing about rope and rations.
 *
 * ## Change-making is the hard part, and it is here rather than in derive
 *
 * `vault_state.currency` stores `{pp, gp, sp, cp}` **independently — nothing
 * rolls up**, which is the schema's own decision and the reason `charCurrency`
 * reads four numbers rather than one. So spending is not subtraction: a 5 cp
 * purchase out of a purse holding one platinum piece has to break the coin.
 *
 * The rule below is what happens at a table: **pay from the smallest coins
 * first, break a larger one only when the smaller ones will not cover it, and
 * take the change.** That keeps the common case — paying 5 cp from 7 cp —
 * a plain decrement, and no purchase silently converts a purse it did not need
 * to touch.
 */

const DENOMINATIONS = [
  { key: 'cp' as const, cp: 1 },
  { key: 'sp' as const, cp: 10 },
  { key: 'gp' as const, cp: 100 },
  { key: 'pp' as const, cp: 1000 },
]

export const emptyCurrency = (): InventoryCurrency => ({ pp: 0, gp: 0, sp: 0, cp: 0 })

/**
 * The canonical breakdown of an amount of copper, for money *coming in*.
 *
 * **It never produces platinum.** A shop paying 2,000 copper hands over 20 gold,
 * not 2 platinum — platinum is treasure a party finds, not change a merchant
 * makes. Minting it here would quietly turn a party's spendable gold into coins
 * they then have to break to buy rations.
 */
export function breakIntoCoins(cp: number): InventoryCurrency {
  const total = Math.max(0, Math.floor(cp))
  return {
    pp: 0,
    gp: Math.floor(total / 100),
    sp: Math.floor((total % 100) / 10),
    cp: total % 10,
  }
}

export interface SpendResult {
  /** Per-denomination deltas to apply. Negative for coins handed over. */
  deltas: Partial<InventoryCurrency>
  /** Shortfall in copper. `0` when the purse covers it. */
  short: number
}

/**
 * What to subtract from a purse to pay `priceCp`.
 *
 * Smallest coins first, breaking a larger one only when the smaller ones will
 * not cover the rest — and crediting the overshoot back as change. Returns a
 * `short` rather than throwing, because "you cannot afford this" is a thing the
 * UI says and not an error.
 */
export function spendCp(currency: InventoryCurrency, priceCp: number): SpendResult {
  const price = Math.max(0, Math.floor(priceCp))
  const have = currencyToCp(currency) as number
  if (price === 0) return { deltas: {}, short: 0 }
  if (have < price) return { deltas: {}, short: price - have }

  const held: Record<string, number> = { ...currency }
  const spent: Record<string, number> = { pp: 0, gp: 0, sp: 0, cp: 0 }
  let remaining = price

  // Pass one: pay with coins that do not need breaking — every coin whose value
  // still fits inside what is owed.
  for (const d of DENOMINATIONS) {
    if (remaining <= 0) break
    const affordable = Math.min(held[d.key] ?? 0, Math.floor(remaining / d.cp))
    if (affordable <= 0) continue
    spent[d.key] += affordable
    held[d.key] -= affordable
    remaining -= affordable * d.cp
  }

  // Pass two: whatever is left is smaller than any coin still held, so one coin
  // has to be broken. The smallest one that covers it, so the change is least.
  if (remaining > 0) {
    const coin = DENOMINATIONS.find(d => d.cp >= remaining && (held[d.key] ?? 0) > 0)
    // `have >= price` guarantees one exists: if no single coin covered the
    // remainder, pass one would have spent more of the smaller ones.
    if (coin) {
      spent[coin.key] += 1
      const change = coin.cp - remaining
      remaining = 0
      const coins = breakIntoCoins(change)
      spent.gp -= coins.gp
      spent.sp -= coins.sp
      spent.cp -= coins.cp
    }
  }

  const deltas: Partial<InventoryCurrency> = {}
  for (const key of ['pp', 'gp', 'sp', 'cp'] as const) {
    if (spent[key] !== 0) deltas[key] = -spent[key]
  }
  return { deltas, short: remaining > 0 ? remaining : 0 }
}

/** What to add to a purse when money comes in. */
export function receiveCp(cp: number): Partial<InventoryCurrency> {
  const coins = breakIntoCoins(cp)
  const deltas: Partial<InventoryCurrency> = {}
  if (coins.gp) deltas.gp = coins.gp
  if (coins.sp) deltas.sp = coins.sp
  if (coins.cp) deltas.cp = coins.cp
  return deltas
}

export interface ShopItem {
  /** The magic-item catalog row's id — its note slug. */
  id: string
  name: string
  rarity?: string | null
  /** The shape `magicItemValue.js` reads: `rarity_id`, `value_cp`, `item_type`. */
  row: Record<string, unknown>
}

export interface BuyInput {
  characterPath: string
  item: ShopItem
  /** The campaign's `magic_item_value_percent`. */
  percent?: number
  content?: InventoryCatalogs
}

export interface SellInput {
  characterPath: string
  itemId: string
  quantity?: number
  percent?: number
  content?: InventoryCatalogs
}

export interface ShopOutcome {
  ok: boolean
  /** User-visible, and a phrase rather than a code path. */
  error?: string
  /** What changed hands, in copper. */
  priceCp?: number
  currency?: InventoryCurrency
}

export interface Shop {
  /** What this item costs to buy here, or `null` when no shop can price it. */
  buyPrice(item: ShopItem, percent?: number): number | null
  /** Why it cannot be bought, or `null` when it can. */
  refusal(item: ShopItem): string | null
  /** What a character would be paid for one of their rows. */
  sellPrice(item: InventoryItem, percent?: number, content?: InventoryCatalogs): number | null
  buy(input: BuyInput): Promise<ShopOutcome>
  sell(input: SellInput): Promise<ShopOutcome>
}

export function createShop(inventory: InventoryStore): Shop {
  const buyPrice = (item: ShopItem, percent?: number): number | null =>
    (magicItemBuyCp(item.row, percent) as number | null) ?? null

  const refusal = (item: ShopItem): string | null =>
    canBeBought(item.row) ? null : ((unbuyableReason(item.row) as string | null) ?? 'This item cannot be bought.')

  const sellPrice = (item: InventoryItem, percent?: number, content?: InventoryCatalogs): number | null => {
    // Hydrated first, because `inventoryValueCp` reads the *embeds*
    // (`content_item.cost_cp`, `magic_item.rarity_id`) rather than the flat row
    // — the same shape PostgREST returned, which is why `hydrateRow` exists.
    const row = hydrateRow(item, content)
    return (inventoryValueCp(row, percent) as number | null) ?? null
  }

  const buy = async (input: BuyInput): Promise<ShopOutcome> => {
    const no = refusal(input.item)
    if (no) return { ok: false, error: no }

    const priceCp = buyPrice(input.item, input.percent)
    if (priceCp === null) return { ok: false, error: 'This item has no price here.' }

    const { currency } = await inventory.getInventory(input.characterPath)
    const { deltas, short } = spendCp(currency, priceCp)
    if (short > 0) {
      // Named in coins rather than copper: a shortfall of 1,250 means nothing
      // at a table and "12 gp 5 sp" means something.
      return { ok: false, error: `Not enough coin — ${formatCp(short)} short of ${formatCp(priceCp)}.` }
    }

    // The item first, then the money. Two writes, because they are two notes —
    // and in this order deliberately: a failure between them leaves the party
    // with an item they did not pay for, which a GM can take back. The other
    // order loses the coin *and* the item, which they cannot.
    await inventory.addToInventory(input.characterPath, {
      magic_item_id: input.item.id,
      name: input.item.name,
      quantity: 1,
    })
    const next = await inventory.updateCurrency(input.characterPath, deltas)

    return { ok: true, priceCp, currency: next }
  }

  const sell = async (input: SellInput): Promise<ShopOutcome> => {
    const { items } = await inventory.getInventory(input.characterPath)
    const item = items.find(i => i.id === input.itemId)
    if (!item) return { ok: false, error: 'That item is no longer in the inventory.' }

    // Selling something that is equipped would take it off the character
    // sideways — under the loadout system the slot *is* what puts it on the
    // sheet, so an item vanishing from a slot is an AC change nobody asked for.
    if (item.equipped || item.loadout_slot) {
      return { ok: false, error: 'Unequip it first — selling an equipped item would change the sheet.' }
    }

    const unit = sellPrice(item, input.percent, input.content)
    if (unit === null) {
      return { ok: false, error: 'No shop can put a price on this — it has no recorded value.' }
    }

    const quantity = Math.max(1, Math.min(item.quantity, Math.floor(input.quantity ?? 1)))
    const priceCp = unit * quantity

    // The money first, then the item — the mirror of `buy`, and the same
    // argument: a failure between the two leaves the party paid for something
    // they still hold, which is recoverable.
    const next = await inventory.updateCurrency(input.characterPath, receiveCp(priceCp))
    if (quantity >= item.quantity) {
      await inventory.removeItem(input.characterPath, item.id)
    } else {
      await inventory.updateItem(input.characterPath, item.id, { quantity: item.quantity - quantity })
    }

    return { ok: true, priceCp, currency: next }
  }

  return { buyPrice, refusal, sellPrice, buy, sell }
}
