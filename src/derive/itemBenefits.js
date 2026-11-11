// The one place the sheet decides whether a magic item's benefits apply —
// VAULT-51.
//
// Two systems license an item to work, and a campaign plays with exactly one of
// them: attunement to three items (`attunement.js`) or thirteen slots and a
// Bearing budget (`loadout.js`), chosen by `campaign_codes.loadout_system`.
//
// This module exists so that choice is made **once**. Before it, the gate was
// `attunementSatisfied` written out at two call sites — `deriveCharacterSheet`
// and `defenseGrants.js` — and adding a second system to each of them
// would have been two branches that have to agree forever, on a question where
// disagreeing means a resistance applies on the Defensive Profile and the same
// item's AC bonus does not.
//
// **Toggle off is the old code path, not a special case of on.** With the
// switch false this calls exactly what it always called; nothing about an
// existing campaign routes through the loadout rules to arrive at unchanged
// behaviour. That is the rule VAULT-33 set with `quirk_costs` and the reason
// switching a campaign back is free.
import { attunementSatisfied } from './attunement.js'
import { isSlottable, isWorn, loadoutSatisfied } from './loadout.js'

/**
 * Whether an equipped row's Effects count.
 *
 * The gate is on the **Effects and never on the item**, under either system —
 * `equippedItems` must stay whole or armour state, weapon actions and the
 * Unarmed Strike loadout all break. See `attunementSatisfied` for the worked
 * example: an unattuned magic breastplate is still a breastplate.
 *
 * There is deliberately no `rows` parameter. Neither system's gate is relative
 * to the other items a character owns: attunement asks whether *this* row is
 * attuned, and the loadout asks whether *this* row is in a slot. The limit and
 * the budget are enforced where the write happens — the toggle in
 * `EquipmentPanel`, and `equip_item` — so a character who is somehow over
 * budget keeps wearing what they are wearing rather than having some
 * unidentifiable subset of it silently stop working.
 *
 * @param {object} row an `inventory` row with a `magic_item` embed
 * @param {object} [opts]
 * @param {boolean} [opts.loadoutSystem=false] the campaign's toggle
 * @returns {boolean}
 */
export function itemBenefitsApply(row, opts = {}) {
  return opts?.loadoutSystem ? loadoutSatisfied(row) : attunementSatisfied(row)
}

/**
 * Whether a row is on the character sheet at all — VAULT-61.
 *
 * The layer above `itemBenefitsApply`, and a different question. That one asks
 * whether a row's *Effects* count and deliberately leaves the row itself in the
 * list, because an unattuned magic breastplate is still a breastplate. This one
 * asks whether the row is there to be read in the first place: it is what feeds
 * `equippedItems`, and so base armour AC, the shield bonus, the armour state
 * the Monk and Barbarian conditions ride on, and the weapon actions.
 *
 * **Under the loadout system the slot is what puts an item on the sheet**, and
 * `equipped` is the other system's column. That is the ruling VAULT-61 exists to
 * make, and the alternative was incoherent rather than merely different: the
 * bug reported was a suit of armour that contributed AC while sitting off the
 * paper doll, so slotting it changed nothing and *un*slotting it cost the
 * character the whole armour value. The round trip has to balance, and it only
 * balances if the doll is the truth.
 *
 * **Toggle off is the old code path** — `!!row.equipped`, unchanged, exactly as
 * `itemBenefitsApply` keeps the attunement branch untouched.
 *
 * **An unslottable row is unaffected**, which is the same load-bearing call
 * `loadoutSatisfied` makes and is here for the same reason: a wondrous item with
 * no authored slot, a potion, a bedroll and Smith's Tools can never be worn on
 * the doll, so reading the slot would take every one of them off the sheet
 * permanently. They answer to `equipped` under both systems.
 *
 * **That exception is why `equip_item` and `unequip_item` still write
 * `equipped` alongside the slot, and why VAULT-61 shipped no migration.** The
 * obvious reading of this ticket was that a loadout write has no business
 * touching the attunement system's column — and for a slottable row that is
 * true and clearing it is merely redundant, since the slot already governs. For
 * an unslottable one it is the *only* thing that can take a displaced item off
 * the sheet: dropped, swapping a helm left the old one granting its resistance
 * forever. Keeping the two columns in step is correct rather than harmful once
 * the sheet reads the slot, so the RPCs are unchanged and the fix is here.
 *
 * @param {object} row an `inventory` row
 * @param {object} [opts]
 * @param {boolean} [opts.loadoutSystem=false] the campaign's toggle
 * @returns {boolean}
 */
export function onSheet(row, opts = {}) {
  if (!opts?.loadoutSystem) return !!row?.equipped
  return isSlottable(row) ? isWorn(row) : !!row?.equipped
}

/**
 * The rows a sheet derives from, filtered by whichever system is in play.
 *
 * **Both the character sheet and the party read go through here**, which is the
 * point: `MyCharacterPage` and `useParty` each held their own `equipped` filter,
 * and two filters that must agree forever is how the encounter tracker and the
 * character sheet come to show different ACs for one character. The same reason
 * `itemBenefitsApply` exists one layer down.
 *
 * @param {object[]} rows
 * @param {object} [opts]
 * @param {boolean} [opts.loadoutSystem=false]
 * @returns {object[]}
 */
export function sheetEquipment(rows, opts = {}) {
  return (rows ?? []).filter(r => onSheet(r, opts))
}

/**
 * Rows flagged `equipped` that are nonetheless not on the sheet — VAULT-61.
 *
 * Empty under attunement by construction, where `equipped` *is* the sheet. Under
 * the loadout system it is every slottable row nobody has placed: the gear a
 * character was wearing before the campaign turned the switch on, plus anything
 * taken out of a slot since.
 *
 * **This is the stronger statement than `inertEquipped` and supersedes it under
 * the loadout system**, which is why the banner switches rather than showing
 * both. "Its benefits are not applied" is what an unattuned item does; an
 * unslotted greatsword is not on the sheet at all — no attack, no damage, and
 * for armour no AC. It also reaches **mundane** rows, which `inertEquipped`
 * cannot and should not: a mundane item has no Effects to withhold, so it can
 * never be inert, but it can certainly be off the doll.
 *
 * @param {object[]} rows
 * @param {object} [opts]
 * @param {boolean} [opts.loadoutSystem=false]
 * @returns {object[]}
 */
export function offSheetEquipped(rows, opts = {}) {
  return (rows ?? []).filter(r => r?.equipped && !onSheet(r, opts))
}

/**
 * Rows that are equipped and inert — worn, and contributing nothing, because
 * whichever system is in play has not licensed them.
 *
 * Worth saying out loud on the sheet for the same reason under both systems: a
 * player who equipped an item before the rule existed has no reason to expect
 * it stopped.
 *
 * @param {object[]} rows
 * @param {object} [opts]
 * @param {boolean} [opts.loadoutSystem=false]
 * @returns {object[]}
 */
export function inertEquipped(rows, opts = {}) {
  return (rows ?? []).filter(r => r?.equipped && !itemBenefitsApply(r, opts))
}

/**
 * Rows that work today and would stop working if the campaign switched to the
 * other system — VAULT-57, what the GM is shown before the toggle moves.
 *
 * **The definition is a diff of the gate against itself**, which is what makes
 * it honest in a way an enumeration of cases could not be: whatever
 * `itemBenefitsApply` licenses is what counts as working, so this cannot drift
 * away from the rule the sheet actually applies. It is also *symmetric* by
 * construction, and that matters — the risk runs both ways. Turning the loadout
 * system **on** silently switches off an attuned item nobody has slotted yet;
 * turning it **off** switches off a slotted item nobody ever attuned. Neither
 * direction is the safe one, so neither is the one without a warning.
 *
 * Only `equipped` rows can be lost, because only they were granting anything —
 * the same test `inertEquipped` makes, and the reason the party read's
 * `.eq('equipped', true)` is a sufficient source for this.
 *
 * Nothing here is destructive: the columns of both systems are kept side by
 * side (VAULT-50), so every row this returns comes back the moment the switch
 * goes back. What it costs is a character quietly getting weaker mid-campaign,
 * which is worth one dialog.
 *
 * @param {object[]} rows equipment rows, `equipped` ones included
 * @param {object} opts
 * @param {boolean} opts.loadoutSystem the state being switched **to**
 * @returns {object[]}
 */
export function benefitsLost(rows, { loadoutSystem } = {}) {
  const to = { loadoutSystem: !!loadoutSystem }
  const from = { loadoutSystem: !loadoutSystem }
  return (rows ?? []).filter(r => (
    r?.equipped && contributes(r, from) && !contributes(r, to)
  ))
}

// Everything a row gives the sheet, under one system — both gates, because
// since VAULT-61 there are two and either can switch a row off.
//
// `itemBenefitsApply` alone was the whole answer while `equipped` was the sheet
// under both systems: the only thing a switch could take away was a magic
// item's Effects. Now the loadout system reads the *slot*, so turning it on
// also takes every equipped-but-unslotted weapon, shield and suit of armour off
// the sheet outright — on the live campaign, eleven weapons across four
// characters. A dialog reporting only the Effects would have shown the GM a
// short list of magic items and said nothing about the greatswords, which is
// the confidently-wrong warning VAULT-57 built this to avoid.
function contributes(row, opts) {
  return onSheet(row, opts) && itemBenefitsApply(row, opts)
}
