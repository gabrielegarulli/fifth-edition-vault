import { encounterXp, partyBudget } from '@vault/derive/encounterBudget.js'

import { MOVE_MODES, type MonsterRow, type MoveMode } from '../../compendium'
import { boxColumns } from './boxColumns'

/**
 * The bestiary's shelves and its encounter lens — the "Bestiary Layout
 * Proposal" canvas (MYDND-64), as pure functions the page and its tests share.
 *
 * **Shelves are challenge tiers**, because the question a GM brings to a
 * bestiary is "what can this party fight", and CR is the answer's first cut.
 * The tiers' edges are the DMG's tiers of play (1–4, 5–10, 11–16, 17+) with
 * everything under CR 1 on a shelf of its own. A monster with no CR — a summon,
 * `cr: —` — is on none of them, and the rail counts it separately.
 */

export type TierId = 'cr-0' | 'cr-1' | 'cr-5' | 'cr-11' | 'cr-17' | 'cr-none'

export interface Tier {
  id: TierId
  label: string
  /** The shelf's subtitle: what one monster on it is worth. */
  when: string
  /** Inclusive. */
  min: number
  max: number
  /**
   * The tier's dot. A class modifier on `.bst-dot`, because the colours are the
   * canvas's own and have a light twin (`styles/index.css`, the Bestiary block).
   */
  tone: 'teal' | 'violet' | 'orange' | 'gold' | 'rose' | 'none'
}

export const TIERS: readonly Tier[] = [
  { id: 'cr-0', label: 'CR 0–½', when: 'Up to 100 XP each', min: 0, max: 0.5, tone: 'teal' },
  { id: 'cr-1', label: 'CR 1–4', when: '200–1,100 XP each', min: 1, max: 4, tone: 'violet' },
  { id: 'cr-5', label: 'CR 5–10', when: '1,800–5,900 XP each', min: 5, max: 10, tone: 'orange' },
  { id: 'cr-11', label: 'CR 11–16', when: '7,200–15,000 XP each', min: 11, max: 16, tone: 'gold' },
  { id: 'cr-17', label: 'CR 17+', when: '18,000 XP and up', min: 17, max: Infinity, tone: 'rose' },
]

/**
 * The shelf for a monster with no CR — 22 of the 888, summons mostly. The canvas
 * counts them in the rail and draws no shelf for them, which would leave them
 * reachable only by search; so they get the last shelf, drawn only when
 * something is on it.
 */
export const NO_CR: Tier = {
  id: 'cr-none',
  label: 'No CR',
  when: 'Summons, and creatures the book gives no rating',
  min: Number.NaN,
  max: Number.NaN,
  tone: 'none',
}

/** The tier a CR sits in, or null for a monster with no CR. */
export function tierOf(cr: number | null): Tier | null {
  if (cr === null) return null
  return TIERS.find(t => cr >= t.min && cr <= t.max) ?? null
}

/** Rows grouped onto their tiers, in `TIERS` order and then `NO_CR`, each sorted by name. */
export function shelveMonsters(rows: readonly MonsterRow[]): Array<{ tier: Tier; rows: MonsterRow[] }> {
  const byName = (a: MonsterRow, b: MonsterRow) => a.name.localeCompare(b.name)
  return [
    ...TIERS.map(tier => ({ tier, rows: rows.filter(r => tierOf(r.cr)?.id === tier.id).sort(byName) })),
    { tier: NO_CR, rows: rows.filter(r => tierOf(r.cr) === null).sort(byName) },
  ]
}

const CR_GLYPHS: Record<number, string> = { 0.125: '⅛', 0.25: '¼', 0.5: '½' }

/** `¼`, `½`, `3`, `—` — the canvas writes a fractional CR as one glyph. */
export const crGlyph = (cr: number | null): string => (cr === null ? '—' : (CR_GLYPHS[cr] ?? String(cr)))

/** `1,800`. Fixed to en-US so a card reads the same in every locale the canvas was drawn in. */
export const formatXp = (xp: number): string => xp.toLocaleString('en-US')

/** `Large monstrosity`. Either half may be missing; both missing is `Creature`. */
export function kindLine(row: Pick<MonsterRow, 'size' | 'creatureType'>): string {
  const line = [row.size, row.creatureType?.toLowerCase()].filter(Boolean).join(' ')
  return line || 'Creature'
}

/** `AC 13 · HP 59 · 40 ft.`, leaving out what the note does not say. Null when it says none of it. */
export function statLine(row: Pick<MonsterRow, 'ac' | 'hp' | 'speed'>): string | null {
  const parts = [
    row.ac !== null ? `AC ${row.ac}` : null,
    row.hp !== null ? `HP ${row.hp}` : null,
    row.speed !== null ? `${row.speed} ft.` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

/** FLY → BURROW, each lit when the monster moves that way. */
export function movePips(moves: readonly MoveMode[]): Array<{ mode: MoveMode; label: string; on: boolean }> {
  return MOVE_MODES.map(mode => ({ mode, label: mode.toUpperCase(), on: moves.includes(mode) }))
}

/** The flags a card carries in its bottom-right corner. */
export function flagsOf(row: Pick<MonsterRow, 'legendary' | 'spellcasting'>): string[] {
  return [row.legendary ? 'Legendary' : null, row.spellcasting ? 'Caster' : null].filter((f): f is string => !!f)
}

/**
 * Columns of cards in a shelf `width` px wide. The canvas drew ~200px cards;
 * since MYDND-120 no card goes under `BOX_MIN` (320px).
 */
export const cardColumns = boxColumns

/** How many cards a closed shelf shows: two rows of whatever fits. */
export const previewCount = (columns: number): number => Math.max(2, columns * 2)

// --- the encounter lens (design B) ------------------------------------------

export type Difficulty = 'low' | 'moderate' | 'high'

export const DIFFICULTY_LABELS: ReadonlyArray<{ id: Difficulty; label: string }> = [
  { id: 'low', label: 'Low' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'high', label: 'High' },
]

/** `4 characters · level 5`, `3 characters · levels 3–5`, `No characters`. */
export function partyLabel(levels: readonly number[]): string {
  if (levels.length === 0) return 'No characters'
  const who = levels.length === 1 ? '1 character' : `${levels.length} characters`
  const lo = Math.min(...levels)
  const hi = Math.max(...levels)
  return `${who} · ${lo === hi ? `level ${lo}` : `levels ${lo}–${hi}`}`
}

/** Each difficulty's budget for these levels, from `@vault/derive` (VAULT-255). */
export function budgets(levels: readonly number[]): Record<Difficulty, number> {
  return {
    low: partyBudget(levels, 'low').xp,
    moderate: partyBudget(levels, 'moderate').xp,
    high: partyBudget(levels, 'high').xp,
  }
}

/** One line of the "In the encounter" column: a monster and how many of it. */
export interface EncounterGroup {
  monsterId: string
  name: string
  count: number
  /** The bestiary row, when the note is still there. */
  row: MonsterRow | null
  /** XP of one. Null when the row is gone or its note does not say. */
  xp: number | null
}

/**
 * The encounter's monsters, one group per bestiary note, in the order they were
 * first added. Characters and hand-typed combatants are not monsters and do not
 * spend the budget.
 */
export function encounterGroups(
  combatants: ReadonlyArray<{ kind: string; monsterId: string | null; name: string }>,
  rows: readonly MonsterRow[],
): EncounterGroup[] {
  const byId = new Map(rows.map(r => [r.id, r]))
  const groups = new Map<string, EncounterGroup>()
  for (const c of combatants) {
    if (c.kind !== 'monster' || !c.monsterId) continue
    const known = groups.get(c.monsterId)
    if (known) {
      known.count += 1
      continue
    }
    const row = byId.get(c.monsterId) ?? null
    groups.set(c.monsterId, { monsterId: c.monsterId, name: row?.name ?? c.name, count: 1, row, xp: row?.xp ?? null })
  }
  return [...groups.values()]
}

/** What the groups cost. A group whose XP is unknown costs nothing — and is shown, so it is not hidden. */
export const spentXp = (groups: readonly EncounterGroup[]): number =>
  encounterXp(groups.map(g => ({ xp: g.xp, count: g.count })))

