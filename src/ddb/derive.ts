import type {
  DdbAction,
  DdbClass,
  DdbItemDefinition,
  DdbModifier,
  DdbPayload,
} from './payload'
import {
  SHEET_VERSION,
  type Sheet,
  type SheetAbility,
  type SheetAttack,
  type SheetCurrency,
  type SheetFeatureDie,
  type SheetHitDie,
  type SheetItem,
  type SheetPassives,
  type SheetResource,
  type SheetSave,
  type SheetSkill,
  type SheetSpellcasting,
  type SheetSpellLevel,
} from './sheet'
import { getCurrency, getFeats, getHitDice } from '@vault/derive/ddbDerive.js'

import { buildDefenses, buildProficiencies, buildSenses, buildSpeeds } from './defenses'
import { buildFeaturePicks } from './featurePicks'
import { activeModifiers, modifierBuckets } from './modifiers'
import { pactOnlyRanksForClassNames, slotMapForDdbClasses } from '../spells/slots'

/**
 * Deriving a sheet from a D&D Beyond payload.
 *
 * Ported from `obsidian-vault-characters`' section 1 (MYDND-7), where it was
 * itself a reimplementation of `the-vault`'s web derivation. **It is kept
 * rather than replaced by `@vault/derive/ddbDerive.js`**, which is in the
 * submodule and does the same job: this code is what produced the two
 * character notes in the author's vault, every defensive read below is a bug
 * it has already been bitten by, and switching derivations would change
 * numbers on existing notes silently. Converging the two is its own card, with
 * its own verification against both characters.
 *
 * **The DDB schema is unofficial, so every reader here is defensive and most
 * have been wrong once.** The comments record which, and they are the reason
 * this file reads the long way round in places. Nothing here is defensive
 * out of habit.
 *
 * This module imports nothing from `obsidian` — deliberately, so it stays in
 * the `logic` Vitest project and is testable in plain Node.
 *
 * ## Known gaps, carried over with the code
 *
 * Each of these is a deliberate omission rather than an oversight, and each is
 * here because **nothing is invented to fill a gap** — a wrong label at the
 * table is worse than a blank one.
 *
 * - **A feature attack's damage type is omitted.** The payload gives only a
 *   `damageTypeId` (`11` for psychic) and carries no lookup — the string
 *   "Psychic" appears nowhere in the JSON. A guessed map could label fire damage
 *   as cold. Inventory weapons keep theirs, because DDB gives those as a string.
 * - **Spell slots are not read from the payload.** `spellSlots.available` reads
 *   0 at every level on a character who demonstrably has slots, so it cannot be
 *   trusted to mean what it looks like. Since MYDND-36 the maxima are worked out
 *   from the class levels instead, by `@vault/derive`'s slot rules — what the
 *   web app's DDB spell panel does — and since MYDND-139 a third caster's
 *   subclass counts too (`slotMapForDdbClasses`).
 * - **One spell save DC** is reported for a multiclassed caster — the first
 *   class that casts in its own right, else the first third caster, labelled
 *   with its ability. The rules give one per class.
 *
 * Closed by MYDND-139, against the 25 public Disposable Heroes payloads: weapon
 * proficiency is resolved rather than assumed, a Versatile weapon has its
 * two-handed line, and an Eldritch Knight or Arcane Trickster has slots. The
 * live coverage the inventory weapons lacked was 93 weapons on 21 characters.
 * - **Nothing here writes HP.** The sheet reads hit points; changing them is
 *   MYDND-6's mutable state.
 */

const STAT_IDS = { STR: 1, DEX: 2, CON: 3, INT: 4, WIS: 5, CHA: 6 } as const
const STAT_ORDER = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const

const SCORE_SLUG: Record<number, string> = {
  1: 'strength-score',
  2: 'dexterity-score',
  3: 'constitution-score',
  4: 'intelligence-score',
  5: 'wisdom-score',
  6: 'charisma-score',
}

const SAVE_SLUG: Record<number, string> = {
  1: 'strength-saving-throws',
  2: 'dexterity-saving-throws',
  3: 'constitution-saving-throws',
  4: 'intelligence-saving-throws',
  5: 'wisdom-saving-throws',
  6: 'charisma-saving-throws',
}

const STAT_KEY: Record<number, string> = { 1: 'STR', 2: 'DEX', 3: 'CON', 4: 'INT', 5: 'WIS', 6: 'CHA' }

/** Ability modifier from a score. The one piece of D&D maths that never changes. */
export function abilityMod(score: number | null | undefined): number {
  return Math.floor(((score ?? 10) - 10) / 2)
}

/** `+3` / `-1` / `+0`, as a sheet prints a modifier. */
export function fmtMod(n: number): string {
  return n >= 0 ? `+${n}` : String(n)
}

const present = <T>(v: T | null | undefined): v is T => v != null

/**
 * Every modifier in force on the character, from whichever bucket.
 * `payload.modifiers` is an object of arrays keyed by source (race, class,
 * background, item, feat, condition), not a flat list — and its `item` bucket
 * includes items that are stowed or unattuned, which `activeModifiers` drops
 * (MYDND-53).
 */
function flattenModifiers(payload: DdbPayload): DdbModifier[] {
  const out: DdbModifier[] = activeModifiers(payload)
  const extra = payload?.bonusModifiers || payload?.customModifiers
  if (Array.isArray(extra)) out.push(...extra.filter(present))
  return out
}

function totalCharacterLevel(payload: DdbPayload): number {
  let n = typeof payload?.level === 'number' ? payload.level : 0
  if (n > 0) return n
  const classes = Array.isArray(payload?.classes) ? payload.classes : []
  for (const c of classes) n += typeof c?.level === 'number' ? c.level : 0
  return Math.max(n, 1)
}

function proficiencyBonus(payload: DdbPayload): number {
  const p = payload?.proficiencyBonus
  if (typeof p === 'number') return p
  return Math.ceil(Math.max(totalCharacterLevel(payload), 1) / 4) + 1
}

/**
 * An ability score with every source applied: the rolled/bought base, racial
 * and ASI bonuses, then item modifiers, then a player's manual override.
 *
 * A `set` modifier (Headband of Intellect, Belt of Giant Strength) takes the
 * *higher* of the two rather than overwriting — that is how the item reads, and
 * the test character leans on it: INT 10 on paper, 19 once the Headband applies.
 *
 * **It is a floor under every bonus, wherever it sits in the list** (MYDND-110).
 * Applied in list order, Fyrath's Belt of Fire Giant Strength set 25 over his
 * base 15, then his two feat bonuses added 3 on top: 28, where D&D Beyond shows
 * 25. So the bonuses are summed first.
 *
 * **A `stacking-bonus` is added after the floor.** Shade's Hammer of
 * Thunderbolts carries `stacking-bonus strength-score 4` ("increases by 4 and
 * can exceed 20") beside the same belt, and D&D Beyond shows 25 + 4 = 29. Read
 * in list order and without it, he also came to 29 — 25, then his feats' +4 —
 * which is why nothing caught the ordering before.
 */
export function getAbilityScore(payload: DdbPayload, statId: number): number {
  const stats = Array.isArray(payload?.stats) ? payload.stats : []
  const row = stats.find(s => s?.id === statId)
  let v = typeof row?.value === 'number' ? row.value : 10

  const bonusList = Array.isArray(payload?.bonusStats) ? payload.bonusStats : []
  const bonus = bonusList.find(s => s?.id === statId)
  if (bonus && typeof bonus.value === 'number') v += bonus.value

  const slug = SCORE_SLUG[statId]
  if (slug) {
    let floor = -Infinity
    let stacking = 0
    for (const m of flattenModifiers(payload)) {
      if (m.subType !== slug || typeof m.value !== 'number') continue
      const t = String(m.type ?? '').toLowerCase()
      if (t === 'bonus') v += m.value
      if (t === 'set') floor = Math.max(floor, m.value)
      if (t === 'stacking-bonus') stacking += m.value
    }
    v = Math.max(v, floor) + stacking
  }

  const overrides = Array.isArray(payload?.overrideStats) ? payload.overrideStats : []
  const ov = overrides.find(s => s?.id === statId)
  if (typeof ov?.value === 'number') return ov.value

  return Math.max(v, 0)
}

/** 0 = none, 1 = proficient, 2 = expertise, reading the modifier list for `slug`. */
function proficiencyLevel(mods: DdbModifier[], slug: string): number {
  let best = 0
  for (const m of mods) {
    if (m.subType !== slug) continue
    const t = String(m.type ?? '').toLowerCase()
    if (t === 'expertise') best = Math.max(best, 2)
    else if (t === 'proficiency' || t === 'half-proficiency') best = Math.max(best, 1)
  }
  return best
}

export function getSaves(payload: DdbPayload): SheetSave[] {
  const pb = proficiencyBonus(payload)
  const mods = flattenModifiers(payload)
  return STAT_ORDER.map(label => {
    const id = STAT_IDS[label]
    const mod = abilityMod(getAbilityScore(payload, id))
    const prof = proficiencyLevel(mods, SAVE_SLUG[id])
    const mult = prof === 2 ? 2 : prof === 1 ? 1 : 0
    return { label, proficient: mult > 0, total: mod + mult * pb }
  })
}

const SKILL_DEFS = [
  { name: 'Acrobatics', statId: 2, sub: 'acrobatics' },
  { name: 'Animal Handling', statId: 5, sub: 'animal-handling' },
  { name: 'Arcana', statId: 4, sub: 'arcana' },
  { name: 'Athletics', statId: 1, sub: 'athletics' },
  { name: 'Deception', statId: 6, sub: 'deception' },
  { name: 'History', statId: 4, sub: 'history' },
  { name: 'Insight', statId: 5, sub: 'insight' },
  { name: 'Intimidation', statId: 6, sub: 'intimidation' },
  { name: 'Investigation', statId: 4, sub: 'investigation' },
  { name: 'Medicine', statId: 5, sub: 'medicine' },
  { name: 'Nature', statId: 4, sub: 'nature' },
  { name: 'Perception', statId: 5, sub: 'perception' },
  { name: 'Performance', statId: 6, sub: 'performance' },
  { name: 'Persuasion', statId: 6, sub: 'persuasion' },
  { name: 'Religion', statId: 4, sub: 'religion' },
  { name: 'Sleight of Hand', statId: 2, sub: 'sleight-of-hand' },
  { name: 'Stealth', statId: 2, sub: 'stealth' },
  { name: 'Survival', statId: 5, sub: 'survival' },
] as const

export function getSkills(payload: DdbPayload): SheetSkill[] {
  const pb = proficiencyBonus(payload)
  const mods = flattenModifiers(payload)
  return SKILL_DEFS.map(({ name, statId, sub }) => {
    const ab = abilityMod(getAbilityScore(payload, statId))
    const prof = proficiencyLevel(mods, sub)
    const mult = prof === 2 ? 2 : prof === 1 ? 1 : 0
    return {
      name,
      ability: STAT_ORDER[statId - 1],
      proficient: mult > 0,
      expertise: prof === 2,
      total: ab + mult * pb,
    }
  })
}

export function getPassives(payload: DdbPayload): SheetPassives {
  const skills = getSkills(payload)
  const find = (n: string): number => skills.find(x => x.name === n)?.total ?? 0
  return {
    perception: 10 + find('Perception'),
    insight: 10 + find('Insight'),
    investigation: 10 + find('Investigation'),
  }
}

/**
 * `race.weightSpeeds.normal.walk` is where DDB actually puts a walking speed.
 * The four other shapes checked here are absent on every real payload seen so
 * far, which is why reading only `payload.speed` showed no speed at all. They
 * cost nothing and the schema is unofficial, so they stay.
 */
export function getSpeed(payload: DdbPayload): number | null {
  const candidates = [
    payload?.speed,
    payload?.movement?.walk,
    payload?.race?.movement?.walk,
    payload?.race?.weightSpeeds?.normal?.walk,
    payload?.calculatedStats?.walkSpeed,
  ]
  for (const c of candidates) if (typeof c === 'number' && c > 0) return c
  return null
}

/**
 * `bonus hit-points-per-level` modifiers, times the levels each one counts
 * (MYDND-106). Tough is +2 in the `feat` bucket, Dwarven Toughness +1 in
 * `race`, Draconic Resilience +1 in `class`, and DDB folds none of them into
 * `baseHitPoints` or `bonusHitPoints`.
 *
 * **A class feature's bonus scales with its own class's level, not the
 * character's.** Duchesse, Paladin 8 / Sorcerer 5, reads 131 on D&D Beyond:
 * Draconic Resilience adds 5, not 13. The modifier's `componentId` is the
 * feature's `definition.id` in that class row's `classFeatures`. A class
 * modifier no row owns, and every other bucket, counts the total level.
 *
 * Read through `modifierBuckets`, so a stowed item's bonus does not count.
 */
function hitPointsPerLevel(payload: DdbPayload): number {
  const total = totalCharacterLevel(payload)
  const classes = Array.isArray(payload?.classes) ? payload.classes : []
  const levelsFor = (bucket: string, m: DdbModifier): number => {
    if (bucket !== 'class' || typeof m.componentId !== 'number') return total
    const owner = classes.find(c => c?.classFeatures?.some(f => f?.definition?.id === m.componentId))
    return typeof owner?.level === 'number' && owner.level > 0 ? owner.level : total
  }

  let sum = 0
  for (const [bucket, list] of modifierBuckets(payload)) {
    for (const m of list) {
      if (m.type !== 'bonus' || m.subType !== 'hit-points-per-level' || typeof m.value !== 'number') continue
      sum += m.value * levelsFor(bucket, m)
    }
  }
  return sum
}

/**
 * **`baseHitPoints` is the hit-dice total and excludes Constitution.** DDB
 * stores the two apart and adds the modifier per level when it renders, so
 * reading `baseHitPoints` as the maximum under-reports every character by
 * `CON modifier × level` — 26 points on the level 13 test character. It
 * excludes the per-level bonuses too; see `hitPointsPerLevel`.
 *
 * `overrideHitPoints` is a maximum the player typed on DDB and already
 * includes everything, so Constitution must not be added on top of it. This
 * read `overriddenHitPoints` until MYDND-106, a field no payload carries, so
 * every hand-set maximum was ignored (3 of the 25 Disposable Heroes).
 */
export function deriveHp(payload: DdbPayload): { current: number; max: number; temp: number } {
  const removed = typeof payload?.removedHitPoints === 'number' ? payload.removedHitPoints : 0
  const temp = typeof payload?.temporaryHitPoints === 'number' ? payload.temporaryHitPoints : 0
  const overridden = typeof payload?.overrideHitPoints === 'number' ? payload.overrideHitPoints : null
  const base = typeof payload?.baseHitPoints === 'number' ? payload.baseHitPoints : 0
  const bonus = typeof payload?.bonusHitPoints === 'number' ? payload.bonusHitPoints : 0
  const fromCon = abilityMod(getAbilityScore(payload, STAT_IDS.CON)) * totalCharacterLevel(payload)

  let max: number
  if (overridden != null && overridden > 0) max = overridden
  else if (base + bonus > 0) max = base + bonus + fromCon + hitPointsPerLevel(payload)
  else max = 10

  const calc = payload?.calculatedStats?.hitPoints
  if (typeof calc === 'number' && calc > 0) max = calc

  return { current: Math.max(0, max - removed), max, temp }
}

/** Armour class, preferring anything DDB computed and falling back to the gear. */
export function deriveAc(payload: DdbPayload): number | null {
  const override = payload?.overrideArmorClass
  if (typeof override === 'number' && override > 0) return override

  const direct = payload?.armorClass
  if (typeof direct === 'number' && direct > 0) return direct

  const cs = payload?.calculatedStats
  if (cs) {
    const cac = cs.totalArmorClass ?? cs.armorClass
    if (typeof cac === 'number' && cac > 0) return cac
  }

  const inventory = Array.isArray(payload?.inventory) ? payload.inventory : []
  const dex = abilityMod(getAbilityScore(payload, STAT_IDS.DEX))
  const mods = flattenModifiers(payload)

  // armorTypeId: 1 = light, 2 = medium, 3 = heavy, 4 = shield. An item whose
  // armorTypeId is absent is neither, which is how every non-armour item in the
  // inventory falls out here.
  const worn: DdbItemDefinition[] = []
  const shields: DdbItemDefinition[] = []
  for (const item of inventory) {
    const def = item?.definition
    if (!item?.equipped || !def) continue
    const typeId = def.armorTypeId
    if (typeof typeId !== 'number') continue
    if (typeId >= 1 && typeId <= 3) worn.push(def)
    else if (typeId === 4) shields.push(def)
  }

  let ac = 10 + dex

  if (worn.length === 0) {
    // Unarmored Defense adds a second ability modifier (Barbarian CON, Monk WIS)
    // through an `unarmored-armor-class` modifier that names its stat.
    for (const m of mods) {
      if (String(m.subType ?? '').toLowerCase() === 'unarmored-armor-class' && typeof m.statId === 'number') {
        ac += abilityMod(getAbilityScore(payload, m.statId))
      }
    }
  } else {
    const armor = worn[worn.length - 1]
    const base = armor.armorClass ?? 0
    const typeId = armor.armorTypeId
    const dexBonus = typeId === 1 ? dex : typeId === 2 ? Math.min(dex, 2) : 0
    ac = base + dexBonus
  }

  for (const shield of shields) ac += shield.armorClass ?? 2

  for (const m of mods) {
    if (
      String(m.subType ?? '').toLowerCase() === 'armor-class' &&
      String(m.type ?? '').toLowerCase() === 'bonus' &&
      typeof m.value === 'number'
    ) {
      ac += m.value
    }
  }

  return ac > 0 ? ac : null
}

function abilityBlock(payload: DdbPayload): SheetAbility[] {
  return STAT_ORDER.map(label => {
    const score = getAbilityScore(payload, STAT_IDS[label])
    return { label, score, mod: abilityMod(score) }
  })
}

function getRace(payload: DdbPayload): string | null {
  const r = payload?.race
  return r?.fullName || r?.definition?.name || null
}

interface DerivedClass {
  name: string
  subclass: string | null
  level: number
  hitDie: number | null
}

function getClasses(payload: DdbPayload): DerivedClass[] {
  const classes = Array.isArray(payload?.classes) ? payload.classes : []
  return classes
    .filter(present)
    .filter((c: DdbClass) => (c.level ?? 0) > 0)
    .map((c: DdbClass) => ({
      name: c.definition?.name || c.name || 'Class',
      subclass: c.subclassDefinition?.name || null,
      level: c.level as number,
      hitDie: c.definition?.hitDice ?? null,
    }))
}

/**
 * Whether a class casts through its subclass: an Eldritch Knight or Arcane
 * Trickster. The class row says no and the subclass says yes; see
 * `slotMapForDdbClasses` for the measurement.
 */
function subclassCasts(cls: DdbClass | null | undefined): boolean {
  return cls?.definition?.canCastSpells !== true && cls?.subclassDefinition?.canCastSpells === true
}

/** The classes as the slot rules want them, a third caster flagged. */
function slotClasses(payload: DdbPayload): { name: string; level: number; subclassCasts: boolean }[] {
  return (Array.isArray(payload?.classes) ? payload.classes : [])
    .filter(present)
    .filter((c: DdbClass) => (c.level ?? 0) > 0)
    .map((c: DdbClass) => ({
      name: c.definition?.name || c.name || 'Class',
      level: c.level as number,
      subclassCasts: subclassCasts(c),
    }))
}

function formatClasses(payload: DdbPayload): string {
  return (
    getClasses(payload)
      .map(c => (c.subclass ? `${c.name} (${c.subclass}) ${c.level}` : `${c.name} ${c.level}`))
      .join(' / ') || '—'
  )
}

const SPELLCASTING_STAT_ID: Record<string, number> = {
  wizard: 4,
  artificer: 4,
  cleric: 5,
  druid: 5,
  ranger: 5,
  bard: 6,
  sorcerer: 6,
  warlock: 6,
  paladin: 6,
}

/**
 * Spell attack bonus and save DC, from the first spellcasting class found.
 * A multiclassed caster has one DC per class in the rules; this reports the
 * first, which is the common case and is visibly labelled with its ability.
 *
 * **Plus the bonuses items grant** (MYDND-53). A Wand of the War Mage is a
 * `bonus spell-attacks`; a Rhythm-Maker's Drum names its class, `bonus
 * bard-spell-attacks` and `bard-spell-save-dc`, and applies to that class's
 * spells only. Both measured on Gabriela's payload, 2026-10-14. The bare
 * `spell-save-dc` is the same shape for the DC.
 */
export function buildSpellcasting(payload: DdbPayload): SheetSpellcasting | null {
  const classes = Array.isArray(payload?.classes) ? payload.classes : []
  // A class that casts in its own right comes first, and a third caster only
  // after (MYDND-139): Brammand is an Eldritch Knight 6 listed before his
  // Cleric 10, and his Cleric's DC is the one he casts with.
  const order = [
    ...classes.map(cls => ({ cls, third: false })),
    ...classes.filter(subclassCasts).map(cls => ({ cls, third: true })),
  ]
  for (const { cls, third } of order) {
    const name = String(cls?.definition?.name || cls?.name || '').toLowerCase()
    // A third caster's ability is its subclass's: Intelligence for both
    // Eldritch Knights measured.
    const statId = third ? cls?.subclassDefinition?.spellCastingAbilityId : SPELLCASTING_STAT_ID[name]
    if (!statId || !STAT_KEY[statId]) continue
    const mod = abilityMod(getAbilityScore(payload, statId))
    const pb = proficiencyBonus(payload)
    let attack = pb + mod
    let dc = 8 + pb + mod
    for (const m of flattenModifiers(payload)) {
      if (String(m.type ?? '').toLowerCase() !== 'bonus' || typeof m.value !== 'number') continue
      const sub = String(m.subType ?? '').toLowerCase()
      if (sub === 'spell-attacks' || sub === `${name}-spell-attacks`) attack += m.value
      if (sub === 'spell-save-dc' || sub === `${name}-spell-save-dc`) dc += m.value
    }
    return { ability: STAT_KEY[statId], mod, attack, dc }
  }
  return null
}

/** Initiative is DEX plus anything that names `initiative` as a bonus. */
function buildInitiative(payload: DdbPayload): number {
  let n = abilityMod(getAbilityScore(payload, STAT_IDS.DEX))
  for (const m of flattenModifiers(payload)) {
    if (
      String(m.subType ?? '').toLowerCase() === 'initiative' &&
      String(m.type ?? '').toLowerCase() === 'bonus' &&
      typeof m.value === 'number'
    ) {
      n += m.value
    }
  }
  return n
}

/**
 * A weapon's `+N`, from the item's own granted modifiers. A `+1 Longsword`
 * carries it as a `bonus`/`magic` modifier rather than in its name.
 */
function weaponMagicBonus(def: DdbItemDefinition | null | undefined): number {
  let n = 0
  for (const m of def?.grantedModifiers || []) {
    if (!m) continue
    if (
      String(m.type ?? '').toLowerCase() === 'bonus' &&
      String(m.subType ?? '').toLowerCase() === 'magic' &&
      typeof m.value === 'number'
    ) {
      n += m.value
    }
  }
  return n
}

/**
 * Whether an inventory row is a weapon. `filterType === 'Weapon'` is the clean
 * signal, but magic weapons sometimes arrive filed as something else, so a
 * damage dice plus an attack type counts too. Every item in a payload *has*
 * these keys — they are null on non-weapons, which is why this tests values.
 */
function isWeapon(def: DdbItemDefinition | null | undefined): boolean {
  if (!def) return false
  if (def.filterType === 'Weapon') return true
  return !!(def.damage && def.damage.diceString && def.attackType)
}

/** `'Crossbow, Hand'` → `'crossbow-hand'`, the spelling a proficiency modifier uses. */
const weaponSlug = (s: string | null | undefined): string =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/**
 * Whether the character is proficient with a weapon (MYDND-139).
 *
 * Resolved the way D&D Beyond states it: `categoryId` 1 is simple and 2 is
 * martial, and a `proficiency` modifier names either the category
 * (`simple-weapons`, `martial-weapons`) or the weapon's type (`longsword`,
 * `crossbow-hand`). Measured 2026-11-02 on the 25 public Disposable Heroes
 * payloads, 93 weapons: every one carries a `categoryId` and a `type`.
 *
 * **Assumed where the payload cannot say**: no proficiency modifier at all (only
 * a synthetic or broken payload), or a weapon with neither field. Before this,
 * proficiency was assumed for every weapon.
 */
function weaponProficient(def: DdbItemDefinition, proficiencies: ReadonlySet<string>): boolean {
  if (proficiencies.size === 0) return true
  if (def.categoryId == null && !def.type) return true
  if (def.categoryId === 1 && proficiencies.has('simple-weapons')) return true
  if (def.categoryId === 2 && proficiencies.has('martial-weapons')) return true
  return proficiencies.has(weaponSlug(def.type))
}

/**
 * Weapon attacks as rollable lines.
 *
 * Proficiency is resolved against the payload's proficiency modifiers
 * (`weaponProficient`), and a Versatile weapon gets a second line for two hands,
 * as a Vault weapon does (`content/sheetProjection.ts`). Both MYDND-139, which
 * checked them against the armed characters in the 25 public Disposable Heroes
 * payloads; until then this ran only against hand-built items. An attack that
 * looks wrong is editable in the fence.
 */
export function buildAttacks(payload: DdbPayload): SheetAttack[] {
  const pb = proficiencyBonus(payload)
  const str = abilityMod(getAbilityScore(payload, STAT_IDS.STR))
  const dex = abilityMod(getAbilityScore(payload, STAT_IDS.DEX))
  const proficiencies = new Set(
    flattenModifiers(payload)
      .filter(m => String(m.type ?? '').toLowerCase() === 'proficiency')
      .map(m => String(m.subType ?? '').toLowerCase()),
  )
  const out: SheetAttack[] = []

  for (const item of Array.isArray(payload?.inventory) ? payload.inventory : []) {
    const def = item?.definition
    if (!isWeapon(def) || !def) continue

    const props = (def.properties || []).map(p => String(p?.name || '').toLowerCase())
    const ranged = def.attackType === 2
    const finesse = props.includes('finesse')
    // Finesse takes the better of the two; a ranged weapon takes Dexterity.
    const ability = ranged ? dex : finesse ? Math.max(str, dex) : str
    const magic = weaponMagicBonus(def)

    const dice = def.damage?.diceString || null
    const damageMod = ability + magic
    const line: SheetAttack = {
      name: def.name || 'Weapon',
      source: 'item',
      equipped: !!item?.equipped,
      range: ranged ? 'ranged' : 'melee',
      attack: ability + (weaponProficient(def, proficiencies) ? pb : 0) + magic,
      damage: dice ? `${dice}${damageMod ? fmtMod(damageMod) : ''}` : null,
      damageType: def.damageType || null,
      properties: (def.properties || []).map(p => p?.name || '').filter(Boolean),
    }
    out.push(line)

    // The two-handed dice, only when they are dice: `notes` is free text.
    const twoHanded = (def.properties || []).find(p => String(p?.name || '').toLowerCase() === 'versatile')?.notes?.trim()
    if (twoHanded && /^\d+d\d+$/i.test(twoHanded)) {
      out.push({ ...line, name: `${line.name} (two-handed)`, damage: `${twoHanded}${damageMod ? fmtMod(damageMod) : ''}` })
    }
  }

  // Equipped first, then alphabetical — the ones in hand are the ones rolled.
  out.sort((a, b) => Number(b.equipped) - Number(a.equipped) || a.name.localeCompare(b.name))
  return out
}

/**
 * DDB's `activation.activationType`, for the three values confirmed against the
 * rules on a real payload: Psychic Blades' main attack and Psionic Power are
 * `1`, Cunning Action / Nimble Escape / the off-hand blade are `3`, Uncanny
 * Dodge is `4`. The rest (`2` and `8`, seen on Sneak Attack, its Cunning Strike
 * riders and Fury of the Small) are deliberately *not* guessed — an unlabelled
 * action beats one labelled wrongly.
 */
const ACTIVATION_LABELS: Record<number, string> = { 1: 'action', 3: 'bonus action', 4: 'reaction' }

/** Every entry of `payload.actions`, whichever bucket it sits in. */
function flattenActions(payload: DdbPayload): DdbAction[] {
  const out: DdbAction[] = []
  const actions = payload?.actions
  if (actions && typeof actions === 'object') {
    for (const bucket of Object.values(actions)) {
      if (Array.isArray(bucket)) out.push(...bucket.filter(present))
    }
  }
  if (Array.isArray(payload?.customActions)) out.push(...payload.customActions.filter(present))
  return out
}

/**
 * Whether an action is something you roll to hit with.
 *
 * **Not `displayAsAttack`.** That flag is true on Sneak Attack and on all three
 * Psionic Power entries, none of which involve an attack roll — trusting it puts
 * damage-only features in the attack list with a nonsense to-hit. A real attack
 * states both a range *and* the ability it is made with.
 */
function isActionAttack(action: DdbAction | null | undefined): boolean {
  return !!(action && action.attackTypeRange != null && typeof action.abilityModifierStatId === 'number')
}

/**
 * Attacks granted by a class, species or feat feature rather than by an item —
 * a Soulknife's Psychic Blades, a Monk's unarmed strike. Without this, a
 * character who owns no weapon appears to have no way to attack, which is wrong
 * for both characters tested.
 *
 * Proficiency here is **stated** (`isProficient`) rather than assumed as it must
 * be for inventory weapons, and `fixedToHit` overrides the sum when DDB has one.
 */
export function buildActionAttacks(payload: DdbPayload): SheetAttack[] {
  const pb = proficiencyBonus(payload)
  const out: SheetAttack[] = []

  for (const action of flattenActions(payload)) {
    if (!isActionAttack(action)) continue

    const ability = abilityMod(getAbilityScore(payload, action.abilityModifierStatId as number))
    const attack =
      typeof action.fixedToHit === 'number' ? action.fixedToHit : ability + (action.isProficient ? pb : 0)

    const dice = action.dice || {}
    const flat = ability + (typeof dice.fixedValue === 'number' ? dice.fixedValue : 0)
    const activationType = action.activation?.activationType
    const reach = typeof action.range?.range === 'number' ? action.range.range : null

    out.push({
      name: action.name || 'Attack',
      source: 'feature',
      equipped: true,
      activation: (typeof activationType === 'number' ? ACTIVATION_LABELS[activationType] : null) || null,
      range: reach ? `${reach} ft` : null,
      attack,
      damage: dice.diceString ? `${dice.diceString}${flat ? fmtMod(flat) : ''}` : null,
      // Only a `damageTypeId` is given and the payload carries no lookup for it,
      // so the type is omitted rather than guessed from the number.
      damageType: null,
      properties: [],
    })
  }
  return out
}

/**
 * Features whose dice you roll without rolling to hit — Sneak Attack's 7d6, a
 * Psionic Energy die. Worth their own click: a rogue rolls sneak attack most
 * turns, and it is the biggest handful of dice on the sheet.
 */
export function buildFeatureDice(payload: DdbPayload): SheetFeatureDie[] {
  const seen = new Set<string>()
  const out: SheetFeatureDie[] = []

  for (const action of flattenActions(payload)) {
    if (isActionAttack(action)) continue
    const dice = action.dice || {}
    if (!dice.diceString) continue

    const name = action.name || 'Feature'
    const key = `${name}|${dice.diceString}`
    if (seen.has(key)) continue
    seen.add(key)

    const activationType = action.activation?.activationType
    out.push({
      name,
      formula: dice.diceString,
      activation: (typeof activationType === 'number' ? ACTIVATION_LABELS[activationType] : null) || null,
    })
  }
  return out
}

/**
 * A resource's key in `feature_uses_used`: `Bardic Inspiration` →
 * `bardic_inspiration`, the spelling `@vault/derive`'s pools use, so a Vault
 * character and a D&D Beyond one address the same counter.
 */
export function resourceKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

const RESET_TYPES: Record<number, SheetResource['resets']> = { 1: 'short_rest', 2: 'long_rest' }

/**
 * Everything with uses — Bardic Inspiration, Luck Points, Psychic Veil, Fury of
 * the Small (MYDND-47). Read from each action's `limitedUse`; see `DdbAction`
 * for why `maxUses` alone is not the count.
 *
 * **One row per name.** D&D Beyond lists Bardic Inspiration twice on a level-13
 * Bard — the base feature resetting on a long rest and Font of Inspiration's
 * short-rest version — and the character has one pool, the better one. So the
 * more uses wins, and then the shorter rest. A use count that works out to zero
 * (a modifier of +0) is the rules' minimum of one, as the web sheet has it.
 */
export function buildClassResources(payload: DdbPayload): SheetResource[] {
  const pb = proficiencyBonus(payload)
  const byKey = new Map<string, SheetResource>()

  for (const action of flattenActions(payload)) {
    const lu = action.limitedUse
    const name = (action.name ?? '').trim()
    if (!lu || !name) continue

    const fixed = Math.max(0, Number(lu.maxUses) || 0)
    let uses = fixed
    if (typeof lu.statModifierUsesId === 'number' && lu.statModifierUsesId >= 1 && lu.statModifierUsesId <= 6) {
      uses += abilityMod(getAbilityScore(payload, lu.statModifierUsesId))
    }
    if (lu.useProficiencyBonus) uses = lu.proficiencyBonusOperator === 2 ? Math.max(1, fixed) * pb : uses + pb
    // A stat-based pool is at least one use; a pool D&D Beyond states as zero
    // with nothing to add is a feature that is not limited after all.
    if (typeof lu.statModifierUsesId === 'number') uses = Math.max(1, uses)
    if (uses <= 0) continue

    const key = resourceKey(name)
    const resets = RESET_TYPES[Number(lu.resetType)] ?? null
    const roll = action.dice?.diceString || null
    const candidate: SheetResource = { key, name, uses, resets, roll }
    const current = byKey.get(key)
    const better =
      !current ||
      candidate.uses > current.uses ||
      (candidate.uses === current.uses && resets === 'short_rest' && current.resets !== 'short_rest')
    if (better) byKey.set(key, { ...candidate, roll: candidate.roll ?? current?.roll ?? null })
  }
  return [...byKey.values()]
}

/** Known spells by level, merged across every source DDB lists them under. */
export function buildSpells(payload: DdbPayload): SheetSpellLevel[] {
  const seen = new Set<string>()
  const byLevel = new Map<number, string[]>()

  const push = (entry: { definition?: { name?: string | null; level?: number | null } | null } | null): void => {
    const def = entry?.definition
    if (!def || typeof def.name !== 'string') return
    const key = def.name.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    const level = typeof def.level === 'number' ? def.level : 0
    if (!byLevel.has(level)) byLevel.set(level, [])
    byLevel.get(level)?.push(def.name)
  }

  for (const cs of Array.isArray(payload?.classSpells) ? payload.classSpells : []) {
    for (const s of cs?.spells || []) push(s)
  }
  const sources = payload?.spells || {}
  for (const bucket of ['race', 'class', 'background', 'item', 'feat']) {
    for (const s of sources[bucket] || []) push(s)
  }

  return [...byLevel.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([level, names]) => ({ level, spells: names.sort((a, b) => a.localeCompare(b)) }))
}

/**
 * The names of the feats the character has taken.
 *
 * **Names only, and deliberately so** (MYDND-15). What a feat *does* is in its
 * note's ` ```vault-feat ` fence, which `resolveFeatEffects` reads; duplicating
 * any of it here would be a second copy of a feat's rules that could disagree
 * with the catalog. See `DdbFeat` for why an ASI must not be read off this.
 *
 * Deduplicated case-insensitively and sorted, because the fence is rewritten on
 * every re-sync and a list whose order moved would show as a diff in a note the
 * player is watching. DDB has been observed to repeat an entry across its own
 * buckets, so the dedupe is not hypothetical. The reader is `ddbDerive`'s
 * `getFeats` since MYDND-140, moved upstream so there is one copy.
 */
export function buildFeats(payload: DdbPayload): string[] {
  return getFeats(payload)
}

/** Remaining hit dice per class, as `13d8`: `ddbDerive`'s `getHitDice` since MYDND-140. */
function buildHitDice(payload: DdbPayload): SheetHitDie[] {
  return getHitDice(payload)
}

/**
 * The inventory D&D Beyond reports, as the read-only list `Sheet.ddb_items`
 * carries (MYDND-37). The-vault's `ItemsPanel` `deriveItems`, minus the
 * character name and the link — one character per sheet, and nothing here
 * links out to D&D Beyond.
 *
 * Two departures, both measured on a real payload rather than guessed:
 *
 * - **A quantity of 0 is dropped.** D&D Beyond keeps a drunk potion as a
 *   zero-quantity row until someone deletes it; the web app showed it as
 *   `0 ×`, which reads as a bug rather than as "used".
 * - **`rarity` is null on mundane gear.** D&D Beyond says `Common` on a
 *   backpack, and a Common badge on every rope and bedroll buries the one
 *   common *magic* item among them. `magic` is the honest signal.
 */
export function buildDdbItems(payload: DdbPayload): SheetItem[] {
  const out: SheetItem[] = []
  for (const item of Array.isArray(payload?.inventory) ? payload.inventory : []) {
    const def = item?.definition
    const name = typeof def?.name === 'string' ? def.name.trim() : ''
    if (!name) continue
    const quantity = typeof item?.quantity === 'number' ? item.quantity : 1
    if (quantity <= 0) continue
    const magic = def?.magic === true
    out.push({
      name,
      quantity,
      type: def?.type || def?.filterType || null,
      rarity: magic && def?.rarity ? def.rarity.toLowerCase() : null,
      magic,
      equipped: item?.equipped === true,
      attuned: item?.isAttuned === true,
    })
  }
  return out
}

/** The D&D Beyond purse, every denomination floored at 0: `ddbDerive`'s `getCurrency` since MYDND-140. */
export function buildDdbCurrency(payload: DdbPayload): SheetCurrency {
  return getCurrency(payload)
}

/**
 * The payload, reduced to the one object everything downstream reads.
 *
 * `ddbId` is passed in rather than read from the payload: it is the id the user
 * asked for, it is what goes into the note's frontmatter as identity, and a
 * payload that disagreed with it would be the more suspicious of the two.
 */
export function buildSheet(payload: DdbPayload, ddbId: string | number): Sheet {
  const hp = deriveHp(payload)
  const classes = getClasses(payload)
  return {
    version: SHEET_VERSION,
    name: payload?.name || 'Unknown',
    ddb_id: String(ddbId),
    race: getRace(payload),
    classes: formatClasses(payload),
    level: totalCharacterLevel(payload),
    proficiency_bonus: proficiencyBonus(payload),
    ac: deriveAc(payload),
    hp: { current: hp.current, max: hp.max, temp: hp.temp },
    speed: getSpeed(payload),
    initiative: buildInitiative(payload),
    hit_dice: buildHitDice(payload),
    abilities: abilityBlock(payload),
    saves: getSaves(payload),
    skills: getSkills(payload),
    passives: getPassives(payload),
    spellcasting: buildSpellcasting(payload),
    // Items first, then feature attacks — a weapon in hand is what a player
    // looks for, and a Soulknife has only the feature ones.
    attacks: [...buildAttacks(payload), ...buildActionAttacks(payload)],
    feature_dice: buildFeatureDice(payload),
    class_resources: buildClassResources(payload),
    defenses: buildDefenses(payload),
    senses: buildSenses(payload),
    speeds: buildSpeeds(payload, getSpeed(payload)),
    proficiencies: buildProficiencies(payload),
    spells: buildSpells(payload),
    avatar: payload?.decorations?.avatarUrl || null,
    subclasses: classes.map(c => c.subclass).filter(present),
    feats: buildFeats(payload),
    feature_picks: buildFeaturePicks(payload),
    spell_slots: slotMapForDdbClasses(slotClasses(payload)),
    short_rest_slot_ranks: pactOnlyRanksForClassNames(classes),
    ddb_items: buildDdbItems(payload),
    ddb_currency: buildDdbCurrency(payload),
  }
}
