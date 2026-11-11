// The canonical item `data` shape — the one language `content_item.data` and
// `magic_item.data` both speak.
//
// Items are the *class* case, not the monster case. `content_monster.data` is
// deliberately a raw verbatim dump because nothing computes with a stat block;
// it is rendered. But `weaponActions`, crafting, attunement and the shop all do
// arithmetic on items, so items follow `content_class.data`: one canonical
// shape, and the importers normalise into it rather than leaving every reader to
// decode a third-party format at runtime. See ADR 0014.
//
// The shape (every key optional — absent means "not applicable", never zero):
//
//   {
//     damage:           { dice: '1d8', type: 'slashing' },
//     versatile:        '1d10',
//     range:            { normal: 20, long: 60 },
//     properties:       ['finesse', 'light'],   // closed vocabulary, below
//     sourceProperties: ['GC:VSS-B'],           // verbatim, never rules-bearing
//     mastery:          'nick',                 // slug into `content_mastery`
//     ac:               2,
//     strength:         15,
//     stealth:          true,                   // disadvantage
//     weight:           3,
//     description:      '<p>…</p>',
//     effects:          [],                     // magic items only
//     tables:           [],                     // `dataTables.js` owns the shape
//   }
//
// Two rules make this worth having:
//
// 1. **Slugs, not labels.** `hasWeaponProperty` used to do a case-insensitive
//    *substring* match, because the same property arrived spelled as 'Light',
//    'Two-Handed' and 'Thrown (20/60)' depending on the book. Substring matching
//    is a guess that happens to be right: 'light' also matches 'Lightning
//    Charge', and nothing would have told you.
//
// 2. **Unknown codes are quarantined, not laundered.** A property this file does
//    not recognise — `'GC:VSS-B'`, `'MG-A'`, `'Whirl'` — goes to
//    `sourceProperties` verbatim. It still renders, so nothing is lost from the
//    page, but it can never reach `weaponMatches` and silently satisfy a rule it
//    was never defined to mean.

import { ABILITY_FULL_NAMES } from './dnd5e.js'

// The properties the rules engine understands. A predicate in `weaponActions`
// may only name one of these.
export const WEAPON_PROPERTIES = [
  'ammunition', 'burst-fire', 'finesse', 'heavy', 'light', 'loading',
  'reach', 'reload', 'special', 'thrown', 'two-handed', 'versatile',
]

export const DAMAGE_TYPES = [
  'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic',
  'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder',
]

const WEAPON_PROPERTY_SET = new Set(WEAPON_PROPERTIES)
const DAMAGE_TYPE_SET = new Set(DAMAGE_TYPES)

// 'Two-Handed' → 'two-handed'; 'Burst Fire' → 'burst-fire'.
export function toSlug(value) {
  if (typeof value !== 'string') return null
  const slug = value.trim().toLowerCase().replace(/[\s_]+/g, '-')
  return slug || null
}

// A property can arrive carrying its range in a parenthetical — 'Thrown (20/60)'
// is one string in some sources and two fields in others. Splitting it here is
// what lets the property become an exact slug *and* the range survive, instead
// of the range being the reason the slug had to stay fuzzy.
const RANGE_IN_LABEL = /^(.*?)\s*\((\d+)\s*\/\s*(\d+)\s*(?:ft\.?)?\)\s*$/i

function splitRange(value) {
  const match = typeof value === 'string' ? value.match(RANGE_IN_LABEL) : null
  if (!match) return { label: value, range: null }
  return {
    label: match[1],
    range: { normal: Number(match[2]), long: Number(match[3]) },
  }
}

// '20/60' or '20 / 60' → { normal, long }. A single number is a normal range
// with no long range, which is how reach and most thrown melee weapons read.
export function parseRange(value) {
  if (value == null) return null
  if (typeof value === 'object') {
    const normal = Number(value.normal)
    if (!Number.isFinite(normal)) return null
    const long = Number(value.long)
    return Number.isFinite(long) ? { normal, long } : { normal }
  }
  const text = String(value).trim()
  const pair = text.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (pair) return { normal: Number(pair[1]), long: Number(pair[2]) }
  const single = text.match(/^(\d+)$/)
  return single ? { normal: Number(single[1]) } : null
}

function num(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

// Reads a damage type from either a canonical slug or a source label
// ('Slashing', 'S' having already been decoded by the importer).
function damageType(value) {
  const slug = toSlug(value)
  return slug && DAMAGE_TYPE_SET.has(slug) ? slug : null
}

// Normalises any item `data` — a legacy 5e.tools-decoded blob, a partially
// migrated row, or an already-canonical one — into the canonical shape.
//
// Idempotent by construction: every branch reads both the legacy key and the
// canonical one, so normalising twice is the same as normalising once. The
// migration and the importer therefore cannot disagree, and a row that was
// missed by one is fixed by the other.
export function normalizeItemData(raw) {
  const d = raw && typeof raw === 'object' ? raw : {}
  const out = {}

  // Damage. Legacy `dmg1`/`dmgType`/`dmg2`; canonical `damage`/`versatile`.
  const dice = d.damage?.dice ?? d.dmg1 ?? null
  const type = damageType(d.damage?.type ?? d.dmgType)
  if (dice) out.damage = type ? { dice: String(dice), type } : { dice: String(dice) }
  const versatile = d.versatile ?? d.dmg2 ?? null
  if (versatile) out.versatile = String(versatile)

  // Properties, split into the vocabulary the engine acts on and everything
  // else. A range hiding inside a label is lifted out before the slug is taken.
  const properties = []
  const sourceProperties = []
  let range = parseRange(d.range)
  for (const entry of [...(d.properties ?? []), ...(d.sourceProperties ?? [])]) {
    if (typeof entry !== 'string') continue
    const { label, range: inline } = splitRange(entry)
    if (inline && !range) range = inline
    const slug = toSlug(label)
    if (slug && WEAPON_PROPERTY_SET.has(slug)) {
      if (!properties.includes(slug)) properties.push(slug)
    } else if (!sourceProperties.includes(entry)) {
      sourceProperties.push(entry)
    }
  }
  if (properties.length) out.properties = properties
  if (sourceProperties.length) out.sourceProperties = sourceProperties
  if (range) out.range = range

  // Mastery. One per weapon in the 2024 rules, so the array the 5e.tools shape
  // uses collapses to a single slug resolved against `content_mastery`.
  const mastery = Array.isArray(d.mastery) ? d.mastery[0] : d.mastery
  const masterySlug = toSlug(mastery)
  if (masterySlug) out.mastery = masterySlug

  const ac = num(d.ac)
  if (ac != null) out.ac = ac
  const strength = num(d.strength)
  if (strength != null) out.strength = strength
  if (d.stealth) out.stealth = true
  const weight = num(d.weight)
  if (weight != null) out.weight = weight
  if (d.description) out.description = d.description
  if (Array.isArray(d.effects) && d.effects.length) out.effects = d.effects
  // The tables the item's prose refers to (VAULT-220), shape owned by
  // `dataTables.js` and validated by the importer that writes them.
  //
  // **This branch is not decoration — without it the key cannot exist.** `out` is
  // built key by key, so `normalizeItemData` is a whitelist for everything except
  // what it names, and every writer of `content_item.data` goes through it: both
  // 5e.tools importers, the app's import dialog and the item builder. A `tables`
  // array handed in without this line is dropped between the extractor and the
  // insert, which looks exactly like the importer never finding a table.
  if (Array.isArray(d.tables) && d.tables.length) out.tables = d.tables

  return out
}

// Exact slug match. The whole point of the canonical shape: a predicate naming
// 'light' matches the Light property and nothing else.
export function hasProperty(data, property) {
  const slug = toSlug(property)
  return !!slug && (data?.properties ?? []).includes(slug)
}

// ## The effects an item carries (VAULT-7, closing VAULT-6's gaps 2 and 3)
//
// `data.effects` has existed since VAULT-5 and had no vocabulary and no
// consumer: ADR 0014 says in as many words that it "does not fire a magic
// item's +1". These three types are that vocabulary, and `weaponActions.js`
// fires them.
//
//   { type: 'weapon_attack_bonus',  amount: 1 }
//   { type: 'weapon_damage_bonus',  amount: 1 }
//   { type: 'weapon_extra_damage',  damage: { dice: '2d6', type: 'fire' } }
//
// **These are not the effects in `effects.js`, and the distinction is the whole
// reason they are a separate list.** A feat's `attack_roll_bonus` is granted to
// a *character* and carries a `weapon` predicate saying which weapons it reaches
// — that is how Archery applies to ranged weapons and nothing else. An item's
// bonus is already scoped by the only thing that could scope it: the item it is
// written on. So these types take no predicate, and `weaponActions` deliberately
// does not run them through `weaponMatches` — a `+1` sword is +1 in every hand,
// held every way, and a predicate here could only ever be a way to get that
// wrong.
//
// The payload nests under `damage` rather than carrying a flat `damageType`
// because `data.damage` is already `{ dice, type }` two keys up. One spelling of
// one concept; and it keeps the effect's own discriminating `type` from
// colliding with the damage's.
//
// ## Three types are shared with `effects.js` (VAULT-150, VAULT-195)
//
// The paragraph above says these are *not* the effects in `effects.js`, and for
// the three weapon types that holds: `weaponActions.js` is their only consumer
// and a predicate on them could only ever be a way to get a `+1` sword wrong.
//
// `ac_bonus`, `spell_attack_bonus` and `spell_save_dc_bonus` reach the sheet
// down the other path. `deriveCharacterSheet.js` folds every equipped item's
// `data.effects` into the same stream as the baked feat effects, gated by
// `itemBenefitsApply`, and `effects.js` applies them from there — so an item's
// `ac_bonus` had been working, and tested, since long before it was nameable
// here. What was missing was only the *authoring* half: this list is what
// `itemEffectProblems` validates against, so the item builder and
// `ItemEffectsEditor` rejected the exact payload the sheet was reading.
//
// That split is why `+1 Armor`, `+2 Armor`, `+3 Armor` and the three Shields sat
// with `data = {}` — there was no legal way to say the only thing they do. The
// types are spelled identically to `effects.js`'s because they *are* those
// concepts; two spellings of one idea is the hazard `magicItemData.js` delegates
// to this module to avoid.
//
// The two spell types joined them in VAULT-195, and **what licenses an item
// effect to live in `effects.js` too is that the item's own rule is already a
// statement about the character**. "While holding this wand, you gain a +1 bonus
// to spell attack rolls" is a character's bonus that an item happens to be the
// occasion for; a `+1` sword's `+1` is a fact about the sword. The first needs
// the character-wide stream, the second does not.
// ## Three more joined them in VAULT-229, for an item that arms the character
//
// `attack_roll_bonus`, `damage_roll_bonus` and `unarmed_strike_die` pass the same
// test the two spell types passed: each is already a statement about the
// character that an item happens to be the occasion for. Demon Armor is the row
// that needed them — "the armor's clawed gauntlets allow your unarmed strikes to
// deal 1d8 slashing damage instead of the usual bludgeoning damage, and you gain
// a +1 bonus to the attack and damage rolls of your unarmed strikes".
//
// **`weapon_attack_bonus` is the wrong type for that, and the difference is not
// cosmetic.** An Unarmed Strike is not a weapon: `resolveWeaponData` finds no row
// for it, so `weaponActions.js` never sees it, and `unarmedStrike.js` — which
// does — reads `attack_roll_bonus`/`damage_roll_bonus` through `appliesUnarmed`,
// which rejects any effect carrying a `weapon` predicate. A `weapon_attack_bonus`
// authored here would have reached nothing at all and looked authored.
//
// The consumer needed no change: `deriveCharacterSheet.js` has folded item
// effects into `allEffects` and passed that to `deriveUnarmedStrike` since
// VAULT-154. This was the authoring half again, exactly as `ac_bonus` was — the
// sheet could read the payload and nothing was allowed to write it.
//
// ## And `ability_score_set` in VAULT-258
//
// "Your Intelligence score is 19 while you wear this headband" is the same kind
// of statement, and the one `ability_score_bonus` cannot make: it is a floor,
// not a bonus. `vaultAbilityScores` reads it from `allEffects` like the rest.
export const ITEM_EFFECT_TYPES = [
  'weapon_attack_bonus', 'weapon_damage_bonus', 'weapon_extra_damage', 'ac_bonus',
  'spell_attack_bonus', 'spell_save_dc_bonus',
  'attack_roll_bonus', 'damage_roll_bonus', 'unarmed_strike_die',
  'ability_score_set',
]

const ITEM_EFFECT_TYPE_SET = new Set(ITEM_EFFECT_TYPES)

// '2d6', '1d8', 'd4'. Deliberately not an expression grammar: an item that adds
// '2d6 + 3' is two effects, and letting one field hold arithmetic is how the
// damage line stops being addable.
const DICE = /^\d*d\d+$/i

/**
 * What is wrong with one authored item effect, as a list of sentences a form can
 * print. Empty means it is safe to store.
 *
 * This exists for the reason `featEffectSchema.js`'s `effectProblems` does: a
 * half-filled effect that is *rendered* is ugly and recoverable, but one that is
 * *stored* looks exactly like something somebody meant. The builder refuses to
 * save what the sheet would silently ignore.
 *
 * It lives here rather than in `apps/vault/src/lib/` — where the feat one lives
 * — because this validates the stored shape, not a form layout, and it guards
 * the same three keys `normalizeItemData` passes through one function above.
 * `normalizeItemData` itself stays lossless on purpose: it runs over the whole
 * catalog from the importers, and silently dropping a malformed effect there
 * would delete data rather than report it.
 */
export function itemEffectProblems(effect) {
  const problems = []
  if (!effect || typeof effect !== 'object') return ['Not an effect.']
  if (!ITEM_EFFECT_TYPE_SET.has(effect.type)) {
    problems.push(`Unknown effect type "${effect.type ?? ''}".`)
    return problems
  }
  if (effect.type === 'weapon_extra_damage') {
    const dice = effect.damage?.dice
    if (!dice) problems.push('Extra damage needs dice.')
    else if (!DICE.test(String(dice).trim())) problems.push(`"${dice}" is not dice, e.g. 2d6.`)
    // The damage type is optional and absent is a real answer: extra damage of
    // the weapon's own type is how a flat "+1d6 damage" band reads, and
    // `damageToken` renders an untyped die correctly.
    if (effect.damage?.type != null && !damageType(effect.damage.type)) {
      problems.push(`"${effect.damage.type}" is not a damage type.`)
    }
  } else if (effect.type === 'unarmed_strike_die') {
    // The one item type carrying no `amount` at all — it *replaces* the flat 1 of
    // an Unarmed Strike rather than adding to anything, so its payload is a die
    // and validating it as a bonus would reject every well-formed one.
    // `unarmedStrike.js` takes the largest die on offer and ignores the rest, so a
    // `die` of 0 or a fraction is not harmless: it silently loses to Martial Arts
    // and the row looks authored.
    const die = Number(effect.die)
    if (!Number.isInteger(die) || die <= 0) problems.push('Die must be a whole number, e.g. 8.')
    // Optional, and the reason it exists: Demon Armor's gauntlets deal *slashing*
    // where every other unarmed strike deals bludgeoning. Absent means bludgeoning.
    if (effect.damageType != null && !damageType(effect.damageType)) {
      problems.push(`"${effect.damageType}" is not a damage type.`)
    }
  } else if (effect.type === 'ability_score_set') {
    // A score, not an amount: `vaultAbilityScores` compares it rather than adds
    // it. 30 is the rules' ceiling, and the Belt of Storm Giant Strength's 29
    // the highest printed.
    if (!Object.hasOwn(ABILITY_FULL_NAMES, effect.ability ?? '')) {
      problems.push('Ability must be one of str, dex, con, int, wis, cha.')
    }
    const score = Number(effect.score)
    if (effect.score == null || !Number.isInteger(score) || score < 1 || score > 30) {
      problems.push('Score must be a whole number from 1 to 30.')
    }
  } else if (!Number.isFinite(Number(effect.amount)) || Number(effect.amount) === 0) {
    // Zero is rejected rather than stored: it changes no roll, so it is either a
    // half-typed field or a bonus somebody meant to delete.
    problems.push('Bonus must be a non-zero number.')
  }
  // `spell_save_dc_bonus` is the one item type carrying a predicate (VAULT-195),
  // and a malformed one is the dangerous case rather than the loud one: absent
  // `classes` legitimately means *every* class, so `classes: 'Warlock'` — the
  // string, not the array — reads as unscoped and hands a Wizard the Rod of the
  // Pact Keeper's DC bonus. Checked only when the key is present, because absent
  // is a real answer.
  if (effect.type === 'spell_save_dc_bonus' && effect.classes !== undefined) {
    const classes = effect.classes
    if (!Array.isArray(classes) || classes.length === 0) {
      problems.push('Classes must be a non-empty list, or left out to apply to all.')
    } else if (classes.some(c => typeof c !== 'string' || c.trim() === '')) {
      problems.push('Each class must be a name.')
    }
  }
  return problems
}

/** The item effects on one `data`, ignoring anything not in the vocabulary. */
export function itemEffects(data) {
  return (data?.effects ?? []).filter(e => ITEM_EFFECT_TYPE_SET.has(e?.type))
}

/** The summed `amount` of one bonus type. 0 when the item grants none. */
export function itemEffectBonus(effects, type) {
  return (effects ?? [])
    .filter(e => e?.type === type)
    .reduce((total, e) => total + (Number(e.amount) || 0), 0)
}

/** The `{ dice, type }` payloads of every `weapon_extra_damage` on an item. */
export function itemExtraDamage(effects) {
  return (effects ?? [])
    .filter(e => e?.type === 'weapon_extra_damage' && e.damage?.dice)
    .map(e => ({ dice: String(e.damage.dice), type: damageType(e.damage.type) }))
}

// 'two-handed' → 'Two-Handed'. The inverse of `toSlug` for display; a mastery
// slug with no catalog row still has to render as something a player can read.
export function labelFromSlug(slug) {
  if (typeof slug !== 'string' || !slug) return null
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')
}

// Properties as they should be shown. Source properties come last and
// unaltered, because the book's spelling is the only thing that makes them
// meaningful.
export function displayProperties(data) {
  const canonical = (data?.properties ?? []).map(labelFromSlug)
  return [...canonical, ...(data?.sourceProperties ?? [])]
}

// Cost lives in `content_item.cost_cp` — a real column the shop already reads —
// not in `data`. This formats it for display so the two never drift.
export function formatCostCp(cp) {
  if (!cp) return null
  if (cp >= 100000 && cp % 1000 === 0) return `${cp / 1000} pp`
  if (cp >= 100 && cp % 100 === 0) return `${cp / 100} gp`
  if (cp >= 10 && cp % 10 === 0) return `${cp / 10} sp`
  return `${cp} cp`
}

// The inverse, for importers reading a formatted cost back into copper.
export function parseCostToCp(value) {
  if (value == null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const match = String(value).trim().match(/^([\d.]+)\s*(pp|gp|ep|sp|cp)$/i)
  if (!match) return null
  const amount = Number(match[1])
  if (!Number.isFinite(amount)) return null
  const multiplier = { pp: 1000, gp: 100, ep: 50, sp: 10, cp: 1 }[match[2].toLowerCase()]
  return Math.round(amount * multiplier)
}
