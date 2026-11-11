// Attunement rules. PHB 2024: a character can be attuned to at most three
// magic items at once, and only items that ask for it can be attuned to at all.
//
// Pure functions over the equipment rows `inventory.listEquipment` returns, so
// the limit is stated once and every surface that needs it — the toggle, the
// counter, the tooltip explaining why a toggle is disabled — agrees.
//
// This lives in `packages/derive` rather than beside the panel because the
// character-sheet derivation needs `attunementSatisfied` to decide whether a
// magic item's Effects count, and derive cannot import from `apps/`. Stating the
// rule twice is exactly what this module exists to prevent.

export const ATTUNEMENT_LIMIT = 3

// Only magic items declare attunement; a mundane greatsword never can.
export function requiresAttunement(row) {
  return !!row?.magic_item?.requires_attunement
}

export function attunedRows(rows) {
  return (rows ?? []).filter(r => r.attuned && requiresAttunement(r))
}

// Whether an equipped row's *magical* benefits apply — its Effects, and so its
// AC bonus and its resistances.
//
// The gate is on the Effects and not on the item, because those are different
// questions: a magic breastplate you have equipped but not attuned is still a
// breastplate, and still gives you breastplate AC. What it does not give you is
// the +1. So `equippedItems` stays whole — armour state, weapon actions and the
// Unarmed Strike loadout all read it unchanged — and only the Effects are
// filtered. An item that never asked for attunement is unaffected.
export function attunementSatisfied(row) {
  return !requiresAttunement(row) || !!row?.attuned
}

export function attunedCount(rows) {
  return attunedRows(rows).length
}

export function atAttunementLimit(rows) {
  return attunedCount(rows) >= ATTUNEMENT_LIMIT
}

// Why this row's attunement toggle is unavailable, as a phrase to show the
// player — or null when it is available. Attuning is blocked at the limit;
// *un*attuning never is, which is why the current state is part of the question.
export function attunementBlockedReason(row, rows) {
  if (!requiresAttunement(row)) return 'This item does not require attunement.'
  if (row.attuned) return null
  if (atAttunementLimit(rows)) {
    return `Already attuned to ${ATTUNEMENT_LIMIT} items — break one first.`
  }
  return null
}

// `inertEquipped` lived here until VAULT-57 and is now **only** in
// `itemBenefits.js`, which asks the same question of whichever system the
// campaign plays with. Two exported functions of one name, one of which
// silently ignored the loadout system, is not a hazard worth keeping for the
// sake of a shorter import: `EquipmentPanel` imported this one and spent five
// tickets telling loadout campaigns about attunement. The replacement is
// `inertEquipped(rows, { loadoutSystem })`, and with the flag off it filters
// exactly what this did — `!attunementSatisfied` *is* `requires && !attuned`.

// The restriction is free text from the catalog ("by a druid", "by a creature
// of good alignment"), so it is shown rather than enforced — nothing in the
// data models alignment, and a homebrew restriction can say anything.
export function attunementLabel(row) {
  const restriction = row?.magic_item?.attunement_restriction
  return restriction ? `Attunement: ${restriction}` : 'Requires attunement'
}
