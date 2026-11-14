// @ts-check
// A caster's spell attack bonus and save DC — VAULT-195.
//
// The arithmetic is two lines of the PHB and was written out inline in three
// components before this module existed: `SpellPanel.jsx` for Vault characters,
// `DdbSpellPanel.jsx` for imported ones and `builder/SpellStep.jsx` for the
// build preview. Three copies of `8 + pb + mod` is harmless while nothing else
// contributes; the moment an *item* can move those numbers it stops being
// harmless, because a bonus folded into one copy is a bonus the other two deny.
//
// So the fold happens here, once, and the callers ask for the answer.
//
// **Both sheet branches pass effects.** The Vault branch folds its gated effect
// list; since VAULT-249 the D&D Beyond branch reads its item `bonus` modifiers
// into the same two types (`ddbSpellBonusEffects`). The builder has nothing
// equipped yet, calls this with no `effects` and gets the bare formula.
//
// `DdbSpellPanel.jsx` had kept its own `8 + pb + mod` until VAULT-249, which is
// why an imported character's wand never reached its spell attack.

import { effectsOfType, resolveAmount } from './effects.js'

/** @typedef {import('./effects.js').Effect} Effect */
/** @typedef {import('./effects.js').AmountContext} AmountContext */

/**
 * Whether one effect reaches the casting class being asked about.
 *
 * `classes` absent or empty means *every* class, which is the common case: a
 * Wand of the War Mage says "you gain a +1 bonus to spell attack rolls" with no
 * qualifier at all. A Rod of the Pact Keeper is the other case — its attack
 * bonus is unqualified but its DC bonus is "the saving throw DCs of your
 * **Warlock** spells", so the two halves of one item are scoped differently and
 * the predicate has to live on the effect rather than on the item.
 *
 * Matched case-insensitively because the predicate is authored by hand and the
 * class name arrives from `content_class.name`. An effect naming a class the
 * character does not have simply never matches — there is nothing to report.
 *
 * @param {Effect | null | undefined} effect
 * @param {string | null | undefined} className
 * @returns {boolean}
 */
function reachesClass(effect, className) {
  const classes = effect?.classes
  if (!Array.isArray(classes) || classes.length === 0) return true
  if (!className) return false
  const wanted = String(className).trim().toLowerCase()
  return /** @type {readonly unknown[]} */ (classes).some(c => String(c).trim().toLowerCase() === wanted)
}

/**
 * The total of one bonus type that applies to this casting class.
 *
 * Not `sumAmounts`, which is the same reduce without the predicate. An
 * unresolvable amount contributes nothing rather than poisoning the total, for
 * the reason `sumAmounts` gives: one malformed effect among several must not
 * silently zero a number the player is about to roll against.
 *
 * @param {readonly (Effect | null | undefined)[] | null | undefined} effects
 * @param {string} type
 * @param {string | null | undefined} className
 * @param {AmountContext} amountCtx
 * @returns {number}
 */
function bonusFor(effects, type, className, amountCtx) {
  return effectsOfType(effects, type)
    .filter(e => reachesClass(e, className))
    .reduce((total, e) => total + (resolveAmount(e.amount ?? 0, amountCtx) ?? 0), 0)
}

/**
 * One casting class's attack bonus and save DC, with item and feature effects
 * folded in.
 *
 * Both numbers are `null` when `abilityMod` is null — the character has a
 * spellcasting class whose ability has not been chosen, which the panels render
 * as "—" rather than as a wrong number. The bonuses are still reported in that
 * case, because they are facts about the character's kit and not about the gap.
 *
 * `abilityMod` is the casting ability's modifier, `pb` the proficiency bonus,
 * `className` the casting class (for a scoped bonus), `effects` already gated by
 * the active-toggle set, and `amountCtx` `resolveAmount`'s ctx, for a non-flat
 * amount.
 *
 * @param {{ abilityMod?: number | null, pb?: number, className?: string | null, effects?: readonly (Effect | null | undefined)[] | null, amountCtx?: AmountContext }} [args]
 * @returns {{ spellAttack: number|null, saveDc: number|null,
 *   attackBonus: number, saveDcBonus: number }}
 */
export function deriveSpellcasting({
  abilityMod, pb = 0, className = null, effects = [], amountCtx = {},
} = {}) {
  const attackBonus = bonusFor(effects, 'spell_attack_bonus', className, amountCtx)
  const saveDcBonus = bonusFor(effects, 'spell_save_dc_bonus', className, amountCtx)
  const known = typeof abilityMod === 'number'
  return {
    spellAttack: known ? pb + abilityMod + attackBonus : null,
    saveDc: known ? 8 + pb + abilityMod + saveDcBonus : null,
    attackBonus,
    saveDcBonus,
  }
}
