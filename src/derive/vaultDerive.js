// @ts-check
// Derivation layer for Vault Characters (source = 'vault').
// Mirrors the API surface of ddbDerive.js so MyCharacterPage can branch cleanly.

import { PROF_BY_LEVEL, POINT_COST, ABILITY_FULL_NAMES, abilityMod, capitalize } from './dnd5e.js'
import { martialArtsDie } from './unarmedStrike.js'
import { toolName } from './tools.js'
import { withIncreases } from './abilityIncreases.js'
import {
  isActivated, effectKey, resolveAmount, sumAmounts, ARMOR_PENALTY_ABILITIES,
  normaliseProficiencyList, normaliseWeaponProficiency, normaliseArmorTraining,
} from './effects.js'

/** @typedef {import('./effects.js').Effect} Effect */
/** @typedef {import('./effects.js').AmountContext} AmountContext */
/** @typedef {import('./weaponActions.js').InventoryRow} InventoryRow */

// A Vault character's `json`, as far as this file reads it. **It is read, not
// checked**: `data()` takes it on trust, as this file always has, and every
// reader below is written for a key that is missing. A key the builder writes
// and this does not name is simply not read here.

/**
 * @typedef {{
 *   name?: string | null,
 *   level?: number | null,
 *   hit_die?: number | null,
 *   subclass?: { name?: string | null } | string | null,
 * }} VaultClass
 */
/**
 * How a 2024 background's increase was allocated; see `backgroundAbilityBonus`.
 *
 * @typedef {{
 *   mode?: string | null,
 *   primary?: string | null,
 *   secondary?: string | null,
 *   first?: string | null,
 *   second?: string | null,
 *   third?: string | null,
 * }} BackgroundBonuses
 */
/**
 * An invocation or a metamagic option as the builder stores it: the whole
 * entry, so the sheet needs no fetch.
 *
 * @typedef {{ name?: string | null, description?: string | null, [field: string]: unknown }} OptionPick
 */
/**
 * One builder pick in `featureChoices`. Which fields it has depends on `type`.
 *
 * @typedef {{
 *   type?: string | null,
 *   first?: string | null,
 *   second?: string | null,
 *   label?: string | null,
 *   optionName?: string | null,
 *   optionDescription?: string | null,
 *   className?: string | null,
 *   minLevel?: number | null,
 *   uses?: number | null,
 *   resets?: string | null,
 *   spells?: readonly ({ spellId?: string | null, spellName: string, spellLevel: number } | null | undefined)[] | null,
 *   metamagic?: readonly (OptionPick | null | undefined)[] | null,
 *   invocations?: readonly (OptionPick | null | undefined)[] | null,
 * }} FeatureChoice
 */
/**
 * @typedef {{
 *   name?: string | null,
 *   avatarUrl?: string | null,
 *   backdropUrl?: string | null,
 *   race?: { id?: string | null, name?: string | null } | null,
 *   classes?: readonly VaultClass[] | null,
 *   abilityScores?: Readonly<Record<string, number | null | undefined>> | null,
 *   backgroundBonuses?: BackgroundBonuses | null,
 *   featureChoices?: Readonly<Record<string, FeatureChoice | null | undefined>> | null,
 *   feats?: readonly ({ id?: string | null, name?: string | null } | null | undefined)[] | null,
 *   originFeat?: { id?: string | null, name?: string | null } | null,
 *   hp?: { current?: number | null, max?: number | null } | null,
 *   speed?: number | null,
 *   saveProficiencies?: readonly string[] | null,
 *   skillProficiencies?: readonly string[] | null,
 *   skillExpertise?: readonly string[] | null,
 *   familiars?: readonly unknown[] | null,
 * }} VaultJson
 */
/**
 * A character row. Only its `json` is read, through `data()`.
 *
 * @typedef {{ json?: unknown } | null | undefined} VaultChar
 */
/** @typedef {{ notation: string, dice: { count: number, sides: number }[], modifier: number }} ResourceRoll */
/**
 * A resource pool, as the sheet renders it and the rests refill it.
 *
 * @typedef {{
 *   key: string,
 *   name: string,
 *   uses: number,
 *   resets: string,
 *   detail?: string,
 *   die?: number,
 *   roll?: ResourceRoll,
 *   unit?: string,
 *   pool?: boolean,
 *   shortRestRegain?: number,
 * }} FeatureResource
 */
/** @typedef {{ source: string | null, condition: string | null }} AdvantageSource */
/** @typedef {{ sense: string, range: number, source: string | null }} Sense */

export const VAULT_SKILLS = [
  { name: 'Acrobatics',     slug: 'acrobatics',     ability: 'dex' },
  { name: 'Animal Handling',slug: 'animal_handling', ability: 'wis' },
  { name: 'Arcana',         slug: 'arcana',          ability: 'int' },
  { name: 'Athletics',      slug: 'athletics',       ability: 'str' },
  { name: 'Deception',      slug: 'deception',       ability: 'cha' },
  { name: 'History',        slug: 'history',         ability: 'int' },
  { name: 'Insight',        slug: 'insight',         ability: 'wis' },
  { name: 'Intimidation',   slug: 'intimidation',    ability: 'cha' },
  { name: 'Investigation',  slug: 'investigation',   ability: 'int' },
  { name: 'Medicine',       slug: 'medicine',        ability: 'wis' },
  { name: 'Nature',         slug: 'nature',          ability: 'int' },
  { name: 'Perception',     slug: 'perception',      ability: 'wis' },
  { name: 'Performance',    slug: 'performance',     ability: 'cha' },
  { name: 'Persuasion',     slug: 'persuasion',      ability: 'cha' },
  { name: 'Religion',       slug: 'religion',        ability: 'int' },
  { name: 'Sleight of Hand',slug: 'sleight_of_hand', ability: 'dex' },
  { name: 'Stealth',        slug: 'stealth',         ability: 'dex' },
  { name: 'Survival',       slug: 'survival',        ability: 'wis' },
]

/** @type {Readonly<Record<string, string>>} */
export const VAULT_ABILITY_LABELS = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
}

// Canonically `dnd5e.js`'s `ABILITY_FULL_NAMES`; kept under this name because
// the UI imports it from here.
export const VAULT_ABILITY_FULL = ABILITY_FULL_NAMES

export const VAULT_ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha']

export { abilityMod }

/**
 * @param {VaultChar} char
 * @returns {VaultJson}
 */
function data(char) {
  return /** @type {VaultJson} */ (char?.json ?? {})
}

/**
 * @param {readonly Effect[]} effects
 * @param {string} type
 * @returns {Effect[]}
 */
function effectsOfType(effects, type) {
  return effects.filter(e => e.type === type)
}

// The context every amount is resolved against — VAULT-76's grammar needs the
// character's proficiency bonus, ability modifiers and class levels to turn
// `{ kind: 'proficiency_bonus' }` into a number.
//
// Takes the already-computed ability modifiers rather than the character,
// because `vaultAbilityScores` is what produces them and an amount inside an
// `ability_score_bonus` would otherwise be defined in terms of itself. Callers
// that resolve ability scores pass `{}` and get `null` for a modifier-keyed
// amount, which is the honest answer at that point in the derivation.
/**
 * @param {VaultChar} char
 * @param {Readonly<Record<string, number>>} [abilityMods]
 * @returns {AmountContext}
 */
function amountContext(char, abilityMods = {}) {
  /** @type {Record<string, number>} */
  const classLevels = {}
  for (const cls of (data(char).classes ?? [])) {
    if (cls?.name) classLevels[cls.name] = cls.level ?? 0
  }
  return { pb: vaultPb(char), abilityMods, classLevels }
}

/**
 * @param {readonly { key: string, mod: number }[]} scores
 * @returns {Record<string, number>}
 */
function modMap(scores) {
  return Object.fromEntries(scores.map(a => [a.key, a.mod]))
}

// Advantage is not arithmetic, so it cannot fold into a `total` — it rides as
// its own flag with the granting features named, so the sheet never shows it
// unexplained. `vaultSaves` emitted this shape first, for Barbarian Danger Sense
// and Rage; VAULT-82 generalises it to attack rolls and ability checks rather
// than writing the same reduce out four more times.
//
// `key` is the field the effect narrows by — `ability` for saves and checks —
// or null for a type that applies to every roll of its kind.
/**
 * @param {readonly Effect[]} effects
 * @param {string} type
 * @param {'ability' | null} [key]
 * @returns {Record<string, AdvantageSource[]>}
 */
function groupSources(effects, type, key = null) {
  /** @type {Record<string, AdvantageSource[]>} */
  const map = {}
  for (const e of effectsOfType(effects, type)) {
    const bucket = key ? e[key] : '*'
    if (!bucket) continue
    ;(map[bucket] ??= []).push({
      source: e.source ?? null,
      // Ruling 3: advantage on saves *against a condition* is this qualifier,
      // not a type of its own. Null for the unqualified case.
      condition: e.condition ?? null,
    })
  }
  return map
}

// The `{ advantage, advantageSources }` half of the shape above, for one bucket.
/**
 * @param {Readonly<Record<string, readonly AdvantageSource[]>>} map
 * @param {string} [bucket]
 */
function advantageState(map, bucket = '*') {
  const entries = map[bucket] ?? []
  return {
    advantage: entries.length > 0,
    advantageSources: /** @type {string[]} */ (entries.map(x => x.source).filter(Boolean)),
    conditions: /** @type {string[]} */ (entries.map(x => x.condition).filter(Boolean)),
  }
}

// Dice notation for a resource's attached roll. A negative modifier has to read
// "1d10 - 1" rather than "1d10 + -1", which a Monk with a Dexterity penalty
// would otherwise get on Deflect Attacks.
/**
 * @param {number} count
 * @param {number} sides
 * @param {number} modifier
 */
function rollNotation(count, sides, modifier) {
  const dice = `${count}d${sides}`
  if (!modifier) return dice
  return modifier > 0 ? `${dice} + ${modifier}` : `${dice} - ${Math.abs(modifier)}`
}

/**
 * @param {VaultChar} char
 * @returns {number}
 */
export function vaultPb(char) {
  const level = vaultTotalLevel(char)
  return PROF_BY_LEVEL[(level ?? 1) - 1] ?? 2
}

/**
 * @param {VaultChar} char
 * @returns {number}
 */
export function vaultTotalLevel(char) {
  const classes = data(char).classes ?? []
  return classes.reduce((sum, c) => sum + (c.level ?? 0), 0) || 1
}

/**
 * @param {VaultChar} char
 * @returns {string}
 */
export function vaultName(char) {
  return data(char).name ?? '—'
}

/**
 * @param {VaultChar} char
 * @returns {string | null}
 */
export function vaultAvatarUrl(char) {
  return data(char).avatarUrl ?? null
}

/**
 * @param {VaultChar} char
 * @returns {string | null}
 */
export function vaultBackdropUrl(char) {
  return data(char).backdropUrl ?? null
}

/**
 * @param {VaultChar} char
 * @returns {string | null}
 */
export function vaultRace(char) {
  return data(char).race?.name ?? null
}

/**
 * @param {VaultChar} char
 * @returns {string}
 */
export function vaultFormatClasses(char) {
  const classes = data(char).classes ?? []
  return classes
    .filter(c => c.name)
    .map(c => `${c.name}${c.subclass ? ` (${(typeof c.subclass === 'object' ? c.subclass.name : null) ?? c.subclass})` : ''} ${c.level}`)
    .join(' / ')
}

/**
 * The background Ability Score Increase this character gets in `key` — VAULT-165.
 *
 * 2024 backgrounds allocate their increase one of two ways, and `mode` says
 * which: `'two_one'` puts +2 on `primary` and +1 on `secondary`; `'three_ones'`
 * puts +1 on each of `first`, `second` and `third`.
 *
 * **An absent `mode` means `'two_one'`.** Every character saved before this
 * function existed carries a bare `{ primary, secondary }`, and reading those
 * unchanged is what let the two modes ship without migrating the `character`
 * table. Do not "normalise" old rows to add the field — nothing needs it.
 *
 * The three abilities are stored on the character rather than looked up from
 * the background, so this stays a pure function of the character. Reaching for
 * a `content_background` row here would give the sheet's ability scores a
 * catalog dependency they have never had.
 *
 * @param {BackgroundBonuses | null | undefined} bonuses
 * @param {string | null | undefined} key
 * @returns {number}
 */
export function backgroundAbilityBonus(bonuses, key) {
  if (!bonuses || !key) return 0
  if (bonuses.mode === 'three_ones') {
    return (bonuses.first === key ? 1 : 0)
      + (bonuses.second === key ? 1 : 0)
      + (bonuses.third === key ? 1 : 0)
  }
  return (bonuses.primary === key ? 2 : 0) + (bonuses.secondary === key ? 1 : 0)
}

/**
 * @param {VaultChar} char
 * @param {readonly Effect[]} [effects]
 * @returns {{ key: string, label: string, score: number, mod: number }[]}
 */
export function vaultAbilityScores(char, effects = []) {
  const base = data(char).abilityScores ?? {}
  const bonuses = data(char).backgroundBonuses ?? {}
  const featureChoices = data(char).featureChoices ?? {}

  // Every increase is kept apart, with its own cap, rather than summed: an
  // increase may not take a score past its maximum (VAULT-262, `withIncreases`).
  /** @type {Record<string, import('./abilityIncreases.js').Increase[]>} */
  const increases = Object.fromEntries(VAULT_ABILITY_KEYS.map(k => [k, []]))
  for (const choice of Object.values(featureChoices)) {
    if (choice?.type === 'score') {
      if (choice.first)  increases[choice.first]?.push({ amount: 1 })
      if (choice.second) increases[choice.second]?.push({ amount: 1 })
    }
  }
  for (const e of effectsOfType(effects, 'ability_score_bonus')) {
    // The amount is taken as the number it is authored as, as it always was.
    if (e.ability) increases[e.ability]?.push({ amount: /** @type {number} */ (e.amount ?? 0), max: e.max })
  }

  // VAULT-258. A floor, applied after every bonus: the Headband of Intellect
  // "has no effect on you if your Intelligence is 19 or higher without it". The
  // highest of several wins, as the DDB reader takes the largest `set`.
  /** @type {Record<string, number>} */
  const floor = {}
  for (const e of effectsOfType(effects, 'ability_score_set')) {
    const score = Number(e.score)
    if (e.ability && Number.isInteger(score)) floor[e.ability] = Math.max(floor[e.ability] ?? 0, score)
  }

  return VAULT_ABILITY_KEYS.map(key => {
    const own = withIncreases(base[key] ?? 8, [
      { amount: backgroundAbilityBonus(bonuses, key) },
      ...increases[key],
    ])
    const score = Math.max(own, floor[key] ?? 0)
    return { key, label: VAULT_ABILITY_LABELS[key], score, mod: abilityMod(score) }
  })
}

/**
 * @param {readonly { level?: number | null, hit_die?: number | null }[] | null | undefined} classes
 * @param {number} conMod
 * @param {number} [bonusPerLevel]
 * @returns {number | null}
 */
export function calcVaultMaxHp(classes, conMod, bonusPerLevel = 0) {
  if (!classes?.length) return null
  if (!classes.every(c => c.hit_die != null)) return null
  let total = 0
  let firstLevel = true
  for (const cls of classes) {
    // Every class has a hit die: the `every` above returned null otherwise.
    const hitDie = /** @type {number} */ (cls.hit_die)
    for (let i = 0; i < (cls.level ?? 0); i++) {
      total += (firstLevel ? hitDie : Math.floor(hitDie / 2) + 1) + conMod + bonusPerLevel
      firstLevel = false
    }
  }
  return total
}

/**
 * @param {VaultChar} char
 * @param {readonly Effect[]} [effects]
 * @returns {{ current: number, max: number }}
 */
export function vaultHp(char, effects = []) {
  const classes = data(char).classes ?? []
  const conMod = vaultAbilityScores(char, effects).find(a => a.key === 'con')?.mod ?? 0

  // The baked effects, plus a name-matched fallback applied **per source** —
  // VAULT-119.
  //
  // This used to be all-or-nothing: read the effects when there were any, and
  // name-match otherwise. So the first baked effect from *any* source closed the
  // fallback and dropped the bonus — a character did not need a new effect for
  // Tough or for Dwarven Toughness, they needed any effect at all. One click of
  // ↻ Re-sync Effects, the button you press *because* a sheet looks wrong, cost
  // Alfred Muscles 40 hit points (203 → 163) before Tough was authored.
  //
  // Adding per source instead means the two branches cannot disagree: a source
  // that has authored its effect is counted once, from the effect, and one that
  // has not is still counted from its name. The fallback is scaffolding for the
  // rows the catalog has not caught up with, not a second opinion on the ones
  // it has.
  const baked = effectsOfType(effects, 'hp_bonus_per_level')
  const bakedSourceIds = new Set(baked.map(e => e.sourceFeatureId).filter(Boolean))
  // Summed as authored numbers, not through the amount grammar, as it always was.
  let bonusPerLevel = baked.reduce((sum, e) => sum + /** @type {number} */ (e.amount ?? 0), 0)

  const allFeats = [
    ...(data(char).feats ?? []),
    ...(data(char).originFeat ? [data(char).originFeat] : []),
  ]
  if (allFeats.some(f => f?.name === 'Tough' && !bakedSourceIds.has(f.id))) bonusPerLevel += 2

  // An exact name, not a substring. Of the two dwarf rows in `content_race`
  // only the PHB `Dwarf` has Dwarven Toughness — `Dune Dwarf` trades it away for
  // Desert Resilience — so `includes('dwarf')` was granting a bonus that species
  // never had.
  const race = data(char).race
  if (race?.name === 'Dwarf' && !bakedSourceIds.has(race.id)) bonusPerLevel += 1

  // `hp_bonus` is a flat addition to the maximum, where `hp_bonus_per_level`
  // multiplies by level — two different mechanics that read almost the same.
  // Tough is per-level; a one-off "+5 hit points" is this.
  const scores = vaultAbilityScores(char, effects)
  const flatBonus = sumAmounts(effects, 'hp_bonus', amountContext(char, modMap(scores)))

  const derivedMax = calcVaultMaxHp(classes, conMod, bonusPerLevel)
  const max = (derivedMax ?? (data(char).hp?.max ?? 0)) + flatBonus
  return { current: data(char).hp?.current ?? 0, max }
}

const ARMOR_TYPES = new Set(['Light Armor', 'Medium Armor', 'Heavy Armor'])

/**
 * The armour class an item's `data` states, if it states one.
 *
 * @param {InventoryRow | null | undefined} row
 * @returns {number | null | undefined}
 */
const statedAc = row => /** @type {{ ac?: number | null } | null | undefined} */ (row?.content_item?.data)?.ac

/**
 * @param {VaultChar} char
 * @param {readonly InventoryRow[]} [equippedItems]
 * @param {readonly Effect[]} [effects]
 * @returns {number}
 */
export function vaultAc(char, equippedItems = [], effects = []) {
  const scores = vaultAbilityScores(char, effects)
  const dexMod = scores.find(a => a.key === 'dex')?.mod ?? 0
  const conMod = scores.find(a => a.key === 'con')?.mod ?? 0
  const wisMod = scores.find(a => a.key === 'wis')?.mod ?? 0

  const equippedArmor = equippedItems.find(r => ARMOR_TYPES.has(r.content_item?.item_type ?? ''))
  const equippedShield = equippedItems.find(r => r.content_item?.item_type === 'Shield')
  const shieldBonus = equippedShield ? (statedAc(equippedShield) ?? 2) : 0

  let base
  if (equippedArmor) {
    const itemType = equippedArmor.content_item?.item_type
    const armorAc = statedAc(equippedArmor) ?? 10
    if (itemType === 'Light Armor') base = armorAc + dexMod
    else if (itemType === 'Medium Armor') base = armorAc + Math.min(dexMod, 2)
    else base = armorAc // Heavy Armor
  } else {
    const classes = (data(char).classes ?? []).map(c => c.name)
    if (classes.includes('Barbarian')) base = 10 + dexMod + conMod
    else if (classes.includes('Monk')) base = 10 + dexMod + wisMod
    else base = 10 + dexMod
  }

  // `requires: 'armor'` gates a bonus on actually wearing Light, Medium or Heavy
  // armor — the Fighting Style Defense. A Shield alone does not satisfy it.
  const acBonus = effectsOfType(effects, 'ac_bonus')
    .filter(e => !e.requires || (e.requires === 'armor' && !!equippedArmor))
    .reduce((sum, e) => sum + /** @type {number} */ (e.amount ?? 0), 0)
  return base + shieldBonus + acBonus
}

/**
 * @param {readonly InventoryRow[]} [equippedItems]
 */
export function vaultArmorState(equippedItems = []) {
  const equippedArmor = equippedItems.find(r => ARMOR_TYPES.has(r.content_item?.item_type ?? ''))
  const equippedShield = equippedItems.find(r => r.content_item?.item_type === 'Shield')
  return {
    isWearingArmor: !!equippedArmor,
    // Barbarian Fast Movement and Rage both key on Heavy armor specifically,
    // where the Monk's conditions key on armor of any kind.
    isWearingHeavyArmor: equippedArmor?.content_item?.item_type === 'Heavy Armor',
    // A Shield with no `ac` still disqualifies the Monk stance and Unarmed
    // Fighting's d8, so ask about the shield itself, not about its bonus.
    hasShield: !!equippedShield,
    shieldBonus: equippedShield ? (statedAc(equippedShield) ?? 2) : 0,
  }
}

/**
 * The armour penalty as **synthesised effects** — VAULT-154.
 *
 * Nothing on a `content_item` row can say this: the penalty is a fact about the
 * character wearing the piece, not about the piece. So it is built here, the way
 * `vaultRageDamageEffects` builds Rage's damage bonus for the same reason, and
 * then joins `allEffects` and travels the ordinary road.
 *
 * **That is the entire trick.** `vaultSaves` and `vaultAbilityChecks` have read
 * `saving_throw_disadvantage` and `ability_check_disadvantage` since VAULT-82
 * and nothing has ever authored one; `AdvantageMarker` has rendered the red `D`
 * with named sources since VAULT-101. Feeding the penalty in as effects means
 * neither function learns a new concept, both surfaces light up, and the
 * tooltip names the offending armour without a line of display code.
 *
 * Attack rolls are **not** here. `vaultAttackRolls` is sheet-wide and would
 * disadvantage a spell attack, which the rule does not touch; it also has no UI
 * consumer at all. Attacks are answered per-row in `weaponActions.js` and
 * `unarmedStrike.js`, which already know whether the swing used Strength or
 * Dexterity.
 *
 * @param {readonly { name?: string | null, category?: string | null }[] | null} [unproficient] from `unproficientArmor`
 * @returns {Effect[]}
 */
export function vaultArmorPenaltyEffects(unproficient = []) {
  if ((unproficient ?? []).length === 0) return []
  // One source string for however many offending pieces there are. Two effects
  // of the same type on the same ability would render as two identical red
  // markers, and "Plate, Shield" in one tooltip is the sentence a player needs.
  const source = `Unproficient armour (${(unproficient ?? []).map(a => a.name).join(', ')})`
  return ARMOR_PENALTY_ABILITIES.flatMap(ability => [
    { type: 'ability_check_disadvantage', ability, source },
    { type: 'saving_throw_disadvantage', ability, source },
  ])
}

/**
 * @param {VaultChar} char
 * @param {readonly Effect[]} [effects]
 * @returns {number}
 */
export function vaultInitiative(char, effects = []) {
  const scores = vaultAbilityScores(char, effects)
  const dexMod = scores.find(a => a.key === 'dex')?.mod ?? 0
  // Alert is the archetype: "add your Proficiency Bonus to Initiative", which is
  // the amount grammar's whole reason for existing — the number changes twice a
  // level and a player who copies it down gets it wrong.
  return dexMod + sumAmounts(effects, 'initiative_bonus', amountContext(char, modMap(scores)))
}

// PHB 5.5e Unarmored Movement (Monk L2+): the Unarmored Movement column of the
// Monk Features table — +10 ft at L2, +15 at L6, +20 at L10, +25 at L14, +30 at
// L18. 0 for anyone below Monk 2.
/**
 * @param {number} [monkLevel]
 * @returns {number}
 */
export function unarmoredMovementBonus(monkLevel = 0) {
  if (monkLevel >= 18) return 30
  if (monkLevel >= 14) return 25
  if (monkLevel >= 10) return 20
  if (monkLevel >= 6) return 15
  if (monkLevel >= 2) return 10
  return 0
}

// PHB 5.5e Fast Movement (Barbarian L5+): +10 ft "while you aren't wearing
// Heavy armor". Level-gated and loadout-conditional, and the `speed` Effect can
// express neither — the same call Unarmored Movement made above.
/**
 * @param {number} [barbarianLevel]
 * @param {boolean} [isWearingHeavyArmor]
 * @returns {number}
 */
export function fastMovementBonus(barbarianLevel = 0, isWearingHeavyArmor = false) {
  return barbarianLevel >= 5 && !isWearingHeavyArmor ? 10 : 0
}

/**
 * @param {VaultChar} char
 * @param {readonly Effect[]} [effects]
 * @param {{ isWearingArmor?: boolean, hasShield?: boolean, isWearingHeavyArmor?: boolean }} [loadout]
 * @returns {number}
 */
export function vaultSpeed(char, effects = [], loadout = {}) {
  return vaultSpeeds(char, effects, loadout).walk
}

/**
 * Every movement mode the character has, not just walking — VAULT-82.
 *
 * A `speed` Effect has always accepted `mode: 'fly' | 'swim' | 'climb'` and this
 * function's predecessor then **silently discarded** everything that was not
 * `walk`, so an authored flying speed simply did not exist. Nothing in the
 * catalog had hit it yet, which is why it survived: the bug was in the shape of
 * the answer, not in any character's numbers.
 *
 * `vaultSpeed` stays the walking number and stays the sheet's `speed` field,
 * because that is what `MyCharacterPage` renders and what a Wild Shape form
 * overrides. The other modes are additive information, absent when nothing
 * grants them — an empty key is different from a speed of 0.
 *
 * @param {VaultChar} char
 * @param {readonly Effect[]} [effects]
 * @param {{ isWearingArmor?: boolean, hasShield?: boolean, isWearingHeavyArmor?: boolean }} [loadout]
 * @returns {{walk: number} & Record<string, number>} always has `walk`
 */
export function vaultSpeeds(char, effects = [], { isWearingArmor = false, hasShield = false, isWearingHeavyArmor = false } = {}) {
  const ctx = amountContext(char, modMap(vaultAbilityScores(char, effects)))
  /** @type {{walk: number} & Record<string, number>} */
  const speeds = { walk: data(char).speed ?? 30 }

  for (const e of effectsOfType(effects, 'speed')) {
    const mode = e.mode ?? 'walk'
    const amount = resolveAmount(e.amount ?? 0, ctx)
    if (amount === null) continue
    // `add` raises what is already there; without it the effect *sets* a floor,
    // which is how "your walking speed is 35" and "your speed increases by 10"
    // differ. A mode nobody has yet starts from the amount itself rather than
    // from the walking speed — a fly speed is not a walking speed plus 10.
    if (e.add) speeds[mode] = (speeds[mode] ?? 0) + amount
    else speeds[mode] = Math.max(speeds[mode] ?? 0, amount)
  }

  // Unarmored Movement scales with Monk level and is gated on "while you aren't
  // wearing armor or wielding a Shield", and the `speed` Effect can express
  // neither — so it is read off the class level here, the same call Martial Arts
  // made in `unarmedStrike.js`.
  if (!isWearingArmor && !hasShield) {
    speeds.walk += unarmoredMovementBonus(vaultClassLevel(char, 'Monk'))
  }
  speeds.walk += fastMovementBonus(vaultClassLevel(char, 'Barbarian'), isWearingHeavyArmor)
  speeds.walk += rovingBonus(vaultClassLevel(char, 'Ranger'), isWearingHeavyArmor)
  return speeds
}

/**
 * @param {VaultChar} char
 * @param {readonly Effect[]} [effects]
 */
export function vaultSaves(char, effects = []) {
  const scores = vaultAbilityScores(char, effects)
  const pb = vaultPb(char)
  const profs = new Set([
    ...(data(char).saveProficiencies ?? []),
    ...effectsOfType(effects, 'saving_throw_proficiency').map(e => e.ability).filter(Boolean),
  ])
  // `saving_throw_advantage` was in the Effect table from the start but had no
  // consumer until Barbarian Danger Sense and Rage needed it. Advantage is not
  // arithmetic, so it cannot fold into `total` — it rides as its own flag, with
  // the granting features named so the sheet never shows it unexplained.
  //
  // Ruling 3 keeps "advantage on saves against being Frightened" here rather
  // than giving it a type of its own: it is the same concept with a `condition`
  // qualifier, and splitting it would force the saves display to merge the two
  // back together.
  const advantage = groupSources(effects, 'saving_throw_advantage', 'ability')
  const disadvantage = groupSources(effects, 'saving_throw_disadvantage', 'ability')
  const ctx = amountContext(char, modMap(scores))

  return scores.map(({ key }) => {
    const proficient = profs.has(key)
    const mod = scores.find(a => a.key === key)?.mod ?? 0
    // A `saving_throw_bonus` with no `ability` applies to every save — the
    // commonest shape in the catalog ("+1 to all saving throws").
    const bonus = effectsOfType(effects, 'saving_throw_bonus')
      .filter(e => !e.ability || e.ability === key)
      .reduce((sum, e) => sum + (resolveAmount(e.amount ?? 0, ctx) ?? 0), 0)
    const adv = advantageState(advantage, key)
    const dis = advantageState(disadvantage, key)
    return {
      key,
      label: VAULT_ABILITY_FULL[key],
      proficient,
      expertise: false,
      ...adv,
      disadvantage: dis.advantage,
      disadvantageSources: dis.advantageSources,
      total: mod + (proficient ? pb : 0) + bonus,
    }
  })
}

/**
 * @param {VaultChar} char
 * @param {readonly Effect[]} [effects]
 */
export function vaultSkills(char, effects = []) {
  const scores = vaultAbilityScores(char, effects)
  const pb = vaultPb(char)
  const profSet = new Set([
    ...(data(char).skillProficiencies ?? []),
    ...effectsOfType(effects, 'skill_proficiency').map(e => e.skill).filter(Boolean),
  ])
  // Ruling 5 files Expertise under proficiency grants rather than as a mechanic
  // of its own — it is a skill-proficiency variant. Skill Expert, Observant,
  // Keen Mind and Boon of Skill all grant it, and none of them could say so
  // before: `skillExpertise` is authored on the character, not on the feat.
  const expertSet = new Set([
    ...(data(char).skillExpertise ?? []),
    ...effectsOfType(effects, 'expertise').map(e => e.skill).filter(Boolean),
  ])
  const scoreMap = modMap(scores)
  const ctx = amountContext(char, scoreMap)

  // Bard Jack of All Trades: half Proficiency, rounded down, on every skill the
  // character is NOT proficient in. The Effect carries no amount — half of this
  // character's PB is not something a content row can know — so it is a flag.
  const untrainedBonus = effectsOfType(effects, 'half_proficiency_skills').length > 0
    ? Math.floor(pb / 2)
    : 0

  return VAULT_SKILLS.map(({ name, slug, ability }) => {
    const proficient = profSet.has(slug)
    const expertise = expertSet.has(slug)
    const base = scoreMap[ability] ?? 0
    const bonus = expertise ? pb * 2 : proficient ? pb : untrainedBonus
    // A `skill_bonus` with no `skill` applies to every skill; one naming a slug
    // applies to that skill alone.
    const flat = effectsOfType(effects, 'skill_bonus')
      .filter(e => !e.skill || e.skill === slug)
      .reduce((sum, e) => sum + (resolveAmount(e.amount ?? 0, ctx) ?? 0), 0)
    return { name, slug, ability, proficient, expertise, total: base + bonus + flat }
  })
}

/**
 * Ability check bonuses and advantage, per ability — VAULT-82.
 *
 * Deliberately **not** folded into `vaultAbilityScores`. That function answers
 * "what is this character's Strength", and its `mod` is arithmetic half the
 * derivation layer depends on: attack rolls, saves, skills, the Unarmed Strike
 * die. A bonus that applies to a raw Strength *check* and to nothing else must
 * not leak into any of them, and the only way to guarantee that is to keep it
 * out of the object they all read.
 *
 * Skills are checks too, but they have their own bonus type and their own
 * consumer above — a `skill_bonus` on Athletics is not an `ability_check_bonus`
 * on Strength, and a feature granting the latter helps a shove but not a
 * Perception roll.
 *
 * @param {VaultChar} char
 * @param {readonly Effect[]} [effects]
 */
export function vaultAbilityChecks(char, effects = []) {
  const scores = vaultAbilityScores(char, effects)
  const ctx = amountContext(char, modMap(scores))
  const advantage = groupSources(effects, 'ability_check_advantage', 'ability')
  const disadvantage = groupSources(effects, 'ability_check_disadvantage', 'ability')

  return VAULT_ABILITY_KEYS.map(key => {
    const bonus = effectsOfType(effects, 'ability_check_bonus')
      .filter(e => !e.ability || e.ability === key)
      .reduce((sum, e) => sum + (resolveAmount(e.amount ?? 0, ctx) ?? 0), 0)
    const adv = advantageState(advantage, key)
    const dis = advantageState(disadvantage, key)
    return {
      key,
      label: VAULT_ABILITY_FULL[key],
      bonus,
      ...adv,
      disadvantage: dis.advantage,
      disadvantageSources: dis.advantageSources,
    }
  })
}

/**
 * Whether the character has blanket advantage or disadvantage on attack rolls.
 *
 * Sheet-level, and unqualified only: an `attack_roll_advantage` carrying a
 * `weapon` predicate is a question about one weapon rather than about the
 * character, and `weaponActions.js` is where weapon predicates are resolved. It
 * is left for that consumer rather than being half-answered here, which would
 * put "Advantage" on a sheet that means it for a longbow and not for a mace.
 *
 * @param {readonly Effect[] | null} [effects]
 */
export function vaultAttackRolls(effects = []) {
  const unqualified = (effects ?? []).filter(e => !e.weapon)
  const adv = advantageState(groupSources(unqualified, 'attack_roll_advantage'))
  const dis = advantageState(groupSources(unqualified, 'attack_roll_disadvantage'))
  return {
    advantage: adv.advantage,
    advantageSources: adv.advantageSources,
    disadvantage: dis.advantage,
    disadvantageSources: dis.advantageSources,
  }
}

/**
 * The lowest d20 result that counts as a critical hit — Ruling 8.
 *
 * A **sheet-level derived number, like AC**, not a per-attack property, and the
 * sources do **not stack**: 5e takes the lowest threshold, so Focused Critical
 * and Marksman's Luck together still produce 19 rather than 18. That is exactly
 * why it is modelled — a player holding two of these has to know which applies,
 * and the answer is not the additive one they would reach for.
 *
 * 20 when nothing grants it, which is every character today.
 *
 * @param {readonly Effect[]} [effects]
 * @returns {number}
 */
export function vaultCritRange(effects = []) {
  return effectsOfType(effects, 'crit_range')
    .map(e => Number(e.range ?? e.amount))
    .filter(n => Number.isFinite(n) && n >= 2 && n <= 20)
    .reduce((lowest, n) => Math.min(lowest, n), 20)
}

/**
 * The character's tool proficiencies — Ruling 5, and the one ruling that adds
 * schema because something was already waiting for it.
 *
 * Nothing records these today: `classToolProfs` returns the class table's free
 * text, which is why the crafting flow asks the player to tick a box and treats
 * an unticked one as disadvantage. A closed vocabulary means the crafting DC can
 * read the answer instead of asking for it.
 *
 * De-duplicated and sorted, because two sources granting Smith's Tools is one
 * proficiency rather than two. Returns display names: each stored `tool` goes
 * through `toolName`, so `smiths-tools` and a legacy `Smith's Tools` collapse
 * into one "Smith's tools" (VAULT-176) — before that the sheet printed the
 * Crafter's slug as "Smiths-tools".
 *
 * @param {readonly Effect[]} [effects]
 * @returns {string[]}
 */
export function vaultToolProficiencies(effects = []) {
  const tools = effectsOfType(effects, 'tool_proficiency')
    .map(e => e.tool)
    .filter(t => typeof t === 'string' && t.length > 0)
    .map(t => toolName(/** @type {string} */ (t)))
  return [...new Set(tools)].sort()
}

/**
 * Resource pools granted by a feat rather than by a class — Ruling 1.
 *
 * Emits exactly the object `ClassResourcesPanel` already renders and
 * `shortRestPlan` already reads, so a feat resource is indistinguishable from a
 * class one on the sheet. **These must be spread into `classResourcePools`** —
 * see the comment there; a pool in a parallel list silently never recharges.
 *
 * The key is the benefit key, so `vault_state.featureUsesUsed` counts two copies
 * of a repeatable feat separately (Ruling 11). It is **derived** from the
 * envelope by `effectKey` unless the effect names one — the authoring form has
 * no key field, and before VAULT-177 every authored resource was dropped here
 * for lacking one. An explicit `key` still wins: the species free-casts mint
 * their own.
 *
 * @param {VaultChar} char
 * @param {readonly Effect[]} [effects]
 * @returns {FeatureResource[]}
 */
export function vaultFeatureResources(char, effects = []) {
  const ctx = amountContext(char, modMap(vaultAbilityScores(char, effects)))
  return /** @type {FeatureResource[]} */ (effectsOfType(effects, 'feature_resource')
    .map(e => {
      const uses = resolveAmount(e.uses ?? e.amount ?? 0, ctx)
      // A pool whose size cannot be resolved is not rendered as an empty one —
      // zero pips looks like a spent resource rather than a broken definition.
      if (uses === null || uses <= 0) return null
      // The fields only a resource carries, read as the sheet renders them.
      const own = /** @type {{ key?: string | null, detail?: string, roll?: ResourceRoll, unit?: string, pool?: unknown }} */ (e)
      return {
        key: own.key ?? effectKey(e),
        name: e.name ?? e.source ?? 'Feature',
        uses,
        resets: e.resets ?? 'long_rest',
        ...(own.detail ? { detail: own.detail } : {}),
        ...(e.die ? { die: e.die } : {}),
        ...(own.roll ? { roll: own.roll } : {}),
        ...(own.unit ? { unit: own.unit } : {}),
        ...(own.pool ? { pool: true } : {}),
      }
    })
    .filter(row => row && row.key))
}

/**
 * @param {VaultChar} char
 * @param {readonly Effect[]} [effects]
 */
export function vaultPassives(char, effects = []) {
  const skills = vaultSkills(char, effects)
  const ctx = amountContext(char, modMap(vaultAbilityScores(char, effects)))
  // Observant's "+5 to your Passive Perception" raises the passive score alone
  // and leaves the active roll untouched, which is why this is its own type
  // rather than a `skill_bonus` — those already reach the passive through the
  // skill total below. A `passive_bonus` with no `skill` applies to all three.
  /** @param {string} slug */
  const extra = (slug) => effectsOfType(effects, 'passive_bonus')
    .filter(e => !e.skill || e.skill === slug)
    .reduce((sum, e) => sum + (resolveAmount(e.amount ?? 0, ctx) ?? 0), 0)
  /** @param {string} slug */
  const get = (slug) => 10 + (skills.find(s => s.slug === slug)?.total ?? 0) + extra(slug)
  return {
    perception: get('perception'),
    insight: get('insight'),
    investigation: get('investigation'),
  }
}

/**
 * @param {VaultChar} char
 * @returns {readonly unknown[]}
 */
export function vaultFamiliars(char) {
  return data(char).familiars ?? []
}

/**
 * @param {VaultChar} char
 * @returns {number}
 */
export function vaultTamerLevel(char) {
  return (data(char).classes ?? []).find(c => c.name === 'Tamer')?.level ?? 0
}

// PHB 5.5e Bardic Inspiration: uses = max(1, CHA mod), die scales at L5/10/15,
// Font of Inspiration at L5 changes reset from long to short/long rest.
// Returns null when the character has no Bard levels.
/**
 * @param {VaultChar} char
 * @param {readonly Effect[]} [effects]
 * @returns {FeatureResource | null}
 */
export function vaultBardicInspiration(char, effects = []) {
  const bard = (data(char).classes ?? []).find(c => c?.name === 'Bard')
  if (!bard?.level) return null
  const chaMod = vaultAbilityScores(char, effects).find(a => a.key === 'cha')?.mod ?? 0
  const level = bard.level
  return {
    key: 'bardic_inspiration',
    name: 'Bardic Inspiration',
    uses: Math.max(1, chaMod),
    die: level >= 15 ? 12 : level >= 10 ? 10 : level >= 5 ? 8 : 6,
    resets: level >= 5 ? 'short_rest' : 'long_rest',
  }
}

// The Rage Damage column of the Barbarian Features table: +2 through level 8,
// +3 from 9, +4 from 16. Level-scaled, so it is computed here rather than being
// an Effect on the content row — the same call Sneak Attack and the Bardic die
// made. 0 for anyone with no Barbarian levels.
/**
 * @param {number} [barbarianLevel]
 * @returns {number}
 */
export function rageDamageBonus(barbarianLevel = 0) {
  if (!barbarianLevel || barbarianLevel < 1) return 0
  if (barbarianLevel >= 16) return 4
  if (barbarianLevel >= 9) return 3
  return 2
}

// PHB 5.5e Rage (Barbarian L1+): the Rages column — 2 at level 1, 3 at 3, 4 at
// 6, 5 at 12, 6 at 17. `resets` is long_rest because that is the rule the pips
// can express; "one use returns on a Short Rest" is a partial refill the player
// makes by un-clicking a pip, so the caption says it instead.
/**
 * @param {VaultChar} char
 * @returns {FeatureResource | null}
 */
export function vaultRage(char) {
  const level = vaultClassLevel(char, 'Barbarian')
  if (level < 1) return null
  const uses = level >= 17 ? 6 : level >= 12 ? 5 : level >= 6 ? 4 : level >= 3 ? 3 : 2
  return {
    key: 'rage',
    name: 'Rage',
    uses,
    resets: 'long_rest',
    // The one use a Short Rest hands back, stated as a number rather than only
    // in the prose below — the Short Rest action has to act on it.
    shortRestRegain: 1,
    detail: `Bonus Action, +${rageDamageBonus(level)} damage on Strength attacks; `
      + 'one use returns on a Short Rest',
  }
}

// Rage's level-scaled damage bonus, as an Effect, but only while the toggle is
// on. It cannot live on the content row like Rage's resistances do, because the
// amount depends on the character's level — yet it must obey the same toggle,
// so it is synthesised here.
//
// The Rage feature's id is not in `character.json`; the only place it appears is
// as the `sourceFeatureId` of the effects Rage already declares, which is also
// what the Features Tab keys its toggle on. So the id is read back out of those.
//
// **It is found by `sourceKind`, not by matching the display name.** The old
// `e.source === 'Rage'` was a string comparison against a content row's `name`
// column — a homebrew feature called Rage, or a rename, or a translation, and
// the Barbarian silently loses their damage bonus with nothing to show for it.
// `sourceKind: 'feature'` plus the benefit key is the same answer stated in
// terms the data guarantees. The name match stays as a fallback for the four
// live rows that predate the envelope, and comes out when they are re-baked.
/**
 * @param {VaultChar} char
 * @param {readonly Effect[] | null} [resolvedEffects]
 * @param {ReadonlySet<string>} [activeFeatureIds]
 * @returns {Effect[]}
 */
export function vaultRageDamageEffects(char, resolvedEffects = [], activeFeatureIds = new Set()) {
  const level = vaultClassLevel(char, 'Barbarian')
  if (level < 1) return []
  const rage = (resolvedEffects ?? []).find(e => (
    isActivated(e)
    && (e.sourceKind === 'feature' || e.sourceKind == null)
    && (e.benefitKey === 'rage' || e.source === 'Rage')
  ))
  const rageId = rage?.sourceFeatureId
  if (!rageId || !activeFeatureIds.has(rageId)) return []
  return [{
    type: 'damage_roll_bonus',
    amount: rageDamageBonus(level),
    // "an attack using Strength — with either a weapon or an Unarmed Strike".
    weapon: { ability: 'str' },
    source: 'Rage',
    sourceKind: 'feature',
    benefitKey: 'rage',
    sourceFeatureId: rageId,
  }]
}

// PHB 5.5e Favored Enemy (Ranger L1+): free casts of Hunter's Mark, from the
// Favored Enemy column — 2 at level 1, then +1 at 5, 9, 13 and 17. Like the
// Paladin's free casts this is a fixed always-prepared spell rather than a
// `spell_choice` pick, so the derivation layer has no spell id to hand the
// Spell Panel and it renders as an ordinary pool instead.
/**
 * @param {VaultChar} char
 * @returns {FeatureResource | null}
 */
export function vaultFavoredEnemy(char) {
  const level = vaultClassLevel(char, 'Ranger')
  if (level < 1) return null
  const uses = level >= 17 ? 6 : level >= 13 ? 5 : level >= 9 ? 4 : level >= 5 ? 3 : 2
  // Foe Slayer (L20) upgrades the spell's damage die, which the pips cannot say.
  const die = level >= 20 ? 'd10' : 'd6'
  return {
    key: 'favored_enemy',
    name: 'Favored Enemy',
    uses,
    resets: 'long_rest',
    detail: `Cast Hunter's Mark without expending a spell slot (${die} damage)`,
  }
}

// PHB 5.5e Roving (Ranger L6+): +10 ft "while you aren't wearing Heavy armor".
// The same shape as Barbarian Fast Movement — level-gated and loadout-
// conditional — and kept as its own named helper rather than sharing one,
// because they are independent features that merely agree on the number today.
// Roving's Climb and Swim speeds are not modelled: `vaultSpeed` returns walking
// speed alone.
/**
 * @param {number} [rangerLevel]
 * @param {boolean} [isWearingHeavyArmor]
 * @returns {number}
 */
export function rovingBonus(rangerLevel = 0, isWearingHeavyArmor = false) {
  return rangerLevel >= 6 && !isWearingHeavyArmor ? 10 : 0
}

// PHB 5.5e Tireless (Ranger L10+): a Magic action granting 1d8 + WIS Temporary
// Hit Points, usable a WIS-modifier number of times per Long Rest. The
// "Exhaustion drops by 1 on a Short Rest" half has no vocabulary — the Vault
// tracks Exhaustion only as a manually-entered condition — so it is not here.
/**
 * @param {VaultChar} char
 * @param {readonly Effect[]} [effects]
 * @returns {FeatureResource | null}
 */
export function vaultTireless(char, effects = []) {
  const level = vaultClassLevel(char, 'Ranger')
  if (level < 10) return null
  const wisMod = vaultAbilityScores(char, effects).find(a => a.key === 'wis')?.mod ?? 0
  return {
    key: 'tireless',
    name: 'Tireless',
    uses: Math.max(1, wisMod),
    resets: 'long_rest',
    detail: 'Magic action: gain Temporary Hit Points',
    roll: { notation: rollNotation(1, 8, wisMod), dice: [{ count: 1, sides: 8 }], modifier: wisMod },
  }
}

// PHB 5.5e Nature's Veil (Ranger L14+): a Bonus Action granting the Invisible
// condition until the end of your next turn, a WIS-modifier number of times per
// Long Rest.
/**
 * @param {VaultChar} char
 * @param {readonly Effect[]} [effects]
 * @returns {FeatureResource | null}
 */
export function vaultNaturesVeil(char, effects = []) {
  const level = vaultClassLevel(char, 'Ranger')
  if (level < 14) return null
  const wisMod = vaultAbilityScores(char, effects).find(a => a.key === 'wis')?.mod ?? 0
  return {
    key: 'natures_veil',
    name: "Nature's Veil",
    uses: Math.max(1, wisMod),
    resets: 'long_rest',
    detail: 'Bonus Action: Invisible until the end of your next turn',
  }
}

// PHB 5.5e Monk's Focus (L2+): Focus Points equal to Monk level, recover on
// short or long rest. Returns null for Monks below L2 or non-Monk characters.
/**
 * @param {VaultChar} char
 * @returns {FeatureResource | null}
 */
export function vaultMonkFocus(char) {
  const monk = (data(char).classes ?? []).find(c => c?.name === 'Monk')
  if (!monk?.level || monk.level < 2) return null
  return {
    key: 'monk_focus',
    name: 'Focus Points',
    uses: monk.level,
    resets: 'short_rest',
  }
}

// PHB 5.5e Uncanny Metabolism (Monk L2+): once per Long Rest, when you roll
// Initiative, regain every expended Focus Point and heal your Monk level plus a
// roll of the Martial Arts die. Refilling the Focus pool is the player's own
// click on that row — the pip here tracks only the once-per-Long-Rest
// permission, which is the part that is easy to lose track of.
/**
 * @param {VaultChar} char
 * @returns {FeatureResource | null}
 */
export function vaultUncannyMetabolism(char) {
  const level = vaultClassLevel(char, 'Monk')
  if (level < 2) return null
  // A die at every Monk level from 1, and this is level 2 or more.
  const die = /** @type {number} */ (martialArtsDie(level))
  return {
    key: 'uncanny_metabolism',
    name: 'Uncanny Metabolism',
    uses: 1,
    resets: 'long_rest',
    detail: 'On Initiative: regain all Focus Points and heal',
    roll: { notation: rollNotation(1, die, level), dice: [{ count: 1, sides: die }], modifier: level },
  }
}

// PHB 5.5e Deflect Attacks (Monk L3+): a Reaction that reduces one attack's
// damage by 1d10 + DEX + Monk level. Not a pool — a Reaction is rationed by the
// round rather than by uses — so it carries no `uses` and renders as a rollable
// chip, the same shape Sneak Attack takes.
/**
 * @param {VaultChar} char
 * @param {readonly Effect[]} [effects]
 */
export function vaultDeflectAttacks(char, effects = []) {
  const level = vaultClassLevel(char, 'Monk')
  if (level < 3) return null
  const dexMod = vaultAbilityScores(char, effects).find(a => a.key === 'dex')?.mod ?? 0
  const modifier = dexMod + level
  return {
    key: 'deflect_attacks',
    name: 'Deflect Attacks',
    notation: rollNotation(1, 10, modifier),
    dice: [{ count: 1, sides: 10 }],
    modifier,
    // Deflect Energy (L13) widens the damage types it answers; the redirect
    // itself is unchanged, so only the first half of the caption moves.
    detail: level >= 13
      ? 'Reduce any damage type; 1 Focus Point redirects it as a ranged attack'
      : 'Reduce Bludgeoning, Piercing or Slashing damage; 1 Focus Point redirects it',
    note: 'Reaction',
  }
}

// PHB 5.5e Wild Shape (L2+): the Wild Shape column of the Druid Features table
// — 2 uses at L2-5, 3 at L6-16, 4 at L17+. Regain one on a Short Rest, all on a
// Long Rest. Returns null for Druids below L2 or non-Druid characters.
//
// The 2024 Archdruid does NOT make this unlimited (that was the 2014 feature):
// at level 20 it regains one use when you roll Initiative empty, which the pips
// cannot express, so the caption says it instead. Form selection is still out of
// scope — the pool is the only part modelled.
/**
 * @param {VaultChar} char
 * @returns {FeatureResource | null}
 */
export function vaultWildShape(char) {
  const druid = (data(char).classes ?? []).find(c => c?.name === 'Druid')
  if (!druid?.level || druid.level < 2) return null
  const level = druid.level
  const hours = Math.floor(level / 2)
  const base = `Bonus Action: Beast form for ${hours} hour${hours === 1 ? '' : 's'}, ${level} temp HP`
  return {
    key: 'wild_shape',
    name: 'Wild Shape',
    uses: level >= 17 ? 4 : level >= 6 ? 3 : 2,
    resets: 'short_rest',
    detail: level >= 20 ? `${base}; regain one use on Initiative when empty` : base,
  }
}

// PHB 5.5e Channel Divinity (Cleric L2+): the Channel Divinity column of the
// Cleric Features table — 2 uses at L2-5, 3 at L6-17, 4 at L18+. Regain one on a
// Short Rest, all on a Long Rest. Which effect a use creates (Divine Spark, Turn
// Undead, or a subclass option) is chosen at the table, not tracked here.
/**
 * @param {VaultChar} char
 * @returns {FeatureResource | null}
 */
export function vaultChannelDivinity(char) {
  const cleric = (data(char).classes ?? []).find(c => c?.name === 'Cleric')
  if (!cleric?.level || cleric.level < 2) return null
  const level = cleric.level
  return {
    key: 'channel_divinity',
    name: 'Channel Divinity',
    uses: level >= 18 ? 4 : level >= 6 ? 3 : 2,
    resets: 'short_rest',
  }
}

// PHB 5.5e Divine Intervention (Cleric L10+): once per Long Rest, cast any Cleric
// spell of level 5 or lower with no slot and no Material components. Greater
// Divine Intervention (L20) adds Wish at the cost of a 2d4 Long Rest cooldown,
// which the pip can't express — it is stated in the detail caption instead.
/**
 * @param {VaultChar} char
 * @returns {FeatureResource | null}
 */
export function vaultDivineIntervention(char) {
  const cleric = (data(char).classes ?? []).find(c => c?.name === 'Cleric')
  if (!cleric?.level || cleric.level < 10) return null
  return {
    key: 'divine_intervention',
    name: 'Divine Intervention',
    uses: 1,
    resets: 'long_rest',
    detail: cleric.level >= 20
      ? 'Cast any Cleric spell of level 5 or lower, or Wish (then 2d4 Long Rests)'
      : 'Cast any Cleric spell of level 5 or lower, no slot or Material components',
  }
}

/**
 * @param {VaultChar} char
 * @param {string} name
 * @returns {number}
 */
export function vaultClassLevel(char, name) {
  return (data(char).classes ?? []).find(c => c?.name === name)?.level ?? 0
}

// PHB 5.5e Lay on Hands (Paladin L1+): a pool of 5 × Paladin level Hit Points
// that refills on a Long Rest. Unlike every other class resource this is spent
// in arbitrary amounts rather than whole uses — a Paladin heals 7 here and 3
// there — so it carries `pool: true` and the sheet renders a spend field
// instead of pips. `uses` is still the maximum, which keeps it compatible with
// the featureUsesUsed counter and with longRest() zeroing it.
/**
 * @param {VaultChar} char
 * @returns {FeatureResource | null}
 */
export function vaultLayOnHands(char) {
  const level = vaultClassLevel(char, 'Paladin')
  if (!level) return null
  return {
    key: 'lay_on_hands',
    name: 'Lay on Hands',
    pool: true,
    unit: 'HP',
    uses: level * 5,
    resets: 'long_rest',
    detail: level >= 14
      ? 'Bonus Action: heal by touch; 5 HP removes Poisoned or one other condition'
      : 'Bonus Action: heal by touch; 5 HP removes the Poisoned condition',
  }
}

// PHB 5.5e Channel Divinity (Paladin L3+): the Channel Divinity column of the
// Paladin Features table — 2 uses at L3-10, 3 at L11+. Regain one on a Short
// Rest, all on a Long Rest.
//
// Deliberately a separate key from the Cleric's: they are two different class
// features with two separate pools, so a Cleric/Paladin tracks each on its own
// row. The name says which class it came from for exactly that reason.
/**
 * @param {VaultChar} char
 * @returns {FeatureResource | null}
 */
export function vaultPaladinChannelDivinity(char) {
  const level = vaultClassLevel(char, 'Paladin')
  if (level < 3) return null
  return {
    key: 'paladin_channel_divinity',
    name: 'Channel Divinity (Paladin)',
    uses: level >= 11 ? 3 : 2,
    resets: 'short_rest',
    detail: level >= 9 ? 'Divine Sense or Abjure Foes' : 'Divine Sense',
  }
}

// PHB 5.5e Paladin's Smite (L2) and Faithful Steed (L5): each grants one casting
// of a fixed always-prepared spell without a slot, once per Long Rest.
//
// These are free casts, but they cannot ride SpellPanel's freeCastSpells path —
// that renders rows built from a builder `spell_choice` pick, and these two
// spells are fixed rather than chosen, so the derive layer (which only ever sees
// character.json) has no spell id to hand it. A resource row naming the spell is
// the honest model.
/**
 * @param {VaultChar} char
 * @returns {FeatureResource[]}
 */
export function vaultPaladinFreeCasts(char) {
  const level = vaultClassLevel(char, 'Paladin')
  /** @type {FeatureResource[]} */
  const rows = []
  if (level >= 2) {
    rows.push({
      key: 'paladins_smite',
      name: "Paladin's Smite",
      uses: 1,
      resets: 'long_rest',
      detail: 'Cast Divine Smite without expending a spell slot',
    })
  }
  if (level >= 5) {
    rows.push({
      key: 'faithful_steed',
      name: 'Faithful Steed',
      uses: 1,
      resets: 'long_rest',
      detail: 'Cast Find Steed without expending a spell slot',
    })
  }
  return rows
}

// PHB 5.5e Second Wind (Fighter L1+): the Second Wind column of the Fighter
// Features table — 2 uses at L1-3, 3 at L4-9, 4 at L10+. Regain one on a Short
// Rest, all on a Long Rest. The heal is 1d10 + Fighter level, which the sheet
// offers as a roll rather than only stating it.
/**
 * @param {VaultChar} char
 * @returns {FeatureResource | null}
 */
export function vaultSecondWind(char) {
  const level = vaultClassLevel(char, 'Fighter')
  if (!level) return null
  return {
    key: 'second_wind',
    name: 'Second Wind',
    uses: level >= 10 ? 4 : level >= 4 ? 3 : 2,
    resets: 'short_rest',
    detail: 'Bonus Action: regain HP',
    roll: { notation: rollNotation(1, 10, level), dice: [{ count: 1, sides: 10 }], modifier: level },
  }
}

// PHB 5.5e Action Surge (Fighter L2+): one extra action on your turn, once per
// Short or Long Rest — twice from L17, though still only once on a given turn.
/**
 * @param {VaultChar} char
 * @returns {FeatureResource | null}
 */
export function vaultActionSurge(char) {
  const level = vaultClassLevel(char, 'Fighter')
  if (level < 2) return null
  return {
    key: 'action_surge',
    name: 'Action Surge',
    uses: level >= 17 ? 2 : 1,
    resets: 'short_rest',
    detail: level >= 17
      ? 'One extra action (not Magic), once per turn'
      : 'One extra action (not Magic)',
  }
}

// PHB 5.5e Indomitable (Fighter L9+): reroll a failed save with a bonus equal to
// your Fighter level. 1 use at L9-12, 2 at L13-16, 3 at L17+, all on a Long Rest.
/**
 * @param {VaultChar} char
 * @returns {FeatureResource | null}
 */
export function vaultIndomitable(char) {
  const level = vaultClassLevel(char, 'Fighter')
  if (level < 9) return null
  return {
    key: 'indomitable',
    name: 'Indomitable',
    uses: level >= 17 ? 3 : level >= 13 ? 2 : 1,
    resets: 'long_rest',
    detail: `Reroll a failed saving throw with a +${level} bonus`,
  }
}

// PHB 5.5e Font of Magic (Sorcerer L2+): Sorcery Points equal to Sorcerer
// level, all back on a Long Rest. The class table's column is 0 at level 1,
// which is why this starts at 2 rather than returning an empty pool.
/**
 * @param {VaultChar} char
 * @returns {FeatureResource | null}
 */
export function vaultSorceryPoints(char) {
  const level = vaultClassLevel(char, 'Sorcerer')
  if (level < 2) return null
  return {
    key: 'sorcery_points',
    name: 'Sorcery Points',
    uses: level,
    resets: 'long_rest',
    detail: 'Fuels Metamagic; convert to and from spell slots',
  }
}

// PHB 5.5e Innate Sorcery (Sorcerer L1+): twice per Long Rest, 1 minute of +1
// spell save DC and Advantage on Sorcerer spell attack rolls. Sorcery Incarnate
// (L7) lets a Sorcerer pay 2 Sorcery Points to use it while empty, which the
// pips cannot express — it is stated in the detail caption instead.
/**
 * @param {VaultChar} char
 * @returns {FeatureResource | null}
 */
export function vaultInnateSorcery(char) {
  const level = vaultClassLevel(char, 'Sorcerer')
  if (!level) return null
  return {
    key: 'innate_sorcery',
    name: 'Innate Sorcery',
    uses: 2,
    resets: 'long_rest',
    detail: level >= 7
      ? 'Bonus Action, 1 min: +1 spell save DC, Advantage on spell attacks (or 2 SP when empty)'
      : 'Bonus Action, 1 min: +1 spell save DC, Advantage on spell attacks',
  }
}

// PHB 5.5e Sorcerous Restoration (Sorcerer L5+): once per Long Rest, a Short
// Rest gives back up to half your Sorcerer level in Sorcery Points. The pip
// tracks the once-per-Long-Rest permission, not the points themselves.
/**
 * @param {VaultChar} char
 * @returns {FeatureResource | null}
 */
export function vaultSorcerousRestoration(char) {
  const level = vaultClassLevel(char, 'Sorcerer')
  if (level < 5) return null
  return {
    key: 'sorcerous_restoration',
    name: 'Sorcerous Restoration',
    uses: 1,
    resets: 'long_rest',
    detail: `Short Rest: regain up to ${Math.floor(level / 2)} Sorcery Points`,
  }
}

// Metamagic options chosen in the builder. Stored like invocations — the full
// option entries ({name, cost, description}) so the sheet needs no fetch — but
// spread across the three features that grant them (Sorcerer 2, 10 and 17), so
// they are collected by type rather than read off one feature. Null when none.
/**
 * @param {VaultChar} char
 * @returns {OptionPick[] | null}
 */
export function vaultMetamagic(char) {
  const picks = /** @type {OptionPick[]} */ (Object.values(data(char).featureChoices ?? {})
    .filter(c => c?.type === 'metamagic')
    .flatMap(c => c?.metamagic ?? [])
    .filter(m => m?.name))
  return picks.length > 0 ? picks : null
}

// Feature Options chosen in the builder (Cleric Divine Order, Blessed Strikes).
// Like invocations, the pick carries the option's name and description so the
// sheet renders it without a content-table fetch. Null when none.
/**
 * @param {VaultChar} char
 * @returns {{ label: string | null, name: string, description: string | null }[] | null}
 */
export function vaultFeatureOptions(char) {
  const picks = Object.values(data(char).featureChoices ?? {})
    .filter(c => c?.type === 'feature_option' && c.optionName)
    .map(c => ({
      label: c?.label ?? null,
      // The filter above kept only picks with an option name.
      name: /** @type {string} */ (c?.optionName),
      description: c?.optionDescription ?? null,
    }))
  return picks.length > 0 ? picks : null
}

// Extra cantrips granted by a feature on top of the class table's Cantrips
// column — Cleric Thaumaturge is the only source today.
// The character's special senses, from `sense` Effects. That type has sat in the
// Effect table since it was written with no consumer at all — a character sheet
// had no Senses line, which is what kept Ranger Feral Senses and the Blind
// Fighting fighting style informational and hid species Darkvision everywhere
// but the builder's Species panel.
//
// Species Darkvision is stored as a plain `content_race.data.darkvision` number
// rather than as an Effect, and `character.json.race` carries only an id and a
// name — no `data`. Rather than teach this pure module to know about races, the
// translation happens once at bake time in `@vault/derive/effectBaking.js`, so everything
// that reaches here is already in the one `sense` shape.
//
// Ranges replace rather than stack, largest wins, the same rule the Unarmed
// Strike die follows: two sources of Darkvision mean the better one, not 180 ft.
/**
 * @param {readonly Effect[]} [effects]
 * @returns {Sense[]}
 */
export function vaultSenses(effects = []) {
  /** @type {Map<string, Sense>} */
  const best = new Map()
  for (const e of effectsOfType(effects, 'sense')) {
    const sense = String(e.sense ?? '').trim()
    const range = Number(e.range)
    if (!sense || !Number.isFinite(range) || range <= 0) continue
    const prev = best.get(sense)
    if (!prev || range > prev.range) {
      best.set(sense, { sense, range, source: e.source ?? null })
    }
  }
  return [...best.values()].sort((a, b) => a.sense.localeCompare(b.sense))
}

/**
 * @param {readonly Effect[]} [effects]
 * @returns {number}
 */
export function vaultBonusCantrips(effects = []) {
  return effectsOfType(effects, 'bonus_cantrips')
    .reduce((sum, e) => sum + /** @type {number} */ (e.amount ?? 0), 0)
}

// Names of other classes whose spell lists the character may prepare from —
// Bard Magical Secrets (Cleric, Druid and Wizard from level 10). Returns a
// de-duplicated array, empty for characters with no such feature. The Spell
// Panel unions these classes' spell links into its own Add-Spell list; nothing
// here grants a spell, it only widens what may be picked.
/**
 * @param {readonly Effect[]} [effects]
 * @returns {string[]}
 */
export function vaultSpellListAccess(effects = []) {
  const names = /** @type {string[]} */ (effectsOfType(effects, 'spell_list_access')
    .flatMap(e => e.classes ?? [])
    .filter(Boolean))
  return [...new Set(names)]
}

// Spells a feature hands the character outright — Bard Words of Creation, Druid
// Druidic, Warlock Contact Patron. `mode: 'prepared'` is the PHB's "you always
// have X prepared"; `mode: 'cantrip'` is the same grant aimed at the Cantrips
// column. Both sit *outside* the class's caps, which every Spellcasting feature
// states in as many words: "those spells don't count against the number of
// spells you can prepare with this feature".
//
// The cap exemption needs no arithmetic here. A granted spell is never written
// into `character.json.spells`, so it is not in the collection either cap counts
// — the Spell Panel renders these rows from the sheet and the counts never see
// them. That is the whole reason the grant is an Effect rather than a builder
// pick.
//
// `mode: 'free_cast'` is deliberately not read. Under Ruling 2 a free cast is a
// spell that owns a resource, so its uses come from a `feature_resource` riding
// the same benefit — a join this consumer does not make, and one the Spell
// Panel's existing `freeCastSpells` path already covers for builder picks.
//
// `spellId` is optional by Ruling 2: a name is enough at author time, and the
// panel resolves it against the class spell list. De-duplicated on mode and
// name, because two features may grant the same spell and the sheet should
// show it once.
/**
 * @param {readonly Effect[]} [effects]
 * @returns {{ key: string, spellName: string, spellId: string | null, mode: 'prepared' | 'cantrip' | 'spellbook', ability: string | null, source: string | null }[]}
 */
export function vaultGrantedSpells(effects = []) {
  /** @type {{ key: string, spellName: string, spellId: string | null, mode: 'prepared' | 'cantrip' | 'spellbook', ability: string | null, source: string | null }[]} */
  const rows = []
  const seen = new Set()
  for (const e of effectsOfType(effects, 'spell_grant')) {
    // `spellbook` (VAULT-264): a 2024 Savant's free pick, written into the book.
    // Not always prepared — the sheet lists it in the book, preparable.
    if (e.mode !== 'prepared' && e.mode !== 'cantrip' && e.mode !== 'spellbook') continue
    const spellName = String(e.spell ?? '').trim()
    if (!spellName) continue
    const dedupeKey = `${e.mode}:${spellName.toLowerCase()}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    rows.push({
      key: `granted_${e.mode}_${spellName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      spellName,
      spellId: e.spellId ?? null,
      mode: e.mode,
      // Spellfire Spark lets one granted spell cast off an ability of the
      // player's choosing, independent of any class. Null means "use whichever
      // class list carries it", which is what the panel does for every spell.
      ability: e.ability ?? null,
      source: e.source ?? null,
    })
  }
  return rows.sort((a, b) => a.spellName.localeCompare(b.spellName))
}

// PHB 5.5e Sneak Attack (L1+): the Rogue Features table grants ceil(level / 2)
// d6, once per turn. Not a spendable resource — no pips, just the current dice
// pool plus the Cunning Strike allowance that spends dice from it (L5 one
// effect, L11 two). Returns null for non-Rogue characters.
/**
 * @param {VaultChar} char
 */
export function vaultSneakAttack(char) {
  const rogue = (data(char).classes ?? []).find(c => c?.name === 'Rogue')
  if (!rogue?.level) return null
  const dice = Math.ceil(rogue.level / 2)
  return {
    key: 'sneak_attack',
    name: 'Sneak Attack',
    dice,
    die: 6,
    notation: `${dice}d6`,
    cunningStrikeEffects: rogue.level >= 11 ? 2 : rogue.level >= 5 ? 1 : 0,
  }
}

// Spells a feature lets you cast without a slot: Warlock Mystic Arcanum (one
// level 6-9 spell, 1/Long Rest), Wizard Spell Mastery (a level 1 and a level 2
// spell, at will) and Signature Spells (two level 3 spells, 1/Short Rest).
// `uses: null` means at will.
//
// The builder stores the granting class and level with each pick, so a
// character who later drops below the feature's level stops getting the free
// casts without the stale pick having to be deleted.
/**
 * @param {VaultChar} char
 * @returns {{ key: string, label: string, spellId: string, spellName: string, spellLevel: number, uses: number | null, resets: string | null }[] | null}
 */
export function vaultFreeCastSpells(char) {
  const classes = data(char).classes ?? []
  /** @type {{ key: string, label: string, spellId: string, spellName: string, spellLevel: number, uses: number | null, resets: string | null }[]} */
  const rows = []
  for (const [featureId, choice] of Object.entries(data(char).featureChoices ?? {})) {
    if (choice?.type !== 'spell_choice') continue
    const cls = classes.find(c => c?.name === choice.className)
    if (!cls || (cls.level ?? 0) < (choice.minLevel ?? 1)) continue
    ;(choice.spells ?? []).forEach((spell, i) => {
      if (!spell?.spellId) return
      rows.push({
        key: `freecast_${featureId}_${i}`,
        label: choice.label ?? 'Free Cast',
        spellId: spell.spellId,
        spellName: spell.spellName,
        spellLevel: spell.spellLevel,
        uses: choice.uses ?? null,
        resets: choice.resets ?? null,
      })
    })
  }
  if (rows.length === 0) return null
  return rows.sort((a, b) => (a.spellLevel - b.spellLevel) || a.spellName.localeCompare(b.spellName))
}

// PHB 5.5e Arcane Recovery (Wizard L1+): once per Long Rest, on a Short Rest,
// recover spell slots totalling up to half your Wizard level rounded up, none
// above level 5. The allowance is surfaced so the sheet can state it.
/**
 * @param {VaultChar} char
 * @returns {FeatureResource | null}
 */
export function vaultArcaneRecovery(char) {
  const wizard = (data(char).classes ?? []).find(c => c?.name === 'Wizard')
  if (!wizard?.level) return null
  return {
    key: 'arcane_recovery',
    name: 'Arcane Recovery',
    uses: 1,
    resets: 'long_rest',
    detail: `Recover up to ${Math.ceil(wizard.level / 2)} slot level${
      Math.ceil(wizard.level / 2) === 1 ? '' : 's'} (none above level 5) on a Short Rest`,
  }
}

// Eldritch Invocations chosen in the builder, stored in featureChoices as a
// tagged object with the full option entries ({name, description, ...}) so the
// sheet can render them without a content-table fetch. Null when none.
/**
 * @param {VaultChar} char
 * @returns {OptionPick[] | null}
 */
export function vaultInvocations(char) {
  const picks = /** @type {OptionPick[]} */ (Object.values(data(char).featureChoices ?? {})
    .filter(c => c?.type === 'invocations')
    .flatMap(c => c?.invocations ?? [])
    .filter(inv => inv?.name))
  return picks.length > 0 ? picks : null
}

/**
 * @param {number | null | undefined} hitDie
 * @param {number | null | undefined} level
 * @param {number} conMod
 * @returns {number | null}
 */
export function calcMaxHp(hitDie, level, conMod) {
  if (!hitDie || !level) return null
  return hitDie + conMod + (level - 1) * (Math.floor(hitDie / 2) + 1 + conMod)
}

/**
 * @param {Readonly<Record<string, number>>} scores
 * @returns {number}
 */
export function pointsSpent(scores) {
  return VAULT_ABILITY_KEYS.reduce((sum, k) => sum + (POINT_COST[scores[k]] ?? 0), 0)
}

/**
 * A `content_class.data` blob, as far as the class readers below read it.
 *
 * @typedef {{
 *   startingProficiencies?: { armor?: readonly unknown[] | null, weapons?: readonly unknown[] | null, tools?: readonly unknown[] | null } | null,
 *   multiclassProficiencies?: {
 *     armor?: readonly unknown[] | null,
 *     weapons?: readonly unknown[] | null,
 *     tools?: readonly unknown[] | null,
 *     skills?: { count?: number | null, options?: unknown } | null,
 *   } | null,
 *   primaryAbility?: readonly Readonly<Record<string, unknown>>[] | null,
 * }} ClassData
 */

/**
 * @param {unknown} classData
 * @returns {ClassData | null | undefined}
 */
const classDataOf = classData => /** @type {ClassData | null | undefined} */ (classData)

/**
 * @param {unknown} data a `content_class.data` blob
 * @returns {string[]}
 */
export function classArmorProfs(data) {
  const profs = classDataOf(data)?.startingProficiencies?.armor ?? []
  return profs.filter(a => typeof a === 'string').map(a => capitalize(a))
}

/**
 * @param {unknown} data a `content_class.data` blob
 * @returns {string[]}
 */
export function classWeaponProfs(data) {
  const profs = classDataOf(data)?.startingProficiencies?.weapons ?? []
  return profs.filter(w => typeof w === 'string').map(w => capitalize(w))
}

// The Monk is the first class whose Core Traits table carries a Tool
// Proficiencies row. Like the armor list, an empty one renders no row at all.
/**
 * @param {unknown} data a `content_class.data` blob
 * @returns {string[]}
 */
export function classToolProfs(data) {
  const profs = classDataOf(data)?.startingProficiencies?.tools ?? []
  return profs.filter(t => typeof t === 'string').map(t => capitalize(t))
}

/**
 * The class's proficiency baseline in the closed vocabulary — VAULT-92.
 *
 * The three functions above are the *display* path and stay exactly as they are:
 * they `capitalize()` the catalog's prose and `CoreTraitsPanel` prints it, which
 * is right, because a Core Traits table should read like the book it came from.
 * This is the *semantic* path, and it is what a feat's `weapon_proficiency` grant
 * is added to.
 *
 * **`authored` is the important field.** Eleven of the 28 classes, all from one
 * homebrew book, have `armor: []` *and* `weapons: []`, which is an
 * import that never ran, not a class that grants nothing. Nothing else in the row
 * distinguishes them, and both-lists-empty isolates exactly those eleven: the
 * Sorcerer and the Wizard have an empty `armor` and a populated `weapons`, and
 * they are the genuine no-armour classes.
 *
 * This is `classMulticlassProfs`'s rule one table over — "no authored entry" and
 * "grants nothing" are different answers and a caller must not collapse them. A
 * consumer that gates a number on this must treat `authored: false` as *unknown*
 * and leave the number alone; that is the whole reason VAULT-92 stopped short of
 * changing `weaponActions.js`.
 *
 * @param {unknown} data a `content_class.data` blob
 * @returns {{weapons: {granted: import('./effects.js').ProficiencyGrant[], unresolved: string[]}, armor: {granted: {category: string}[], unresolved: string[]}, authored: boolean}}
 */
export function classProficiencyBaseline(data) {
  const starting = classDataOf(data)?.startingProficiencies ?? {}
  const weapons = normaliseProficiencyList(starting.weapons, normaliseWeaponProficiency)
  const armor = normaliseProficiencyList(starting.armor, normaliseArmorTraining)
  /** @param {unknown} list */
  const size = list => (Array.isArray(list) ? list.length : 0)
  return {
    weapons,
    armor,
    authored: size(starting.weapons) > 0 || size(starting.armor) > 0,
  }
}

// PHB 2024 grants a *reduced* subset of a class's starting proficiencies when it
// is taken beyond the first — and never its saving throws or starting equipment.
// Returns null when the class has no authored entry, which is a different answer
// from "grants nothing": every homebrew class is absent, while the Sorcerer and
// the Wizard genuinely grant nothing and say so with an empty entry. Callers must
// not turn the first case into the second.
//
// `skills` is a choice rather than a list, and it is not always absent: the Bard,
// the Ranger and the Rogue each grant one skill pick on multiclass. Reading it as
// "no multiclass ever picks a skill" is what the first version of this got wrong,
// in the data and in the panel both — see the 20260812010000 migration. It
// carries the same `{ count, options }` shape as `skillChoices` so the builder's
// existing picker renders it unchanged.
/**
 * @param {unknown} data a `content_class.data` blob
 */
export function classMulticlassProfs(data) {
  const mc = classDataOf(data)?.multiclassProficiencies
  if (!mc) return null
  /** @param {'armor' | 'weapons' | 'tools'} key */
  const list = (key) => (mc[key] ?? []).filter(v => typeof v === 'string').map(v => capitalize(v))
  const skills = (mc.skills?.count ?? 0) > 0 ? mc.skills : null
  return { armor: list('armor'), weapons: list('weapons'), tools: list('tools'), skills }
}

/**
 * @param {unknown} data a `content_class.data` blob
 * @returns {string[]}
 */
export function classPrimaryAbility(data) {
  const arr = classDataOf(data)?.primaryAbility ?? []
  return arr.flatMap(obj => Object.keys(obj).filter(k => obj[k]))
}

// Display string for the Core Traits table. The 5etools encoding nests two
// operators: keys within one entry are ANDed (Paladin — Strength and Charisma),
// entries are ORed (Fighter — Strength or Dexterity). Flattening both to "and",
// as this used to, misreads every class with a choice.
//
// An ANDed group is listed in canonical ability order rather than key order,
// because these objects come out of a jsonb column: Postgres sorts object keys,
// so the Paladin's {str, cha} reads back as {cha, str} and would otherwise
// render "Charisma and Strength". ORed entries keep their array order, which
// jsonb does preserve.
/**
 * @param {unknown} data a `content_class.data` blob
 * @returns {string}
 */
export function classPrimaryAbilityLabel(data) {
  const groups = (classDataOf(data)?.primaryAbility ?? [])
    .map(obj => VAULT_ABILITY_KEYS.filter(k => obj[k]).map(k => VAULT_ABILITY_FULL[k] ?? k))
    .filter(g => g.length > 0)
    .map(g => g.join(' and '))
  return groups.join(' or ')
}
