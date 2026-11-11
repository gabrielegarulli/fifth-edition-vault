// The loadout rules — VAULT-51, on the schema VAULT-50 laid down.
//
// Thirteen equipment slots and a point budget called **Bearing**, the
// alternative to attunement-to-three-items, chosen per campaign by the
// `campaign_codes.loadout_system` GM switch.
//
// Pure functions over the equipment rows `inventory.listEquipment` returns,
// deliberately shaped to mirror `attunement.js` so the two systems are
// swappable behind one seam (`itemBenefits.js`) rather than branched on at
// every call site. Like that module this lives in `packages/derive` and not
// beside the panel, because the character-sheet derivation needs
// `loadoutSatisfied` to decide whether a magic item's Effects count, and derive
// cannot import from `apps/`.
//
// **Attunement is kept, not replaced.** Nothing here reads or writes
// `inventory.attuned`, and nothing in `attunement.js` reads `loadout_slot`.
// With the switch off a campaign runs the old code path unchanged — the rule
// VAULT-33 established, and the reason switching back is free.
import { hasWeaponProperty, resolveWeaponData } from './weaponActions.js'

/**
 * The thirteen slots, in the order the paper doll reads them down the body.
 *
 * A **constant and not a lookup table**, by ADR 0017's own test: the set is
 * closed and the rules read it — ring I versus ring II, a two-handed weapon
 * blocking the off hand, the doll's own layout. That is the opposite of
 * `content_item_type`, which grows with every book imported and is never read
 * to compute anything.
 *
 * SQL enforces the same list with a CHECK on `magic_item.loadout_slot` and
 * `inventory.loadout_slot` (migration 20260911010000, amended by 20260915000000).
 * `loadout.test.js` pins this copy to those keys; the two must be edited
 * together — and so must `equip_item`, which re-declares the array inline
 * rather than reading the constraint.
 *
 * **`legs` was replaced by `sidearm` in VAULT-64**, and the catalog is why. The
 * authoring pass over the 840 wondrous rows found the legs slot matched by
 * **nothing**: no trousers, leggings, breeches or kilt exists in any imported
 * book, and a keyword sweep of all 840 names returns zero. A slot no item in
 * the game can ever fill is not a slot, it is a permanently empty row on the
 * paper doll. Both `magic_item` and `inventory` held zero `legs` rows when it
 * went, so nothing was migrated and nothing could be.
 *
 * `sidearm` is what took the thirteenth place: a third weapon slot, a weapon
 * kept ready on the body rather than in a hand. It exists because two hand
 * slots cannot express the most ordinary martial loadout in the game — sword,
 * shield *and* longbow — and so a character carrying a bow had nowhere to put
 * it. Unlike the off hand it accepts a **two-handed** weapon, which is the
 * whole point: it is not a hand, so nothing is being held in it, and the
 * two-handed rule that blocks the off hand has no bearing on it.
 */
export const SLOTS = [
  'head', 'neck', 'back', 'chest', 'belt', 'feet',
  'arms', 'hands', 'ring_1', 'ring_2', 'main_hand', 'off_hand', 'sidearm',
]

/**
 * How each slot is named to a player. Here rather than in a component because
 * `ring_1` reads as "Ring 1" to anything that title-cases a key, and the design
 * calls them Ring I and Ring II — a difference no renderer should have to
 * rediscover.
 */
export const SLOT_LABELS = {
  head: 'Head',
  neck: 'Neck',
  back: 'Back',
  chest: 'Chest',
  belt: 'Belt',
  feet: 'Feet',
  arms: 'Arms',
  hands: 'Hands',
  ring_1: 'Ring I',
  ring_2: 'Ring II',
  main_hand: 'Main Hand',
  off_hand: 'Off Hand',
  sidearm: 'Sidearm',
}

/**
 * The two ring slots, which are interchangeable: nothing distinguishes Ring I
 * from Ring II beyond the order the doll draws them, so anything legal in one
 * is legal in the other. Read by `fallbackSlots` and, since VAULT-59, by
 * `legalSlots` for an authored ring as well.
 */
const RING_SLOTS = ['ring_1', 'ring_2']

/**
 * The slots a weapon can occupy — VAULT-64, when `sidearm` joined the two hands.
 *
 * **`off_hand` is in this list but is not treated as a weapon slot by
 * `legalSlots`**, and the asymmetry is deliberate. A weapon may be held there,
 * but so may a shield, and 62 of the 124 magic armour rows are shields that
 * `fallbackSlots` sends to exactly that slot. So an item *authored* to the off
 * hand tells us nothing about whether it is a weapon, while one authored to the
 * main hand or the sidearm does — those two slots take nothing else. Reading an
 * authored `off_hand` as "this is a weapon, offer it every weapon slot" would
 * let a shield be strapped to the main hand.
 */
const WEAPON_SLOTS = ['main_hand', 'off_hand', 'sidearm']

/**
 * Where this weapon may go, given how many hands it needs.
 *
 * A two-handed weapon is refused the off hand — it occupies that slot by
 * *blocking* it rather than by filling it, which is `blockedSlots`' rule — but
 * is offered the sidearm freely. Nothing is held in a sidearm, so a greatsword
 * slung across the back is no more contradictory than a longbow is, and
 * refusing it would recreate the gap the slot was added to close.
 */
function weaponSlots(row) {
  return isTwoHanded(row)
    ? ['main_hand', 'sidearm']
    : [...WEAPON_SLOTS]
}

/**
 * What to call the item on an equipment row, whichever catalog it came from.
 *
 * The refusal phrases this module writes — "The off hand is held by X", "X is
 * cursed and cannot be removed" — all name an item, and since VAULT-60 that
 * item can be a mundane one. Each of those sites had its own `magic_item?.name`
 * read, three of which had no mundane fallback and would have said "a
 * two-handed weapon" where they could have said "Greatsword".
 *
 * The fallback string is the caller's, because the right one depends on the
 * sentence: an empty slot is "Empty" on the doll and "Nothing worn" in the
 * rail.
 *
 * @param {object} row
 * @param {string|null} [fallback] what to return when the row names nothing
 * @returns {string|null}
 */
export function itemName(row, fallback = null) {
  return row?.magic_item?.name ?? row?.content_item?.name ?? fallback
}

/** Bearing every character has before Constitution and before any item. */
export const BASE_BEARING = 8

/**
 * What wearing an item of each rarity costs, keyed by `rarity.id` — the same
 * lower-case key `MAGIC_ITEM_VALUE_GP` and `ENCHANTING_DC` use.
 *
 * **This module is canonical.** `rarity.bearing_cost` holds these six numbers
 * so a future `equip_item` can COALESCE and join instead of carrying a CASE
 * that drifts, exactly as `default_value_cp` (VAULT-37) and
 * `default_craft_gold` (VAULT-41) do for their tables. `loadout.test.js` and a
 * `DO` block in the RPC migration both assert the two still agree.
 *
 * **Unlike those two, there is no null.** Their NULL means "cannot be crafted"
 * / "has no market value" — real answers for an artifact. Every rarity costs
 * *some* bearing, so a missing entry here could only ever be an unanswered
 * question, which is why the column is NOT NULL with no default.
 *
 * The numbers themselves are a project decision with no book behind them: they
 * come from the design handoff, which invented them because the brief left them
 * blank. Common and uncommon at zero means 738 of the 1,998 catalog items cost
 * nothing to wear and are limited only by the thirteen slots — chosen, not
 * overlooked.
 */
export const BEARING_COST_BY_RARITY = {
  common: 0,
  uncommon: 0,
  rare: 1,
  'very rare': 2,
  legendary: 3,
  artifact: 4,
}

function normaliseRarity(rarityId) {
  return typeof rarityId === 'string' ? rarityId.toLowerCase().trim() : ''
}

function toInt(value) {
  return value != null && Number.isFinite(Number(value)) ? Number(value) : null
}

/**
 * The band for a rarity, in bearing.
 *
 * @param {string|null|undefined} rarityId
 * @returns {number} 0 for a rarity the table does not know — an unknown band is
 *   not a reason to refuse to dress, and the slot limit still applies
 */
export function rarityBearingCost(rarityId) {
  return BEARING_COST_BY_RARITY[normaliseRarity(rarityId)] ?? 0
}

/**
 * What one equipment row costs to wear.
 *
 * The per-item override wins when set, because a uniquely burdensome (or
 * weightless) item is exactly what the band cannot express. `0` is a
 * legitimate override, so this tests for null rather than falsiness — the same
 * call `magicItemValueCp` makes.
 *
 * **A mundane row costs nothing, and since VAULT-60 that is a rule with a
 * consequence rather than a line that never fired.** The budget is a licence to
 * carry *magic*, and a greatsword has never needed one — so now that mundane
 * armour, shields and weapons can occupy a slot, a character can fill all
 * thirteen for zero bearing. That is the intended low-level state and not a
 * loophole: a level 3 party owns almost no magic items, and a paper doll they
 * cannot dress is a worse answer than one Bearing does not constrain yet.
 * Bearing constrains magic, and magic is what arrives later. Charging for
 * mundane gear would be a different rule needing a `content_item` column, and
 * nothing in the design asks for one.
 *
 * Note that unlike `magicItemValueCp` this does **not** withhold the band from
 * the five crafting-essence rows. There it mattered because the band would have
 * priced a material at 25,000gp; here the band would only make an essence
 * *more* expensive to wear, and an essence can never be worn anyway —
 * `legalSlots` gives it none.
 *
 * @param {object} row an `inventory` row with a `magic_item` embed
 * @returns {number}
 */
export function bearingCost(row) {
  const item = row?.magic_item
  if (!item) return 0
  const override = toInt(item.bearing_cost)
  if (override != null) return override
  return rarityBearingCost(item.rarity_id)
}

/**
 * How much this item raises maximum bearing while it is worn — the Ring of
 * Warding's 2. Zero for everything else, which is all 1,998 rows today.
 *
 * @param {object} row
 * @returns {number}
 */
export function bearingBonus(row) {
  return toInt(row?.magic_item?.bearing_bonus) ?? 0
}

/**
 * The rows actually occupying a slot.
 *
 * `loadout_slot` and not `equipped`: they are independent columns, because
 * `equipped` still means what it meant to the attunement system and a campaign
 * can switch back. A row is worn under *this* system when it names a slot.
 *
 * @param {object[]} rows
 * @returns {object[]}
 */
export function wornRows(rows) {
  return (rows ?? []).filter(isWorn)
}

/**
 * The same question about one row.
 *
 * Split out for `onSheet` (VAULT-61), which asks it per row rather than over a
 * list and must get exactly the answer `wornRows` gives — the slot is what puts
 * an item on the character sheet under this system, so a second spelling of
 * "is it worn" is a second answer to what AC is.
 *
 * @param {object} row
 * @returns {boolean}
 */
export function isWorn(row) {
  return !!row?.loadout_slot && SLOTS.includes(row.loadout_slot)
}

/**
 * Bearing spent across everything worn.
 *
 * A two-handed weapon is counted once, because occupying the off hand is the
 * *absence* of a row there rather than a second one — the same fact the partial
 * unique index on `(character_id, loadout_slot)` relies on.
 *
 * @param {object[]} rows
 * @returns {number}
 */
export function bearingUsed(rows) {
  return wornRows(rows).reduce((sum, row) => sum + bearingCost(row), 0)
}

/**
 * The Constitution modifier off a derived sheet, or 0 when there is no sheet
 * yet. Both adapters shape `abilityScores` the same way, so this reads either.
 */
function conModifier(sheet) {
  const con = (sheet?.abilityScores ?? []).find(a => a?.key === 'con')
  return toInt(con?.mod) ?? 0
}

/**
 * Maximum bearing: base 8 + Constitution modifier + what is worn.
 *
 * Needs no new character state — the Constitution modifier is already derived,
 * through the whole ASI/feat/effect pipeline, which is precisely why it is
 * *this* function and not plpgsql that knows it. `equip_item` takes the figure
 * as a parameter for that reason; see the RPC's own comment.
 *
 * Never floors: a Constitution of 1 gives 3, which is a hard character to dress
 * and a true one. The bonuses of worn items count, so taking off a Ring of
 * Warding can put a character over their own budget — a real state the panel
 * shows rather than one the rules forbid.
 *
 * @param {object|null} sheet a derived character sheet
 * @param {object[]} rows the character's equipment rows
 * @returns {number}
 */
export function bearingMax(sheet, rows) {
  return bearingBreakdown(sheet, rows).max
}

/**
 * Where the maximum comes from, term by term — VAULT-54, the derivation caption
 * the budget panel (1f) writes across from the big number: "Base 8 +
 * Constitution 2 + Ring of Warding 2".
 *
 * **`bearingMax` is this function's `max`,** rather than the two summing the
 * same terms side by side. A caption that adds up to a different number than
 * the meter beside it is the one failure this panel has that the rail does not,
 * and one addition in one place is what makes it impossible.
 *
 * `bonuses` carries the rows and not just a total, because the caption names
 * them: "+ Ring of Warding 2" is the sentence, and a bare `+2` leaves the
 * player hunting for which item it was. Only rows that actually contribute are
 * listed — today that is none of the 1,998, every one of which has
 * `bearing_bonus` 0.
 *
 * @param {object|null} sheet a derived character sheet
 * @param {object[]} rows the character's equipment rows
 * @returns {{base: number, con: number, bonuses: {row: object, bonus: number}[], max: number}}
 */
export function bearingBreakdown(sheet, rows) {
  const base = BASE_BEARING
  const con = conModifier(sheet)
  const bonuses = wornRows(rows)
    .map(row => ({ row, bonus: bearingBonus(row) }))
    .filter(b => b.bonus !== 0)
  const total = bonuses.reduce((sum, b) => sum + b.bonus, 0)
  return { base, con, bonuses, max: base + con + total }
}

/**
 * Whether a weapon needs both hands. Resolved rather than stored: VAULT-49
 * flagged the missing `magic_item.two_handed` column as a gap, and it is not
 * one — `resolveWeaponData` already answers it off the base item, preferring
 * `inventory.base_content_item_id` (VAULT-28, per copy) over
 * `magic_item.base_item_id` (per catalog row), and `content_item.data
 * .properties` carries the slug.
 *
 * A magic weapon with no resolved base is **not** two-handed as far as the
 * rules can tell. That is the same real answer `baseResolved: false` already
 * gives the Actions tab, where the weapon lists but rolls no damage; inventing
 * a column would only move the guess.
 *
 * Exported since VAULT-55, for `fillPlan` — a kit that puts a greatsword in the
 * main hand has thereby filled the off hand too, and the planner must know that
 * before it tries to fill it again. The alternative was reading it back out of
 * `legalSlots` (a weapon offered the main hand but not the off hand is
 * two-handed), which is true and is an inference where a fact was available.
 */
export function isTwoHanded(row) {
  const weapon = resolveWeaponData(row)
  return !!weapon && hasWeaponProperty(weapon, 'two-handed')
}

const SHIELD_PATTERN = /\bshield\b/i

/**
 * The coarse fallback for an item whose slot nobody has authored.
 *
 * `magic_item.loadout_slot` is the answer whenever it is set; this covers the
 * three buckets a *type* can genuinely answer, and returns nothing for the rest.
 * VAULT-50's migration has the counts: wondrous is 840 rows where a helm, a
 * cloak, a belt, boots and gloves are all `Wondrous item`, and no rule recovers
 * which is which.
 *
 * **It reads either embed since VAULT-60**, and that one change is what lets a
 * character wear their own armour. Until then this opened `const item =
 * row?.magic_item; if (!item) return []`, so every mundane row resolved to no
 * slot, `isSlottable` was false, and 1d's `legalSlots(r).length > 0` filter
 * dropped it before it could be seen — a Shield and a suit of Hide Armor sat in
 * the bag with nowhere to go. Nothing needed authoring to fix it: unlike the
 * magic catalog, `content_item.item_type` already answers for all 156 rows that
 * can be worn (66 Melee Weapon, 72 Ranged Weapon, 13 armour, 5 Shield), and the
 * weapon branch needed no change at all because `resolveWeaponData` reads a
 * mundane row directly and returns `baseResolved: true` for it.
 *
 * Word matching against free text is what VAULT-34 warns about, so note the
 * direction of the risk. There it was used to *rewrite* a value and a wrong
 * guess corrupted the catalog. Here a miss returns `[]` — "unslotted" — which
 * is a state the design already draws and which `loadoutSatisfied` treats as
 * unaffected. The failure mode is an item that costs no bearing, not an item
 * that stops working. The mundane side is safer still: `content_item.item_type`
 * is decoded from 5e.tools type codes by `lib/importItems.js` rather than
 * transcribed out of a PDF, so `Shield` and `Medium Armor` are a lookup's
 * output and not prose.
 *
 * Shields are split out of armour deliberately: 62 of the 124 magic armour rows
 * are `Armour (shield)` or `Shield`, and a shield is held in the off hand rather
 * than worn on the chest. Barding (2 rows) falls through to chest, which is
 * wrong for a horse and harmless for a character who cannot wear it either way.
 * The `armou?r` spelling covers both catalogs at once — the magic side writes
 * `Armour (medium or heavy)` and `content_item` writes `Medium Armor`.
 */
function fallbackSlots(row) {
  // Whichever catalog this row came from. They are mutually exclusive in
  // practice — an `inventory` row names a `content_item` or a `magic_item`,
  // never both — so the order only settles a case that does not arise, and it
  // matches `resolveWeaponData`'s in preferring the row's own content item.
  const rawType = row?.content_item?.item_type ?? row?.magic_item?.item_type
  const type = typeof rawType === 'string' ? rawType : ''

  if (SHIELD_PATTERN.test(type)) return ['off_hand']
  if (/\bring\b/i.test(type)) return [...RING_SLOTS]
  if (/\barmou?r\b/i.test(type)) return ['chest']

  if (resolveWeaponData(row)) return weaponSlots(row)
  return []
}

/**
 * Every slot this row could legally occupy, in the order a picker should offer
 * them.
 *
 * An authored `loadout_slot` is the whole answer, with two exceptions the
 * column cannot express because it holds a single key and the item has a pair
 * of slots open to it:
 *
 * - a weapon authored as `main_hand` or `sidearm` may go in any weapon slot, so
 *   `weaponSlots` answers for all of them at once. A two-handed weapon is never
 *   offered the off hand, because it occupies it by blocking rather than by
 *   filling it — but it *is* offered the sidearm, which is not a hand. Note
 *   `off_hand` is deliberately absent from this branch: a shield is authored
 *   there too, and treating that as "weapon" would offer it the main hand;
 * - **a ring authored as either ring slot may be worn in either** (VAULT-59).
 *   Left as-is this was the one case where authoring made an item *worse* than
 *   leaving it alone: `fallbackSlots` reads `Ring` and offers both, so the
 *   moment a GM picked Ring I out of the new admin Select that ring could no
 *   longer be worn on the other hand. There is no ring equivalent of the
 *   two-handed rule — the slots are interchangeable — so both are always
 *   offered, in `SLOTS` order rather than starting from whichever was authored.
 *
 * Only a magic item can have an *authored* slot — `content_item` has no such
 * column and needs none, because its `item_type` already answers (VAULT-60). So
 * a mundane row always takes the fallback, which is the same route the 840
 * unauthored wondrous rows take.
 *
 * @param {object} row an `inventory` row with a `magic_item` or `content_item`
 *   embed (and optionally `base_content_item` / `magic_item.base_item`)
 * @returns {string[]} empty when the item is unslotted, which is a real state
 */
export function legalSlots(row) {
  const authored = row?.magic_item?.loadout_slot
  if (authored && SLOTS.includes(authored)) {
    if (authored === 'main_hand' || authored === 'sidearm') return weaponSlots(row)
    if (RING_SLOTS.includes(authored)) return [...RING_SLOTS]
    return [authored]
  }
  return fallbackSlots(row)
}

/**
 * Whether this item can go in a slot at all.
 *
 * True for a shield, a suit of armour, a weapon and a ring whether or not any
 * of them is magic; false for an unslotted item, which today is the 840
 * wondrous rows and every mundane row the type vocabulary does not place — a
 * potion, a bedroll, Smith's Tools.
 *
 * **This is not the benefits gate**, and since VAULT-60 the two are separate
 * functions rather than one asked twice — see `loadoutGated` below for why
 * conflating them was wrong the moment a mundane row could answer true.
 *
 * @param {object} row
 * @returns {boolean}
 */
export function isSlottable(row) {
  return legalSlots(row).length > 0
}

/**
 * Slots that cannot be filled given what is already worn, keyed by slot.
 *
 * Only one rule produces one today: a two-handed weapon in the main hand
 * occupies the off hand too. The design renders that slot as "Held by
 * <weapon>", disabled — hence returning the blocking row rather than a bare
 * boolean, so the caller can name it without searching for it again.
 *
 * Cursed items are **not** here. A cursed item locks the slot it is *in*, which
 * is a property of the occupied slot and not of an empty one; see
 * `equipBlockedReason`.
 *
 * @param {object[]} rows
 * @returns {Object<string, {reason: string, blockedBy: object}>}
 */
export function blockedSlots(rows) {
  const blocked = {}
  const mainHand = wornRows(rows).find(r => r.loadout_slot === 'main_hand')
  if (mainHand && isTwoHanded(mainHand)) {
    const name = itemName(mainHand, 'a two-handed weapon')
    blocked.off_hand = { reason: `Held by ${name}`, blockedBy: mainHand }
  }
  return blocked
}

/**
 * Whether a cursed item is holding this row where it is. A cursed item cannot
 * be taken off and cannot be picked as the item to free bearing with.
 *
 * @param {object} row
 * @returns {boolean}
 */
export function isCursed(row) {
  return !!row?.magic_item?.cursed
}

/**
 * Whether this row is subject to the loadout gate — the loadout system's
 * `requiresAttunement`, and the half of `isSlottable` that VAULT-60 had to
 * separate out.
 *
 * Two questions were being asked through one function: "can this go in a slot?"
 * and "do this row's magical benefits depend on being in one?". They gave the
 * same answer for as long as only magic items were slottable, and the moment
 * mundane gear became slottable they diverged — a Shield equipped and not yet
 * slotted would have been reported **inert** on the Equipment panel, and all
 * ten of the live campaign's mundane rows with it. That is wrong in the most
 * confident possible way: a mundane item has no Effects, so there is nothing
 * for a gate to withhold and it can never be inert. It would also have put ten
 * items into VAULT-57's `benefitsLost` dialog the next time the GM touched the
 * switch, warning about benefits that do not exist.
 *
 * So the gate asks for the magic embed explicitly. `attunement.js` has the same
 * shape for the same reason — `requiresAttunement` is what stops a mundane
 * greatsword being judged by a rule it never entered.
 *
 * @param {object} row
 * @returns {boolean}
 */
export function loadoutGated(row) {
  return !!row?.magic_item && isSlottable(row)
}

/**
 * Whether an equipped row's *magical* benefits apply — its Effects, and so its
 * AC bonus and its resistances. The loadout system's answer to
 * `attunementSatisfied`, and gating the same thing for the same reason: the
 * Effects, never the item. A magic breastplate not worn in a slot is still a
 * breastplate and still gives breastplate AC; what it does not give is the +1.
 *
 * That distinction is what makes mundane gear safe to slot: the gate filters
 * `itemEffects` and never `equippedItems`, so base armour AC, weapon actions
 * and the Unarmed Strike loadout read the same rows they always did whether or
 * not anything is in a slot.
 *
 * **An unslotted item is unaffected**, exactly as an item that never asked for
 * attunement is unaffected by that rule. This is load-bearing and it is the
 * cautious direction: 840 wondrous items have no authored slot, so the other
 * reading would mean a GM flipping the campaign switch silently turned off
 * every one of them — the outcome VAULT-48's backfill precedent exists to
 * avoid. The cost is that those items are free to wear until a GM authors them,
 * which is visible on the panel and fixable with an edit.
 *
 * @param {object} row
 * @returns {boolean}
 */
export function loadoutSatisfied(row) {
  return !loadoutGated(row) || !!row?.loadout_slot
}

/**
 * What is worn in each of the thirteen slots, keyed by slot — VAULT-52.
 *
 * The paper doll asks "what is in the head slot?" thirteen times per render, and
 * a `.find()` per slot is thirteen scans of the same list. Built once here so
 * the doll and the compact grid read the same index rather than each filtering
 * their own way to it.
 *
 * A slot with nothing in it is **absent from the map rather than present as
 * null**, so `bySlot[slot]` reads as the occupant or undefined and the caller
 * needs no null check to render an empty slot. Every slot is a key of `SLOTS`
 * regardless, so the doll iterates the constant and not this.
 *
 * @param {object[]} rows
 * @returns {Object<string, object>}
 */
export function bySlot(rows) {
  const map = {}
  for (const row of wornRows(rows)) map[row.loadout_slot] = row
  return map
}

/**
 * The Bearing meter's segments, in the order the design draws them: down the
 * body, one per item that actually costs something.
 *
 * **A zero-cost item gets no segment**, which is why this is not simply
 * `wornRows`. Common and uncommon cost nothing, so 738 of the catalog's 1,998
 * items would otherwise contribute a zero-width sliver — invisible, but with the
 * meter's 2px gap between segments, thirteen of them add 26px of gap to a bar
 * representing nothing spent.
 *
 * Returned rather than computed in the component because the meter and the
 * budget legend (1f, a later ticket) are the same list read twice, and they must
 * not disagree about what is on it.
 *
 * @param {object[]} rows
 * @returns {{row: object, cost: number, rarityId: string|null}[]}
 */
export function bearingSegments(rows) {
  const order = new Map(SLOTS.map((slot, i) => [slot, i]))
  return wornRows(rows)
    .map(row => ({ row, cost: bearingCost(row), rarityId: row.magic_item?.rarity_id ?? null }))
    .filter(seg => seg.cost > 0)
    .sort((a, b) => order.get(a.row.loadout_slot) - order.get(b.row.loadout_slot))
}

/**
 * How far each regalia set the character is wearing has been assembled.
 *
 * **The set sizes are injected**, because the total is a fact about the catalog
 * and `packages/derive` imports no Supabase client (ADR 0013) — the same shape
 * `makeMagicItemTypeVocabulary` uses for the item-type vocabulary. The caller
 * reads `magic_item.set_name` across the catalog and counts; today that is four
 * rows across two sets.
 *
 * **Only sets the character has a piece of are returned.** A list of every set
 * in the catalog with 0/2 beside it is a shopping list, not a status panel, and
 * the design's section is drawn as the latter.
 *
 * Nothing here reports a *bonus*. The design writes tier lines ("2 pieces — +1
 * AC while in sunlight"), and no column holds them: `set_name` is the only set
 * data that exists. Inventing the thresholds in JS would put rules in the app
 * that no GM authored, so the panel shows progress and stops — see VAULT-49's
 * own note that regalia is a column and not a dataset.
 *
 * @param {object[]} rows
 * @param {Object<string, number>} setSizes set name → how many pieces it has
 * @returns {{name: string, worn: number, total: number, pieces: object[]}[]}
 */
export function regaliaProgress(rows, setSizes = {}) {
  const bySet = new Map()
  for (const row of wornRows(rows)) {
    const name = row.magic_item?.set_name
    if (!name) continue
    const pieces = bySet.get(name) ?? []
    pieces.push(row)
    bySet.set(name, pieces)
  }
  return [...bySet.entries()]
    .map(([name, pieces]) => ({
      name,
      worn: pieces.length,
      // A set the caller could not size still reports honestly: the pieces worn
      // are the pieces known, so it reads "2 / 2" rather than "2 / 0".
      total: Math.max(setSizes[name] ?? 0, pieces.length),
      pieces,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * What equipping `row` into `slot` would displace, and what stands in the way.
 *
 * One function rather than a predicate per question, because the conflict
 * dialog needs all of it at once and computing it in pieces is how a dialog
 * comes to disagree with the button that opened it.
 *
 * @param {object} params
 * @param {object[]} params.rows the character's equipment rows
 * @param {object} params.row the row being equipped
 * @param {string} params.slot the slot it is going into
 * @returns {{
 *   displaced: object[],   rows that would come off, cursed or not
 *   cursedLocked: object[], of those, the ones that cannot come off
 *   blocked: object|null,  the two-handed weapon already holding this slot
 *   illegalSlot: boolean,  the item cannot occupy this slot at all
 * }}
 */
export function conflicts({ rows, row, slot }) {
  const worn = wornRows(rows)
  const rowId = row?.id

  // The slot's own occupant, plus the off hand when a two-hander moves in: both
  // come off, and the player has to be told about the second one because
  // nothing they clicked mentions it.
  const takes = [slot]
  if (slot === 'main_hand' && isTwoHanded(row)) takes.push('off_hand')

  const displaced = worn.filter(r => takes.includes(r.loadout_slot) && r.id !== rowId)

  return {
    displaced,
    cursedLocked: displaced.filter(isCursed),
    blocked: blockedSlots(rows)[slot]?.blockedBy ?? null,
    illegalSlot: !legalSlots(row).includes(slot),
  }
}

/**
 * What bearing would stand at if this equip went through:
 * `used - displacedCost + newCost`, the design's own formula.
 *
 * Re-equipping a row into the slot it already occupies nets zero rather than
 * charging twice, which is why `conflicts` excludes the row by id.
 *
 * @param {object} params — as `conflicts`
 * @returns {number}
 */
export function projectedBearing({ rows, row, slot }) {
  const alreadyWorn = wornRows(rows).some(r => r.id === row?.id)
  const { displaced } = conflicts({ rows, row, slot })
  const freed = displaced.reduce((sum, r) => sum + bearingCost(r), 0)
  const added = alreadyWorn ? 0 : bearingCost(row)
  return bearingUsed(rows) - freed + added
}

/**
 * Why this row cannot be equipped into this slot — as a phrase to show the
 * player — or null when it can be. Mirrors `attunementBlockedReason`, including
 * that the current state is part of the question.
 *
 * **Over budget is a refusal, not a warning.** The design is explicit: the
 * confirm button stays disabled until the player frees the points. `equip_item`
 * refuses the same case server-side, because a disabled button is not an
 * enforcement mechanism when the anon key ships in the bundle.
 *
 * @param {object} params
 * @param {object[]} params.rows
 * @param {object} params.row
 * @param {string} params.slot
 * @param {number} params.max maximum bearing, from `bearingMax`
 * @returns {string|null}
 */
export function equipBlockedReason({ rows, row, slot, max }) {
  if (!SLOTS.includes(slot)) return 'That is not an equipment slot.'
  if (!isSlottable(row)) return 'This item does not occupy a slot.'

  const { illegalSlot, blocked, cursedLocked } = conflicts({ rows, row, slot })
  if (illegalSlot) return `This item cannot be worn in the ${SLOT_LABELS[slot]} slot.`
  if (blocked) {
    return `${SLOT_LABELS[slot]} is held by ${itemName(blocked, 'a two-handed weapon')}.`
  }
  if (cursedLocked.length) {
    // Only a magic item is ever cursed, so this one could keep the narrow read
    // — it goes through `itemName` anyway so that every refusal in this module
    // names an item the same way.
    return `${itemName(cursedLocked[0], 'A cursed item')} is cursed and cannot be removed.`
  }

  const projected = projectedBearing({ rows, row, slot })
  if (max != null && projected > max) {
    return `Not enough bearing — this would need ${projected} of ${max}.`
  }
  return null
}

/**
 * The character's equipment rows as they would stand after this equip —
 * VAULT-53.
 *
 * The whole reason 1c can show a *real* before/after rather than a table of
 * hard-coded consequences: hand this to `deriveCharacterSheet` and diff it
 * against the sheet the character already has, and the AC, the passives and the
 * resistances answer for themselves. Nothing here knows what a stat is.
 *
 * Rows are returned in the order they came in, with `loadout_slot` and
 * `equipped` rewritten — exactly the two columns `equip_item` writes, so a
 * projection and the row the server hands back afterwards are the same shape.
 * The list is never reordered and nothing is added or removed: a projection
 * that reshuffled would make the meter's segments jump between the preview and
 * the commit.
 *
 * `freeing` is 1e's radio choice — an item in *another* slot taken off to make
 * room. It is a separate parameter and not just another displacement because
 * the server does it in a separate call: `equip_item` displaces the target
 * slot's occupants itself and knows nothing about freeing a third slot.
 *
 * @param {object} params
 * @param {object[]} params.rows
 * @param {object} params.row the row being equipped
 * @param {string} params.slot
 * @param {object|null} [params.freeing] a worn row to take off first
 * @returns {object[]}
 */
export function projectedRows({ rows, row, slot, freeing = null }) {
  const { displaced } = conflicts({ rows, row, slot })
  const coming = new Set(displaced.map(r => r.id))
  if (freeing && freeing.id !== row?.id) coming.add(freeing.id)

  return (rows ?? []).map(r => {
    if (r.id === row?.id) return { ...r, loadout_slot: slot, equipped: true }
    // Both columns, still mirroring `equip_item` exactly — and VAULT-61 tried
    // dropping the `equipped: false` here and put it back. Once the sheet reads
    // the slot (`onSheet`), clearing it is redundant for a *slottable* row; but
    // an **unslottable** one falls back to `equipped` by design — the 840
    // wondrous rows with no authored slot, which `loadoutSatisfied` leaves
    // unaffected for the same reason — so for those this line is the only thing
    // that takes a displaced item off the sheet at all. Without it, swapping a
    // helm left the old one granting its resistance forever.
    if (coming.has(r.id)) return { ...r, loadout_slot: null, equipped: false }
    return r
  })
}

/**
 * What could be taken off to afford this equip, in the order 1e should offer
 * them — the design's "frees enough with least loss".
 *
 * **Every worn row that costs something is returned, cursed ones included.**
 * The design draws the locked Amulet of the Black Sun in the list with a
 * padlock rather than omitting it, and that is the better answer: a player
 * looking for the two points they are short needs to see that the item holding
 * them cannot come off. `selectable` is what says so, and it is the only reason
 * this returns objects rather than rows.
 *
 * Rows the equip *already* displaces are excluded — they come off either way,
 * and `projectedBearing` has already counted their refund, so offering one
 * would be offering a choice that changes nothing.
 *
 * "Least loss" is read as: enough on its own first, then cheapest of those, so
 * the top option is the smallest sacrifice that actually works. Options that do
 * not free enough alone are still listed, below, because the player may know
 * something the sort does not.
 *
 * @param {object} params
 * @param {object[]} params.rows
 * @param {object} params.row the row being equipped
 * @param {string} params.slot
 * @param {number} params.max maximum bearing
 * @returns {{row: object, frees: number, selectable: boolean, sufficient: boolean}[]}
 */
export function freeingCandidates({ rows, row, slot, max }) {
  const { displaced } = conflicts({ rows, row, slot })
  const alreadyOff = new Set([...displaced.map(r => r.id), row?.id])
  const projected = projectedBearing({ rows, row, slot })
  const shortfall = max == null ? 0 : projected - max

  return wornRows(rows)
    .filter(r => !alreadyOff.has(r.id) && bearingCost(r) > 0)
    .map(r => {
      const frees = bearingCost(r)
      return {
        row: r,
        frees,
        selectable: !isCursed(r),
        sufficient: frees >= shortfall,
      }
    })
    .sort((a, b) => (
      // Cursed rows sink: they are shown for the explanation, never as an offer.
      Number(b.selectable) - Number(a.selectable)
      || Number(b.sufficient) - Number(a.sufficient)
      || a.frees - b.frees
      || a.row.loadout_slot.localeCompare(b.row.loadout_slot)
    ))
}

/**
 * Why this row cannot be taken off, or null when it can be. The only rule is
 * the curse, and it is the whole reason `magic_item.cursed` is authored rather
 * than read out of a description.
 *
 * @param {object} row
 * @returns {string|null}
 */
export function unequipBlockedReason(row) {
  if (!row?.loadout_slot) return 'This item is not worn.'
  if (isCursed(row)) {
    return `${itemName(row, 'This item')} is cursed — it cannot be removed.`
  }
  return null
}

/**
 * The three starting kits — VAULT-55, the handoff's view 1g.
 *
 * **A kit is a slot profile, not a list of items,** and that is the whole
 * shape of this feature. The design draws curated kits with fixed costs
 * ("Frontline warden · Chest, legs, feet, main hand, off hand · ✦ 6"), which
 * reads as a named set of magic items. A character can only ever equip rows
 * they own, so a kit naming items would either equip nothing or need a
 * `content_kit_item` table that ships empty and that no GM has authored — the
 * call VAULT-54 made about the regalia tier ladder, and VAULT-52 about set
 * bonuses. What the app can honestly do is *fill those slots from the bag*,
 * which is also what the handoff's own copy asks for: "start from a kit and
 * adjust".
 *
 * So the names and the slot lists are the design's, unchanged, and the ✦
 * figure is **computed by `fillPlan` from what would actually be worn** rather
 * than being the mock's 6 / 8 / 4. Those three numbers describe one fictional
 * character's inventory; against a real bag they would be a promise the equip
 * cannot keep.
 *
 * `ring_1` stands in for the design's single "ring". `fillPlan` will spill into
 * `ring_2` only if a kit asks for it, which none does — one ring is the
 * design's own reading and a kit that quietly took both would be dressing the
 * character in more than it said.
 */
export const STARTING_KITS = [
  {
    key: 'frontline_warden',
    name: 'Frontline warden',
    // The design's fifth slot was `legs`, which VAULT-64 retired for want of a
    // single item in the catalog that could fill it. `sidearm` takes its place
    // rather than the kit dropping to four: a warden with a backup weapon is
    // the same idea the design was reaching for, and it keeps the kit able to
    // place five things.
    slots: ['chest', 'feet', 'main_hand', 'off_hand', 'sidearm'],
  },
  {
    key: 'pact_scholar',
    name: 'Pact scholar',
    slots: ['head', 'neck', 'back', 'ring_1', 'main_hand'],
  },
  {
    key: 'shadow_tail',
    name: 'Shadow tail',
    slots: ['back', 'feet', 'hands', 'ring_1', 'main_hand'],
  },
]

/**
 * What filling these slots out of this bag would come to — VAULT-55.
 *
 * One planner behind both of 1g's bulk actions: a starting kit (`slots` from
 * `STARTING_KITS`) and Import from sheet (every slot, `candidates` narrowed to
 * the rows already flagged on the sheet). They differ only in those two
 * arguments, and a second copy of the greedy walk is how the two would come to
 * disagree about what fits.
 *
 * **The walk is greedy in slot order, richest affordable first.** A one-click
 * kit means "dress me in my best", so within each slot the costliest item that
 * still fits the budget wins; ties go to the cheaper, then to the name, so the
 * plan is deterministic and the same bag always produces the same kit. The
 * budget is spent as it goes, which means an early slot can price a later one
 * out — real, and visible, because `unfilled` names every slot that got
 * nothing.
 *
 * **It plans, it never writes.** The caller equips the picks one at a time
 * through `equip_item`, which re-checks all of this server-side; a plan that
 * the server then refuses costs a failed call and not a wrong loadout.
 *
 * Slots already occupied are skipped rather than displaced — a kit is the way
 * *out* of an empty loadout, not a way to overwrite a dressed one — as are
 * slots something already blocks, and the off hand once the walk has put a
 * two-handed weapon in the main hand.
 *
 * @param {object} params
 * @param {object[]} params.rows the character's equipment rows
 * @param {string[]} params.slots the slots to fill, in the order to try them
 * @param {number|null} [params.max] maximum bearing; null plans without a budget
 * @param {object[]|null} [params.candidates] rows the picks may come from,
 *   defaulting to everything in the bag
 * @returns {{picks: {row: object, slot: string, cost: number}[], total: number, unfilled: string[]}}
 *   `total` is what the picks cost together — the kit row's ✦
 */
export function fillPlan({ rows, slots, max = null, candidates = null }) {
  const worn = wornRows(rows)
  const wornIds = new Set(worn.map(r => r.id))
  const taken = new Set([
    ...worn.map(r => r.loadout_slot),
    ...Object.keys(blockedSlots(rows)),
  ])

  const pool = (candidates ?? rows ?? []).filter(r => !wornIds.has(r.id) && isSlottable(r))
  const used = new Set()

  let spent = bearingUsed(rows)
  const picks = []
  const unfilled = []

  for (const slot of slots ?? []) {
    if (taken.has(slot)) continue

    const best = pool
      .filter(r => !used.has(r.id) && legalSlots(r).includes(slot))
      .filter(r => max == null || spent + bearingCost(r) <= max)
      // Richest first, then by name so the same bag always produces the same
      // kit. The name has to resolve off either catalog or the tie-break is no
      // tie-break at all: every mundane row would compare as `''` and the pick
      // among a character's four melee weapons would fall to `sort` stability.
      .sort((a, b) => (
        bearingCost(b) - bearingCost(a)
        || (itemName(a, '') ?? '').localeCompare(itemName(b, '') ?? '')
      ))[0]

    if (!best) {
      unfilled.push(slot)
      continue
    }

    const cost = bearingCost(best)
    picks.push({ row: best, slot, cost })
    used.add(best.id)
    taken.add(slot)
    spent += cost

    // A greatsword in the main hand has filled the off hand as well, by the
    // absence of a row rather than the presence of one. Without this the walk
    // would go on to pick a shield the equip could never place.
    if (slot === 'main_hand' && isTwoHanded(best)) taken.add('off_hand')
  }

  return { picks, total: picks.reduce((sum, p) => sum + p.cost, 0), unfilled }
}

/**
 * The rows Import from sheet would draw on — VAULT-55.
 *
 * **The attunement system's own state, read as an answer to "what was this
 * character wearing?"** `equipped` and `attuned` are what a campaign running
 * the old rules has been writing all along, and VAULT-50 kept both columns
 * precisely so switching the toggle costs nothing. A character whose GM flipped
 * it this morning already has a dressed sheet; this is the one click that
 * carries it across.
 *
 * Nothing infers a slot here — `fillPlan` does that through `legalSlots`, so an
 * attuned item with no slot of its own is simply not placed, exactly as it is
 * not placed anywhere else.
 *
 * Since VAULT-60 this reaches a character's **mundane** gear too, which is what
 * the click was always for: the live campaign's case was ten equipped-and-
 * unslotted rows, and eight of them were a weapon, a shield or a suit of
 * armour. Before, Import from sheet looked at that bag and placed nothing.
 *
 * @param {object[]} rows
 * @returns {object[]}
 */
export function sheetFlaggedRows(rows) {
  return (rows ?? []).filter(r => (r?.equipped || r?.attuned) && !r?.loadout_slot && isSlottable(r))
}
