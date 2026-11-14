// @ts-check
// Unarmed Strike: the attack every character always has. It is derived here
// rather than in `weaponActions.js` because no inventory row backs it — the
// sheet showed nothing at all for a character who had not bought a weapon.
//
// PHB 2024 hangs three options off one attack roll (d20 + STR + PB): Damage
// (1 + STR, Bludgeoning), Grapple, and Shove, the latter two resisted by a save
// against 8 + STR + PB. That flat 1 is the only part features touch, and every
// feature that touches it says "instead of the normal damage of an Unarmed
// Strike" — so the options never stack, and the biggest die simply wins.
//
// Two sources feed in:
//
//   Effects  `unarmed_strike_die` on a feat — Tavern Brawler (d4) and the
//            Unarmed Fighting Fighting Style (d6, d8 while empty-handed) — which
//            reach here through the ordinary effect-baking pipeline.
//   Monk     Martial Arts scales the die with Monk level and Dexterous Attacks
//            allows DEX, both gated on the class's own loadout condition. A
//            level-scaled die has no Effect vocabulary, so it is read off the
//            Monk level here the way Sneak Attack and the Bardic die are.
//
// Weapon-filtered `attack_roll_bonus` / `damage_roll_bonus` Effects deliberately
// do *not* apply: an Unarmed Strike is not a weapon, so Archery and Dueling stay
// off it. Unfiltered ones keep their documented global meaning and do apply.
// The one exception is a predicate that constrains nothing but `ability`, which
// asks about the attack rather than the weapon — Barbarian Rage adds its damage
// "with either a weapon or an Unarmed Strike", and the strike knows which
// ability it used. See `appliesUnarmed`.

import { damageToken, hasWeaponProperty, resolveWeaponData } from './weaponActions.js'
import { ARMOR_PENALTY_ABILITIES } from './effects.js'

/** @typedef {import('./effects.js').Effect} Effect */
/** @typedef {import('./weaponActions.js').InventoryRow} InventoryRow */
/** @typedef {import('./weaponActions.js').Weapon} Weapon */

export const UNARMED_STRIKE_ID = 'unarmed-strike'

// Monk weapons: Simple Melee weapons, plus Martial Melee weapons that have the
// Light property. Anything else in hand drops the character out of the stance.
/**
 * @param {Weapon | null | undefined} weapon
 * @returns {boolean}
 */
export function isMonkWeapon(weapon) {
  if (!weapon || weapon.itemType !== 'Melee Weapon') return false
  if (weapon.category === 'simple') return true
  return weapon.category === 'martial' && hasWeaponProperty(weapon, 'light')
}

// The Martial Arts column of the Monk Features table. Null below Monk 1.
/**
 * @param {number} [monkLevel]
 * @returns {number | null}
 */
export function martialArtsDie(monkLevel = 0) {
  if (!monkLevel || monkLevel < 1) return null
  if (monkLevel >= 17) return 12
  if (monkLevel >= 11) return 10
  if (monkLevel >= 5) return 8
  return 6
}

/**
 * @param {readonly Effect[]} entries
 * @returns {number}
 */
function sum(entries) {
  // Added raw, as it always was: every unarmed bonus authored is a number.
  // `weaponActions.js` resolves its amounts through the grammar; this does not.
  return entries.reduce((total, e) => total + /** @type {number} */ (e.amount ?? 0), 0)
}

/**
 * @param {readonly Effect[]} entries
 * @returns {string[]}
 */
function sources(entries) {
  return entries.map(e => e.source).filter(/** @returns {s is string} */ s => Boolean(s))
}

// Does a weapon-predicated Effect reach the Unarmed Strike? Normally no — the
// predicate is the author saying "this is about a weapon". An `ability`-only
// predicate is different: it constrains the attack, not the instrument, and
// Rage's is written to cover unarmed strikes explicitly. Any other key present
// (category, property, grip, sole) keeps the Effect off the punch, because all
// of them describe something an Unarmed Strike does not have.
/**
 * @param {Effect | null | undefined} effect
 * @param {string} ability
 * @returns {boolean}
 */
export function appliesUnarmed(effect, ability) {
  const predicate = effect?.weapon
  if (!predicate) return true
  const keys = Object.keys(predicate)
  if (keys.length === 1 && keys[0] === 'ability') return predicate.ability === ability
  return false
}

// VAULT-154. An Unarmed Strike is a Strength (or, in the Monk stance, Dexterity)
// attack roll, so the unproficient-armour penalty reaches it exactly as it
// reaches a weapon — the rule says "any … attack roll that involves Strength or
// Dexterity" and does not care that there is no weapon in hand.
//
// The Monk case is the one worth stating: Martial Arts already requires *not*
// wearing armour, so a Monk in plate loses the stance and falls back to `'str'`.
// The penalty then lands on the Strength attack, which is the right answer by a
// different route — but this is still tested against `ability` rather than
// assumed, because a non-Monk in armour reaches the same line.
/**
 * @param {{
 *   abilityScores?: readonly { key: string, mod?: number | null }[],
 *   pb?: number,
 *   monkLevel?: number,
 *   isWearingArmor?: boolean,
 *   hasShield?: boolean,
 *   armorPenalty?: { active?: boolean | null, source?: string | null } | null,
 * }} [opts]
 * @param {readonly InventoryRow[] | null} [equippedItems]
 * @param {readonly (Effect | null | undefined)[] | null} [effects]
 */
export function deriveUnarmedStrike(
  {
    abilityScores = [], pb = 2, monkLevel = 0, isWearingArmor = false, hasShield = false,
    armorPenalty = null,
  } = {},
  equippedItems = [],
  effects = [],
) {
  const strMod = abilityScores.find(a => a.key === 'str')?.mod ?? 0
  const dexMod = abilityScores.find(a => a.key === 'dex')?.mod ?? 0

  const weapons = (equippedItems ?? []).map(resolveWeaponData).filter(/** @returns {w is Weapon} */ w => Boolean(w))

  // "If you aren't holding any weapons or a Shield when you make the attack
  // roll" — the Vault tracks what is equipped, not what is in which hand, so
  // equipped stands in for held.
  const emptyHanded = weapons.length === 0 && !hasShield

  // Martial Arts applies "while you are unarmed or wielding only Monk weapons
  // and you aren't wearing armor or wielding a Shield".
  const monkStance = monkLevel >= 1 && !isWearingArmor && !hasShield && weapons.every(isMonkWeapon)

  // Dexterous Attacks (Monk 1) rides that same condition and is a "you can", so
  // it only ever helps — the same shape as a Finesse weapon.
  const abilityMod = monkStance ? Math.max(strMod, dexMod) : strMod
  const ability = monkStance && dexMod > strMod ? 'dex' : 'str'

  /**
   * @param {string} type
   * @returns {Effect[]}
   */
  const global = type => (effects ?? []).filter(/** @returns {e is Effect} */ e => e?.type === type && appliesUnarmed(e, ability))
  const attackEffects = global('attack_roll_bonus')
  const dmgEffects = global('damage_roll_bonus')

  // **The die may bring its own damage type** — VAULT-229. An Unarmed Strike is
  // Bludgeoning in every case the Vault had until Demon Armor, whose clawed
  // gauntlets "allow your unarmed strikes to deal 1d8 **slashing** damage instead
  // of the usual bludgeoning damage". The type rides on the die because that is
  // what the sentence changes: the die and the type are one substitution, and an
  // item granting the type without a die is not a thing the books do.
  //
  // Absent means Bludgeoning, so Tavern Brawler and Unarmed Fighting are unchanged
  // and no existing effect needs a field adding to it.
  /** @type {{ sides: number | null | undefined, source: string | null, damageType: string | null }[]} */
  const dieOptions = [
    ...(effects ?? [])
      .filter(/** @returns {e is Effect} */ e => e?.type === 'unarmed_strike_die')
      .map(e => ({
        sides: emptyHanded && e.dieIfEmptyHanded ? e.dieIfEmptyHanded : e.die,
        source: e.source ?? null,
        damageType: e.damageType ?? null,
      })),
    ...(monkStance
      ? [{ sides: martialArtsDie(monkLevel), source: 'Martial Arts', damageType: null }]
      : []),
  ].filter(o => (o.sides ?? 0) > 0)

  // They replace rather than stack, so take the best and name only that one. The
  // damage type follows the die that won, rather than being collected across all
  // of them — two dice offering two types is one substitution beating another,
  // not a strike that deals both.
  const best = dieOptions.reduce(
    (a, b) => ((b.sides ?? 0) > (a.sides ?? 0) ? b : a),
    { sides: 0, source: null, damageType: null },
  )
  const damage = best.damageType ?? 'Bludgeoning'

  const dmgBonus = abilityMod + sum(dmgEffects)

  return {
    id: UNARMED_STRIKE_ID,
    name: 'Unarmed Strike',
    ability,
    attackBonus: abilityMod + pb + sum(attackEffects),
    attackSources: sources(attackEffects),
    damageSources: [...(best.source ? [best.source] : []), ...sources(dmgEffects)],
    // With no die the damage is the flat "1 + modifier", which is a number
    // rather than a roll — the sheet prints it instead of offering a dice chip.
    dmgToken: best.sides ? damageToken(`1d${best.sides}`, dmgBonus, damage) : null,
    dmgFlat: best.sides ? null : Math.max(0, 1 + dmgBonus),
    // With no die there is no substitution, so the flat "1 + modifier" is always
    // Bludgeoning — `damage` can only differ from it when a die won.
    damageType: damage,
    // Grapple and Shove are the other two options off the same attack; both are
    // resisted by this save, so the row states it where a weapon lists its
    // properties.
    saveDc: 8 + abilityMod + pb,
    // VAULT-154 — the same pair of fields a weapon row carries, so `ActionsPanel`
    // renders both kinds of row through one code path.
    disadvantage: !!armorPenalty?.active && ARMOR_PENALTY_ABILITIES.includes(ability),
    disadvantageSources: armorPenalty?.active && ARMOR_PENALTY_ABILITIES.includes(ability)
      ? [armorPenalty.source]
      : [],
  }
}
