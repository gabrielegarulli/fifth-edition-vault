// Weapon actions: the per-weapon attack and damage lines on the character sheet.
// Pure — `ActionsPanel` only renders what this returns.
//
// This is also the first place an Effect reaches a weapon roll. `CONTEXT.md` has
// documented `attack_roll_bonus` and `damage_roll_bonus` since the Effect table
// was written, but nothing consumed them until Fighting Styles needed them. Both
// stay global by default; an optional `weapon` predicate narrows them to the
// weapons the granting feature actually covers:
//
//   Archery                 attack +2   { category: 'ranged' }
//   Dueling                 damage +2   { category: 'melee', grip: 'one-handed', sole: true }
//   Thrown Weapon Fighting  damage +2   { property: 'thrown' }
//   Barbarian Rage          damage +N   { ability: 'str' }
//
// Per-item magic bonuses are the other half, and they are handled separately
// all the way down: `weapon_attack_bonus`, `weapon_damage_bonus` and
// `weapon_extra_damage` attach to **one item** rather than to a class of
// weapons, so they take no `weapon` predicate and never reach `weaponMatches`.
// VAULT-5 gave them a place to live (`magic_item.data.effects`), VAULT-7 gave
// them a vocabulary and this file, at last, fires them — VAULT-6's gaps 2 and 3.
//
// A third seam arrived with VAULT-161: `weapon_attack_ability_override` does not
// *add* to a roll, it decides which ability the roll is built from. It is a
// character effect like the four above and takes the same `weapon` predicate, but
// it has to be resolved before any of them, because the ability it picks is what
// their predicates are then matched against. See `overriddenAbility`.
//
// **They are licensed like every other item Effect** — VAULT-117. A magic
// weapon you have not attuned to is still a weapon and still swings its dice,
// but it does not hand over its `+1`. `deriveCharacterSheet` already gated the
// Effects it folds into `allEffects` that way; these were read straight off the
// row and missed the gate, which was invisible only because no catalog row
// carried an effect until the same ticket backfilled 169 of them.

import { attunementSatisfied } from './attunement.js'
import { fmtMod } from './dnd5e.js'
import { resolveAmount, ARMOR_PENALTY_ABILITIES } from './effects.js'
import {
  displayProperties,
  hasProperty,
  itemEffectBonus,
  itemEffects,
  itemExtraDamage,
} from './itemData.js'
import { poisonedBy } from './proficiency.js'

const WEAPON_ITEM_TYPES = ['Melee Weapon', 'Ranged Weapon']

const SWITCH_WEAPON_ITEM_TYPE = 'Switch Weapon'

/**
 * The form a Switch Weapon is currently in — VAULT-155.
 *
 * The pair lives in `content_item_switch_mode` (embedded as `switch_modes`) and
 * the active index in `inventory.switch_mode`. Exported because the toggle has
 * to name the *other* mode to offer it, and re-deriving "which one is that"
 * beside this function is how the button comes to disagree with the sheet.
 *
 * **Matched on `mode_index`, never on array position.** PostgREST does not
 * promise an order for an embedded collection, so reading `switch_modes[1]`
 * would be right until the day the planner returned them the other way round —
 * and the symptom would be a weapon silently swinging the wrong form.
 *
 * A row whose modes did not come back falls through to `null`, which leaves the
 * weapon exactly as unslottable as it was before this ticket. That is the
 * honest degradation: the alternative is inventing a form the data does not
 * name.
 *
 * @param {object} row an `inventory` row with a `content_item` embed
 * @returns {{modes: object[], active: object, other: object|null}|null}
 */
export function resolveSwitchMode(row) {
  if (row?.content_item?.item_type !== SWITCH_WEAPON_ITEM_TYPE) return null
  const modes = row.content_item.switch_modes
  if (!Array.isArray(modes) || modes.length === 0) return null

  const ordered = [...modes].sort((a, b) => (a?.mode_index ?? 0) - (b?.mode_index ?? 0))
  const wanted = row.switch_mode ?? 0
  // Falling back to the first form rather than to nothing: an index with no
  // matching row cannot happen while the CHECK and the unique constraint both
  // hold, but if it ever does, a weapon that swings its default form beats one
  // that vanishes off the Actions tab.
  const active = ordered.find(m => m?.mode_index === wanted) ?? ordered[0]
  const other = ordered.find(m => m !== active) ?? null
  return { modes: ordered, active, other }
}

// The mundane weapon a magic weapon fights as. Two sources, in order of
// authority:
//
//   1. `row.base_content_item` — the *inventory row's* own link: the specific
//      weapon this copy was forged from, recorded by `craft_item`. A
//      "Weapon (any axe)" has no single base by design, so only the row can
//      answer; and two Time Splitters made from different axes correctly
//      differ.
//   2. `row.magic_item.base_item` — the catalog's declared base, for the items
//      that do name exactly one weapon.
//
// `magic_item.base_item_type` (free text: 'flail', 'any axe') is deliberately
// not consulted here — matching prose against a catalog is the importer's job,
// and `20260807…_backfill_magic_item_base_item.sql` resolves the unambiguous
// ones into `base_item_id` so this stays a pure lookup.
export function resolveBaseItem(row) {
  return row?.base_content_item ?? row?.magic_item?.base_item ?? null
}

/**
 * Is this catalog pair a weapon? — the question `resolveWeaponData` asks of a
 * magic item, without needing an inventory row to ask it about.
 *
 * **The base decides and the type is the fallback**, in that order, because a
 * base item carries the dice and the type carries only a word. A `Weapon (any
 * sword)` with no base still lists on the Actions tab — `baseResolved: false`,
 * an attack roll and no damage — which is deliberate and is why the second
 * clause exists at all.
 *
 * Exported since VAULT-218 so `scripts/gen_magic_item_effects.mjs` can select
 * the rows the sheet will actually read, rather than re-deriving the rule from
 * the same two lines. It had the second clause and not the first, so a Staff of
 * the Magi — a Quarterstaff typed `Staff` — was never a candidate for the
 * backfill that would have given it its `+2`. Two copies of a rule are two
 * until the day one of them is wrong.
 *
 * @param {object} magicItem a `magic_item` row
 * @param {object} [baseItem] the `content_item` it is built on, if any
 * @returns {boolean}
 */
export function isWeaponCatalogRow(magicItem, baseItem) {
  return WEAPON_ITEM_TYPES.includes(baseItem?.item_type)
    || !!magicItem?.item_type?.toLowerCase().includes('weapon')
}

// Resolves an equipped inventory row to a weapon, whether it is a plain content
// item or a magic item built on a weapon base. `category` is the simple/martial
// split, which only the Monk weapon test in `unarmedStrike.js` reads today.
//
// `baseResolved` is false when a magic item is weapon-typed but no base weapon
// could be found. The weapon still lists as an action — it is equipped, and the
// attack roll is knowable — but it has no damage dice, and the sheet says so
// rather than inventing them.
//
// **`data` and `effects` come from different rows for a magic weapon, and that
// is not an oversight.** `data` is the *base* weapon's — the dice, properties
// and mastery a Flame Tongue fights with are the longsword's. `effects` is the
// *magic item's* own, because the +1 and the 2d6 fire are what the enchantment
// added and the longsword knows nothing about them. Reading both off one row
// would either lose the enchantment or arm every longsword in the campaign.
export function resolveWeaponData(row) {
  // A Switch Weapon fights as its active form's base, and everything below the
  // name comes from that base row — the dice, the properties, the mastery and
  // the melee/ranged split. That last one is why `itemType` must follow the
  // base rather than the row: Archery's `{ category: 'ranged' }` has to fire on
  // a Bowblade in Longbow mode and must not in Longsword mode, and the same
  // goes for `hasWeaponProperty(weapon, 'two-handed')`, which is what makes the
  // off hand free in one form and blocked in the other.
  //
  // The name carries the form ("Bowblade (Longbow)") because the Actions tab
  // lists a line per weapon and two forms of one weapon are two different
  // attacks; a bare "Bowblade" beside 1d8 piercing at range is a line the
  // player cannot check.
  //
  // `effects` stays the *switch weapon's* own, not the base's — the same split
  // the magic branch makes below, and for the same reason. Anything enchanted
  // onto this copy belongs to it, and the catalog Longbow knows nothing about
  // it.
  const mode = resolveSwitchMode(row)
  if (mode) {
    const base = mode.active?.base_item ?? null
    return {
      name: mode.active?.label ? `${row.content_item.name} (${mode.active.label})` : row.content_item.name,
      itemType: base?.item_type ?? 'Melee Weapon',
      category: base?.weapon_category ?? row.content_item.weapon_category ?? null,
      data: base?.data ?? {},
      effects: itemEffects(row.content_item.data),
      baseResolved: !!base,
    }
  }

  if (row?.content_item && WEAPON_ITEM_TYPES.includes(row.content_item.item_type)) {
    return {
      name: row.content_item.name,
      itemType: row.content_item.item_type,
      category: row.content_item.weapon_category ?? null,
      data: row.content_item.data ?? {},
      effects: itemEffects(row.content_item.data),
      baseResolved: true,
    }
  }
  if (row?.magic_item) {
    const base = resolveBaseItem(row)
    const baseType = base?.item_type
    if (isWeaponCatalogRow(row.magic_item, base)) {
      return {
        name: row.magic_item.name,
        itemType: baseType ?? 'Melee Weapon',
        category: base?.weapon_category ?? null,
        data: base?.data ?? {},
        effects: itemEffects(row.magic_item.data),
        baseResolved: !!base,
      }
    }
  }
  return null
}

// Exact slug match against the canonical vocabulary in `itemData.js`.
//
// This was a case-insensitive *substring* match until 2026-08-07, because the
// same property arrived spelled as 'Light', 'Two-Handed' and 'Thrown (20/60)'
// depending on the source book. It gave the right answer often enough to look
// correct while remaining a guess — 'light' also matches a 'Lightning Charge'
// property, and a Fighting Style would have quietly applied. The importers now
// normalise into slugs, so the match can be exact.
export function hasWeaponProperty(weapon, name) {
  return hasProperty(weapon?.data, name)
}

// Does one weapon-filtered Effect apply to this weapon, held this way?
//
// `ctx.twoHanded` is the *grip*, not the weapon: a Versatile weapon produces two
// damage lines, and only the second one is two-handed. That is what stops
// Dueling's +2 from riding along on a longsword's versatile damage.
// `ctx.sole` means no other weapon is equipped.
//
// `ctx.ability` is the ability the attack actually uses, which is not always a
// property of the weapon: a Finesse weapon uses whichever of STR and DEX is
// higher, so the same dagger matches `{ ability: 'str' }` for one character and
// not for another. That is exactly what Rage means by "an attack using
// Strength".
//
// `ctx.offHand` marks the Light property's extra attack (VAULT-11). Like `grip`
// it describes the *swing* rather than the weapon — the same shortsword
// produces a main-hand line and an off-hand one, and a predicate that named the
// Light property instead would fire on both.
//
// The keys walked here are `WEAPON_PREDICATE_KEYS` in `effects.js`, and a key
// added to one must be added to the other — a test fails if a listed key does
// not narrow. Any other key is simply not checked, which is the VAULT-184 trap:
// it narrows nothing, so `effectProblems` refuses it before it is stored.
export function weaponMatches(predicate, weapon, ctx = {}) {
  if (!predicate) return true
  if (predicate.category === 'melee' && weapon.itemType !== 'Melee Weapon') return false
  if (predicate.category === 'ranged' && weapon.itemType !== 'Ranged Weapon') return false
  if (predicate.property && !hasWeaponProperty(weapon, predicate.property)) return false
  if (predicate.grip === 'one-handed' && ctx.twoHanded) return false
  if (predicate.grip === 'two-handed' && !ctx.twoHanded) return false
  if (predicate.sole && !ctx.sole) return false
  if (predicate.ability && ctx.ability !== predicate.ability) return false
  // Asymmetric on purpose, and the same shape `sole` uses: `offHand: true`
  // demands the extra attack, while an unset `offHand` means "any swing" and
  // must keep reaching it. Archery and Dueling are not written about the main
  // hand — they are written about weapons, and the off-hand attack is one.
  if (predicate.offHand && !ctx.offHand) return false
  return true
}

/**
 * Is the character proficient with this weapon? — VAULT-102.
 *
 * The last step of `proficiency.js`, and it lives here rather than there because
 * it is the one part of the question that needs `weaponMatches`: a grant can be
 * a tier plus a predicate ("Martial weapons that have the Thrown property"), and
 * walking that predicate is weapon knowledge. Importing `weaponMatches` into
 * `proficiency.js` would make a cycle, since this file already imports it back.
 *
 * Order matters. The category test comes **before** the GM override, because an
 * override says "proficient with Martial weapons" and a weapon whose base could
 * not be resolved has no tier to compare it to — honouring the override there
 * would be answering a question nobody could ask.
 *
 * @param {object} resolved from `resolveProficiencies`
 * @param {object} weapon from `resolveWeaponData`
 * @param {object} ctx the same grip/ability context the effect predicates use
 * @returns {'yes'|'no'|'unknown'}
 */
export function weaponProficiency(resolved, weapon, ctx = {}) {
  const category = weapon?.category
  if (!category) return 'unknown'
  if (resolved?.manualWeapons?.includes(category)) return 'yes'
  if (!resolved?.known) return 'unknown'
  if (resolved.weapons.some(g => g.category === category && weaponMatches(g.weapon, weapon, ctx))) {
    return 'yes'
  }
  // A grant nobody could parse still counts against a confident no — it names
  // either this tier or this very weapon.
  if (poisonedBy(resolved.unresolvedWeapons, [category, weapon.name])) return 'unknown'
  return 'no'
}

function matching(effects, type, weapon, ctx) {
  return (effects ?? []).filter(e => e?.type === type && weaponMatches(e.weapon, weapon, ctx))
}

/**
 * The ability this swing uses, after any `weapon_attack_ability_override` —
 * VAULT-161. Pact of the Blade, Hex Warrior and Battle Ready all say the same
 * sentence: *"you can use your Charisma modifier for the attack and damage rolls
 * instead of using Strength or Dexterity"*.
 *
 * **"Can use" is best-of, not replace.** The books grant an option, and nobody
 * takes the option when it is worse — a Hexblade with 20 Strength and 14 Charisma
 * swings with Strength. Reading it as a replacement would hand that character a
 * -3 to hit for having a feature, which is the sort of wrong number a player
 * argues about and then stops trusting the sheet over.
 *
 * Ties keep the default. That is not arbitrary: an override that changes nothing
 * numerically should not change which ability the swing *reports*, because that
 * answer is read by three other things (see the call site) and a silent switch
 * there is a behaviour change dressed as a no-op.
 *
 * Several overrides resolve to the single best of them. They do not compound —
 * two features each offering "use Charisma instead" offer the same swing.
 *
 * @param {{key: string, mod: number}} current the default ability and its modifier
 * @param {object[]} overrides already filtered through `weaponMatches`
 * @param {Object<string, number>} abilityMods every ability's modifier
 * @returns {{key: string, mod: number, source: string|null}}
 */
export function overriddenAbility(current, overrides, abilityMods) {
  let best = { key: current.key, mod: current.mod, source: null }
  for (const e of overrides ?? []) {
    const mod = abilityMods?.[e.ability]
    if (typeof mod !== 'number' || mod <= best.mod) continue
    best = { key: e.ability, mod, source: e.source ?? null }
  }
  return best
}

// Amounts go through the grammar rather than being read raw. Every authored
// weapon effect is a literal number today and `resolveAmount` returns those
// unchanged, so this changes no existing total — but `amount` is allowed to be
// a tagged formula anywhere else in the vocabulary, and one arriving here used
// to be added as an *object*, turning the whole line into NaN. An unresolvable
// amount contributes nothing, which is `sumAmounts`' rule and the right one: a
// single broken effect must not zero a weapon's damage.
function sum(entries, ctx) {
  return entries.reduce((total, e) => total + (resolveAmount(e.amount ?? 0, ctx) ?? 0), 0)
}

// Two-Weapon Fighting, and the only thing in the books that says this: "you can
// add your ability modifier to the damage of that attack".
//
// It is read as a **switch rather than a bonus**, and the negative case is why.
// The Light property withholds the modifier "unless that modifier is negative",
// so the off-hand line floors at `min(0, mod)`; summing a restored `+mod` on top
// of that floor gives the right answer for a +3 character and reads a -1 one as
// -2. What the feat actually changes is *whether the modifier applies*, so that
// is what this asks.
function restoresAbilityModifier(e) {
  return e?.amount?.kind === 'ability_modifier' && e.amount.ability === 'attack'
}

// Named contributors, so the sheet can explain where a bonus came from rather
// than silently shifting a number.
function sources(entries) {
  return entries.map(e => e.source).filter(Boolean)
}

// A RollableText damage token — `[1d8+3, damage, slashing]`. Shared with the
// Unarmed Strike row so both damage cells parse and colour identically.
export function damageToken(die, modifier, dmgType) {
  const mod = modifier !== 0 ? fmtMod(modifier) : ''
  const type = dmgType ? `, ${dmgType.toLowerCase()}` : ''
  return `[${die}${mod}, damage${type}]`
}

// `proficiency` is the resolved set from `resolveProficiencies`, or null. Null
// means unknown for every weapon, which keeps `+PB` — the default has to be the
// old behaviour, because this function is also called by `loadoutProjection` and
// the DDB branch, and a missing argument must not quietly cost a character their
// proficiency bonus.
//
// `itemEffectsApply` is the licensing gate for the weapon's *own* effects, and
// it arrives as a function rather than the campaign's `loadoutSystem` flag
// because this file cannot ask `itemBenefits.js` the question directly: that
// module imports `loadout.js`, which imports this one, and the cycle is the
// same one the `weaponProficiency` note above avoids. `deriveCharacterSheet`
// holds `opts` and passes `row => itemBenefitsApply(row, opts)`.
//
// **Its default is the gate on, not off** — the opposite call from `proficiency`
// above, and deliberately so. A missing argument there costs a bonus the
// character has earned; a missing argument here would hand out one they have
// not, and a number that is wrong high at the table is the one nobody catches.
// Under the attunement system the default *is* the right answer; a loadout
// campaign that failed to pass one would withhold visibly rather than overpay.
// VAULT-154. `armorPenalty` is `{ active, source }` or null, and it is answered
// **per row** rather than through the effect list. `vaultAttackRolls` would have
// been the obvious home and is wrong twice: it is sheet-wide, so it would
// disadvantage a spell attack the rule never touches, and nothing on any screen
// reads it — it has been dark since VAULT-82.
//
// Every weapon attack in the game uses Strength or Dexterity, so in practice
// this marks every row. It is still written as a test against `abilityKey`
// rather than a blanket flag, because the row is the only thing that knows which
// ability the swing used and a future weapon keyed to anything else must not
// silently inherit a penalty that does not apply to it.
//
// Its default is **off**, the same call `itemEffectsApply` makes: a missing
// argument must never invent a penalty the character has not earned.
export function deriveWeaponActions(
  {
    abilityScores = [], pb = 2, proficiency = null,
    itemEffectsApply = attunementSatisfied, armorPenalty = null,
  } = {},
  equippedItems = [],
  effects = [],
) {
  // Every ability, not just the two a weapon can natively use — VAULT-161. An
  // override names Charisma, Wisdom or Intelligence, and `{ kind:
  // 'ability_modifier' }` may name any of the six, so the map the amount grammar
  // resolves against has to hold all of them. It held `{ str, dex }` while those
  // were the only two anything here could ask about.
  const abilityMods = Object.fromEntries(
    (abilityScores ?? []).map(a => [a.key, a.mod ?? 0]),
  )
  const strMod = abilityMods.str ?? 0
  const dexMod = abilityMods.dex ?? 0

  const rows = (equippedItems ?? [])
    .map(row => ({ row, weapon: resolveWeaponData(row) }))
    .filter(entry => entry.weapon)

  // Dueling's "and no other weapons" — a Shield is armour, not a weapon, so it
  // does not break the condition.
  const sole = rows.length === 1

  // PHB 2024 hangs the extra attack on the **Light property**, not on the
  // Two-Weapon Fighting style: attack with a Light weapon and you may make one
  // extra attack as a Bonus Action "with a different Light weapon in your other
  // hand". Two of them, therefore — and every Light weapon in hand is a
  // candidate, because which one you swing off-hand is chosen at the table and
  // per turn. Each gets its own row rather than the app nominating one and
  // being wrong half the time.
  const lightRows = rows.filter(({ weapon }) => hasWeaponProperty(weapon, 'light'))
  const dualWielding = lightRows.length >= 2

  const build = ({ row, weapon }, offHand) => {
    // Resolved once per row and carried onto the action, so the Actions tab can
    // offer the other form without re-reading the embed. Null for everything
    // that is not a Switch Weapon.
    const switchInfo = resolveSwitchMode(row)
    const isRanged = weapon.itemType === 'Ranged Weapon'
    const isFinesse = hasWeaponProperty(weapon, 'finesse')
    const isTwoHanded = hasWeaponProperty(weapon, 'two-handed')

    // The ability key rides alongside the modifier because an `ability`
    // predicate asks which one the attack used, not which the weapon allows.
    // A Finesse weapon takes the better of the two, so a high-DEX rogue's
    // dagger reports 'dex' and a high-STR barbarian's reports 'str'.
    let defaultMod, defaultKey
    if (isRanged) {
      defaultMod = dexMod
      defaultKey = 'dex'
    } else if (isFinesse) {
      const usesStr = strMod >= dexMod
      defaultMod = usesStr ? strMod : dexMod
      defaultKey = usesStr ? 'str' : 'dex'
    } else {
      defaultMod = strMod
      defaultKey = 'str'
    }

    // VAULT-161. An override is matched against the ability the swing *would*
    // have used, which is why this ctx is built with `defaultKey` rather than the
    // answer below. That is not a workaround for the ordering — it is the books'
    // own phrasing: "instead of using Strength or Dexterity" is a condition on
    // the ability being replaced, so a predicate narrowing an override to
    // `{ ability: 'str' }` has to be asked before the replacement happens.
    const overrides = matching(effects, 'weapon_attack_ability_override', weapon, {
      sole, twoHanded: isTwoHanded, ability: defaultKey, ...(offHand && { offHand: true }),
    })
    const chosen = overriddenAbility(
      { key: defaultKey, mod: defaultMod }, overrides, abilityMods,
    )
    const abilityKey = chosen.key
    const abilityMod = chosen.mod

    // **Everything below reads `abilityKey`, and that is the whole reason the
    // override is resolved here rather than added to `attackBonus` at the end.**
    // Three things follow it for free:
    //
    //   - a `{ ability: 'str' }` predicate stops matching a Charisma swing, so
    //     Rage's "an attack using Strength" correctly withholds its damage from a
    //     pact weapon;
    //   - `{ kind: 'ability_modifier', ability: 'attack' }` resolves to the
    //     ability actually used, which is what Two-Weapon Fighting means;
    //   - the VAULT-154 armour penalty stops applying, because the rule is
    //     "an attack roll that involves Strength or Dexterity" and a Charisma
    //     attack involves neither. A Hexblade in unfamiliar plate is genuinely
    //     unhindered on that swing.
    //
    // Folding the difference into `attackBonus` would have produced the same
    // number and been wrong about all three.
    const attackCtx = {
      sole, twoHanded: isTwoHanded, ability: abilityKey, ...(offHand && { offHand: true }),
    }
    // What `{ kind: 'ability_modifier', ability: 'attack' }` resolves against.
    // This is the only place in the app that can answer it: the ability is a
    // property of the swing, not of the character.
    const amountCtx = { pb, abilityMods, attackAbility: abilityKey }
    const attackEffects = matching(effects, 'attack_roll_bonus', weapon, attackCtx)

    // The item's own bonuses (VAULT-7). No `weaponMatches` and no predicate:
    // these are written on this weapon, so the scoping question the character's
    // effects need is already answered by which row we are on.
    //
    // The one question that *is* still open is whether the enchantment is
    // switched on at all — attunement, or a loadout slot (VAULT-117). Gated
    // here rather than in `resolveWeaponData` because that function is shared
    // with `loadout.js` and `unarmedStrike.js`, neither of which reads
    // `effects`, and because the weapon must survive the gate whole: an
    // unattuned Flame Tongue still rolls a longsword's 1d8.
    const itemEffectList = itemEffectsApply(row) ? (weapon.effects ?? []) : []
    const itemAttack = itemEffectBonus(itemEffectList, 'weapon_attack_bonus')
    const itemDamage = itemEffectBonus(itemEffectList, 'weapon_damage_bonus')
    const extraDamage = itemExtraDamage(itemEffectList)

    // VAULT-102. `+PB` is withheld on a confident **no** and on nothing else:
    // 'unknown' keeps it, because the number this replaces is at least wrong in
    // the direction the player expects. Damage is untouched — the proficiency
    // bonus never applied there.
    const proficient = weaponProficiency(proficiency, weapon, attackCtx)
    const attackBonus = abilityMod + (proficient === 'no' ? 0 : pb)
      + sum(attackEffects, amountCtx) + itemAttack

    const allDmgEffects = matching(effects, 'damage_roll_bonus', weapon, attackCtx)
    // The restoring effect is pulled out of the sum and read as a switch — see
    // `restoresAbilityModifier`. It stays in `damageSources` because the player
    // still deserves to be told that Two-Weapon Fighting is why the number moved.
    const restores = allDmgEffects.some(restoresAbilityModifier)
    const dmgEffects = allDmgEffects.filter(e => !restoresAbilityModifier(e))

    // The ability modifier the *damage* gets, which is the whole of what the
    // Light property changes. It withholds the modifier from the extra attack
    // "unless that modifier is negative" — so a penalty always lands, and only
    // a benefit is withheld.
    const dmgAbilityMod = !offHand || restores ? abilityMod : Math.min(0, abilityMod)

    // No die rather than a stand-in one. This used to fall back to '1d4', which
    // meant a magic weapon with an unresolved base rolled a plausible-looking
    // wrong number at the table instead of admitting it did not know.
    const die = weapon.data.damage?.dice ?? null
    // A Versatile weapon is never Light — the two properties do not co-occur in
    // any book — but the off-hand line drops the second grip regardless, because
    // the extra attack is made with the weapon *in your other hand* and a hand
    // holding the other weapon cannot also be on this one.
    const die2 = offHand ? null : (weapon.data.versatile ?? null)
    const type = weapon.data.damage?.type ?? null

    // The versatile line is always the two-handed grip.
    const dmg2Effects = die2
      ? matching(effects, 'damage_roll_bonus', weapon, { sole, twoHanded: true, ability: abilityKey })
      : []

    return {
      // The off-hand line is a second row for the *same* inventory row, so it
      // needs a key of its own or React renders one of the two.
      id: offHand ? `${row.id}:off-hand` : row.id,
      name: weapon.name,
      // Ruling 4's economy enum, and labelling only: the panel prints
      // "Bonus Action" and nothing anywhere counts whether one has been spent.
      // Every weapon line carries it so the panel never has to infer a default.
      actionKind: offHand ? 'bonus_action' : 'action',
      offHand,
      attackBonus,
      // 'yes' | 'no' | 'unknown'. A field of its own rather than an absence
      // entry in `attackSources`: that list is the *positive* contributors the
      // panel prints as "Includes Archery" and colours green, and a missing
      // proficiency is neither a contributor nor good news.
      proficient,
      // What the character would be rolling if they were proficient, so the
      // panel can show the gap rather than only the reduced number.
      pbWithheld: proficient === 'no' ? pb : 0,
      // The tier the refusal was decided on — what a GM override would have to
      // grant, and the only word that makes "not proficient" actionable.
      weaponCategory: weapon.category,
      // VAULT-161. Which ability this swing used, and — only when an override
      // moved it off the default — the feature that said so.
      //
      // `abilityKey` is reported on every row rather than only on overridden
      // ones, because "which ability is this weapon using?" is a question a
      // Finesse weapon already made non-obvious and nothing on the sheet could
      // answer. `abilitySource` is null on the ordinary case, which is what makes
      // "is this row overridden?" one falsy check rather than a comparison
      // against a default the panel would have to re-derive.
      abilityKey,
      abilitySource: chosen.source,
      // VAULT-154. Disadvantage is not arithmetic and cannot fold into
      // `attackBonus` — it rides as its own flag with its source named, exactly
      // as saves and ability checks have carried it since VAULT-82. It
      // **pre-selects and never locks**: the panel lights the `D` in the roll
      // menu and the player is still free to roll flat, because a GM waiving
      // the penalty at the table must not require editing the sheet.
      disadvantage: !!armorPenalty?.active && ARMOR_PENALTY_ABILITIES.includes(abilityKey),
      disadvantageSources: armorPenalty?.active && ARMOR_PENALTY_ABILITIES.includes(abilityKey)
        ? [armorPenalty.source]
        : [],
      // The item names itself as a contributor, so "+1" on the attack line is
      // explained by "Includes Flame Tongue" rather than being an unattributed
      // number the player has to take on trust — the same courtesy Archery and
      // Dueling already get.
      attackSources: [...sources(attackEffects), ...(itemAttack ? [weapon.name] : [])],
      damageSources: [
        ...sources(allDmgEffects),
        ...(itemDamage || extraDamage.length ? [weapon.name] : []),
      ],
      baseUnknown: !weapon.baseResolved,
      // VAULT-155. Null for every weapon that is not a Switch Weapon, so the
      // panel's test is one falsy check. `other` is what the toggle offers and
      // `otherIndex` what it writes — both resolved here rather than in the
      // component, because "which form is the other one?" is the same question
      // `resolveSwitchMode` already answered and a second copy beside the button
      // is how the label comes to name a form the write does not select.
      //
      // **No action cost is stated.** The brew's own wording for the Switch
      // Weapon property could not be read out of the source, and the card
      // claiming "Bonus Action" was wrong about ten of its eleven weapons, so
      // printing a cost would be stating a rule nobody here has verified. The
      // toggle declares the form and the table keeps the action economy — the
      // same call the rest of this app makes about durations.
      // `inventoryId` is carried rather than letting the caller reuse `id`,
      // because they are **not the same string on an off-hand row** — that one
      // is `${row.id}:off-hand` so React has two distinct keys for one weapon.
      // A Trickblade in Shortsword form is Light and therefore produces exactly
      // such a row, so a toggle keyed on `id` would post a write against an
      // inventory row that does not exist.
      switchMode: switchInfo && {
        inventoryId: row.id,
        active: switchInfo.active?.label ?? null,
        other: switchInfo.other?.label ?? null,
        otherIndex: switchInfo.other?.mode_index ?? null,
      },
      dmgToken: die
        ? damageToken(die, dmgAbilityMod + sum(dmgEffects, amountCtx) + itemDamage, type)
        : null,
      dmgToken2: die2
        ? damageToken(die2, abilityMod + sum(dmg2Effects, amountCtx) + itemDamage, type)
        : null,
      // Its own tokens rather than folded into the two above, because a
      // Flame Tongue's 2d6 fire is a different die *and* a different damage
      // type — there is no modifier it could be added to. One list serves both
      // grips: nothing about extra damage depends on how the weapon is held.
      //
      // Empty rather than null when there is none, so `ActionsPanel` maps over
      // it without a guard and an older cached row cannot crash the sheet.
      extraDamageTokens: extraDamage.map(d => damageToken(d.dice, 0, d.type)),
      // Canonical properties only. The attack line is where a player reads what
      // the weapon *does*, and a source-specific code ('GC:VSS-B') means nothing
      // there — those stay in `data.sourceProperties` and are shown in full by
      // the item drawer, which is the catalog view. This replaces an explicit
      // `startsWith('GC:')` filter that only knew about one book's codes.
      props: displayProperties({ properties: weapon.data.properties }),
      magicItemId: row.magic_item?.id ?? null,
      rarityId: row.magic_item?.rarity_id ?? null,
      // What a `dice_intervention`'s `weapon` predicate is answered against at
      // roll time (VAULT-85). It rides on the row because the damage token is a
      // string — `[1d8+3, damage, slashing]` says nothing about the weapon that
      // produced it, and `RollableText` is shared with monsters and magic items,
      // so it cannot know either. Two of them, because the versatile line is the
      // two-handed grip and Great Weapon Fighting turns on exactly that.
      weaponCtx: { weapon, ...attackCtx },
      weaponCtx2: die2 ? { weapon, sole, twoHanded: true, ability: abilityKey } : null,
    }
  }

  // Off-hand rows come after every main-hand one rather than beside their own
  // weapon, so the panel reads as "here is your Action, then here is your Bonus
  // Action" — which is the order the turn happens in.
  return [
    ...rows.map(entry => build(entry, false)),
    ...(dualWielding ? lightRows.map(entry => build(entry, true)) : []),
  ]
}
