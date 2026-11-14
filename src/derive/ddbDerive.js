// @ts-check
/** D&D Beyond character v5 payload helpers (best-effort; schema is unofficial). */

import { abilityMod } from './dnd5e.js'

// The payload's shape, as far as this file reads it. **Every field is optional
// and nullable**, because the schema is unofficial and fields come and go with
// what the character has active on D&D Beyond. Each `typeof` check below is
// what keeps a missing one harmless.

/**
 * A modifier, from any bucket: `subType` names what it affects, `type` how.
 *
 * @typedef {{
 *   type?: string | null,
 *   subType?: string | null,
 *   value?: number | null,
 *   statId?: number | null,
 *   friendlySubtypeName?: string | null,
 *   componentId?: number | null,
 *   requiresAttunement?: boolean | null,
 *   entityTypeId?: number | null,
 * }} DdbModifier
 */
/** @typedef {{ id?: number | null, value?: number | null }} DdbStat */
/**
 * @typedef {{
 *   equipped?: boolean | null,
 *   isAttuned?: boolean | null,
 *   definition?: { id?: number | null, armorTypeId?: number | null, armorClass?: number | null } | null,
 * }} DdbItem
 */
/**
 * @typedef {{
 *   name?: string | null,
 *   level?: number | null,
 *   definition?: { name?: string | null, hitDice?: number | null } | null,
 *   subclassDefinition?: { name?: string | null } | null,
 *   classFeatures?: ({ definition?: { id?: number | null } | null } | null)[] | null,
 * }} DdbClass
 */
/**
 * @typedef {{
 *   name?: string | null,
 *   level?: number | null,
 *   proficiencyBonus?: number | null,
 *   stats?: readonly (DdbStat | null)[] | null,
 *   bonusStats?: readonly (DdbStat | null)[] | null,
 *   overrideStats?: readonly (DdbStat | null)[] | null,
 *   modifiers?: Readonly<Record<string, readonly (DdbModifier | null)[] | null>> | null,
 *   bonusModifiers?: readonly (DdbModifier | null)[] | null,
 *   customModifiers?: readonly (DdbModifier | null)[] | null,
 *   classes?: readonly (DdbClass | null)[] | null,
 *   race?: {
 *     fullName?: string | null,
 *     definition?: { name?: string | null } | null,
 *     movement?: { walk?: number | null } | null,
 *     weightSpeeds?: { normal?: { walk?: number | null, fly?: number | null, swim?: number | null, climb?: number | null, burrow?: number | null } | null } | null,
 *   } | null,
 *   skills?: Readonly<Record<string, unknown>> | null,
 *   speed?: number | null,
 *   movement?: { walk?: number | null } | null,
 *   calculatedStats?: {
 *     walkSpeed?: number | null,
 *     speed?: number | null,
 *     hitPoints?: number | null,
 *     armorClass?: number | null,
 *     totalArmorClass?: number | null,
 *   } | null,
 *   baseHitPoints?: number | null,
 *   bonusHitPoints?: number | null,
 *   overrideHitPoints?: number | null,
 *   removedHitPoints?: number | null,
 *   temporaryHitPoints?: number | null,
 *   armorClass?: number | null,
 *   overrideArmorClass?: number | null,
 *   decorations?: {
 *     avatarUrl?: string | null,
 *     largeBackdropAvatarUrl?: string | null,
 *     defaultBackdrop?: { largeBackdropAvatarUrl?: string | null } | null,
 *   } | null,
 *   avatarUrl?: string | null,
 *   inventory?: readonly (DdbItem | null)[] | null,
 *   feats?: readonly ({ definition?: { name?: string | null } | null } | null)[] | null,
 *   currencies?: { pp?: number | null, gp?: number | null, ep?: number | null, sp?: number | null, cp?: number | null } | null,
 * }} DdbPayload
 */
/** @typedef {DdbPayload | null | undefined} PayloadArg */
/**
 * A character row, as far as `getPayload` reads it: an imported row's payload
 * at `json.data`, a converted row's under `json.ddbImport.payload.data`.
 *
 * @typedef {{ json?: { data?: DdbPayload | null, ddbImport?: { payload?: { data?: DdbPayload | null } | null } | null } | null }} DdbRow
 */
/** @typedef {'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA'} StatLabel */

/**
 * `list` when it is an array, else `[]`: every list in the payload may be
 * missing or the wrong thing. `Array.isArray` widens a readonly array to
 * `any[]`, so the element type is said once here.
 *
 * @template T
 * @param {readonly T[] | null | undefined} list
 * @returns {readonly T[]}
 */
const listOf = list => (Array.isArray(list) ? /** @type {readonly T[]} */ (list) : [])

export const STAT_IDS = {
  STR: 1,
  DEX: 2,
  CON: 3,
  INT: 4,
  WIS: 5,
  CHA: 6,
}

/** @type {readonly StatLabel[]} */
export const STAT_ORDER = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

export const ABILITY_SLUGS = {
  STR: 'strength', DEX: 'dexterity', CON: 'constitution',
  INT: 'intelligence', WIS: 'wisdom', CHA: 'charisma',
}

const SCORE_SLUG = {
  [STAT_IDS.STR]: 'strength-score',
  [STAT_IDS.DEX]: 'dexterity-score',
  [STAT_IDS.CON]: 'constitution-score',
  [STAT_IDS.INT]: 'intelligence-score',
  [STAT_IDS.WIS]: 'wisdom-score',
  [STAT_IDS.CHA]: 'charisma-score',
}

// Every modifier in force on the character, from whichever bucket.
//
// **D&D Beyond's `item` bucket lists every item's modifiers, whatever the item
// is doing** (VAULT-249; measured on a real payload 2026-10-14 for the Obsidian
// plugin's MYDND-53). Two potions in the bag (`equipped: false`) read as
// permanent cold and force resistances, an unattuned Eyes of the Eagle as
// Perception advantage — and an unattuned Headband of Intellect would set INT 19.
//
// So an item modifier is kept when an inventory row with its `componentId`
// (= `definition.id`) is equipped and, if the modifier `requiresAttunement`,
// attuned. Several rows may share a definition; any one in force is enough. A
// modifier naming no item, or an item not in the inventory, is kept as before:
// nothing says it is not in force, and silently dropping a real bonus is the
// worse failure. Every other bucket is the character's own and passes through.
/**
 * @param {PayloadArg} payload
 * @returns {(DdbModifier | null)[]}
 */
export function flattenModifiers(payload) {
  return modifiersInForce(payload).map(([, m]) => m)
}

// The same list, each modifier paired with the bucket it came from — `race`,
// `class`, `item`… — so a reader can say where a grant came from. `null` for the
// bonus/custom list, which names no source.
/**
 * @param {PayloadArg} payload
 * @returns {[string | null, DdbModifier | null][]}
 */
function modifiersInForce(payload) {
  /** @type {[string | null, DdbModifier | null][]} */
  const out = []
  const mods = payload?.modifiers
  if (mods && typeof mods === 'object' && !Array.isArray(mods)) {
    /** @type {Map<number, { equipped: boolean, attuned: boolean }[]>} */
    const states = new Map()
    for (const item of listOf(payload?.inventory)) {
      const id = item?.definition?.id
      if (typeof id !== 'number') continue
      const rows = states.get(id) ?? []
      rows.push({ equipped: item?.equipped === true, attuned: item?.isAttuned === true })
      states.set(id, rows)
    }
    /** @param {DdbModifier} m */
    const inForce = m => {
      const rows = typeof m?.componentId === 'number' ? states.get(m.componentId) : undefined
      if (!rows) return true
      return rows.some(r => r.equipped && (!m.requiresAttunement || r.attuned))
    }
    for (const [bucket, v] of Object.entries(mods)) {
      const list = listOf(v)
      for (const m of bucket === 'item' ? list.filter(m => m && inForce(m)) : list) out.push([bucket, m])
    }
  }
  const extra = payload?.bonusModifiers ?? payload?.customModifiers
  for (const m of listOf(extra)) out.push([null, m])
  return out
}

// A payload's class rows that are rows at all. The schema is unofficial and a
// `null` entry in `classes` threw on `c.level` and took the whole sheet with it
// (found by my-dnd-vault's parity harness, MYDND-72).
/**
 * @param {PayloadArg} payload
 * @returns {DdbClass[]}
 */
function classRows(payload) {
  return /** @type {DdbClass[]} */ (listOf(payload?.classes).filter(c => c && typeof c === 'object'))
}

// A class row's name. `||` rather than `??`, so an empty string falls through to
// the next spelling the way a missing one does.
/** @param {DdbClass} cls */
function className(cls) {
  return cls?.definition?.name || cls?.name || ''
}

// A D&D Beyond character's spell attack and save DC bonuses, as the effects
// `spellcasting.js` folds — VAULT-249.
//
// `deriveSpellcasting` has taken `spell_attack_bonus` / `spell_save_dc_bonus`
// since VAULT-195, but only the Vault branch ever produced one, so a Wand of the
// War Mage on an imported character changed nothing. D&D Beyond spells them as
// `bonus` modifiers: `spell-attacks` and `spell-save-dc` reach every class, and
// `<class>-spell-attacks` / `<class>-spell-save-dc` (a Rhythm-Maker's Drum,
// Bard spells only) carry the class in the subtype, which becomes `classes`.
// Read through `flattenModifiers`, so a wand in the bag grants nothing.
const SPELL_BONUS = /^(?:([a-z-]+)-)?spell-(attacks|save-dc)$/

/**
 * @param {PayloadArg} payload
 * @returns {{ type: string, amount: number, classes?: string[], source: string | null | undefined }[]}
 */
export function ddbSpellBonusEffects(payload) {
  /** @type {{ type: string, amount: number, classes?: string[], source: string | null | undefined }[]} */
  const out = []
  for (const m of flattenModifiers(payload)) {
    if (String(m?.type ?? '').toLowerCase() !== 'bonus' || typeof m?.value !== 'number') continue
    const match = SPELL_BONUS.exec(String(m.subType ?? '').toLowerCase())
    if (!match) continue
    out.push({
      type: match[2] === 'attacks' ? 'spell_attack_bonus' : 'spell_save_dc_bonus',
      amount: m.value,
      ...(match[1] ? { classes: [match[1]] } : {}),
      source: m.friendlySubtypeName ?? m.subType,
    })
  }
  return out
}

// The class `getSpellcastingAbility` answers for, by name — what a class-scoped
// spell bonus is matched against.
/**
 * @param {PayloadArg} payload
 * @returns {string | null}
 */
export function getSpellcastingClassName(payload) {
  for (const cls of classRows(payload)) {
    const name = className(cls)
    if (SPELLCASTING_STAT_ID[name.toLowerCase()]) return name
  }
  return null
}

/**
 * @param {PayloadArg} payload
 * @returns {number}
 */
export function proficiencyBonus(payload) {
  const p = payload?.proficiencyBonus
  if (typeof p === 'number') return p
  const lvl = totalCharacterLevel(payload)
  return Math.ceil(Math.max(lvl, 1) / 4) + 1
}

/**
 * @param {PayloadArg} payload
 * @returns {number}
 */
export function totalCharacterLevel(payload) {
  let n = typeof payload?.level === 'number' ? payload.level : 0
  if (n > 0) return n
  const cls = listOf(payload?.classes)
  for (const c of cls) {
    const lv = typeof c?.level === 'number' ? c.level : 0
    n += lv
  }
  return Math.max(n, 1)
}

/**
 * @param {PayloadArg} payload
 * @param {number} statId
 * @returns {number}
 */
export function getAbilityScore(payload, statId) {
  const stats = listOf(payload?.stats)
  const row = stats.find((s) => s?.id === statId)
  let v = typeof row?.value === 'number' ? row.value : 10

  const bonus = listOf(payload?.bonusStats).find((s) => s?.id === statId)
  if (bonus && typeof bonus.value === 'number') v += bonus.value

  const slug = SCORE_SLUG[statId]
  if (slug) {
    for (const m of flattenModifiers(payload)) {
      if (m?.subType !== slug) continue
      const t = String(m.type ?? '').toLowerCase()
      if (t === 'bonus' && typeof m.value === 'number') v += m.value
      if (t === 'set' && typeof m.value === 'number') v = Math.max(v, m.value)
    }
  }

  const ov = listOf(payload?.overrideStats).find((s) => s?.id === statId)
  if (typeof ov?.value === 'number') return ov.value

  return Math.max(v, 0)
}

/**
 * @param {unknown} score
 * @returns {number}
 */
export function getAbilityModifier(score) {
  return abilityMod(Number(score))
}

/** @param {number} statId */
function saveSlugForStat(statId) {
  /** @type {Record<number, string>} */
  const map = {
    [STAT_IDS.STR]: 'strength-saving-throws',
    [STAT_IDS.DEX]: 'dexterity-saving-throws',
    [STAT_IDS.CON]: 'constitution-saving-throws',
    [STAT_IDS.INT]: 'intelligence-saving-throws',
    [STAT_IDS.WIS]: 'wisdom-saving-throws',
    [STAT_IDS.CHA]: 'charisma-saving-throws',
  }
  return map[statId] ?? ''
}

/**
 * @param {readonly (DdbModifier | null)[]} mods
 * @param {string} slug
 */
function saveProficiencyLevel(mods, slug) {
  let best = 0
  for (const m of mods) {
    if (!m || m.subType !== slug) continue
    const t = String(m.type ?? '').toLowerCase()
    if (t === 'expertise') best = Math.max(best, 2)
    else if (t === 'proficiency' || t === 'half-proficiency') best = Math.max(best, 1)
  }
  return best
}

/** @param {PayloadArg} payload */
export function getSaves(payload) {
  const pb = proficiencyBonus(payload)
  const mods = flattenModifiers(payload)
  return STAT_ORDER.map((label) => {
    const id = STAT_IDS[label]
    const score = getAbilityScore(payload, id)
    const mod = getAbilityModifier(score)
    const slug = saveSlugForStat(id)
    const prof = saveProficiencyLevel(mods, slug)
    const mult = prof === 2 ? 2 : prof === 1 ? 1 : 0
    const total = mod + mult * pb
    return { label, abilityMod: mod, proficient: mult > 0, expertise: prof === 2, total }
  })
}

const SKILL_DEFS = [
  { name: 'Acrobatics', statId: STAT_IDS.DEX, sub: 'acrobatics' },
  { name: 'Animal Handling', statId: STAT_IDS.WIS, sub: 'animal-handling' },
  { name: 'Arcana', statId: STAT_IDS.INT, sub: 'arcana' },
  { name: 'Athletics', statId: STAT_IDS.STR, sub: 'athletics' },
  { name: 'Deception', statId: STAT_IDS.CHA, sub: 'deception' },
  { name: 'History', statId: STAT_IDS.INT, sub: 'history' },
  { name: 'Insight', statId: STAT_IDS.WIS, sub: 'insight' },
  { name: 'Intimidation', statId: STAT_IDS.CHA, sub: 'intimidation' },
  { name: 'Investigation', statId: STAT_IDS.INT, sub: 'investigation' },
  { name: 'Medicine', statId: STAT_IDS.WIS, sub: 'medicine' },
  { name: 'Nature', statId: STAT_IDS.INT, sub: 'nature' },
  { name: 'Perception', statId: STAT_IDS.WIS, sub: 'perception' },
  { name: 'Performance', statId: STAT_IDS.CHA, sub: 'performance' },
  { name: 'Persuasion', statId: STAT_IDS.CHA, sub: 'persuasion' },
  { name: 'Religion', statId: STAT_IDS.INT, sub: 'religion' },
  { name: 'Sleight of Hand', statId: STAT_IDS.DEX, sub: 'sleight-of-hand' },
  { name: 'Stealth', statId: STAT_IDS.DEX, sub: 'stealth' },
  { name: 'Survival', statId: STAT_IDS.WIS, sub: 'survival' },
]

/**
 * @param {readonly (DdbModifier | null)[]} mods
 * @param {string} sub
 */
function skillProficiencyLevel(mods, sub) {
  let best = 0
  for (const m of mods) {
    if (!m || m.subType !== sub) continue
    const t = String(m.type ?? '').toLowerCase()
    if (t === 'expertise') best = Math.max(best, 2)
    else if (t === 'proficiency' || t === 'half-proficiency') best = Math.max(best, 1)
  }
  return best
}

/**
 * If DDB exposes a flat skills object, prefer it; else derive from modifiers.
 *
 * @param {PayloadArg} payload
 */
export function getSkills(payload) {
  const skillsObj = payload?.skills
  if (skillsObj && typeof skillsObj === 'object' && !Array.isArray(skillsObj)) {
    return SKILL_DEFS.map(({ name, statId, sub }) => {
      const raw = skillsObj[name] ?? skillsObj[name.toLowerCase()]
      const fromObj =
        typeof raw === 'number' ? raw : typeof raw === 'string' ? Number.parseInt(raw, 10) : null
      if (typeof fromObj === 'number' && Number.isFinite(fromObj))
        return { name, slug: sub, total: fromObj, derived: false, proficient: undefined, expertise: undefined }
      const pb = proficiencyBonus(payload)
      const mods = flattenModifiers(payload)
      const prof = skillProficiencyLevel(mods, sub)
      const mult = prof === 2 ? 2 : prof === 1 ? 1 : 0
      const ab = getAbilityModifier(getAbilityScore(payload, statId))
      return { name, slug: sub, total: ab + mult * pb, derived: true, proficient: mult > 0, expertise: prof === 2 }
    })
  }

  const pb = proficiencyBonus(payload)
  const mods = flattenModifiers(payload)
  return SKILL_DEFS.map(({ name, statId, sub }) => {
    const ab = getAbilityModifier(getAbilityScore(payload, statId))
    const prof = skillProficiencyLevel(mods, sub)
    const mult = prof === 2 ? 2 : prof === 1 ? 1 : 0
    const total = ab + mult * pb
    return { name, slug: sub, total, derived: true, proficient: mult > 0, expertise: prof === 2 }
  })
}

/** @param {PayloadArg} payload */
export function getPassives(payload) {
  const skills = getSkills(payload)
  /** @param {string} n */
  const find = (n) => skills.find((s) => s.name === n)?.total
  const perception = find('Perception') ?? getAbilityModifier(getAbilityScore(payload, STAT_IDS.WIS))
  const insight = find('Insight') ?? getAbilityModifier(getAbilityScore(payload, STAT_IDS.WIS))
  const investigation = find('Investigation') ?? getAbilityModifier(getAbilityScore(payload, STAT_IDS.INT))
  return {
    perception: 10 + (typeof perception === 'number' ? perception : 0),
    insight: 10 + (typeof insight === 'number' ? insight : 0),
    investigation: 10 + (typeof investigation === 'number' ? investigation : 0),
  }
}

/**
 * `race.weightSpeeds.normal.walk` is where D&D Beyond actually puts a walking
 * speed. None of the other four shapes this checks is present on any of the 21
 * live rows, so every DDB character's Speed read `null` and the sheet showed no
 * speed at all. The others are kept — they cost nothing and this schema is
 * unofficial — but the one that works is now among them.
 *
 * **Zero is not a walking speed** (VAULT-257). A `payload.speed` of 0 used to
 * stop the search and the sheet read 0 ft. with a real 30 one shape further on;
 * every candidate must now be positive to win, as in my-dnd-vault's reader.
 *
 * @param {PayloadArg} payload
 * @returns {number | null}
 */
export function getSpeed(payload) {
  const candidates = [
    payload?.speed,
    payload?.movement?.walk,
    payload?.race?.movement?.walk,
    payload?.race?.weightSpeeds?.normal?.walk,
    payload?.calculatedStats?.walkSpeed,
    payload?.calculatedStats?.speed,
  ]
  for (const c of candidates) if (typeof c === 'number' && c > 0) return c
  return null
}

/**
 * Temporary hit points as D&D Beyond reports them (VAULT-257). The sheet takes
 * them only when `vault_state` holds none of its own, so an import arrives with
 * the 18 a Bard had on D&D Beyond rather than with 0.
 *
 * @param {PayloadArg} payload
 * @returns {number}
 */
export function getTempHitPoints(payload) {
  const t = payload?.temporaryHitPoints
  return typeof t === 'number' && t > 0 ? t : 0
}

/**
 * Initiative: the DEX modifier plus every `bonus initiative` modifier in force
 * (VAULT-257) — Alert (2014), a Weapon of Warning. It was the DEX modifier alone.
 *
 * @param {PayloadArg} payload
 * @returns {number}
 */
export function getInitiative(payload) {
  let n = getAbilityModifier(getAbilityScore(payload, STAT_IDS.DEX))
  for (const m of flattenModifiers(payload)) {
    if (
      String(m?.subType ?? '').toLowerCase() === 'initiative' &&
      String(m?.type ?? '').toLowerCase() === 'bonus' &&
      typeof m?.value === 'number'
    ) n += m.value
  }
  return n
}

const SENSES = new Set(['blindsight', 'darkvision', 'tremorsense', 'truesight'])

/** @type {Readonly<Record<string, string>>} */
const BUCKET_LABEL = {
  race: 'Species', class: 'Class', background: 'Background', item: 'Item', feat: 'Feat', condition: 'Condition',
}

/**
 * Senses, in the `{ sense, range, source }` shape `vaultSenses` gives a Vault
 * character (VAULT-257). The DDB branch wrote `[]` for every character.
 *
 * They arrive two ways (measured by my-dnd-vault on two real payloads,
 * 2026-10-14): `set-base darkvision 60` from a species, and `sense darkvision 60`
 * from an item — beside a `set-base darkvision 1` that is a flag, not a range.
 * So the largest value over 1 wins. Read through `flattenModifiers`' gate, so
 * goggles in the bag grant nothing.
 *
 * @param {PayloadArg} payload
 * @returns {{ sense: string, range: number, source: string | null }[]}
 */
export function getSenses(payload) {
  /** @type {Map<string, { sense: string, range: number, source: string | null }>} */
  const best = new Map()
  for (const [bucket, m] of modifiersInForce(payload)) {
    const type = String(m?.type ?? '').toLowerCase()
    const sense = String(m?.subType ?? '').toLowerCase()
    const range = Number(m?.value)
    if ((type !== 'sense' && type !== 'set-base') || !SENSES.has(sense)) continue
    if (!Number.isFinite(range) || range <= 1) continue
    const prev = best.get(sense)
    if (!prev || range > prev.range) best.set(sense, { sense, range, source: BUCKET_LABEL[bucket ?? ''] ?? null })
  }
  return [...best.values()].sort((a, b) => a.sense.localeCompare(b.sense))
}

// `bonus hit-points-per-level` modifiers, times the levels each one counts
// (VAULT-259, the upstream half of my-dnd-vault's MYDND-106). Tough is +2 in the
// `feat` bucket, Dwarven Toughness +1 in `race`, Draconic Resilience +1 in
// `class`, and D&D Beyond folds none of them into `baseHitPoints`.
//
// **A class feature's bonus scales with its own class's level.** Duchesse,
// Paladin 8 / Sorcerer 5, reads 131 on D&D Beyond: Draconic Resilience adds 5,
// not 13. The modifier's `componentId` is the feature's `definition.id` in that
// class row's `classFeatures`. A class modifier no row owns, and every other
// source, counts the total level. Through `modifiersInForce`, so a stowed
// item's bonus does not count.
/**
 * @param {PayloadArg} payload
 * @returns {number}
 */
function hitPointsPerLevel(payload) {
  const total = totalCharacterLevel(payload)
  /**
   * @param {string | null} bucket
   * @param {DdbModifier} m
   */
  const levelsFor = (bucket, m) => {
    if (bucket !== 'class' || typeof m?.componentId !== 'number') return total
    const owner = classRows(payload).find(c =>
      listOf(c.classFeatures).some(f => f?.definition?.id === m.componentId))
    return typeof owner?.level === 'number' && owner.level > 0 ? owner.level : total
  }
  let sum = 0
  for (const [bucket, m] of modifiersInForce(payload)) {
    if (m?.type !== 'bonus' || m.subType !== 'hit-points-per-level' || typeof m.value !== 'number') continue
    sum += m.value * levelsFor(bucket, m)
  }
  return sum
}

/**
 * **`baseHitPoints` is the hit-dice total and does NOT include Constitution.**
 * D&D Beyond stores the two apart and adds the modifier per level when it
 * renders the sheet, so reading `baseHitPoints` as the maximum under-reports
 * every character by `CON modifier × total level` — 40 points on a level 15
 * Barbarian with CON 18, 60 on a level 15 character with a +4.
 *
 * Measured against the 21 live DDB rows this was wrong on all 21, and adding the
 * Constitution term makes it agree exactly with what `calcVaultMaxHp` derives for
 * the same character. That agreement is the check: two independent formulas over
 * the same character land on one number.
 *
 * It excludes the per-level bonuses too; see `hitPointsPerLevel`.
 *
 * `overrideHitPoints` is a maximum the player typed on D&D Beyond and so
 * already includes everything — it must not have Constitution added on top.
 * This read `overriddenHitPoints` until VAULT-259, a field no payload carries,
 * so every hand-set maximum was ignored (3 of 25 Disposable Heroes payloads).
 *
 * @param {PayloadArg} payload
 * @returns {{ current: number, max: number }}
 */
export function deriveHp(payload) {
  const removed = typeof payload?.removedHitPoints === 'number' ? payload.removedHitPoints : 0
  const overridden = typeof payload?.overrideHitPoints === 'number' ? payload.overrideHitPoints : null
  const base = typeof payload?.baseHitPoints === 'number' ? payload.baseHitPoints : 0
  const bonus = typeof payload?.bonusHitPoints === 'number' ? payload.bonusHitPoints : 0
  const fromCon = getAbilityModifier(getAbilityScore(payload, STAT_IDS.CON)) * totalCharacterLevel(payload)

  let max = overridden != null && overridden > 0
    ? overridden
    : base + bonus > 0 ? base + bonus + fromCon + hitPointsPerLevel(payload) : 10
  const calc = payload?.calculatedStats?.hitPoints
  if (typeof calc === 'number' && calc > 0) max = calc
  return { current: Math.max(0, max - removed), max }
}

/**
 * @param {PayloadArg} payload
 * @returns {number | null}
 */
export function deriveAc(payload) {
  // Manual override set by the user on DDB
  const override = payload?.overrideArmorClass
  if (typeof override === 'number' && override > 0) return override

  // Direct scalar (rare but present in some DDB snapshots)
  const direct = payload?.armorClass
  if (typeof direct === 'number' && direct > 0) return direct

  // calculatedStats (present in some DDB export formats)
  const cs = payload?.calculatedStats
  if (cs) {
    const cac = cs.totalArmorClass ?? cs.armorClass
    if (typeof cac === 'number' && cac > 0) return cac
  }

  // Derive from equipped armor in inventory (armorTypeId: 1=light 2=medium 3=heavy 4=shield)
  const inventory = listOf(payload?.inventory)
  const dexMod = getAbilityModifier(getAbilityScore(payload, STAT_IDS.DEX))

  const wornArmor = inventory.filter(
    (i) => i?.equipped && (i?.definition?.armorTypeId ?? 0) >= 1 && (i.definition?.armorTypeId ?? 0) <= 3,
  )
  const wornShields = inventory.filter(
    (i) => i?.equipped && i?.definition?.armorTypeId === 4,
  )

  const mods = flattenModifiers(payload)

  let ac = 10 + dexMod // unarmored baseline

  if (wornArmor.length === 0) {
    // Unarmored Defense: some class features (Barbarian = CON, Monk = WIS) add a second
    // ability modifier via an "unarmored-armor-class" modifier with a statId reference.
    for (const m of mods) {
      if (!m) continue
      if (String(m.subType ?? '').toLowerCase() === 'unarmored-armor-class' && typeof m.statId === 'number') {
        ac += getAbilityModifier(getAbilityScore(payload, m.statId))
      }
    }
  }

  if (wornArmor.length > 0) {
    const armor = wornArmor[wornArmor.length - 1]
    // The filter above kept only rows with a definition.
    const base = armor?.definition?.armorClass ?? 0
    const typeId = armor?.definition?.armorTypeId
    const dexBonus = typeId === 1 ? dexMod : typeId === 2 ? Math.min(dexMod, 2) : 0
    ac = base + dexBonus
  }

  for (const shield of wornShields) {
    ac += shield?.definition?.armorClass ?? 2
  }

  // Flat AC bonuses from modifiers (e.g. Defense fighting style, Mage Armor, Bracers of Defense)
  for (const m of mods) {
    if (!m) continue
    const sub = String(m.subType ?? '').toLowerCase()
    const t = String(m.type ?? '').toLowerCase()
    if (sub === 'armor-class' && t === 'bonus' && typeof m.value === 'number') ac += m.value
  }

  return ac > 0 ? ac : null
}

/** @param {PayloadArg} payload */
export function abilityBlock(payload) {
  return STAT_ORDER.map((label) => {
    const id = STAT_IDS[label]
    const score = getAbilityScore(payload, id)
    return { label, score, mod: getAbilityModifier(score) }
  })
}

/**
 * The D&D Beyond payload for a row, wherever it lives.
 *
 * An imported row keeps it at `json.data`. A row VAULT-46 has converted to a
 * Vault Character has a Vault-shaped `json`, and the original is parked under
 * `json.ddbImport.payload` — so the carried inventory a player spent a campaign
 * accumulating is still readable after the conversion rather than disappearing
 * with the shape change.
 *
 * `deriveCharacterSheet` never reaches here for a converted row: it branches on
 * `source` and a converted row takes the Vault adapter. This is for the surfaces
 * that read the payload directly, which today means the Items tab.
 *
 * @param {DdbRow | null | undefined} charRow
 * @returns {DdbPayload}
 */
export function getPayload(charRow) {
  return charRow?.json?.data ?? charRow?.json?.ddbImport?.payload?.data ?? {}
}

// `||`, not `??`: an empty name or species is no name, and falls back.
/**
 * @param {PayloadArg} payload
 * @returns {string}
 */
export function getName(payload) {
  return payload?.name || 'Unknown'
}

/**
 * @param {PayloadArg} payload
 * @returns {string | null}
 */
export function getAvatarUrl(payload) {
  return payload?.decorations?.avatarUrl ?? payload?.avatarUrl ?? null
}

/**
 * @param {PayloadArg} payload
 * @returns {string | null}
 */
export function getBackdropUrl(payload) {
  const decorations = payload?.decorations
  return decorations?.largeBackdropAvatarUrl ?? decorations?.defaultBackdrop?.largeBackdropAvatarUrl ?? null
}

/**
 * @param {PayloadArg} payload
 * @returns {string | null}
 */
export function getRace(payload) {
  const r = payload?.race
  return r?.fullName || r?.definition?.name || null
}

// Each class with its subclass (VAULT-257), which the sheet's class line is the
// only place to show — `Bard (College of Lore) 13`, as `vaultFormatClasses`
// writes a Vault character's and my-dnd-vault's `charsheet` fence publishes it.
/** @param {PayloadArg} payload */
export function getClasses(payload) {
  return classRows(payload)
    .filter((c) => (c.level ?? 0) > 0)
    .map((c) => ({ name: className(c) || 'Class', subclass: c.subclassDefinition?.name || null, level: c.level }))
}

/**
 * @param {PayloadArg} payload
 * @returns {string}
 */
export function formatClasses(payload) {
  return getClasses(payload)
    .map((c) => (c.subclass ? `${c.name} (${c.subclass}) ${c.level}` : `${c.name} ${c.level}`))
    .join(' / ') || '—'
}

/**
 * @param {PayloadArg} payload
 * @param {string} name
 * @returns {boolean}
 */
export function hasClass(payload, name) {
  const want = name.toLowerCase()
  return classRows(payload).some((c) => className(c).toLowerCase() === want && (c.level ?? 0) > 0)
}

/** @type {Readonly<Record<string, number>>} */
const SPELLCASTING_STAT_ID = {
  wizard: STAT_IDS.INT, artificer: STAT_IDS.INT,
  cleric: STAT_IDS.WIS, druid: STAT_IDS.WIS, ranger: STAT_IDS.WIS,
  bard: STAT_IDS.CHA, sorcerer: STAT_IDS.CHA, warlock: STAT_IDS.CHA, paladin: STAT_IDS.CHA,
}

/** @type {Readonly<Record<number, string>>} */
const STAT_TO_ABILITY_KEY = {
  [STAT_IDS.STR]: 'str', [STAT_IDS.DEX]: 'dex', [STAT_IDS.CON]: 'con',
  [STAT_IDS.INT]: 'int', [STAT_IDS.WIS]: 'wis', [STAT_IDS.CHA]: 'cha',
}

/**
 * @param {PayloadArg} payload
 * @returns {number}
 */
export function getSpellcastingMod(payload) {
  for (const cls of classRows(payload)) {
    const statId = SPELLCASTING_STAT_ID[className(cls).toLowerCase()]
    if (statId) return getAbilityModifier(getAbilityScore(payload, statId))
  }
  return getAbilityModifier(getAbilityScore(payload, STAT_IDS.DEX))
}

/**
 * @param {PayloadArg} payload
 * @returns {string | null}
 */
export function getSpellcastingAbility(payload) {
  for (const cls of classRows(payload)) {
    const name = className(cls).toLowerCase()
    const statId = SPELLCASTING_STAT_ID[name]
    if (statId) return STAT_TO_ABILITY_KEY[statId] ?? null
  }
  return null
}

/**
 * @param {PayloadArg} payload
 * @returns {readonly (DdbItem | null)[]}
 */
export function getInventory(payload) {
  return listOf(payload?.inventory)
}

/** @type {Record<string, string>} */
const DAMAGE_SUBTYPE_TO_SLUG = {
  'acid-damage': 'acid',
  'bludgeoning-damage': 'bludgeoning',
  'cold-damage': 'cold',
  'fire-damage': 'fire',
  'force-damage': 'force',
  'lightning-damage': 'lightning',
  'necrotic-damage': 'necrotic',
  'piercing-damage': 'piercing',
  'poison-damage': 'poison',
  'psychic-damage': 'psychic',
  'radiant-damage': 'radiant',
  'slashing-damage': 'slashing',
  'thunder-damage': 'thunder',
  'bludgeoning-damage-from-non-magical-attacks': 'bludgeoning',
  'piercing-damage-from-non-magical-attacks': 'piercing',
  'slashing-damage-from-non-magical-attacks': 'slashing',
  'bludgeoning-damage-from-non-magical-attacks-that-arent-silvered': 'bludgeoning',
  'piercing-damage-from-non-magical-attacks-that-arent-silvered': 'piercing',
  'slashing-damage-from-non-magical-attacks-that-arent-silvered': 'slashing',
}

// Some grants — magic items in particular — carry the bare damage type as
// their subType (`cold`, not `cold-damage`). Each is its own slug (VAULT-247).
for (const slug of ['acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic',
  'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder']) {
  DAMAGE_SUBTYPE_TO_SLUG[slug] = slug
}

const CONDITION_SLUGS = new Set([
  'blinded', 'charmed', 'deafened', 'exhaustion', 'frightened',
  'grappled', 'incapacitated', 'invisible', 'paralyzed', 'petrified',
  'poisoned', 'prone', 'restrained', 'stunned', 'unconscious',
])

/**
 * Returns Defense Grant entries derived from DDB modifiers (resistance/immunity/vulnerability/condition_immunity).
 *
 * @param {PayloadArg} payload
 * @returns {{ type: string, value: string }[]}
 */
export function getDamageDefenses(payload) {
  /** @type {{ type: string, value: string }[]} */
  const grants = []
  const seen = new Set()
  for (const m of flattenModifiers(payload)) {
    if (!m) continue
    const type = String(m.type ?? '').toLowerCase()
    const subType = String(m.subType ?? '').toLowerCase()
    if (type !== 'resistance' && type !== 'immunity' && type !== 'vulnerability') continue
    const dmgSlug = DAMAGE_SUBTYPE_TO_SLUG[subType]
    if (dmgSlug) {
      const key = `${type}:${dmgSlug}`
      if (!seen.has(key)) { seen.add(key); grants.push({ type, value: dmgSlug }) }
      continue
    }
    if (type === 'immunity' && CONDITION_SLUGS.has(subType)) {
      const key = `condition_immunity:${subType}`
      if (!seen.has(key)) { seen.add(key); grants.push({ type: 'condition_immunity', value: subType }) }
    }
  }
  return grants
}

// ---------------------------------------------------------------------------
// VAULT-261. Five readers my-dnd-vault's `src/characterModel/model/ddb/derive.ts` and `defenses.ts`
// had and this file did not, moved here so the plugin calls one copy (its
// MYDND-140). Not wired into `deriveCharacterSheet`: the web app's panels read
// a DDB character their own way, and changing that is a change of its own.
//
// Each reads `modifiersInForce` and skips the bonus/custom list (bucket `null`),
// as the plugin's `modifierBuckets` did: a custom modifier names no source.
// ---------------------------------------------------------------------------

/** @param {PayloadArg} payload */
const modifiersBySource = payload => modifiersInForce(payload).filter(([bucket]) => bucket !== null)

/**
 * Hit dice per class, as `13d8`, labelled with the class. A class with no `hitDice` has none.
 *
 * @param {PayloadArg} payload
 * @returns {{ label: string, formula: string }[]}
 */
export function getHitDice(payload) {
  return classRows(payload)
    .filter(c => (c.level ?? 0) > 0 && c.definition?.hitDice)
    .map(c => ({ label: className(c) || 'Class', formula: `${c.level}d${c.definition?.hitDice}` }))
}

/** @type {Readonly<Record<string, 'walk' | 'fly' | 'swim' | 'climb' | 'burrow'>>} */
const SPEED_MODES = { walking: 'walk', flying: 'fly', swimming: 'swim', climbing: 'climb', burrowing: 'burrow' }

/**
 * Every movement mode in feet: the species' `weightSpeeds.normal`, raised by any
 * `set-innate-speed` modifier — a fly speed from a magic item or a feat. `walk`
 * is `getSpeed`'s unless one is passed, so it matches the sheet's speed exactly.
 *
 * @param {PayloadArg} payload
 * @param {number | null} [walk]
 * @returns {Record<string, number>}
 */
export function getSpeeds(payload, walk = getSpeed(payload)) {
  /** @type {Record<string, number>} */
  const out = {}
  const normal = payload?.race?.weightSpeeds?.normal ?? {}
  for (const mode of /** @type {const} */ (['walk', 'fly', 'swim', 'climb', 'burrow'])) {
    const v = Number(normal?.[mode])
    if (Number.isFinite(v) && v > 0) out[mode] = v
  }
  if (typeof walk === 'number' && walk > 0) out.walk = walk
  for (const [, m] of modifiersBySource(payload)) {
    if (String(m?.type ?? '').toLowerCase() !== 'set-innate-speed') continue
    const mode = SPEED_MODES[String(m?.subType ?? '').toLowerCase().replace(/^innate-speed-/, '')]
    const v = Number(m?.value)
    if (mode && Number.isFinite(v) && v > (out[mode] ?? 0)) out[mode] = v
  }
  return out
}

// D&D Beyond's own word on what a proficiency is, measured on the 25 public
// Disposable Heroes payloads (2026-11-03). Skills and saves are the sheet's
// already and are left out; `null` is a save or an unmade `choose-…`.
/** @type {Readonly<Record<number, 'armor' | 'weapons' | 'tools' | 'skill'>>} */
const PROFICIENCY_ENTITY = {
  174869515: 'armor',
  660121713: 'weapons', // a category: simple-weapons, martial-weapons, firearms
  1782728300: 'weapons', // one weapon: longsword, crossbow-hand, pump-shotgun
  2103445194: 'tools',
  1958004211: 'skill',
}

const PROFICIENCY_SKILLS = new Set([
  'acrobatics', 'animal-handling', 'arcana', 'athletics', 'deception', 'history',
  'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception',
  'performance', 'persuasion', 'religion', 'sleight-of-hand', 'stealth', 'survival',
])

// The fallback for a modifier with no `entityTypeId`: the 2014 and 2024 weapon
// tables in D&D Beyond's slug spelling. Before VAULT-261 this was the only rule,
// and it filed a Gunslinger's firearms as tools.
const WEAPON_SLUGS = new Set([
  'club', 'dagger', 'greatclub', 'handaxe', 'javelin', 'light-hammer', 'mace', 'quarterstaff',
  'sickle', 'spear', 'dart', 'crossbow-light', 'light-crossbow', 'shortbow', 'sling',
  'battleaxe', 'flail', 'glaive', 'greataxe', 'greatsword', 'halberd', 'lance', 'longsword',
  'maul', 'morningstar', 'pike', 'rapier', 'scimitar', 'shortsword', 'trident', 'war-pick',
  'warhammer', 'whip', 'blowgun', 'crossbow-hand', 'hand-crossbow', 'crossbow-heavy',
  'heavy-crossbow', 'longbow', 'musket', 'pistol', 'net',
])

/**
 * @param {DdbModifier | null} m
 * @param {string} sub
 * @returns {'armor' | 'weapons' | 'tools' | 'skill'}
 */
function proficiencyKind(m, sub) {
  const byEntity = m?.entityTypeId != null ? PROFICIENCY_ENTITY[m.entityTypeId] : undefined
  if (byEntity) return byEntity
  if (PROFICIENCY_SKILLS.has(sub) || sub.endsWith('-saving-throws')) return 'skill'
  if (sub.endsWith('-armor') || sub === 'shields') return 'armor'
  if (sub.endsWith('-weapons') || WEAPON_SLUGS.has(sub)) return 'weapons'
  return 'tools'
}

/** @param {string} slug */
const titled = slug => slug.split('-').map(w => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ')

/**
 * Armour, weapons, tools and languages, labelled as D&D Beyond labels them
 * (`friendlySubtypeName`) and sorted. Skills and saving throws are left out:
 * `getSkills` and `getSaves` have them.
 *
 * @param {PayloadArg} payload
 */
export function getProficiencies(payload) {
  /** @type {{ armor: string[], weapons: string[], tools: string[], languages: string[] }} */
  const out = { armor: [], weapons: [], tools: [], languages: [] }
  /**
   * @param {string[]} list
   * @param {string} label
   */
  const add = (list, label) => {
    if (label && !list.includes(label)) list.push(label)
  }
  for (const [, m] of modifiersBySource(payload)) {
    const type = String(m?.type ?? '').toLowerCase()
    const sub = String(m?.subType ?? '').toLowerCase()
    if (!sub || sub.startsWith('choose-')) continue
    const label = String(m?.friendlySubtypeName ?? '').trim() || titled(sub)
    if (type === 'language') {
      add(out.languages, label)
      continue
    }
    if (type !== 'proficiency') continue
    const kind = proficiencyKind(m, sub)
    if (kind !== 'skill') add(out[kind], label)
  }
  for (const list of Object.values(out)) list.sort((a, b) => a.localeCompare(b))
  return out
}

/**
 * The names of the feats taken, deduplicated case-insensitively and sorted:
 * D&D Beyond repeats an entry across its own buckets, and a list whose order
 * moved shows as a diff wherever it is written down. **Names only** — what a
 * feat does is its catalog row's, and an ASI must not be read off this.
 *
 * @param {PayloadArg} payload
 * @returns {string[]}
 */
export function getFeats(payload) {
  const seen = new Set()
  /** @type {string[]} */
  const out = []
  for (const entry of listOf(payload?.feats)) {
    const name = entry?.definition?.name
    if (typeof name !== 'string' || name.trim() === '') continue
    const trimmed = name.trim()
    if (seen.has(trimmed.toLowerCase())) continue
    seen.add(trimmed.toLowerCase())
    out.push(trimmed)
  }
  return out.sort((a, b) => a.localeCompare(b))
}

/**
 * The D&D Beyond purse, every denomination floored at 0.
 *
 * @param {PayloadArg} payload
 * @returns {{ pp: number, gp: number, ep: number, sp: number, cp: number }}
 */
export function getCurrency(payload) {
  const c = payload?.currencies
  /** @param {unknown} v */
  const n = v => (typeof v === 'number' && v > 0 ? Math.floor(v) : 0)
  return { pp: n(c?.pp), gp: n(c?.gp), ep: n(c?.ep), sp: n(c?.sp), cp: n(c?.cp) }
}
