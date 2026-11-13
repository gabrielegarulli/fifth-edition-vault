import {
  getCasterCaps,
  isClassCaster,
  isSpellSelectionComplete,
  subclassCasting,
} from '@vault/derive/builderSpellCaps.js'
import { vaultBonusCantrips, vaultSpellListAccess } from '@vault/derive/vaultDerive.js'

import { baseClassName, type ClassFence, type SubclassFence } from '../../../compendium'
import { slotMapFor } from '../../../characterModel'
import { classData, type BuilderDraft, type ClassSource } from '../draft'

import { asRecord } from './shared'
import { featureRows } from './features'

// Spells: casters, their caps and lists, bonus cantrips.
// One module of the builder's choices (MYDND-197); index.ts says what the folder is.

// --- Spells -------------------------------------------------------------------

export interface CasterCaps {
  cantripCap: number
  spellsCap: number
  spellbookCap: number | null
  isSpellbook: boolean
}

/**
 * The highest spell rank a class's own slots reach at its own level (MYDND-124)
 * — the ranks the Spells step offers, by the slot tables the sheet's panel
 * already uses (`highestRank` of the same `casterProgression`). Each class of a
 * multiclass by its own level, as the 2024 rules prepare them.
 *
 * At least 1 for a caster: a class whose note names no progression, or whose
 * slots start later than its spells (a Tamer gains Spellcasting at 2), is offered
 * first-level spells as it was before MYDND-124, rather than none.
 */
export function maxSpellRank(fence: ClassFence | null, name: string, level: number): number {
  const progression = fence?.data?.casterProgression
  const slots = slotMapFor([{ name, level, progression: typeof progression === 'string' ? progression : null }])
  return Math.max(1, ...Object.keys(slots).map(Number))
}

/**
 * The draft's spellcasting classes, with the caps each one's table gives.
 *
 * **No Cantrips column is no cantrips when the table counts spells** (MYDND-124).
 * `getCasterCaps` answers `Infinity` for a column it cannot find — right for a
 * homebrew note with no table at all, wrong for the 2024 Paladin and Ranger,
 * whose tables have a Prepared Spells column and no cantrips because the class
 * has none. Those were offered every cantrip on the list, uncapped.
 */
export function casters(
  draft: BuilderDraft,
  sources: ReadonlyArray<ClassSource | null>,
  /** Each class row's chosen subclass fence, by `draft.classes` index (MYDND-182). */
  subclassFences: ReadonlyArray<SubclassFence | null> = [],
): Caster[] {
  return draft.classes.flatMap((dc, i): Caster[] => {
    const source = sources[i]
    if (!source) return []
    const row = classData(source)
    const level = dc.level ?? 1
    const subclass = dc.subclass ? { id: dc.subclass.id, fence: subclassFences[i] ?? null } : null
    const bonus = bonusCantrips(draft, source, subclass)
    const extraLists = spellListAccess(source, subclass, level)
    // The Eldritch Knight and the Arcane Trickster (MYDND-182): the class does not
    // cast, its subclass does, from another class's list. Decided on the class
    // *row*, not the draft: once saved, the draft carries the subclass's
    // Intelligence, and `isClassCaster` would then read the Fighter's table.
    const sub = subclassFences[i] ?? null
    const casting = subclassCasting(sub) as { progression: string; list: string | null } | null
    const ownAbility = row.spellcasting_ability
    if (sub && casting && (!ownAbility || ownAbility === 'none')) {
      const caps = getCasterCaps({ data: sub.data }, level) as CasterCaps
      const slots = slotMapFor([{ name: source.row.name, level, progression: casting.progression }])
      return [
        {
          index: i,
          name: sub.name,
          list: casting.list ?? baseClassName(source.row.name),
          extraLists,
          caps: { ...caps, cantripCap: (Number.isFinite(caps.cantripCap) ? caps.cantripCap : 0) + bonus },
          maxRank: Math.max(1, ...Object.keys(slots).map(Number)),
        },
      ]
    }
    if (isClassCaster(dc, row)) {
      const caps = getCasterCaps(row, level) as CasterCaps
      const cantripCap = !Number.isFinite(caps.cantripCap) && Number.isFinite(caps.spellsCap) ? 0 : caps.cantripCap
      return [
        {
          index: i,
          name: source.row.name,
          list: baseClassName(source.row.name),
          extraLists,
          caps: { ...caps, cantripCap: cantripCap + bonus },
          maxRank: maxSpellRank(source.fence, source.row.name, level),
        },
      ]
    }
    return []
  })
}

/** One casting class of the draft, as the Spells step asks it. */
export interface Caster {
  /** Its `draft.classes` index. */
  index: number
  /** The class, or for a subclass that casts, the subclass ("Eldritch Knight"). */
  name: string
  /** The class whose spell list it learns from: its own, or the subclass's (Wizard). */
  list: string
  /** Other lists a feature lets it choose from: Bard Magical Secrets' Cleric, Druid and Wizard (MYDND-182). */
  extraLists: string[]
  caps: CasterCaps
  maxRank: number
}

/**
 * The other classes' lists a class may choose its spells from at its level
 * (MYDND-182): Bard Magical Secrets, whose level-10 feature carries a
 * `spell_list_access` effect naming Cleric, Druid and Wizard. Read by derive's
 * `vaultSpellListAccess` over the features the class (and its subclass) has
 * reached, leaving out unpicked options. Before this a Bard at 10 was offered
 * only Bard spells, though the feature says "any of your new prepared spells".
 */
export function spellListAccess(
  source: ClassSource,
  subclass: { id: string; fence: SubclassFence | null } | null,
  level: number,
): string[] {
  const rows = [
    ...featureRows(source.row.id, source.fence?.features),
    ...(subclass?.fence ? featureRows(subclass.id, subclass.fence.features) : []),
  ].filter(r => r.level <= level && !r.data?.optionOf)
  return vaultSpellListAccess(rows.flatMap(r => (Array.isArray(r.data?.effects) ? (r.data.effects as unknown[]) : []))) as string[]
}

/**
 * Extra cantrips a class's picked options grant (MYDND-182): the Cleric's
 * Thaumaturge and the Druid's Magician, whose `bonus_cantrips` effect sits on the
 * Divine/Primal Order option. The sheet's SpellPanel adds them to its cap
 * (`bonus_cantrips`, baked); the Spells step did not, so a Thaumaturge was
 * offered one cantrip fewer than the sheet then asked for.
 *
 * Summed by `vaultBonusCantrips`, over the option rows the class's (and its
 * subclass's) answers name. Counted against the class that owns the option.
 */
export function bonusCantrips(
  draft: BuilderDraft,
  source: ClassSource,
  subclass: { id: string; fence: SubclassFence | null } | null = null,
): number {
  const rows = [
    ...featureRows(source.row.id, source.fence?.features),
    ...(subclass?.fence ? featureRows(subclass.id, subclass.fence.features) : []),
  ]
  const effects = Object.values(draft.featureChoices).flatMap(answer => {
    const choice = asRecord(answer)
    if (choice?.type !== 'feature_option') return []
    const row = rows.find(r => r.id === choice.optionId)
    return Array.isArray(row?.data?.effects) ? (row.data.effects as unknown[]) : []
  })
  return vaultBonusCantrips(effects) as number
}

/**
 * The elements a class's affinity picks name, or null when its list is not
 * filtered (MYDND-124).
 *
 * Ryoko's Bender casts from the element lists it has chosen through Elemental
 * Affinity (at 1, 6, 10 and 14). Its note says which lists exist
 * (`data.affinitySpells`) and each spell note which it is on (`affinities`);
 * a pick is a `feature_option` answer owned by the class whose option is named
 * for one of them. Null — offer the whole list — for any class without lists,
 * and for a Bender with nothing picked yet, rather than an empty step.
 */
export function affinityPicks(draft: BuilderDraft, classId: string | null, fence: ClassFence | null): Set<string> | null {
  const lists = fence?.data?.affinitySpells
  const elements = new Set(lists && typeof lists === 'object' ? Object.keys(lists) : [])
  if (!classId || elements.size === 0) return null
  const picked = new Set<string>()
  for (const [key, answer] of Object.entries(draft.featureChoices)) {
    const choice = asRecord(answer)
    const name = typeof choice?.optionName === 'string' ? choice.optionName : null
    if (key.startsWith(`${classId}:`) && choice?.type === 'feature_option' && name && elements.has(name)) picked.add(name)
  }
  return picked.size > 0 ? picked : null
}

/** Whether a spell is on the lists `picks` allow; a spell naming no element always is. */
export function offeredByAffinity(spell: { affinities: readonly string[] }, picks: ReadonlySet<string> | null): boolean {
  return !picks || spell.affinities.length === 0 || spell.affinities.some(a => picks.has(a))
}

export function spellsComplete(draft: BuilderDraft, caps: CasterCaps): boolean {
  return isSpellSelectionComplete(draft.spells, caps) as boolean
}
