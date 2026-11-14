// @ts-check
// The effect vocabulary — VAULT-82, phase 1 of VAULT-66.
//
// Every Effect in the app is a `{ type, ...payload, ...envelope }` object living
// in a `data.effects[]` array on a content row, baked into
// `character.json.resolvedEffects[]` by `@vault/derive/effectBaking.js`. Until this module
// existed there was no single statement of what a `type` may be, what the shared
// fields around it mean, or who decides whether one applies — each of those was
// spread across the consumers that happened to need it.
//
// The rulings this implements are `docs/design/feat-mechanics.md` (VAULT-69).
// That file is the *why*; this one is the vocabulary.
//
// **This module stays vocabulary-only.** It defines what a `type` may be and the
// envelope every effect shares; it reads none of them. That was the point of
// landing the enum first, and it still holds — the consumers grew up around it
// in `vaultDerive.js`, `rollEngine.js` and the feat UI without this file
// changing.
//
// **Which types have a consumer is not recorded here, on purpose.** That is a
// fact about wiring, and it moves every time a story lands; stated as prose it
// goes stale silently, which it did between VAULT-82 and VAULT-99. The live
// answer is the `CONSUMED` set in `scripts/audit_feat_benefits.mjs`, which
// asserts that every name in it is still in `EFFECT_TYPES` and exits non-zero
// when it is not. The group comments below say where a type came *from*, which
// cannot rot.

import { ABILITY_FULL_NAMES, capitalize } from './dnd5e.js'
import { toolName } from './tools.js'

/**
 * The `amount` grammar (Ruling 7): a literal number, or one of a closed set of
 * tagged objects. Authored, so anything else may arrive and is refused.
 *
 * @typedef {{ kind?: string, times?: unknown, ability?: string, class?: string, notation?: string, of?: readonly unknown[] }} AmountObject
 * @typedef {number | AmountObject | null | undefined} Amount
 */
/**
 * What an amount resolves against. Every key is optional: with no character,
 * an amount names itself instead.
 *
 * @typedef {{
 *   pb?: number,
 *   abilityMods?: Readonly<Record<string, number | null | undefined>>,
 *   classLevels?: Readonly<Record<string, number | null | undefined>>,
 *   featChoiceAbility?: string | null,
 *   attackAbility?: string | null,
 * }} AmountContext
 */
/**
 * The envelope's `weapon` predicate: the keys `weaponMatches` walks.
 *
 * @typedef {{ category?: string, property?: string, grip?: string, sole?: boolean, ability?: string, offHand?: boolean }} WeaponPredicate
 */
/**
 * One effect: a `type`, its payload, and the envelope. One shape for the whole
 * vocabulary rather than a union per type, because the consumers read it by
 * field. Every field is optional, typed as the describers below and the
 * consumers read it, and a field no type here names is still allowed through.
 *
 * @typedef {{
 *   type?: string,
 *   amount?: Amount,
 *   ability?: string | null,
 *   options?: readonly string[] | null,
 *   max?: number | null,
 *   score?: unknown,
 *   skill?: string | null,
 *   tool?: string | null,
 *   category?: string | null,
 *   value?: string | null,
 *   mode?: string | null,
 *   add?: boolean | null,
 *   sense?: string | null,
 *   range?: number | string | null,
 *   die?: number | null,
 *   dieIfEmptyHanded?: number | null,
 *   classes?: readonly (string | null | undefined)[] | null,
 *   spell?: string | null,
 *   spellId?: string | null,
 *   name?: string | null,
 *   action?: string | null,
 *   uses?: Amount,
 *   resets?: string | null,
 *   damageType?: string | null,
 *   on?: readonly (number | string)[] | null,
 *   to?: number | null,
 *   condition?: string | null,
 *   weapon?: WeaponPredicate | null,
 *   requires?: string | null,
 *   activation?: string | null,
 *   active_only?: boolean | null,
 *   duration?: string | null,
 *   trigger?: string | null,
 *   source?: string | null,
 *   sourceFeatureId?: string | null,
 *   sourceKind?: string | null,
 *   benefitKey?: string | null,
 *   [field: string]: unknown,
 * }} Effect
 */
/**
 * An effect's envelope, as `readEnvelope` reads it.
 *
 * @typedef {{
 *   activation: string,
 *   duration: string | null,
 *   trigger: string | null,
 *   weapon: WeaponPredicate | null,
 *   requires: string | null,
 *   source: string | null,
 *   sourceFeatureId: string | null,
 *   sourceKind: string | null,
 *   benefitKey: string | null,
 * }} Envelope
 */
/** @typedef {{ category: string, weapon?: WeaponPredicate }} ProficiencyGrant */

// ---------------------------------------------------------------------------
// The closed type enum
// ---------------------------------------------------------------------------

// VAULT-82's original eighteen — the vocabulary this module opened with, before
// the twelve rulings added to it. Named for where they came from rather than for
// being consumed: they were called `CONSUMED_TYPES` until VAULT-99, which implied
// the groups below it were not, and by then that was false in two of the three.
const FOUNDATION_TYPES = [
  'ability_score_bonus',
  'ac_bonus',
  'attack_roll_bonus',
  'bonus_cantrips',
  'condition_immunity',
  'damage_roll_bonus',
  'half_proficiency_skills',
  'hp_bonus_per_level',
  'immunity',
  'resistance',
  'saving_throw_advantage',
  'saving_throw_proficiency',
  'sense',
  'skill_proficiency',
  'speed',
  'spell_list_access',
  'unarmed_strike_die',
  'vulnerability',
]

// The roll- and score-modifier types VAULT-66 names. VAULT-82 added them to the
// enum and wired their consumers in the same ticket, so they never sat in here
// with nothing reading them — the state `sense` sat in for months.
const BONUS_TYPES = [
  'ability_check_advantage',
  'ability_check_bonus',
  'ability_check_disadvantage',
  'attack_roll_advantage',
  'attack_roll_disadvantage',
  'expertise',
  'hp_bonus',
  'initiative_bonus',
  'passive_bonus',
  'saving_throw_bonus',
  'saving_throw_disadvantage',
  'skill_bonus',
]

// The eight new types from the twelve rulings (docs/design/feat-mechanics.md).
// Six shipped with no consumer at all — deliberately, because the enum is what
// unblocks authoring — and VAULT-84 and VAULT-85 have since landed the UI that
// reads them. The audit script has the current count.
const RULED_TYPES = [
  'ability_score_choice', // Ruling 9  — replaces free-text `data.ability`
  'crit_range',           // Ruling 8  — sheet-level, minimum across sources
  'dice_intervention',    // Ruling 12 — mode: floor | reroll | twice
  'feat_save_dc',         // Ruling 3  — a displayed number; the rest is prose
  'feature_resource',     // Ruling 1  — spread into classResourcePools
  'granted_action',       // Ruling 4  — labelling only
  'spell_grant',          // Ruling 2  — mode: prepared | cantrip | free_cast; `spellbook` is baked, never authored (VAULT-264)
  'tool_proficiency',     // Ruling 5  — `tool` is a slug of `TOOLS` (tools.js, VAULT-176)
]

// Ruling 5's amendment — VAULT-92. Ruled prose on 2026-08-21 on the grounds that
// nothing would read them, and reversed on 2026-08-25 because `weaponActions.js`
// does not read the answer, it *assumes* one: `abilityMod + pb + …` treats every
// character as proficient with every weapon they hold.
//
// **Possession only.** These say what a character is trained in; nothing yet
// changes because of it. That is not the `sense`-shaped wait for a consumer —
// the consumer exists and is wrong, and it stays wrong on purpose until the class
// baseline can carry it. Eleven of 28 classes have an *empty*
// `startingProficiencies`, which is unimported rather than unproficient, so
// gating `+PB` today would take it off characters for a data-entry reason.
const PROFICIENCY_TYPES = [
  'armor_training',      // light | medium | heavy | shield
  'weapon_proficiency',  // simple | martial | advanced | improvised
]

// VAULT-161. The last of CONTEXT.md's three documented-but-absent `weapon_*`
// types, and the only one that belongs in *this* enum rather than beside the
// other two in `ITEM_EFFECT_TYPES`.
//
// The line VAULT-7 drew is what decides it. An item effect is scoped by the item
// it is written on, so it takes no predicate; every member of this enum is
// granted to a **character** and may carry a `weapon` predicate narrowing which
// weapons it reaches. Pact of the Blade is granted to the warlock, not written on
// the sword — a different sword next week is still covered, and the bonded one is
// picked out by the predicate. So it is one of these.
//
// `weapon_attack_bonus` and `weapon_damage_bonus` stay out, and a feat authoring
// either is still an error `audit_feat_benefits.mjs` exits 1 on. That is not an
// oversight this ticket forgot to tidy; it is the same distinction, holding.
const OVERRIDE_TYPES = [
  'weapon_attack_ability_override', // Ruling-free: the books all say "you can use"
]

// VAULT-195. The two spell-bonus types VAULT-150 specified for the Wands of the
// War Mage and could not write, because neither existed in either enum.
//
// They are in `ITEM_EFFECT_TYPES` as well, and `ac_bonus`'s reasoning is what
// puts them in both. The items that grant them say "**While holding** this
// wand", which is `loadout_slot: main_hand` plus attunement — exactly the
// question `itemBenefitsApply` already answers — so they reach the sheet down
// the ordinary `allEffects` road and need no third home. What the second list
// buys is the *authoring* half: `itemEffectProblems` validates against it, so
// without the entry there the builder would refuse the payload the sheet reads.
//
// `spell_save_dc_bonus` may carry a `classes: []` predicate and
// `spell_attack_bonus` may not, which is not an oversight. It is the shape of
// the Rod of the Pact Keeper: "a +N bonus to spell attack rolls **and to the
// saving throw DCs of your Warlock spells**" — one item, two differently-scoped
// halves. An unscoped attack bonus is every printed case of it.
//
// Both were wired into `spellcasting.js` in this ticket rather than landed
// bare, for the reason `BONUS_TYPES` above records.
const SPELLCASTING_TYPES = [
  'spell_attack_bonus',
  'spell_save_dc_bonus',
]

// VAULT-258. Ruling 14 in `docs/design/feat-mechanics.md`. "Your Intelligence
// score is 19 while you wear this headband" cannot be said with
// `ability_score_bonus`, because no fixed bonus lands every character on 19,
// and it is a **floor**, not an override: "it has no effect on you if your
// Intelligence is 19 or higher without it". So it is a type of its own, carrying
// `score` rather than `amount`. An amount is a bonus the grammar may resolve,
// and a score is a number the sheet compares against.
//
// It is in `ITEM_EFFECT_TYPES` too, on `ac_bonus`'s reasoning: the item's rule is
// already a statement about the character. Every printed case is an item (the
// Headband of Intellect, the Amulet of Health, the Gauntlets of Ogre Power, the
// giant-strength belts), and nothing stops a feature from authoring one.
const SCORE_TYPES = [
  'ability_score_set',
]

/**
 * Every effect type the app understands. Closed: an effect whose type is not in
 * here is not a thing the app does, and `isKnownEffectType` says so rather than
 * the effect being silently skipped by every consumer in turn.
 *
 * Pinned by a test, so widening it is a deliberate edit with a ruling behind it.
 */
/** @type {readonly string[]} */
export const EFFECT_TYPES = Object.freeze(
  [
    ...FOUNDATION_TYPES, ...BONUS_TYPES, ...RULED_TYPES,
    ...PROFICIENCY_TYPES, ...OVERRIDE_TYPES, ...SPELLCASTING_TYPES,
    ...SCORE_TYPES,
  ].sort(),
)

const EFFECT_TYPE_SET = new Set(EFFECT_TYPES)

/**
 * @param {unknown} type
 * @returns {type is string}
 */
export function isKnownEffectType(type) {
  return typeof type === 'string' && EFFECT_TYPE_SET.has(type)
}

// ---------------------------------------------------------------------------
// The closed sub-vocabularies
// ---------------------------------------------------------------------------

// Ruling 1: closed at two. Every recharge in the catalog is one of these — no
// `dawn`, no `encounter`.
/** @type {readonly string[]} */
export const RESET_KINDS = Object.freeze(['short_rest', 'long_rest'])

// Ruling 4: the action economy, labelling only. The app prints "Bonus Action";
// it never tracks whether you have spent yours, because that is simulating play.
/** @type {readonly string[]} */
export const ACTION_KINDS = Object.freeze([
  'action', 'bonus_action', 'reaction', 'magic_action', 'free',
])

// Ruling 2. The modes an author may pick. `spellbook` is left out on purpose:
// only `additionalSpellEffects` writes it, for a Savant's free book spells, and
// only a sheet that has a spellbook can show it (VAULT-264).
/** @type {readonly string[]} */
export const SPELL_GRANT_MODES = Object.freeze(['prepared', 'cantrip', 'free_cast'])

// Ruling 12, and closed at three on purpose. An intervention *rewrites a die
// face on the roll being made*. Adding a roll, or changing advantage state, is a
// granted Reaction under Ruling 4 — `applyKeep` already owns advantage, and a
// second path to it would let two mechanisms disagree about one roll.
/** @type {readonly string[]} */
export const DICE_INTERVENTION_MODES = Object.freeze(['floor', 'reroll', 'twice'])

// The movement modes a `speed` effect may name. `vaultDerive.js` accepted these
// and then discarded everything that was not `walk` — see `vaultSpeeds`.
/** @type {readonly string[]} */
export const SPEED_MODES = Object.freeze(['walk', 'fly', 'swim', 'climb', 'burrow'])

// Ruling 5 as amended. Named after the books rather than after each other: the
// 2024 PHB heads these rows "Weapon Proficiency" and "Armor Training", so a
// reader comparing a class table to a feat row sees one word for one idea.
//
// `improvised` is a category in the same sense the others are — Tavern Brawler
// grants it, and it is exactly as flat a grant as Martial.
/** @type {readonly string[]} */
export const WEAPON_PROFICIENCY_CATEGORIES = Object.freeze([
  'simple', 'martial', 'advanced', 'improvised',
])

// `shield` singular, matching `content_item.item_type === 'Shield'`. The class
// catalog spells it both ways and `normaliseArmorTraining` is what settles that.
/** @type {readonly string[]} */
export const ARMOR_TRAINING_CATEGORIES = Object.freeze([
  'light', 'medium', 'heavy', 'shield',
])

// The abilities the unproficient-armour penalty touches — VAULT-154. PHB 2014
// p. 144 / XPHB 2024 p. 212: "Disadvantage on any ability check, saving throw,
// or attack roll that involves Strength or Dexterity". A pair rather than a
// blanket, which is exactly what keeps Constitution saves and spell attacks out
// of it. Lives here because `vaultDerive.js` and `weaponActions.js` both answer
// the question and must not hold two copies of the list.
/** @type {readonly string[]} */
export const ARMOR_PENALTY_ABILITIES = Object.freeze(['str', 'dex'])

// ---------------------------------------------------------------------------
// Normalising a catalog string into those vocabularies — VAULT-92
// ---------------------------------------------------------------------------
//
// `content_class.data.startingProficiencies` is 5e.tools prose and is in six
// dialects at once: bare (`'simple'`), suffixed (`'simple weapons'`), a prose
// predicate (`'martial weapons that have the Light property'`), an unrendered ref
// tag (`'{@filter Martial Ranged weapons|…}'`), individual weapon names
// (`'chakrams'`), and empty. Until VAULT-92 the only readers were
// `classArmorProfs` / `classWeaponProfs`, which `capitalize()` it for display —
// so the disagreement was invisible, because prose renders fine either way.
//
// **Anything these cannot place is returned, never dropped.** A grant the app
// silently forgets is worse than one it admits it cannot read: the first shows a
// character as unproficient with a weapon their class gave them, and nothing on
// screen says why.

/**
 * @param {unknown} text
 * @returns {string}
 */
function cleaned(text) {
  return typeof text === 'string' ? text.trim().toLowerCase().replace(/\s+/g, ' ') : ''
}

/**
 * One class-catalog weapon string as a `weapon_proficiency` payload.
 *
 * Resolves a tier, optionally narrowed by the envelope's `weapon` predicate:
 * `'martial ranged weapons'` and `'martial weapons that have the Light property'`
 * are both real catalog entries and both a tier plus a filter, not new tiers.
 *
 * **A disjunction is unresolvable on purpose.** The Rogue's `'martial weapons
 * that have the Finesse or Light property'` is an OR and the predicate is an AND
 * — `weaponMatches` walks its keys and every one must hold. Returning
 * `{ property: 'finesse' }` would quietly halve the Rogue's weapon list, so the
 * string comes back whole and a human reads it.
 *
 * @param {unknown} text
 * @returns {ProficiencyGrant | null} null when unplaceable
 */
export function normaliseWeaponProficiency(text) {
  const s = cleaned(text).replace(/\s+weapons?$/, '')
  if (!s) return null

  // 'martial ranged' / 'ranged martial' — the tier and the reach, either order.
  const tiers = WEAPON_PROFICIENCY_CATEGORIES.join('|')
  const paired = s.match(new RegExp(`^(?:(${tiers}) (ranged|melee)|(ranged|melee) (${tiers}))$`))
  if (paired) {
    const category = paired[1] ?? paired[4]
    const reach = paired[2] ?? paired[3]
    return { category, weapon: { category: reach } }
  }

  if (WEAPON_PROFICIENCY_CATEGORIES.includes(s)) return { category: s }

  // 'martial weapons that have the Light property' — one property only. The
  // suffix strip above cannot have run here: this string ends in 'property', so
  // its 'weapons' is mid-clause and the pattern has to allow for it.
  const scoped = s.match(
    new RegExp(`^(${tiers})(?: weapons?)? that (?:have|has) the ([a-z-]+) property$`),
  )
  if (scoped) return { category: scoped[1], weapon: { property: scoped[2] } }

  return null
}

/**
 * One class-catalog armour string as an `armor_training` payload.
 *
 * `'light armor'`, `'light armour'` and `'light'` are the same grant; `'shields'`
 * and `'shield'` are the same grant. That is the whole dialect problem on this
 * side, and it is why the armour half needs no predicate.
 *
 * @param {unknown} text
 * @returns {{category: string}|null} null when unplaceable
 */
export function normaliseArmorTraining(text) {
  const s = cleaned(text).replace(/\s+armou?r$/, '').replace(/s$/, '')
  if (!s) return null
  return ARMOR_TRAINING_CATEGORIES.includes(s) ? { category: s } : null
}

/**
 * A whole list, split into what was placed and what was not.
 *
 * @template {object} G
 * @param {readonly unknown[] | null | undefined} list
 * @param {(text: string) => G | null} normalise
 * @returns {{granted: G[], unresolved: string[]}}
 */
export function normaliseProficiencyList(list, normalise) {
  /** @type {G[]} */
  const granted = []
  /** @type {string[]} */
  const unresolved = []
  for (const entry of list ?? []) {
    if (typeof entry !== 'string' || !entry.trim()) continue
    const placed = normalise(entry)
    if (placed) granted.push(placed)
    else unresolved.push(entry)
  }
  return { granted, unresolved }
}

// ---------------------------------------------------------------------------
// The envelope
// ---------------------------------------------------------------------------

/**
 * The fields every effect may carry regardless of its type.
 *
 * - `activation`  'passive' | 'activated' — whether a toggle governs it
 * - `duration`    prose; how long it lasts once activated
 * - `trigger`     prose. **Never detected.** Ruling 8 settles this for the whole
 *                 envelope: the design brief has no trigger-detection UI, so
 *                 `trigger: 'critical_hit'` is a printed reminder and nothing more
 * - `weapon`      a predicate narrowing the effect to some weapons
 * - `requires`    a precondition the sheet can check (`'armor'` today)
 * - `source`      the granting feature's display name
 * - `sourceFeatureId` the granting row's id
 * - `sourceKind`  'feat' | 'feature' | 'race' | 'item' — what kind of row that was
 * - `benefitKey`  which benefit of that row, for the choice and activation keys
 */
/** @type {readonly string[]} */
export const ENVELOPE_FIELDS = Object.freeze([
  'activation', 'duration', 'trigger', 'weapon', 'requires',
  'source', 'sourceFeatureId', 'sourceKind', 'benefitKey',
])

/**
 * The `weapon` predicate's vocabulary: every key `weaponMatches` in
 * `weaponActions.js` walks, and nothing else. It lives here rather than beside
 * its walker because the envelope owns it and `weaponActions.js` already
 * imports this file — not the other way round.
 *
 * **A key outside this list is not checked, so it narrows nothing.** VAULT-184:
 * `weaponQualifier` used to speak a `type` key ("with a quarterstaff") that the
 * walker had never heard of, so the effect read as one weapon and applied to
 * every weapon. `effectProblems` refuses any other key at save time, and a test
 * pins the describer to this list.
 */
/** @type {readonly string[]} */
export const WEAPON_PREDICATE_KEYS = Object.freeze([
  'category', 'property', 'grip', 'sole', 'ability', 'offHand',
])

/** @type {readonly string[]} */
export const WEAPON_PREDICATE_CATEGORIES = Object.freeze(['melee', 'ranged'])
/** @type {readonly string[]} */
export const WEAPON_PREDICATE_GRIPS = Object.freeze(['one-handed', 'two-handed'])

/** @type {readonly string[]} */
export const ACTIVATIONS = Object.freeze(['passive', 'activated'])

/** @type {readonly string[]} */
export const SOURCE_KINDS = Object.freeze(['feat', 'feature', 'race', 'item'])

/**
 * Read an effect's envelope, normalising the one field that has two spellings.
 *
 * **`active_only: true` and `activation: 'activated'` mean the same thing, and
 * both are read for one release.** Four live rows carry the old flag — Rage's
 * three resistances and its Strength-save advantage — and they are content, not
 * code, so they change on their own schedule. Reading both here is what lets the
 * consumers stop caring which spelling a row uses.
 *
 * @param {Effect | null | undefined} effect
 * @returns {Envelope} the envelope, with `activation` always one of ACTIVATIONS
 */
export function readEnvelope(effect) {
  /** @type {Effect} */
  const e = effect ?? {}
  const activation = e.activation ?? (e.active_only ? 'activated' : 'passive')
  return {
    activation: ACTIVATIONS.includes(activation) ? activation : 'passive',
    duration: e.duration ?? null,
    trigger: e.trigger ?? null,
    weapon: e.weapon ?? null,
    requires: e.requires ?? null,
    source: e.source ?? null,
    sourceFeatureId: e.sourceFeatureId ?? null,
    sourceKind: e.sourceKind ?? null,
    benefitKey: e.benefitKey ?? null,
  }
}

/**
 * Whether an effect only applies while something has switched it on.
 *
 * @param {Effect | null | undefined} effect
 */
export function isActivated(effect) {
  return readEnvelope(effect).activation === 'activated'
}

/**
 * The key an activated effect is toggled by.
 *
 * **Keyed per benefit, not per feature** (Ruling 9 and Ruling 11): one feat row
 * can carry several independently-toggled benefits, and two copies of a
 * repeatable feat must not collide. `<sourceKind>:<id>:<benefitKey>` is the same
 * shape `featureChoices` uses, so a benefit's choice and its toggle are found
 * under one addressing scheme rather than two.
 *
 * Falls back to the bare `sourceFeatureId` when there is no `benefitKey`, which
 * is what every row authored before this ticket looks like — and is exactly the
 * key `vault_state.activeFeatures` already holds, so the old state keeps working.
 *
 * @param {Effect | null | undefined} effect
 * @returns {string|null} null when the effect names no source at all
 */
export function effectKey(effect) {
  const { sourceFeatureId, sourceKind, benefitKey } = readEnvelope(effect)
  if (!sourceFeatureId) return null
  if (!benefitKey) return sourceFeatureId
  return `${sourceKind ?? 'feature'}:${sourceFeatureId}:${benefitKey}`
}

/**
 * **The one gate.** Whether an effect applies right now.
 *
 * Modelled on `itemBenefitsApply` (VAULT-51), and here for the same reason it
 * is: before this, the identical check was written out at
 * `deriveCharacterSheet.js:165` and `defenseGrants.js:34`, because
 * `sheet.resolvedEffects` is re-exported *unfiltered* and every consumer had to
 * re-derive the filter. Two copies of a rule that must agree forever is how a
 * resistance shows on the Defensive Profile while the same feature's AC bonus
 * does not.
 *
 * A passive effect always applies. An activated one applies only while its key
 * is switched on — and it is checked under **both** its per-benefit key and its
 * bare feature id, so state written before this ticket still switches Rage on.
 *
 * @param {Effect | null | undefined} effect
 * @param {ReadonlySet<string> | readonly string[] | null} [activeKeys] from `activeEffectKeys(vaultState)`
 * @returns {boolean}
 */
export function effectApplies(effect, activeKeys = new Set()) {
  if (!isActivated(effect)) return true
  const keys = activeKeys instanceof Set ? activeKeys : new Set(activeKeys ?? [])
  const key = effectKey(effect)
  const { sourceFeatureId } = readEnvelope(effect)
  // An activated effect with no source can never be switched on, so it never
  // applies — the safe direction, and it is a content bug rather than a state.
  if (!key) return false
  return keys.has(key) || (!!sourceFeatureId && keys.has(sourceFeatureId))
}

/**
 * The active-toggle keys held in `vault_state`, from either generation.
 *
 * `activeEffects` is the per-benefit list this ticket introduces;
 * `activeFeatures` is the per-feature list it replaces. **Both are read for one
 * release** — the second is what every live character carries today, and a
 * character mid-Rage must not have it switched off by a deploy.
 *
 * @param {{ activeEffects?: readonly string[] | null, activeFeatures?: readonly string[] | null } | null} [vaultState]
 * @returns {Set<string>}
 */
export function activeEffectKeys(vaultState) {
  return new Set([
    ...(vaultState?.activeEffects ?? []),
    ...(vaultState?.activeFeatures ?? []),
  ])
}

/**
 * Every effect that applies, given the character's toggles. The gate, applied.
 *
 * @template {Effect} E
 * @param {readonly E[] | null | undefined} effects
 * @param {ReadonlySet<string> | readonly string[] | null} [activeKeys]
 * @returns {E[]}
 */
export function applicableEffects(effects, activeKeys = new Set()) {
  return (effects ?? []).filter(e => effectApplies(e, activeKeys))
}

/**
 * Effects of one type, already gated. The shape most consumers want.
 *
 * @template {Effect} E
 * @param {readonly (E | null | undefined)[] | null | undefined} effects
 * @param {string} type
 * @returns {E[]}
 */
export function effectsOfType(effects, type) {
  return (effects ?? []).filter(/** @returns {e is E} */ e => e?.type === type)
}

// ---------------------------------------------------------------------------
// The amount grammar — Ruling 7 / VAULT-76
// ---------------------------------------------------------------------------

// The kinds an amount may take. Closed, and each has exactly one consumer.
/** @type {readonly string[]} */
export const AMOUNT_KINDS = Object.freeze([
  'proficiency_bonus', 'ability_modifier', 'class_level', 'dice', 'sum',
])

// `ability_modifier` may name an ability, or *point at one* the character makes
// true. Both back-references are closed names resolved from `ctx`, never
// expressions — the same reason `AMOUNT_KINDS` is an enum rather than a parser.
//
//   feat_choice  the ability this feat raised — Ruling 9's back-reference.
//   attack       the ability the *attack being rolled* used, which is not a
//                property of the character at all: a Finesse weapon takes the
//                better of STR and DEX, so one dagger answers 'str' for the
//                barbarian and 'dex' for the rogue. Two-Weapon Fighting's
//                "your ability modifier" means exactly this and nothing else
//                (VAULT-11), which is why naming an ability outright would be
//                wrong for half the characters who take it.
//
// An unset back-reference resolves to null and the amount is unresolvable,
// which is correct: `attack` off a weapon line has no answer, and Ruling 7
// says an unresolvable formula renders as prose rather than as a wrong number.
/** @type {Readonly<Record<string, (ctx: AmountContext) => string | null>>} */
const BACK_REFERENCES = Object.freeze({
  feat_choice: ctx => ctx.featChoiceAbility ?? null,
  attack: ctx => ctx.attackAbility ?? null,
})

// What each back-reference is called when it cannot be resolved — see
// `amountText`. Kept beside the table above so adding one cannot leave the
// catalog rendering an effect's type name instead of its sentence.
/** @type {Readonly<Record<string, string>>} */
const BACK_REFERENCE_NAMES = Object.freeze({
  feat_choice: "this feat's ability",
  attack: 'ability',
})

/**
 * Resolve an effect's `amount` against a character.
 *
 * A literal number resolves to itself, which is every amount authored today.
 * Beyond that the grammar is a **closed set of tagged objects**, never an
 * expression string — VAULT-66 rejects the generic form and the reason
 * generalises: *a mistyped target must be distinguishable from a real one*.
 * `{ kind: 'proficiency_bonus' }` either parses or does not;
 * `"prof_bonus * 2"` fails silently at render time on one character's sheet,
 * months later.
 *
 * **An unresolvable amount returns `null`, never 0.** Zero is a real answer a
 * feature can legitimately give, so collapsing "I could not work this out" into
 * it would make a broken effect look like a weak one. Callers that need a number
 * to add should treat null as "render the prose instead", which is what Ruling 7
 * means by an unresolvable formula being *ruled prose* rather than a failure.
 *
 * `{ kind: 'dice' }` resolves to `null` too — dice are not a number until they
 * are rolled. `describeAmount` is what renders one.
 *
 * `ctx` (`AmountContext`): `pb`, the proficiency bonus; `abilityMods`, keyed
 * str/dex/con/int/wis/cha; `classLevels`, keyed by class name;
 * `featChoiceAbility`, the ability this feat raised, for
 * `ability: 'feat_choice'` (see `BACK_REFERENCES`); `attackAbility`, the ability
 * the attack being rolled used, for `ability: 'attack'`, supplied only by
 * `weaponActions.js`.
 *
 * @param {unknown} raw the amount
 * @param {AmountContext} [ctx]
 * @returns {number|null}
 */
export function resolveAmount(raw, ctx = {}) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  // A string is rejected outright rather than parsed. This is the whole point of
  // the closed enum, so it must not be quietly coerced here.
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const amount = /** @type {AmountObject} */ (raw)
  if (!AMOUNT_KINDS.includes(amount.kind ?? '')) return null

  switch (amount.kind) {
    case 'proficiency_bonus': {
      const pb = ctx.pb
      if (typeof pb !== 'number') return null
      const times = amount.times ?? 1
      return typeof times === 'number' ? pb * times : null
    }
    case 'ability_modifier': {
      const ability = BACK_REFERENCES[amount.ability ?? '']?.(ctx) ?? amount.ability
      if (!ability) return null
      const mod = ctx.abilityMods?.[ability]
      return typeof mod === 'number' ? mod : null
    }
    case 'class_level': {
      const level = ctx.classLevels?.[amount.class ?? '']
      return typeof level === 'number' ? level : null
    }
    // Dice are not a number until they are thrown. A caller wanting to render
    // "1d8 + 3" asks describeAmount; one wanting to roll it reads `notation`.
    case 'dice':
      return null
    case 'sum': {
      if (!Array.isArray(amount.of)) return null
      let total = 0
      for (const part of amount.of) {
        const value = resolveAmount(part, ctx)
        // One unresolvable member makes the whole sum unresolvable — a partial
        // total is a wrong number wearing the costume of a right one.
        if (value === null) return null
        total += value
      }
      return total
    }
    default:
      return null
  }
}

/**
 * An amount as text, for the cases that cannot be a single number.
 *
 * `1d8 + PB + CHA` is Knight of the Rose's temp HP: Ruling 6 hands the player
 * the resolved formula and lets them type the result, so the formula has to
 * render with live numbers in it even though it never becomes one.
 *
 * @param {unknown} raw the amount
 * @param {AmountContext} [ctx]
 * @returns {string|null} null when nothing can be said about it
 */
export function describeAmount(raw, ctx = {}) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? String(raw) : null
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const amount = /** @type {AmountObject} */ (raw)

  if (amount.kind === 'dice') return amount.notation ?? null
  if (amount.kind === 'sum') {
    if (!Array.isArray(amount.of)) return null
    const parts = amount.of.map(part => describeAmount(part, ctx)).filter(/** @returns {p is string} */ p => Boolean(p))
    return parts.length > 0 ? parts.join(' + ') : null
  }
  const value = resolveAmount(amount, ctx)
  return value === null ? null : String(value)
}

/**
 * The numeric total of every effect of one type, resolved through the grammar.
 *
 * Unresolvable amounts contribute nothing rather than poisoning the sum, which
 * is the opposite of `{ kind: 'sum' }`'s rule above and deliberately so: there,
 * a missing member means one formula is unanswerable; here, one broken effect
 * among several must not silently zero a character's hit points.
 *
 * @param {readonly (Effect | null | undefined)[] | null | undefined} effects
 * @param {string} type
 * @param {AmountContext} [ctx]
 * @returns {number}
 */
export function sumAmounts(effects, type, ctx = {}) {
  return effectsOfType(effects, type).reduce((total, e) => {
    const value = resolveAmount(e.amount ?? 0, ctx)
    return total + (value ?? 0)
  }, 0)
}

// ---------------------------------------------------------------------------
// Plain language — VAULT-86
// ---------------------------------------------------------------------------

// An amount when there may be no character to resolve it against.
//
// `describeAmount` returns null for `{ kind: 'proficiency_bonus' }` without a
// `ctx.pb`, which is every read on `/feats` — the catalog has no character.
// Rendering nothing there would hide the effect entirely, so an unresolved
// amount falls back to naming itself. On a sheet the live number wins.
/**
 * @param {unknown} raw
 * @param {AmountContext} ctx
 * @returns {string | null}
 */
function amountText(raw, ctx) {
  const resolved = describeAmount(raw, ctx)
  if (resolved !== null) return resolved
  if (!raw || typeof raw !== 'object') return null
  const amount = /** @type {AmountObject} */ (raw)
  switch (amount.kind) {
    case 'proficiency_bonus':
      return amount.times && amount.times !== 1
        ? `${String(amount.times)} × your Proficiency Bonus`
        : 'your Proficiency Bonus'
    case 'ability_modifier': {
      // A back-reference has no ability to name until there is a character (or,
      // for `attack`, a swing), so it names the *reference* instead. Without
      // this the whole effect falls through to its type name on `/feats`, where
      // nothing can ever resolve.
      const ability = BACK_REFERENCE_NAMES[amount.ability ?? '']
        ?? ABILITY_FULL_NAMES[amount.ability ?? '']
      return ability ? `your ${ability} modifier` : null
    }
    case 'class_level':
      return amount.class ? `your ${amount.class} level` : 'your level'
    case 'sum': {
      const parts = (amount.of ?? []).map(p => amountText(p, ctx)).filter(/** @returns {p is string} */ p => Boolean(p))
      return parts.length > 0 ? parts.join(' + ') : null
    }
    default:
      return null
  }
}

// `+3`, `-1`, `your Proficiency Bonus` — signed only when it is a bare number.
/**
 * @param {unknown} amount
 * @param {AmountContext} ctx
 * @returns {string | null}
 */
function signedAmountText(amount, ctx) {
  const text = amountText(amount, ctx)
  if (text === null) return null
  return /^\d/.test(text) ? `+${text}` : text
}

/**
 * @param {unknown} slug
 * @returns {string}
 */
function words(slug) {
  return typeof slug === 'string' ? slug.replace(/_/g, ' ') : ''
}

/**
 * @param {unknown} slug
 * @returns {string}
 */
function titled(slug) {
  return capitalize(words(slug))
}

/**
 * @param {unknown} slug
 * @returns {string | null}
 */
function abilityName(slug) {
  return typeof slug === 'string' ? (ABILITY_FULL_NAMES[slug] ?? null) : null
}

// "Strength", "Strength or Dexterity", "one ability score of your choice".
/**
 * @param {readonly unknown[] | null | undefined} options
 * @returns {string | null}
 */
function abilityList(options) {
  const names = (options ?? []).map(abilityName).filter(/** @returns {n is string} */ n => Boolean(n))
  if (names.length === 0) return null
  if (names.length === Object.keys(ABILITY_FULL_NAMES).length) {
    return 'one ability score of your choice'
  }
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`
}

// A `weapon` predicate as a trailing qualifier: "with Heavy weapons".
//
// It speaks only keys in `WEAPON_PREDICATE_KEYS` — VAULT-184. It used to read a
// `type` key, a bare-string predicate and a `hasProperty` alias, and
// `weaponMatches` checks none of the three, so each one described a narrowing
// and then applied to every weapon. Describing a key is a claim the walker
// honours it; a test holds the two to that.
//
// It still says nothing of `grip`, `sole` or `ability`, which under-describes
// Dueling ("with melee weapons") but never claims a narrowing that is not there.
/**
 * @param {unknown} raw the `weapon` predicate
 * @returns {string}
 */
export function weaponQualifier(raw) {
  if (!raw || typeof raw !== 'object') return ''
  const weapon = /** @type {WeaponPredicate} */ (raw)
  // `offHand` narrows to an *attack*, not to a class of weapons, so it reads
  // first and reads differently — "with Light weapons" would be true of the
  // main-hand swing too, and that is the one line this must not claim.
  if (weapon.offHand) return ' on the extra attack of the Light property'
  if (weapon.property) return ` with ${capitalize(words(weapon.property))} weapons`
  if (weapon.category) return ` with ${words(weapon.category)} weapons`
  return ' with some weapons'
}

// One phrasing per effect type. Anything returning null falls through to the
// type name — see `describeEffect`.
/** @type {Readonly<Record<string, (e: Effect, ctx: AmountContext) => string | null>>} */
const DESCRIBERS = {
  ability_score_choice(e, ctx) {
    const list = abilityList(e.options)
    if (!list) return null
    const amount = signedAmountText(e.amount ?? 1, ctx) ?? '+1'
    // "+1 Strength or Dexterity" names its abilities and needs no preposition;
    // "+1 to one ability score of your choice" does. Without the "to" the
    // all-six case reads "+1 one ability score".
    const joiner = list.startsWith('one ') ? ' to ' : ' '
    // The cap is the payoff an Epic Boon has and an ordinary feat does not, and
    // the display string it replaced could never say so. Stated only when it is
    // not the ordinary 20, so the common row stays clean.
    const cap = e.max && e.max !== 20 ? ` (to a maximum of ${e.max})` : ''
    return `${amount}${joiner}${list}${cap}`
  },
  ability_score_bonus(e, ctx) {
    const ability = abilityName(e.ability)
    if (!ability) return null
    // Said only when it is not 20, as `ability_score_choice` says it: Primal
    // Champion's "to a maximum of 25" (VAULT-262), a baked Epic Boon's 30.
    const cap = e.max && e.max !== 20 ? ` (to a maximum of ${e.max})` : ''
    return `${signedAmountText(e.amount ?? 1, ctx) ?? '+1'} ${ability}${cap}`
  },
  // "Intelligence becomes 19" alone would read as an override, and the floor
  // is the half a player asks about.
  ability_score_set(e) {
    const ability = abilityName(e.ability)
    const score = Number(e.score)
    if (!ability || !Number.isInteger(score) || score <= 0) return null
    return `${ability} ${score}, unless it is already higher`
  },
  ac_bonus(e, ctx) {
    const amount = signedAmountText(e.amount ?? 0, ctx)
    const requires = e.requires === 'armor' ? ' while wearing armor' : ''
    return amount ? `${amount} AC${requires}` : null
  },
  attack_roll_bonus: (e, ctx) => bonusTo(e, ctx, 'attack rolls'),
  damage_roll_bonus: (e, ctx) => bonusTo(e, ctx, 'damage rolls'),
  saving_throw_bonus: (e, ctx) => bonusTo(e, ctx, `${abilityName(e.ability) ?? ''} saves`.trim()),
  initiative_bonus: (e, ctx) => bonusTo(e, ctx, 'Initiative'),
  ability_check_bonus: (e, ctx) => bonusTo(e, ctx, `${abilityName(e.ability) ?? 'ability'} checks`),
  skill_bonus: (e, ctx) => bonusTo(e, ctx, e.skill ? titled(e.skill) : 'skill checks'),
  passive_bonus: (e, ctx) => bonusTo(e, ctx, e.skill ? `passive ${titled(e.skill)}` : 'passive scores'),
  hp_bonus: (e, ctx) => bonusTo(e, ctx, 'hit points'),
  hp_bonus_per_level: (e, ctx) => bonusTo(e, ctx, 'hit points per level'),

  // VAULT-195. `bonusTo` would append a `weaponQualifier` to both of these, and
  // a spell attack bonus "with Finesse weapons" is a sentence that cannot be
  // true — so they phrase themselves rather than borrowing it.
  spell_attack_bonus: (e, ctx) => {
    const amount = signedAmountText(e.amount ?? 0, ctx)
    return amount ? `${amount} to spell attack rolls` : null
  },
  spell_save_dc_bonus: (e, ctx) => {
    const amount = signedAmountText(e.amount ?? 0, ctx)
    if (!amount) return null
    // "+1 to your Warlock spell save DCs" — the Rod of the Pact Keeper. Named in
    // the possessive the books use, and the unscoped case says "spell save DCs"
    // rather than "all spell save DCs": the qualifier is the exception.
    // `isArray` widens a readonly list to `any[]`, so the type is said again.
    const classes = Array.isArray(e.classes)
      ? /** @type {readonly unknown[]} */ (e.classes).filter(/** @returns {c is string} */ c => Boolean(c))
      : []
    if (classes.length === 0) return `${amount} to spell save DCs`
    const named = classes.length === 1
      ? classes[0]
      : `${classes.slice(0, -1).join(', ')} and ${classes[classes.length - 1]}`
    return `${amount} to ${named} spell save DCs`
  },

  // "Use your Charisma modifier for attack and damage rolls with melee weapons".
  // Both halves are named because every feature granting one grants the other —
  // Pact of the Blade, Hex Warrior and Battle Ready all say "for the attack and
  // damage rolls" — and a player reading only "attack rolls" would reasonably
  // conclude the damage line was a bug.
  weapon_attack_ability_override(e) {
    const ability = abilityName(e.ability)
    if (!ability) return null
    return `Use your ${ability} modifier for attack and damage rolls${weaponQualifier(e.weapon)}`
  },

  attack_roll_advantage: e => `Advantage on attack rolls${weaponQualifier(e.weapon)}`,
  attack_roll_disadvantage: e => `Disadvantage on attack rolls${weaponQualifier(e.weapon)}`,
  saving_throw_advantage: e => advantageOn(e, 'Advantage'),
  saving_throw_disadvantage: e => advantageOn(e, 'Disadvantage'),
  ability_check_advantage: e => `Advantage on ${abilityName(e.ability) ?? 'ability'} checks`,
  ability_check_disadvantage: e => `Disadvantage on ${abilityName(e.ability) ?? 'ability'} checks`,

  saving_throw_proficiency: e => {
    const ability = abilityName(e.ability)
    return ability ? `Proficiency with ${ability} saves` : null
  },
  skill_proficiency: e => (e.skill ? `Proficiency in ${titled(e.skill)}` : null),
  expertise: e => (e.skill ? `Expertise in ${titled(e.skill)}` : null),
  tool_proficiency: e => (e.tool ? `Proficiency with ${toolName(e.tool)}` : null),
  half_proficiency_skills: () => 'Half your Proficiency Bonus on ability checks you are not proficient in',

  // "Proficiency with Martial weapons", "Proficiency with Ranged Martial
  // weapons" — the envelope's `weapon` predicate narrows the grant rather than
  // the vocabulary growing a compound entry for every combination.
  weapon_proficiency(e) {
    if (!WEAPON_PROFICIENCY_CATEGORIES.includes(e.category ?? '')) return null
    // Improvised weapons are not a tier the way the other three are, so they
    // read as a noun and take no "weapons" suffix of their own.
    if (e.category === 'improvised') return 'Proficiency with improvised weapons'
    const narrowed = e.weapon?.category === 'ranged'
      ? 'Ranged '
      : e.weapon?.category === 'melee' ? 'Melee ' : ''
    // A property predicate has to be spoken too (VAULT-102). The Shinobi is
    // granted Thrown and Finesse weapons and the Disciple of Alacrity Martial
    // Thrown ones; without this the strip printed a flat "Proficiency with
    // Martial weapons", which is a wider claim than the feature makes.
    const scoped = e.weapon?.property
      ? ` that have the ${capitalize(e.weapon.property)} property`
      : ''
    return `Proficiency with ${narrowed}${capitalize(e.category)} weapons${scoped}`
  },
  // "Training with Light armor", "Training with Shields". Shields are counted
  // objects and the books pluralise them; the other three are mass nouns.
  armor_training(e) {
    if (!ARMOR_TRAINING_CATEGORIES.includes(e.category ?? '')) return null
    if (e.category === 'shield') return 'Training with Shields'
    return `Training with ${capitalize(e.category)} armor`
  },

  resistance: e => (e.value ? `Resistance to ${words(e.value)} damage` : null),
  immunity: e => (e.value ? `Immunity to ${words(e.value)} damage` : null),
  vulnerability: e => (e.value ? `Vulnerability to ${words(e.value)} damage` : null),
  condition_immunity: e => (e.value ? `Immunity to the ${titled(e.value)} condition` : null),

  speed(e, ctx) {
    const amount = amountText(e.amount ?? 0, ctx)
    if (amount === null) return null
    const mode = e.mode && e.mode !== 'walk' ? `${titled(e.mode)} Speed` : 'Speed'
    // `add` is the whole meaning of "your Speed increases by 10 feet"; without
    // it the effect sets a floor instead.
    return e.add ? `${mode} +${amount} feet` : `${mode} ${amount} feet`
  },
  sense(e) {
    if (!e.sense) return null
    return e.range ? `${titled(e.sense)} ${String(e.range)} feet` : titled(e.sense)
  },
  crit_range(e) {
    const range = Number(e.range ?? e.amount)
    return Number.isFinite(range) ? `Critical hit on ${range}–20` : null
  },
  unarmed_strike_die(e) {
    if (!e.die) return null
    const empty = e.dieIfEmptyHanded ? ` (1d${e.dieIfEmptyHanded} empty-handed)` : ''
    return `Unarmed Strike deals 1d${e.die}${empty}`
  },
  bonus_cantrips(e, ctx) {
    const amount = amountText(e.amount ?? 1, ctx) ?? '1'
    return `${amount} extra cantrip${amount === '1' ? '' : 's'}`
  },
  spell_list_access(e) {
    const classes = (e.classes ?? []).filter(Boolean)
    return classes.length > 0 ? `Access to the ${classes.join(', ')} spell list` : null
  },
  spell_grant(e) {
    if (!e.spell) return null
    if (e.mode === 'cantrip') return `${e.spell} as a cantrip`
    if (e.mode === 'free_cast') return `${e.spell}, once without a spell slot`
    if (e.mode === 'spellbook') return `${e.spell}, in the spellbook`
    return `${e.spell}, always prepared`
  },
  granted_action(e) {
    if (!e.name) return null
    const kind = ACTION_KINDS.includes(e.action ?? '') ? titled(e.action) : 'Action'
    return `${kind}: ${e.name}`
  },
  feature_resource(e, ctx) {
    const uses = amountText(e.uses ?? e.amount ?? 0, ctx)
    if (uses === null) return null
    const name = e.name ? `${e.name}: ` : ''
    // `resets`, the spelling every pool and `shortRestPlan` read — VAULT-177.
    const reset = e.resets === 'short_rest'
      ? ' per short rest'
      : e.resets === 'long_rest' ? ' per long rest' : ''
    return `${name}${uses} use${uses === '1' ? '' : 's'}${reset}`
  },
  feat_save_dc(e, ctx) {
    const ability = abilityName(e.ability)
    const dc = amountText(e.amount, ctx)
    if (dc !== null && /^\d+$/.test(dc)) return `Save DC ${dc}`
    return ability
      ? `Save DC 8 + your Proficiency Bonus + your ${ability} modifier`
      : 'Save DC 8 + your Proficiency Bonus + your ability modifier'
  },
  dice_intervention(e) {
    // A `damageType` reads as an adjective on the dice rather than a trailing
    // "with …" clause, because that is what it narrows: Piercer's "an attack
    // that deals Piercing damage" is about the die, not about the weapon.
    const dt = e.damageType ? `${words(e.damageType)} ` : ''
    if (e.mode === 'floor') {
      const on = (e.on ?? []).join(' or ')
      // The floor's phrasing names faces, not dice, so its qualifier trails.
      const only = dt ? ` on ${dt}damage` : ''
      return e.to && on ? `Treat a ${on} as ${e.to}${only}` : 'Treat a low die as higher'
    }
    if (e.mode === 'reroll') return `Reroll a ${dt}damage die`
    if (e.mode === 'twice') return `Roll the ${dt}damage twice and keep either`
    return null
  },
}

/**
 * @param {Effect} e
 * @param {AmountContext} ctx
 * @param {string} what
 * @returns {string | null}
 */
function bonusTo(e, ctx, what) {
  const amount = signedAmountText(e.amount ?? 0, ctx)
  if (amount === null || !what) return null
  return `${amount} to ${what}${weaponQualifier(e.weapon)}`
}

/**
 * @param {Effect} e
 * @param {string} word
 * @returns {string}
 */
function advantageOn(e, word) {
  // A `condition` qualifier narrows the save rather than making a new type —
  // "Advantage on saves against being Frightened".
  if (e.condition) return `${word} on saves against being ${titled(e.condition)}`
  const ability = abilityName(e.ability)
  return ability ? `${word} on ${ability} saves` : `${word} on saving throws`
}

/**
 * An effect in plain language — `+1 Strength or Dexterity`, `Advantage on
 * Strength saves`. VAULT-86's drawer and catalog are the first readers.
 *
 * **It never returns null for a real effect.** A modelled benefit that rendered
 * nothing would be indistinguishable from an unmodelled one, which is the exact
 * distinction the whole surface exists to draw — so a type this function has no
 * phrasing for, or one whose payload is incomplete, falls back to its type name
 * spelled out (`Feat save dc`). Ugly is recoverable; invisible is not.
 *
 * `ctx` is `resolveAmount`'s, and is optional: with no character an amount names
 * itself ("your Proficiency Bonus") rather than vanishing.
 *
 * @param {unknown} raw the effect
 * @param {AmountContext} [ctx] see `resolveAmount`
 * @returns {string|null} null only when `effect` is not an effect at all
 */
export function describeEffect(raw, ctx = {}) {
  if (!raw || typeof raw !== 'object') return null
  const effect = /** @type {Effect} */ (raw)
  if (!effect.type) return null
  const describe = DESCRIBERS[effect.type]
  const text = describe ? describe(effect, ctx) : null
  return text ?? capitalize(words(effect.type))
}
