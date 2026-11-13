import type { FeatKind, FeatRow } from '../../compendium'
import { boxColumns } from './boxColumns'
import { ABILITY_LABELS } from '../../compendium'

/**
 * The feats catalog's shelves — design A, "Shelves by kind" (MYDND-62).
 *
 * A feat's kind is *when you get it*, which is the question a player is
 * actually asking: an origin feat at level 1 from a background, a general feat
 * in place of an Ability Score Improvement, a fighting style from a class
 * feature, an epic boon at 19. So the page is one shelf per kind, in the order a
 * character meets them, rather than one alphabetical list with a kind badge.
 */

export interface Shelf {
  /** The kind, or `other` for a feat whose note names none. */
  id: FeatKind | 'other'
  label: string
  /** When a character gets one — the shelf's subtitle. */
  when: string
  /**
   * The shelf's dot: one of the canvas's tones, drawn by `.bst-dot--<tone>`
   * (MYDND-65). The page takes the canvas's palette, as the Bestiary does.
   */
  tone: 'teal' | 'violet' | 'orange' | 'gold' | 'none'
}

export const SHELVES: readonly Shelf[] = [
  { id: 'origin', label: 'Origin', when: 'Level 1 · from your background', tone: 'teal' },
  { id: 'general', label: 'General', when: 'Level 4+ · in place of an ASI', tone: 'violet' },
  { id: 'fighting_style', label: 'Fighting Style', when: 'From a Fighting Style feature', tone: 'orange' },
  { id: 'epic_boon', label: 'Epic Boon', when: 'Level 19+', tone: 'gold' },
  // A hand-written feat with no `kind` (MYDND-15 admits them by tag). Last, and
  // only drawn when something is on it.
  { id: 'other', label: 'Other', when: 'No kind in the note', tone: 'none' },
]

/** Rows grouped onto their shelves, in `SHELVES` order, each sorted by name. */
export function shelve(rows: readonly FeatRow[]): Array<{ shelf: Shelf; rows: FeatRow[] }> {
  return SHELVES.map(shelf => ({
    shelf,
    rows: rows
      .filter(r => (r.kind ?? 'other') === shelf.id)
      .sort((a, b) => a.name.localeCompare(b.name)),
  }))
}

/** How many cards a closed shelf shows: two rows of whatever fits. */
export const previewCount = (columns: number): number => Math.max(2, columns * 2)

/** Columns of cards in a shelf `width` px wide; no card under `BOX_MIN` (MYDND-120). */
export const shelfColumns = boxColumns

export interface Coverage {
  benefits: number
  applied: number
  /** "All on sheet", "1 of 3 on sheet", "Prose only". */
  label: string
}

/**
 * How much of a feat the sheet applies, from the two derived keys.
 *
 * `null` when the note predates them — honestly different from 0, which is a
 * feat whose benefits are all prose. "Applied" is `modelled_count`: a benefit
 * carrying at least one effect the app acts on.
 */
export function coverage(row: Pick<FeatRow, 'benefitCount' | 'modelledCount'>): Coverage | null {
  if (row.benefitCount === null) return null
  const benefits = row.benefitCount
  const applied = Math.min(row.modelledCount ?? 0, benefits)
  const label =
    benefits > 0 && applied === benefits ? 'All on sheet' : applied === 0 ? 'Prose only' : `${applied} of ${benefits} on sheet`
  return { benefits, applied, label }
}

/** The "On the sheet" filter: every benefit modelled, and at least one benefit. */
export const fullyApplied = (row: FeatRow): boolean => {
  const c = coverage(row)
  return !!c && c.benefits > 0 && c.applied === c.benefits
}

/** Six pips, STR → CHA, each lit when the feat can raise it. */
export function abilityPips(abilities: readonly string[]): Array<{ key: string; short: string; label: string; on: boolean }> {
  return ABILITY_LABELS.map(a => ({ key: a.key, short: a.short, label: a.label, on: abilities.includes(a.key) }))
}

/** `STR`, `STR/DEX`, `ANY` — the narrow row's one-word answer. Null when it raises nothing. */
export function raisesShort(abilities: readonly string[]): string | null {
  if (abilities.length === 0) return null
  if (ABILITY_LABELS.every(a => abilities.includes(a.key))) return 'ANY'
  return ABILITY_LABELS.filter(a => abilities.includes(a.key))
    .map(a => a.short)
    .join('/')
}

/** `Raises STR or DEX +1`, `Raises any +1`. Null when it raises nothing. */
export function raisesChip(abilities: readonly string[], amount = 1): string | null {
  const short = raisesShort(abilities)
  if (!short) return null
  return `Raises ${short === 'ANY' ? 'any' : short.split('/').join(' or ')} +${amount}`
}

/**
 * The exporter's prerequisite string, as chips: `Level 4+, Strength 13+` →
 * `["Level 4+", "Strength 13+"]`. The list is comma-joined by
 * `formatPrerequisite` in the exporter; an `or` stays inside its chip.
 */
export function prerequisiteParts(prerequisite: string | null): string[] {
  if (!prerequisite) return []
  return prerequisite
    .split(/,\s*/)
    .map(p => p.trim())
    .filter(Boolean)
}

/** The card's one-line prerequisite: `Level 4+ · Strength 13+`. */
export const prerequisiteLine = (prerequisite: string | null): string =>
  prerequisiteParts(prerequisite).join(' · ') || 'No prerequisite'
