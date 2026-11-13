import type { DdbAction, DdbModifier, DdbPayload } from '../payload'
import { activeModifiers } from '../modifiers'

// What every part of the derivation reads: the stat ids, the flattened modifiers and actions, level, proficiency, a score.
// One file of the D&D Beyond derivation (MYDND-197); index.ts says what it is and why it is kept.

export const STAT_IDS = { STR: 1, DEX: 2, CON: 3, INT: 4, WIS: 5, CHA: 6 } as const

export const STAT_ORDER = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const

const SCORE_SLUG: Record<number, string> = {
  1: 'strength-score',
  2: 'dexterity-score',
  3: 'constitution-score',
  4: 'intelligence-score',
  5: 'wisdom-score',
  6: 'charisma-score',
}

export const SAVE_SLUG: Record<number, string> = {
  1: 'strength-saving-throws',
  2: 'dexterity-saving-throws',
  3: 'constitution-saving-throws',
  4: 'intelligence-saving-throws',
  5: 'wisdom-saving-throws',
  6: 'charisma-saving-throws',
}

export const STAT_KEY: Record<number, string> = { 1: 'STR', 2: 'DEX', 3: 'CON', 4: 'INT', 5: 'WIS', 6: 'CHA' }

export const present = <T>(v: T | null | undefined): v is T => v != null

/**
 * Every modifier in force on the character, from whichever bucket.
 * `payload.modifiers` is an object of arrays keyed by source (race, class,
 * background, item, feat, condition), not a flat list — and its `item` bucket
 * includes items that are stowed or unattuned, which `activeModifiers` drops
 * (MYDND-53).
 */
export function flattenModifiers(payload: DdbPayload): DdbModifier[] {
  const out: DdbModifier[] = activeModifiers(payload)
  const extra = payload?.bonusModifiers || payload?.customModifiers
  if (Array.isArray(extra)) out.push(...extra.filter(present))
  return out
}

export function totalCharacterLevel(payload: DdbPayload): number {
  let n = typeof payload?.level === 'number' ? payload.level : 0
  if (n > 0) return n
  const classes = Array.isArray(payload?.classes) ? payload.classes : []
  for (const c of classes) n += typeof c?.level === 'number' ? c.level : 0
  return Math.max(n, 1)
}

export function proficiencyBonus(payload: DdbPayload): number {
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
export function proficiencyLevel(mods: DdbModifier[], slug: string): number {
  let best = 0
  for (const m of mods) {
    if (m.subType !== slug) continue
    const t = String(m.type ?? '').toLowerCase()
    if (t === 'expertise') best = Math.max(best, 2)
    else if (t === 'proficiency' || t === 'half-proficiency') best = Math.max(best, 1)
  }
  return best
}

/** Every entry of `payload.actions`, whichever bucket it sits in. */
export function flattenActions(payload: DdbPayload): DdbAction[] {
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
