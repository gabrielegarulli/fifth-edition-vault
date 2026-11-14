// @ts-check
// What a Short Rest gives back.
//
// The Long Rest is unconditional — everything resets — so `longRest` needed no
// derivation. A Short Rest is selective: it refills the resources that declare
// `resets: 'short_rest'`, hands back the one use a Barbarian's Rage regains,
// and returns a Warlock's Pact Magic slots. Working out *which* of those apply
// is a question about the sheet, so it is answered here and the vault_state op
// is handed the answer.

import { classResourcePools } from './deriveCharacterSheet.js'
import { combinedSlotMax } from './casterProgression.js'

/** @typedef {Parameters<typeof combinedSlotMax>[0]} ClassLevels */
/**
 * @typedef {{ restoreKeys: string[], regainKeys: Record<string, number>, restoreSlotRanks: number[] }} ShortRestPlan
 */

// Pact Magic slots come back on a Short Rest, but `vault_state.spellSlotsUsed`
// is keyed by rank alone — a Warlock 5 / Wizard 5's third-rank slots are two
// pact slots and three Wizard slots in the same counter, and nothing records
// which of the spent ones were which.
//
// So this restores slots only when Pact Magic is the character's *only* source
// of them, where every spent slot is necessarily a pact slot. A mixed caster
// keeps the pips, which have always been clickable. Guessing in that case would
// hand back Wizard slots a short rest does not restore.
/**
 * @param {ClassLevels} classes
 * @returns {number[]}
 */
export function pactOnlySlotRanks(classes) {
  const rows = classes ?? []
  const warlockLevels = rows
    .filter(c => (c.name ?? '').toLowerCase() === 'warlock')
    .reduce((sum, c) => sum + (c.level ?? 0), 0)
  if (warlockLevels < 1) return []

  const others = rows.filter(c => (c.name ?? '').toLowerCase() !== 'warlock')
  if (Object.keys(combinedSlotMax(others)).length > 0) return []

  return Object.keys(combinedSlotMax(rows)).map(Number)
}

// The plan a Short Rest carries out, ready to hand to vaultState.shortRest.
//
//   restoreKeys       — pools emptied back to full
//   regainKeys        — pools that hand back some, not all, of their uses
//   restoreSlotRanks  — spell slot ranks zeroed
/**
 * @param {Parameters<typeof classResourcePools>[0]} sheet
 * @param {ClassLevels} classes
 * @returns {ShortRestPlan}
 */
export function shortRestPlan(sheet, classes) {
  const pools = classResourcePools(sheet)
  const restoreKeys = pools.filter(p => p.resets === 'short_rest').map(p => p.key)

  /** @type {Record<string, number>} */
  const regainKeys = {}
  for (const pool of pools) {
    // Rage is the case this exists for: it resets on a Long Rest, but PHB 2024
    // hands one use back on a Short Rest.
    const regain = pool.shortRestRegain ?? 0
    if (pool.resets !== 'short_rest' && regain > 0) {
      regainKeys[pool.key] = regain
    }
  }

  return { restoreKeys, regainKeys, restoreSlotRanks: pactOnlySlotRanks(classes) }
}

// Whether a short rest would change anything, so the button can say so rather
// than looking broken when a fully-rested character presses it.
/**
 * @param {ShortRestPlan} plan
 * @returns {boolean}
 */
export function shortRestRestoresAnything(plan) {
  return plan.restoreKeys.length > 0
    || Object.keys(plan.regainKeys).length > 0
    || plan.restoreSlotRanks.length > 0
}
