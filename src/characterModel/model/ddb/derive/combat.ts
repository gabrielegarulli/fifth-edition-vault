import { getHitDice } from '@vault/derive/ddbDerive.js'

import type { DdbItemDefinition, DdbModifier, DdbPayload } from '../payload'
import type { SheetHitDie } from '../../sheet/sheet'
import { modifierBuckets } from '../modifiers'

import { abilityMod } from '../../sheet/abilityMod'
import { STAT_IDS, flattenModifiers, totalCharacterLevel, getAbilityScore } from './shared'

// Speed, hit points, armour class, initiative and hit dice.
// One file of the D&D Beyond derivation (MYDND-197); index.ts says what it is and why it is kept.

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

/** Initiative is DEX plus anything that names `initiative` as a bonus. */
export function buildInitiative(payload: DdbPayload): number {
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

/** Remaining hit dice per class, as `13d8`: `ddbDerive`'s `getHitDice` since MYDND-140. */
export function buildHitDice(payload: DdbPayload): SheetHitDie[] {
  return getHitDice(payload)
}
