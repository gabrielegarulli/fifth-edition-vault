import { CORE_CLASS_SOURCES, OFFICIAL_CLASS_SOURCES } from '../../platform'
import { baseClassName, progressionTable, type ClassRow, type FenceFeature, type SubclassRow } from './classes'

/**
 * The classes page — the "Classes & Builder Layout Proposal" canvas, boards A
 * to C (MYDND-86) — as pure functions the page and its tests share.
 *
 * - **The rail groups classes by where they come from**: the core twelve, the
 *   rest of Wizards of the Coast's books, then third-party. A vault of 34
 *   classes is mostly not the twelve, and a flat alphabetical list buried them.
 * - **The progression is the class note's own table**, parsed for display only
 *   (`progressionTable`). Spell-slot columns are recognised by their header
 *   (`1st` … `9th`) and drawn as pips; every other column is drawn as it is.
 * - **Subclasses are grouped the same way**, against the class's own book: the
 *   ones printed beside the class first, then the legacy printing, then other
 *   official books, then third-party.
 * - **Which books are official, and which are the core rules, is the
 *   edition's** (`platform/model/edition.ts`, MYDND-196). In the SRD edition
 *   the core rules are `SRD 5.2.1` and no book is official.
 */

export const isOfficial = (source: string | null): boolean =>
  !!source && (OFFICIAL_CLASS_SOURCES.has(source) || /^UA/.test(source))

export type ClassGroupId = 'core' | 'official' | 'third'

export interface ClassGroup {
  id: ClassGroupId
  label: string
  rows: ClassRow[]
}

const CLASS_GROUP_LABELS: Record<ClassGroupId, string> = {
  core: 'Core',
  official: 'Official',
  third: 'Third-party',
}

export function classGroupOf(cls: Pick<ClassRow, 'source'>): ClassGroupId {
  if (cls.source && CORE_CLASS_SOURCES.has(cls.source)) return 'core'
  return isOfficial(cls.source) ? 'official' : 'third'
}

/** Every group in order, each by name; empty groups left out. */
export function groupClasses(rows: readonly ClassRow[]): ClassGroup[] {
  const by = new Map<ClassGroupId, ClassRow[]>([['core', []], ['official', []], ['third', []]])
  for (const r of rows) by.get(classGroupOf(r))!.push(r)
  return [...by]
    .map(([id, group]) => ({ id, label: CLASS_GROUP_LABELS[id], rows: group.sort((a, b) => a.name.localeCompare(b.name)) }))
    .filter(g => g.rows.length > 0)
}

export type SubclassGroupId = 'book' | 'legacy' | 'official' | 'third'

export interface SubclassGroup {
  id: SubclassGroupId
  label: string
  sub: string
  rows: SubclassRow[]
}

/**
 * A class's subclasses, grouped against the class's own book: printed beside
 * the class (the shelf's cards), the other printing of the core rules (2014
 * PHB under a 2024 class, and the other way round), other official books, and
 * third-party. A homebrew class's own book is its "beside" group.
 */
export function groupSubclasses(cls: Pick<ClassRow, 'source'>, subs: readonly SubclassRow[]): SubclassGroup[] {
  const groups: Record<SubclassGroupId, SubclassRow[]> = { book: [], legacy: [], official: [], third: [] }
  for (const s of subs) {
    if (s.source === cls.source) groups.book.push(s)
    else if (s.source && CORE_CLASS_SOURCES.has(s.source) && cls.source && CORE_CLASS_SOURCES.has(cls.source)) groups.legacy.push(s)
    else if (isOfficial(s.source)) groups.official.push(s)
    else groups.third.push(s)
  }
  const sources = (rows: SubclassRow[]) => [...new Set(rows.map(r => r.source).filter(Boolean))].sort().join(', ')
  const out: SubclassGroup[] = [
    { id: 'book', label: cls.source ? `Printed with the class · ${cls.source}` : 'Printed with the class', sub: '', rows: groups.book },
    { id: 'legacy', label: 'Legacy printing', sub: sources(groups.legacy), rows: groups.legacy },
    { id: 'official', label: 'Official books', sub: sources(groups.official), rows: groups.official },
    { id: 'third', label: 'Third-party', sub: sources(groups.third), rows: groups.third },
  ]
  for (const g of out) g.rows.sort((a, b) => a.name.localeCompare(b.name))
  return out.filter(g => g.rows.length > 0)
}

// --- the progression table ---------------------------------------------------

export interface ProgressionCell {
  header: string
  value: string
}

export interface ProgressionRow {
  level: number
  pb: string
  features: string
  /** The book marks the subclass's levels in Features ("Wizard Subclass", "Subclass feature"). */
  subclass: boolean
  /** `1st` … `9th` slot counts, in order; `0` where the table says `—`. */
  slots: number[]
  /** Every other column — Cantrips, Prepared Spells, Rages, Sneak Attack. */
  extra: ProgressionCell[]
}

export interface Progression {
  /** Headers of `extra`, in order. */
  extraHeaders: string[]
  /** How many slot levels the table has; 0 for a class with no slot columns. */
  slotLevels: number
  rows: ProgressionRow[]
}

const SLOT_HEADER = /^[1-9](st|nd|rd|th)$/i

/**
 * A class note's progression table, read for display. Null when the note has
 * none, or when it has no Level column to key rows by.
 */
export function readProgression(prose: string): Progression | null {
  const table = progressionTable(prose)
  if (table.length < 2) return null
  const head = table[0].map(h => h.trim())
  const lvl = head.findIndex(h => /^level$/i.test(h))
  if (lvl < 0) return null
  const pb = head.findIndex(h => /^(pb|proficiency bonus)$/i.test(h))
  const feat = head.findIndex(h => /^features?$/i.test(h))
  const slotCols = head.map((h, i) => (SLOT_HEADER.test(h) ? i : -1)).filter(i => i >= 0)
  const extraCols = head.map((_, i) => i).filter(i => i !== lvl && i !== pb && i !== feat && !slotCols.includes(i))
  const rows = table.slice(1).flatMap(cells => {
    const level = parseInt(cells[lvl] ?? '', 10)
    if (!Number.isFinite(level)) return []
    const features = feat >= 0 ? (cells[feat] ?? '') : ''
    return [
      {
        level,
        pb: pb >= 0 ? (cells[pb] ?? '') : '',
        features: features === '—' ? '' : features,
        subclass: /subclass/i.test(features),
        slots: slotCols.map(i => parseInt(cells[i] ?? '', 10) || 0),
        extra: extraCols.map(i => ({ header: head[i], value: cells[i] ?? '' })),
      },
    ]
  })
  return { extraHeaders: extraCols.map(i => head[i]), slotLevels: slotCols.length, rows }
}

/** The highest slot level any row of the table reaches — the pip columns worth drawing. */
export const highestSlot = (p: Progression): number =>
  p.rows.reduce((m, r) => Math.max(m, r.slots.reduce((n, s, i) => (s > 0 ? i + 1 : n), 0)), 0)

// --- whose level ---------------------------------------------------------------

/**
 * A character's level in one class, read off the sheet's `classes` line —
 * `Wizard 5`, `Rogue (Soulknife) 14`, `Fighter 5 / Wizard 2`. Null when the
 * class is not on it. Matched on the class's name without its edition suffix.
 */
export function levelIn(classesLine: string | null | undefined, className: string): number | null {
  if (!classesLine) return null
  const name = baseClassName(className).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = new RegExp(`(?:^|[/,]\\s*)${name}(?:\\s*\\([^)]*\\))?\\s+(\\d+)`, 'i').exec(classesLine)
  return m ? Number(m[1]) : null
}

// --- comparing subclasses ------------------------------------------------------

export interface FeatureCell {
  name: string
  /** The first sentence of the feature's description, emphasis markers removed. */
  gist: string
  /**
   * The whole description, markdown — the maneuvers, invocations or
   * attachments a feature offers are written into it (MYDND-123).
   */
  description: string
  /** Whether the description says more than its gist; only then can it open. */
  more: boolean
}

/**
 * A subclass's features at each level it grants any, from its fence. The
 * fence's first feature is usually the subclass itself (`Evoker`, its flavour
 * and "See Subclass Feature: …"); it is dropped when its name is the
 * subclass's own.
 */
export function featuresByLevel(subName: string, features: readonly FenceFeature[]): Map<number, FeatureCell[]> {
  const own = subName.trim().toLowerCase()
  const out = new Map<number, FeatureCell[]>()
  for (const f of features) {
    if (f.name.trim().toLowerCase() === own) continue
    const list = out.get(f.level) ?? []
    const description = (f.description ?? '').trim()
    const gist = gistOf(description)
    list.push({ name: f.name, gist, description, more: flatten(description) !== gist })
    out.set(f.level, list)
  }
  return out
}

/** The first sentence of prose, without markdown emphasis. */
export function gistOf(text: string): string {
  const flat = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .find(p => p && !/^\*[^*]+\*$/.test(p)) // skip an italic flavour line
  if (!flat) return ''
  const clean = flatten(flat)
  const m = /^(.+?[.!?])(\s|$)/.exec(clean)
  return m ? m[1] : clean
}

/** Prose as one line without markdown emphasis — what a gist is cut from. */
const flatten = (text: string) => text.replace(/\*\*?|__?/g, '').replace(/\s+/g, ' ').trim()
