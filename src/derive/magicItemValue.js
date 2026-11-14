// @ts-check
// What a magic item is worth — VAULT-37, re-anchored by VAULT-39.
//
// Pure rules math, no DB and no React, sitting alongside `craftingQuirks.js`.
// This module is canonical: the `rarity.default_value_cp` column is generated
// from the table below by migration, so `sell_item` can resolve a price with a
// join instead of carrying a `CASE` that drifts from the JS. Change the table
// here and regenerate; do not hand-edit the SQL.
//
// **The rule, in one sentence:** a magic item's market value is what it costs
// to enchant one, unless the catalog row names a value of its own, and an
// artifact is worth nothing because it is priceless. A shop sells at twice that
// and buys back at half of it — a spread of four.
//
//   common 100gp · uncommon 500gp · rare 5,000gp · very rare 25,000gp
//   legendary 100,000gp · artifact null
//
// ## Why the craft cost and not the DMG's own price table
//
// VAULT-37 shipped this as DMG 2024 "Magic Item Prices" (common 100, uncommon
// 400, rare 4,000, very rare 40,000, legendary 200,000). VAULT-39 changed it,
// because the buy side is what forced the question: with two independent
// tables, crafting a very rare item cost 25,000gp and selling it paid 20,000,
// while crafting a legendary cost 100,000 and selling it paid 100,000 — so the
// margin on making an item swung from a small loss to exactly nothing across
// two adjacent bands, for no reason either table could explain.
//
// Anchoring both on the craft cost makes one number per item and one spread
// everywhere: make it for X, buy it for 2X, sell it back for X/2. In a app
// built around a crafting chapter, crafting being the cheapest route to an item
// is the outcome to design for, and this is what states it.
//
// The table is therefore **derived from `magicItemCraftCost.js` rather than
// copied out of it**, so "market value is the craft cost" is a fact in the code
// and not a coincidence that two lists have to keep agreeing. That module
// carries the reasoning for the numbers themselves, including why they are a
// project decision with no book behind them.
//
// **The two per-item overrides stay independent, and that is deliberate.** It
// is the *bands* that were unified, not the columns. `magic_item.value_cp` says
// what one item is worth on the market; `magic_item.craft_gold` says what one
// recipe costs to run. A GM who prices a bespoke recipe by hand has not thereby
// said anything about the shelf price, so `craft_gold` does not move the market
// value — set `value_cp` as well if it should. Both are NULL on all 1,998 rows
// today, so the bands are the whole rule in practice; keeping them separate is
// what stops `sell_item` from having to join and unit-convert a second column.
// **A campaign may run its own economy** (VAULT-42). Every function below takes
// an optional whole-number percentage that scales the *rarity band* — never a
// per-item `value_cp`, which is a price a GM typed and means what it says. The
// default of 100 reproduces the book exactly, so a campaign that has said
// nothing prices as it always did. `campaignPricing.js` carries the reasoning
// and is canonical for the arithmetic.
import { MAGIC_ITEM_CRAFT_COST_GP } from './magicItemCraftCost.js'
import { CAMPAIGN_VALUE_PERCENT_DEFAULT, scaleByPercent } from './campaignPricing.js'

// Copper per gold, so the table below can be read in the units the book prints.
const CP_PER_GP = 100

/**
 * A `magic_item` row, or anything with these keys.
 *
 * - `rarity_id`: the rarity's lower-case name.
 * - `value_cp`: the per-item override, in copper.
 * - `component_type`: `'essence'` withholds the band.
 *
 * @typedef {{ rarity_id?: string | null, value_cp?: number | string | null, component_type?: string | null }} ValuedItem
 */
/**
 * An `inventory` row with its `content_item` / `magic_item` embeds.
 *
 * @typedef {{ content_item?: { cost_cp?: number | string | null } | null, magic_item?: ValuedItem | null }} ValuedRow
 */

/**
 * What a magic item of each rarity is worth, in gold. Keyed by `rarity.id`,
 * which is the lower-case name — the same key `ENCHANTING_DC` and `ITEM_SAVE_DC`
 * in `craftingQuirks.js` use.
 *
 * A copy of the enchanting-cost table rather than a second list of numbers: see
 * the header. Spread rather than re-exported so a caller mutating one cannot
 * reach the other, but it is the same table by construction — change
 * `MAGIC_ITEM_CRAFT_COST_GP` and this follows.
 *
 * **Artifact is null on purpose, and null is an answer.** The book prices five
 * bands and calls artifacts priceless; inventing a sixth number would be the
 * one row in this table with no source behind it. A null value means the item
 * can be neither bought nor sold, which is what "priceless" has to mean in a
 * shop.
 */
/** @type {Readonly<Record<string, number | null>>} */
export const MAGIC_ITEM_VALUE_GP = { ...MAGIC_ITEM_CRAFT_COST_GP }

/** The same table in copper — the unit every price in the app is stored in. */
/** @type {Readonly<Record<string, number | null>>} */
export const MAGIC_ITEM_VALUE_CP = Object.fromEntries(
  Object.entries(MAGIC_ITEM_VALUE_GP).map(([rarity, gp]) => [
    rarity,
    gp == null ? null : gp * CP_PER_GP,
  ]),
)

/**
 * @param {unknown} rarity
 * @returns {string}
 */
function normaliseRarity(rarity) {
  return typeof rarity === 'string' ? rarity.toLowerCase().trim() : ''
}

/**
 * The default value for a rarity band, in copper.
 *
 * Scaled by the campaign's percentage when one is given — this is the only
 * place the band is read, so it is the only place the campaign economy has to
 * be applied. A null band stays null at any percentage: an artifact is
 * priceless in a rich campaign and in a poor one alike.
 *
 * @param {string|null|undefined} rarityId
 * @param {number} [percent] the campaign's `magic_item_value_percent`
 * @returns {number|null} null for artifacts, and for anything not in the table
 */
export function rarityValueCp(rarityId, percent = CAMPAIGN_VALUE_PERCENT_DEFAULT) {
  return scaleByPercent(MAGIC_ITEM_VALUE_CP[normaliseRarity(rarityId)] ?? null, percent)
}

/**
 * `magic_item` is not only magic items. Five rows are the crafting **essences**
 * — Frail, Robust, Potent, Mythic, Deific — carrying a `component_type` of
 * 'essence' and a `rarity_id` like anything else. They are the currency
 * enchanting is paid in, not goods with a market price, and the rarity band is
 * emphatically the wrong number for one: Potent essence is 'very rare', so the
 * band would sell a crafting material for 20,000gp.
 *
 * The same essences also reach `inventory` through `essence_id`, which points
 * at the separate `essence` table and which `sell_item` does not join at all —
 * so those already price at nothing. Withholding the band here makes the two
 * representations of one thing agree, rather than one of them being a money
 * printer.
 *
 * An explicit `value_cp` still wins, so a GM who decides an essence has a price
 * can say so. It is only the *default* that is withheld.
 */
/** @param {{ component_type?: string | null }} magicItem */
function isCraftingMaterial(magicItem) {
  return typeof magicItem.component_type === 'string'
    && magicItem.component_type.toLowerCase().trim() === 'essence'
}

/**
 * What one magic item is worth, in copper.
 *
 * The override wins when it is set, because a uniquely valuable item is exactly
 * the case the rarity table cannot express. `0` is a legitimate override — an
 * item the GM has declared worthless — so it is honoured rather than falling
 * through to the band, which is why this tests for null rather than falsiness.
 *
 * `sell_item` implements the same resolution in plpgsql as
 * `COALESCE(mi.value_cp, CASE WHEN … <> 'essence' THEN r.default_value_cp END)`
 * and is the authority; this exists so the UI can quote the figure the server
 * is about to pay. Change one and you must change the other.
 *
 * @param {ValuedItem | null | undefined} magicItem
 * @param {number} [percent] the campaign's `magic_item_value_percent`, which
 *   scales the band only — the override is returned untouched
 * @returns {number|null} null when the item has no value — an artifact, an
 *   essence, or a rarity the table does not know
 */
export function magicItemValueCp(magicItem, percent = CAMPAIGN_VALUE_PERCENT_DEFAULT) {
  if (!magicItem) return null
  const override = magicItem.value_cp
  if (override != null && Number.isFinite(Number(override))) return Number(override)
  if (isCraftingMaterial(magicItem)) return null
  return rarityValueCp(magicItem.rarity_id, percent)
}

/**
 * What a shop charges for a magic item, as a multiple of its market value —
 * VAULT-39.
 *
 * The merchant's margin, and the only number in the buy path that is not the
 * value itself. Two rather than some finer figure because the sell side is
 * already a half: one pivot, doubled going out and halved coming back, gives a
 * spread the player can hold in their head and keeps "the price rule" a single
 * sentence. Crafting an item and selling it to a shop that then resells it
 * loses the party three quarters of the craft cost, which is what a middleman
 * is for.
 */
export const BUY_PRICE_MULTIPLIER = 2

/**
 * What one magic item costs to buy, in copper.
 *
 * `buy_item` implements the same resolution in plpgsql and is the authority —
 * the anon key ships in the bundle, so a price the browser names is not a
 * price. This exists so the UI can quote the figure the server is about to
 * charge. Change one and you must change the other.
 *
 * @param {ValuedItem | null | undefined} magicItem a `magic_item` row
 * @param {number} [percent] the campaign's `magic_item_value_percent`
 * @returns {number|null} null when the item has no value and so cannot be sold
 *   by a shop either — an artifact, an essence, or an unknown rarity
 */
export function magicItemBuyCp(magicItem, percent = CAMPAIGN_VALUE_PERCENT_DEFAULT) {
  const value = magicItemValueCp(magicItem, percent)
  return value == null ? null : value * BUY_PRICE_MULTIPLIER
}

/**
 * Whether a shop could put a price on this item at all.
 *
 * A null price is not "free", it is "no" — the same trap `canBeCrafted` exists
 * to avoid. `buy_item` raises rather than handing the item over when it
 * resolves NULL, so the catalog has to reach the same conclusion before showing
 * a Buy control.
 *
 * Note this asks only about the *item*. Whether a particular campaign stocks it
 * is a separate question, answered by `campaign_shop_stock` and enforced in the
 * RPC; an item can be perfectly priceable and still not be on the shelf.
 *
 * @param {ValuedItem | null | undefined} magicItem
 * @returns {boolean}
 */
export function canBeBought(magicItem) {
  return magicItemBuyCp(magicItem) != null
}

/**
 * Why an item cannot be bought, phrased for whoever is looking at the shelf.
 *
 * @param {ValuedItem | null | undefined} magicItem
 * @returns {string|null} null when the item *can* be bought
 */
export function unbuyableReason(magicItem) {
  if (canBeBought(magicItem)) return null
  if (!magicItem) return 'This item cannot be bought.'
  if (normaliseRarity(magicItem.rarity_id) === 'artifact') {
    return 'Artifacts are priceless — no shop can put a price on one.'
  }
  if (isCraftingMaterial(magicItem)) {
    return 'Essence is harvested from a creature, not sold in shops.'
  }
  return 'This item has no recorded value and cannot be bought.'
}

/**
 * The price base for an inventory row, whichever kind of item it holds, in
 * copper. A mundane item is priced from the catalog, a magic item from the rule
 * above — the single seam that lets one sell path serve both.
 *
 * Mirrors `COALESCE(ci.cost_cp, mi.value_cp, r.default_value_cp)` in
 * `sell_item`, **including the order**. The two are mutually exclusive in the
 * data — no `inventory` row has both a `content_item_id` and a `magic_item_id`,
 * so which is checked first is unobservable today. It is written to match
 * anyway: an order that only agrees by accident is one schema change away from
 * the client quoting a price the server does not pay.
 *
 * **The campaign percentage reaches only the magic branch** (VAULT-42). A
 * campaign saying magic is cheap here has said nothing about rope and rations,
 * and `content_item.cost_cp` is the book's price for mundane goods; scaling it
 * would silently re-price the whole equipment list off a control labelled for
 * magic items. `buy_item`'s mundane branch is untouched for the same reason, so
 * the client and the server agree about that too.
 *
 * @param {ValuedRow | null | undefined} row an `inventory` row with `content_item` / `magic_item` embeds
 * @param {number} [percent] the campaign's `magic_item_value_percent`
 * @returns {number|null} null when the row has no recorded value at all
 */
export function inventoryValueCp(row, percent = CAMPAIGN_VALUE_PERCENT_DEFAULT) {
  if (!row) return null
  const costCp = row.content_item?.cost_cp
  if (costCp != null && Number.isFinite(Number(costCp))) return Number(costCp)
  return row.magic_item ? magicItemValueCp(row.magic_item, percent) : null
}
