import { getDamageDefenses, getProficiencies, getSpeeds } from '@vault/derive/ddbDerive.js'

import { modifierBuckets } from './modifiers'
import type { DdbPayload } from './payload'
import type { SheetDefense, SheetProficiencies, SheetSense } from '../sheet/sheet'

/**
 * The Defences tab's facts from a D&D Beyond payload (MYDND-48): resistances
 * and immunities, senses, movement modes, proficiencies and languages.
 *
 * All five live in `payload.modifiers`, bucketed by where they came from
 * (`race`, `class`, `background`, `item`, `feat`). Measured on Gabriela's and
 * Gibbs's payloads, 2026-10-14:
 *
 * - **Senses** arrive two ways: `set-base darkvision 60` from a species, and
 *   `sense darkvision 60` from an item — beside a `set-base darkvision 1` that is
 *   a flag, not a range. So the largest value over 1 wins.
 * - **Proficiencies** are one `proficiency` type for everything: skills, saving
 *   throws, armour, weapons, tools and instruments. Skills and saves are the
 *   sheet's already, `choose-a-…` is an unmade choice, and the rest is sorted by
 *   its slug — `-armor` and `shields` are armour, a weapon's own name or
 *   `-weapons` is a weapon, and anything left is a tool.
 * - **Resistances** are `getDamageDefenses`, the web sheet's own reader, run per
 *   bucket so each one can say where it came from.
 *
 * The web app shows none of these for a D&D Beyond character except the
 * resistances (`senses: []` in its DDB adapter, "a modifier shape `ddbDerive`
 * has never parsed"). Parsed here because the plugin keeps no payload to parse
 * later: what the import does not write into the fence is gone.
 */

const BUCKET_LABEL: Record<string, string> = {
  race: 'Species',
  class: 'Class',
  background: 'Background',
  item: 'Item',
  feat: 'Feat',
  condition: 'Condition',
}

/** Only what is in force: a potion in the bag grants no resistance (MYDND-53). */
const buckets = modifierBuckets

const labelOf = (bucket: string): string => BUCKET_LABEL[bucket] ?? bucket.charAt(0).toUpperCase() + bucket.slice(1)

/**
 * Resistances, immunities, vulnerabilities and condition immunities, sourced.
 *
 * **Two spellings of a damage subtype.** A real payload's item resistance can be
 * the bare `cold` rather than `cold-damage` (measured on Gabriela's payload
 * 2026-10-14 — two potions). `getDamageDefenses` reads both since VAULT-247;
 * until MYDND-54 moved the submodule past it, this function read the bare form
 * itself.
 */
export function buildDefenses(payload: DdbPayload): SheetDefense[] {
  const out: SheetDefense[] = []
  const seen = new Set<string>()
  const push = (type: string, value: string, bucket: string): void => {
    const key = `${type}:${value}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ type: type as SheetDefense['type'], value, source: labelOf(bucket) })
  }
  for (const [bucket, list] of buckets(payload)) {
    const grants = getDamageDefenses({ modifiers: { [bucket]: list } }) as { type: string; value: string }[]
    for (const g of grants) push(g.type, g.value, bucket)
  }
  return out
}

const SENSES = ['blindsight', 'darkvision', 'tremorsense', 'truesight']

export function buildSenses(payload: DdbPayload): SheetSense[] {
  const best = new Map<string, SheetSense>()
  for (const [bucket, list] of buckets(payload)) {
    for (const m of list) {
      const type = String(m.type ?? '').toLowerCase()
      const sub = String(m.subType ?? '').toLowerCase()
      const range = Number(m.value)
      if ((type !== 'sense' && type !== 'set-base') || !SENSES.includes(sub)) continue
      // `set-base darkvision 1` sits beside the real `sense darkvision 60`.
      if (!Number.isFinite(range) || range <= 1) continue
      const prev = best.get(sub)
      if (!prev || range > prev.range) best.set(sub, { name: sub, range, source: labelOf(bucket) })
    }
  }
  return [...best.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Every movement mode in feet. The species' `weightSpeeds.normal`, raised by any
 * `set-innate-speed` modifier — a fly speed from a magic item or a feat.
 * `walk` is passed in so it matches the sheet's `speed` exactly.
 *
 * `ddbDerive`'s `getSpeeds` since MYDND-140: written here first, moved upstream
 * so the plugin and the web app have one copy (VAULT-261).
 */
export function buildSpeeds(payload: DdbPayload, walk: number | null): Record<string, number> {
  return getSpeeds(payload, walk)
}

/**
 * Armour, weapons, tools and languages: `ddbDerive`'s `getProficiencies` since
 * MYDND-140 (VAULT-261). It reads D&D Beyond's `entityTypeId` before the slug
 * rules this file had, which filed a Gunslinger's firearms as tools.
 */
export function buildProficiencies(payload: DdbPayload): SheetProficiencies {
  return getProficiencies(payload)
}
