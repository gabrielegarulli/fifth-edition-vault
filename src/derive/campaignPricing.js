// What a campaign's own economy does to the price of a magic item — VAULT-42.
//
// Pure rules math, no DB and no React. This module is canonical for the one
// number the rule is made of; `magicItemValue.js` and `magicItemCraftCost.js`
// both scale their rarity bands through `scaleByPercent` below, and the three
// RPCs (`sell_item`, `buy_item`, `craft_item`) implement the same arithmetic in
// plpgsql. Change one and you must change the others.
//
// ## The rule, in one sentence
//
// A campaign may say its magic economy runs at some percentage of the book's,
// and that percentage scales the **rarity bands** — never a price a GM has
// typed by hand.
//
// ## Why one number and not a table of six
//
// The obvious shape is a per-rarity override table: one row per (campaign,
// rarity), so a GM can say a rare is 3,000gp here without touching commons.
// That is six numbers to fill in, and six numbers is a spreadsheet — a GM
// reasons about "this world pays half", not about a price ladder they have to
// keep internally consistent themselves.
//
// One multiplier also keeps the ladder a ladder. VAULT-39 made market value and
// enchanting cost **one** table on purpose, because two independent ladders had
// produced margins neither could explain (crafting a very rare cost 25,000gp
// and selling it paid 20,000, while a legendary cost 100,000 and sold for
// exactly 100,000 — a loss and a break-even in adjacent bands, for no reason).
// Six free-form overrides re-open exactly that door. A single percentage cannot:
// it scales value and craft cost by the same factor, so
//
//   make it for X · buy it for 2X · sell it back for X/2
//
// survives at any setting, which is the property the whole shop is built on.
//
// ## Why it scales the bands and not the per-item overrides
//
// `magic_item.value_cp` and `magic_item.craft_gold` are what a GM types when the
// band is the wrong answer for one specific item. Scaling those would silently
// move a number somebody chose deliberately — the campaign multiplier would
// overrule the more specific statement, which is backwards. So the override
// wins outright and the percentage never sees it.
//
// The consequence worth knowing: in a campaign at 50%, an item with an explicit
// `value_cp` is *not* half price. That is the intended reading — a hand-priced
// item is priced, full stop.
//
// ## Why a whole-number percent rather than a float multiplier
//
// The same reason `quirkValueFactor` is kept as an exact fraction: every price
// in this app is an integer number of copper, and the client quotes a figure
// the server is about to pay. A float multiplier makes the two agree only up to
// however each language rounded, and `0.1 * 3` is the classic way that goes
// wrong. An integer percent over a denominator of 100 is exact in both
// languages, so `scaleByPercent` here and `round(n * pct / 100)` in plpgsql
// (numeric, not float) produce the same integer bit for bit.

/**
 * What a campaign that has said nothing runs at. 100 means "the book's prices",
 * which is what every campaign gets until a GM changes it — the column defaults
 * to this, so an untouched campaign prices exactly as it did before VAULT-42.
 */
export const CAMPAIGN_VALUE_PERCENT_DEFAULT = 100

/**
 * The bounds a campaign's percentage is held inside, matched by a CHECK
 * constraint on `campaign_codes.magic_item_value_percent`.
 *
 * **Zero is allowed and is not the same as "unset".** A campaign at 0% is one
 * where magic items cannot be sold for anything and cost nothing to buy — a
 * coherent, if bleak, ruling, and the same distinction `magic_item.value_cp`
 * already draws between `0` and NULL.
 *
 * The ceiling is 1,000% rather than unbounded because the numbers downstream
 * are real currency: a legendary at 10,000,000cp doubles to buy and multiplies
 * by a stack quantity before anything divides. Ten times book keeps the worst
 * case comfortably inside `bigint` with room to spare, and no table needs more.
 */
export const CAMPAIGN_VALUE_PERCENT_MIN = 0
export const CAMPAIGN_VALUE_PERCENT_MAX = 1000

/**
 * Round-half-up on whole numbers: floor((2n + d) / 2d).
 *
 * Kept in integers so the halfway case is decided by arithmetic rather than by
 * which side of a float the quotient landed on — the same technique
 * `roundDiv` in `craftingQuirks.js` uses, and the same result Postgres's
 * `round(numeric)` gives for the non-negative values this ever sees.
 *
 * Everything reaching here is non-negative, so there is no floor-toward-zero
 * ambiguity to resolve.
 */
function roundDiv(numerator, denominator) {
  const doubled = 2 * numerator + denominator
  const remainder = doubled % (2 * denominator)
  return (doubled - remainder) / (2 * denominator)
}

/**
 * A campaign's magic-item percentage, read off a `campaign_codes` row.
 *
 * Written to be called once per surface beside `const quirkCosts =
 * !!activeCampaign?.quirk_costs`, which is the shape every pricing component
 * already uses. A missing campaign, a missing column or a nonsense value all
 * fall back to the book, because the failure a GM must never see is the app
 * quoting a price the server will not pay.
 *
 * @param {object|null|undefined} campaign a `campaign_codes` row
 * @returns {number} a whole percentage inside the bounds above
 */
export function campaignValuePercent(campaign) {
  const stored = campaign?.magic_item_value_percent
  // Checked before the cast, because `Number(null)` is **0**, not NaN — so a
  // row selected without this column, or one arriving from a client that has
  // not been updated, would otherwise price the entire campaign at nothing
  // while the server charged full price. The column is NOT NULL, so this is
  // about the shapes that reach here, not about the database.
  if (stored == null) return CAMPAIGN_VALUE_PERCENT_DEFAULT
  // Same trap one step along: `Number('')` and `Number('   ')` are also 0.
  if (typeof stored === 'string' && stored.trim() === '') return CAMPAIGN_VALUE_PERCENT_DEFAULT
  const raw = Number(stored)
  if (!Number.isFinite(raw)) return CAMPAIGN_VALUE_PERCENT_DEFAULT
  const whole = Math.round(raw)
  if (whole < CAMPAIGN_VALUE_PERCENT_MIN) return CAMPAIGN_VALUE_PERCENT_MIN
  if (whole > CAMPAIGN_VALUE_PERCENT_MAX) return CAMPAIGN_VALUE_PERCENT_MAX
  return whole
}

/**
 * Scale a rarity band by a campaign's percentage.
 *
 * **Null in, null out, and that is load-bearing.** A null band means "this item
 * has no price" — an artifact, a crafting essence, a rarity the table does not
 * know. Reading it as zero would make the rarest items in the catalog the only
 * free ones, which is the trap `canBeCrafted` and `canBeBought` exist to avoid.
 * A percentage can move what a price *is*; it can never turn "no price" into
 * one, nor a price into "no price".
 *
 * Rounded **here**, once, rather than deferred into the sale arithmetic. That
 * is deliberate: the scaled band is the item's value, the number the drawer
 * displays and the number every other price is derived from, so a sale really
 * is half of the figure the player was shown. Carrying the percentage through
 * to a single ceiling at the end of `quirkedSellCp` would be marginally more
 * exact and would make "worth X, sells for Y" stop satisfying Y = ceil(X / 2).
 *
 * @param {number|null|undefined} amount a band, in whatever unit it is stored
 * @param {number} [percent]
 * @returns {number|null} the scaled band, or null when there was no band
 */
export function scaleByPercent(amount, percent = CAMPAIGN_VALUE_PERCENT_DEFAULT) {
  if (amount == null || !Number.isFinite(Number(amount))) return null
  const pct = campaignValuePercent({ magic_item_value_percent: percent })
  if (pct === CAMPAIGN_VALUE_PERCENT_DEFAULT) return Number(amount)
  return roundDiv(Math.round(Number(amount)) * pct, 100)
}
