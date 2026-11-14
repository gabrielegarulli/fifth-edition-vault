import { combinedSlotMax, combinedSlotMaxFor } from '@vault/derive/casterProgression.js'
import { pactOnlySlotRanks } from '@vault/derive/shortRest.js'

import type { Sheet } from '../sheet/sheet'
import { isLocalId } from '../localId'

/**
 * Spell slots: how many a sheet has, and which ones a rest gives back
 * (MYDND-36).
 *
 * The slot *arithmetic* is `@vault/derive`'s `casterProgression.js` — the same
 * tables and the same multiclass rule the web Spell Panel reads. This file only
 * decides which input to hand it, because the two kinds of character know
 * different things about their classes:
 *
 * - **A Vault character** knows each class's `casterProgression` from its class
 *   note, which is authoritative and may belong to a homebrew class this module
 *   has never heard of. The projection asks `combinedSlotMaxFor` and writes the
 *   answer into the charsheet fence as `spell_slots`.
 * - **A D&D Beyond character** knows only class names. `combinedSlotMax` maps the
 *   standard ones to a progression, which is what the web app's DDB panel does
 *   too — D&D Beyond's own `spellSlots.available` reads 0 and is not trusted
 *   (see `src/characterModel/model/ddb/derive/`).
 */

export const MAX_RANK = 9

/** One class as the slot rules need it. `progression` is `'1'`, `'1/2'`, `'pact'`, … */
export interface CasterEntry {
  name: string
  level: number
  progression: string | null
}

const count = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

/** `{1: 4, 2: 3}` → `[4, 3, 0, 0, 0, 0, 0, 0, 0]`. Keys may be numbers or strings, as YAML gives them. */
function toRankArray(map: unknown): number[] {
  const raw = map && typeof map === 'object' && !Array.isArray(map) ? (map as Record<string, unknown>) : {}
  return Array.from({ length: MAX_RANK }, (_, i) => count(raw[String(i + 1)]))
}

/** `[4, 3, 0, …]` → `{1: 4, 2: 3}`, the shape written into a fence. */
function toRankMap(max: readonly number[]): Record<string, number> {
  const out: Record<string, number> = {}
  max.forEach((n, i) => {
    if (n > 0) out[String(i + 1)] = n
  })
  return out
}

/** Slot maxima from explicit progressions — a Vault character's class notes. */
export function slotMapFor(entries: readonly CasterEntry[]): Record<string, number> {
  return toRankMap(toRankArray(combinedSlotMaxFor(entries)))
}

/**
 * The ranks a short rest restores, from explicit progressions.
 *
 * `pactOnlySlotRanks` answers this from class *names*, which a homebrew pact
 * caster would fail. The rule is the same: every rank when Pact Magic is the
 * only source of slots, and none otherwise, because spent slots are counted per
 * rank and a mixed caster's spent pact slots cannot be told from the others.
 */
export function pactOnlyRanksFor(entries: readonly CasterEntry[]): number[] {
  const live = entries.filter(e => e.level > 0 && e.progression)
  if (!live.some(e => e.progression === 'pact')) return []
  const others = live.filter(e => e.progression !== 'pact')
  if (Object.keys(combinedSlotMaxFor(others)).length > 0) return []
  return Object.keys(slotMapFor(live)).map(Number)
}

/**
 * The classes a sheet names, read off its hit dice — `{label: 'Wizard',
 * formula: '5d6'}` is a Wizard 5.
 *
 * Both projections write one hit-dice line per class, labelled with the class
 * name, so this is the one place on a sheet that states class *and* level as
 * data rather than as the display string in `classes`.
 */
export function classesOfSheet(sheet: Sheet): { name: string; level: number }[] {
  const lines = Array.isArray(sheet.hit_dice) ? sheet.hit_dice : []
  return lines.flatMap(line => {
    const m = /^\s*(\d+)\s*d\s*\d+\s*$/i.exec(String(line?.formula ?? ''))
    const name = String(line?.label ?? '').trim()
    return m && name ? [{ name, level: parseInt(m[1], 10) }] : []
  })
}

/** Slot maxima for a D&D Beyond payload's classes, for the projection to write. */
export function slotMapForClassNames(classes: readonly { name: string; level: number }[]): Record<string, number> {
  return toRankMap(toRankArray(combinedSlotMax(classes)))
}

/**
 * `combinedSlotMax`'s own map from a D&D Beyond class name to its progression,
 * which `casterProgression.js` does not export. Needed only to hand
 * `combinedSlotMaxFor` a third caster beside them; `slots.test.ts` checks it
 * against `combinedSlotMax` at every level, so the two cannot drift apart.
 */
export const DDB_CLASS_PROGRESSION: Readonly<Record<string, string>> = {
  wizard: '1',
  cleric: '1',
  druid: '1',
  bard: '1',
  sorcerer: '1',
  paladin: '1/2',
  ranger: '1/2',
  artificer: '1/2',
  warlock: 'pact',
}

/**
 * Slot maxima for a D&D Beyond payload, **third casters included** (MYDND-139).
 *
 * `casterProgression.js` leaves the Eldritch Knight and the Arcane Trickster
 * out because they cannot be told from a class name. They can be told from the
 * payload: the class row says `canCastSpells: false` and its subclass says
 * `true`. Measured 2026-11-02 on the 25 public Disposable Heroes payloads: both
 * Eldritch Knights (Zamar, a Fighter 16, and Brammand, EK 6 / Cleric 10) carry
 * it, and Gibbs, a Soulknife, does not, although his Rogue row's spell rules
 * carry the Arcane Trickster's divisor of 3. So the subclass flag is the
 * signal, and the divisor is not.
 */
export function slotMapForDdbClasses(
  classes: readonly { name: string; level: number; subclassCasts?: boolean }[],
): Record<string, number> {
  if (!classes.some(c => c.subclassCasts)) return slotMapForClassNames(classes)
  return slotMapFor(
    classes.map(c => ({
      name: c.name,
      level: c.level,
      progression: c.subclassCasts ? '1/3' : (DDB_CLASS_PROGRESSION[c.name.toLowerCase()] ?? null),
    })),
  )
}

export function pactOnlyRanksForClassNames(classes: readonly { name: string; level: number }[]): number[] {
  return (pactOnlySlotRanks(classes)).slice().sort((a, b) => a - b)
}

export interface SlotTable {
  /** Index `rank - 1`. Always nine long. */
  max: number[]
  /**
   * `'sheet'` when the fence states it; `'classes'` when a D&D Beyond note
   * projected before MYDND-36 had it worked out from its hit dice on read.
   */
  from: 'sheet' | 'classes'
}

/**
 * A sheet's slot maxima, or `null` when they cannot be known without a rebuild.
 *
 * **A Vault character without `spell_slots` gets `null`, not a guess.** Its
 * classes may be homebrew, which the name map does not know, and a wrong slot
 * count at the table is worse than a prompt to rebuild. A D&D Beyond note gets
 * the very answer its next re-sync would write, so there is nothing to wait for.
 */
export function slotTable(sheet: Sheet): SlotTable | null {
  const raw = sheet.spell_slots
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return { max: toRankArray(raw), from: 'sheet' }
  if (isLocalId(sheet.ddb_id)) return null
  return { max: toRankArray(combinedSlotMax(classesOfSheet(sheet))), from: 'classes' }
}

/** The highest rank with a slot, or 0. */
export function highestRank(max: readonly number[]): number {
  for (let i = max.length - 1; i >= 0; i -= 1) if (max[i] > 0) return i + 1
  return 0
}

/** What a short rest gives back — handed to `vitals.shortRest`. */
export interface ShortRestPlan {
  slotRanks: number[]
  useKeys: string[]
  /** Uses handed back on a long-rest pool — Rage's one (MYDND-47). */
  regain: Record<string, number>
}

/**
 * The short-rest half of `@vault/derive`'s `shortRestPlan`, for what this plugin
 * tracks: pact slots, and free casts that recover on a short rest.
 */
export function shortRestPlan(sheet: Sheet | null | undefined): ShortRestPlan {
  if (!sheet) return { slotRanks: [], useKeys: [], regain: {} }
  const stated = sheet.short_rest_slot_ranks
  const slotRanks = Array.isArray(stated)
    ? stated.map(count).filter(n => n >= 1 && n <= MAX_RANK)
    : isLocalId(sheet.ddb_id)
      ? []
      : pactOnlyRanksForClassNames(classesOfSheet(sheet))
  const useKeys = (Array.isArray(sheet.free_cast_spells) ? sheet.free_cast_spells : [])
    .filter(f => f?.resets === 'short_rest' && typeof f.key === 'string')
    .map(f => f.key)
  // Class resources (MYDND-47): a short-rest pool comes back whole; a long-rest
  // pool may hand back a few — `@vault/derive`'s `shortRestPlan` rule.
  const resources = Array.isArray(sheet.class_resources) ? sheet.class_resources : []
  const regain: Record<string, number> = {}
  for (const r of resources) {
    if (typeof r?.key !== 'string') continue
    if (r.resets === 'short_rest') useKeys.push(r.key)
    else if ((r.short_rest_regain ?? 0) > 0) regain[r.key] = r.short_rest_regain as number
  }
  return { slotRanks, useKeys, regain }
}
