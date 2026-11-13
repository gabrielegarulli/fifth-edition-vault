import { cleanColLabel, tableVal } from '@vault/derive/classTable.js'

import type { ClassFence, SubclassFence } from '../../../compendium'
import type { BuilderDraft } from '../draft'

import type { ClassContext } from './types'

// Weapon masteries: how many, and which weapons can take one.
// One module of the builder's choices (MYDND-197); index.ts says what the folder is.

/**
 * How many weapons a class (and its subclass) masters at a level — the web
 * builder's `getMasteryCountAtLevel`: the class's `weaponMasteryProgression`
 * when it has one, else a `Weapon Mastery` column in its table.
 */
export function masteryCountAt(
  fence: ClassFence | null,
  subclassFence: SubclassFence | null,
  level: number,
): number {
  const prog = fence?.data?.weaponMasteryProgression
  if (Array.isArray(prog)) {
    const sub = subclassFence?.data?.weaponMasteryProgression
    return Number(prog[level - 1] ?? 0) + (Array.isArray(sub) ? Number(sub[level - 1] ?? 0) : 0)
  }
  const groups = (fence?.data?.classTableGroups ?? []) as Array<{ colLabels?: string[]; rows?: unknown[][] }>
  for (const group of groups) {
    if (!Array.isArray(group.rows)) continue
    const ci = group.colLabels?.findIndex(l => cleanColLabel(l) === 'Weapon Mastery') ?? -1
    if (ci < 0) continue
    const n = parseInt(String(tableVal(group.rows[level - 1]?.[ci]) ?? '0'), 10)
    return Number.isNaN(n) ? 0 : n
  }
  return masteryCountFromText(fence, level)
}

/**
 * How many weapons the whole draft masters: the most any one class row grants
 * at its level. One pool, since `masteredWeapons` is one list.
 */
export function masteryCountFor(draft: BuilderDraft, contexts: readonly ClassContext[]): number {
  return Math.max(
    0,
    ...contexts.map(c => masteryCountAt(c.source?.fence ?? null, c.subclassFence, draft.classes[c.index]?.level ?? 1)),
  )
}

const COUNT_WORDS: Record<string, number> ={ one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 }

function masteryCountFromText(fence: ClassFence | null, level: number): number {
  const feature = (fence?.features ?? []).find(f => f?.name === 'Weapon Mastery' && typeof f.level === 'number' && f.level <= level)
  const said = /mastery properties of (\w+) kinds?\b/i.exec(String(feature?.description ?? ''))?.[1]?.toLowerCase()
  if (!said) return 0
  return COUNT_WORDS[said] ?? (Number.parseInt(said, 10) || 0)
}

// --- Weapon masteries ---------------------------------------------------------

/**
 * A weapon's mastery, or null — `masteryWeapons.js`'s `weaponMasterySlug`.
 *
 * Re-stated here because that module lives in the web app's `lib/`, not in
 * `@vault/derive`. Its two rules, kept: a mastery belongs to the *weapon*, so a
 * ranged weapon may carry one; and a weapon with none is **not** a legal pick,
 * because it spends a slot on nothing (VAULT-164). The notes keep it in the
 * `vault-item` fence (`mastery: Sap`) — 47 of the 96 weapon notes on 2026-10-08.
 */
export function masteryOf(fence: { mastery?: unknown } | null | undefined): string | null {
  const m = fence?.mastery
  return typeof m === 'string' && m.trim() ? m.trim() : null
}

export const WEAPON_ITEM_TYPES = ['Melee Weapon', 'Ranged Weapon']
