
// **A campaign may run its own economy** (VAULT-42), and it moves this table
// too. The multiplier scales market value and enchanting cost by the same
// factor on purpose: VAULT-39 made them one ladder, so a knob that moved only
// one of them would re-open the incoherence that unification closed — at 50%,
// scaling value alone would make a rare cost 5,000gp to craft and 5,000gp to
// buy, so crafting would be strictly pointless. Scaling both keeps "make it for
// X, buy it for 2X, sell it back for X/2" true at every setting.
import { CAMPAIGN_VALUE_PERCENT_DEFAULT, scaleByPercent } from './campaignPricing.js'

export const MAGIC_ITEM_CRAFT_COST_GP = {
  common: 100,
  uncommon: 500,
  rare: 5000,
  'very rare': 25000,
  legendary: 100000,
  artifact: null,
}

/** Copper per gold. `craft_gold` is stored in gold; currency math is copper. */
const CP_PER_GP = 100

function normaliseRarity(rarity) {
  return typeof rarity === 'string' ? rarity.toLowerCase().trim() : ''
}

/**
 * The default enchanting cost for a rarity band, in gold.
 *
 * Scaled by the campaign's percentage when one is given, exactly as
 * `rarityValueCp` scales the value band. Null stays null: an artifact cannot be
 * crafted at any price, and a percentage must never be able to say otherwise.
 *
 * @param {string|null|undefined} rarityId
 * @param {number} [percent] the campaign's `magic_item_value_percent`
 * @returns {number|null} null for artifacts, and for anything not in the table
 */
export function rarityCraftGold(rarityId, percent = CAMPAIGN_VALUE_PERCENT_DEFAULT) {
  return scaleByPercent(MAGIC_ITEM_CRAFT_COST_GP[normaliseRarity(rarityId)] ?? null, percent)
}

/**
 * `magic_item` is not only magic items. Five rows are the crafting **essences**
 * — Frail, Robust, Potent, Mythic, Deific — carrying a `component_type` of
 * 'essence' and a `rarity_id` like anything else. They are harvested, not
 * enchanted, so a crafting cost is meaningless for one; and the band would be
 * actively wrong, since Potent essence is 'very rare' and would price a
 * material a party pulls off a corpse at 25,000gp to make.
 *
 * The same withholding is in `magicItemValue.js` for the same rows and the same
 * reason. An explicit `craft_gold` still wins, so a GM who decides an essence
 * can be synthesised gets their number — it is only the *default* withheld.
 */
function isCraftingMaterial(magicItem) {
  return typeof magicItem.component_type === 'string'
    && magicItem.component_type.toLowerCase().trim() === 'essence'
}

/**
 * What enchanting one magic item costs, in gold.
 *
 * The override wins when it is set, because a recipe the GM has priced by hand
 * is exactly what the band cannot express. `0` is a legitimate override — a
 * recipe declared free — so it is honoured rather than falling through to the
 * band, which is why this tests for null rather than falsiness.
 *
 * `craft_item` implements the same resolution in plpgsql as
 * `COALESCE(mi.craft_gold, CASE WHEN … <> 'essence' THEN r.default_craft_gold END)`
 * and is the authority; the anon key ships in the bundle, so a cost the client
 * sends is not a cost. This exists so the UI can quote the figure the server is
 * about to charge. Change one and you must change the other.
 *
 * @param {object} magicItem a `magic_item` row, or anything with these keys
 * @param {string|null} [magicItem.rarity_id]
 * @param {number|null} [magicItem.craft_gold] per-item override
 * @param {string|null} [magicItem.component_type] 'essence' withholds the band
 * @param {number} [percent] the campaign's `magic_item_value_percent`, which
 *   scales the band only — a hand-priced recipe is returned untouched, for the
 *   same reason `magicItemValueCp` leaves `value_cp` alone
 * @returns {number|null} null when the item cannot be crafted — an artifact, an
 *   essence, or a rarity the table does not know
 */
export function magicItemCraftGold(magicItem, percent = CAMPAIGN_VALUE_PERCENT_DEFAULT) {
  if (!magicItem) return null
  const override = magicItem.craft_gold
  if (override != null && Number.isFinite(Number(override))) return Number(override)
  if (isCraftingMaterial(magicItem)) return null
  return rarityCraftGold(magicItem.rarity_id, percent)
}

/** The same figure in copper, for comparison against a character's purse. */
export function magicItemCraftCostCp(magicItem, percent = CAMPAIGN_VALUE_PERCENT_DEFAULT) {
  const gp = magicItemCraftGold(magicItem, percent)
  return gp == null ? null : gp * CP_PER_GP
}

/**
 * Whether this item can be enchanted at all.
 *
 * A null cost is not "free", it is "no". Reading it as zero is the mistake this
 * module exists to prevent: it would let an artifact be crafted for nothing,
 * which is the cheapest item in the catalog rather than the rarest. `craft_item`
 * raises rather than deducting when it resolves NULL, so the modal has to reach
 * the same conclusion before spending anyone's components.
 *
 * **Not the same question as `isCraftable` in `lib/magicItemCrafting.js`**,
 * which asks whether a particular character is holding the materials right now.
 * This one is about the recipe and is true or false for everybody — hence the
 * different name, so importing both into one file cannot silently pick the
 * wrong one.
 *
 * @param {object} magicItem
 * @returns {boolean}
 */
export function canBeCrafted(magicItem) {
  return magicItemCraftGold(magicItem) != null
}

/**
 * Why an item cannot be crafted, phrased for a player who clicked Craft.
 *
 * @param {object} magicItem
 * @returns {string|null} null when the item *can* be crafted
 */
export function uncraftableReason(magicItem) {
  if (canBeCrafted(magicItem)) return null
  if (!magicItem) return 'This item cannot be crafted.'
  if (normaliseRarity(magicItem.rarity_id) === 'artifact') {
    return 'Artifacts cannot be crafted — they are found, not made.'
  }
  if (isCraftingMaterial(magicItem)) {
    return 'Essence is harvested from a creature, not crafted.'
  }
  return 'This item has no crafting cost and cannot be crafted.'
}
