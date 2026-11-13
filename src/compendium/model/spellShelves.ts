import type { SpellRow } from './spells'
import { diceAtRank } from './spellRanks'

/**
 * The spell catalog's shelves — the "Spells Layout
 * Proposal" canvas (MYDND-66), as pure functions the page and its tests share.
 *
 * **Shelves are spell levels**, because the first thing a caster asks of a spell
 * is whether they can cast it at all, and the level answers that. The dots group
 * the levels the way the classes unlock them: cantrips, then 1–3, 4–5, 6–7, 8–9.
 *
 * Everything here reads frontmatter only, so drawing the page reads no file.
 * The exporter writes units in the singular ("10 minute", "8 hour") on most
 * notes, so every label below normalises what it is given rather than trusting
 * the spelling.
 */

export type Tone = 'teal' | 'violet' | 'orange' | 'gold' | 'rose' | 'none'

export interface LevelShelf {
  id: string
  /** `-1` is the reader's "no level in frontmatter". */
  level: number
  /** The shelf's title: `Cantrips`, `Level 3`. */
  label: string
  /** The rail's row: `Cantrip`, `Level 3`. */
  railLabel: string
  /** The narrow pane's chip: `Cantrip`, `3`. */
  chipLabel: string
  tone: Tone
}

const toneOf = (level: number): Tone =>
  level === 0 ? 'teal' : level <= 3 ? 'violet' : level <= 5 ? 'orange' : level <= 7 ? 'gold' : 'rose'

export const LEVEL_SHELVES: readonly LevelShelf[] = Array.from({ length: 10 }, (_, level) => ({
  id: `lv-${level}`,
  level,
  label: level === 0 ? 'Cantrips' : `Level ${level}`,
  railLabel: level === 0 ? 'Cantrip' : `Level ${level}`,
  chipLabel: level === 0 ? 'Cantrip' : String(level),
  tone: toneOf(level),
}))

/** A note with no `level` — a stray or hand-made one. Last, and only drawn when something is on it. */
export const NO_LEVEL: LevelShelf = {
  id: 'lv-none',
  level: -1,
  label: 'No level',
  railLabel: 'No level',
  chipLabel: '—',
  tone: 'none',
}

/** Rows onto their level shelves, cantrips first, then `NO_LEVEL`, each sorted by name. */
export function shelveSpells(rows: readonly SpellRow[]): Array<{ shelf: LevelShelf; rows: SpellRow[] }> {
  const byName = (a: SpellRow, b: SpellRow) => a.name.localeCompare(b.name)
  return [
    ...LEVEL_SHELVES.map(shelf => ({ shelf, rows: rows.filter(r => r.level === shelf.level).sort(byName) })),
    { shelf: NO_LEVEL, rows: rows.filter(r => r.level < 0 || r.level > 9).sort(byName) },
  ]
}

/** A shelf's subtitle. Cantrips say how they scale; a level says how many it holds. */
export function spellShelfWhen(shelf: LevelShelf, count: number): string {
  if (shelf.level === 0) return 'at will · damage grows at 5, 11, 17'
  return count === 1 ? '1 spell' : `${count.toLocaleString('en-US')} spells`
}

// --- how a spell is cast ------------------------------------------------------

export type CastAs = 'action' | 'bonus' | 'reaction' | 'longer'

export const CAST_AS: ReadonlyArray<{ id: CastAs; label: string; short: string }> = [
  { id: 'action', label: 'Action', short: 'ACTION' },
  { id: 'bonus', label: 'Bonus', short: 'BONUS' },
  { id: 'reaction', label: 'Reaction', short: 'REACT' },
  { id: 'longer', label: 'Longer', short: 'LONGER' },
]

/**
 * `1 action` → action, `1 bonus` → bonus, `1 reaction` → reaction, and anything
 * that takes a minute or more → longer. `1 action, 8 hour` (a spell with a
 * second, longer way to cast it) is an action: that is how it is cast in a fight.
 */
export function castAsOf(castingTime: string | null): CastAs | null {
  if (!castingTime) return null
  // The leading "1" is optional: the exporter writes it, a hand-written note may not.
  const t = castingTime.trim().toLowerCase()
  if (/^(1\s+)?action\b/.test(t)) return 'action'
  if (/^(1\s+)?bonus\b/.test(t)) return 'bonus'
  if (/^(1\s+)?reaction\b/.test(t)) return 'reaction'
  return 'longer'
}

const UNITS: Record<string, [string, string]> = {
  minute: ['min', 'min'],
  hour: ['hour', 'hours'],
  day: ['day', 'days'],
  round: ['round', 'rounds'],
  mile: ['mile', 'miles'],
  foot: ['ft', 'ft'],
  feet: ['ft', 'ft'],
}

/** `10 minute` → `10 min`, `8 hour` → `8 hours`, `1 miles` → `1 mile`, `60 feet` → `60 ft`. */
function amount(text: string): string {
  return text.replace(/\b(\d+)\s*(minute|hour|day|round|mile|foot|feet)s?\b/gi, (_, n: string, unit: string) => {
    const [one, many] = UNITS[unit.toLowerCase()]
    return `${n} ${n === '1' ? one : many}`
  })
}

const capitalise = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/** The card's casting time: `Action`, `Bonus`, `Reaction`, or the time it takes (`1 hour`, `10 min`). */
export function shortTime(castingTime: string | null): string | null {
  const as = castAsOf(castingTime)
  if (!as || !castingTime) return null
  if (as === 'action') return 'Action'
  if (as === 'bonus') return 'Bonus'
  if (as === 'reaction') return 'Reaction'
  return amount(castingTime.trim())
}

/** `120 feet` → `120 ft`, `self` → `Self`, `1 miles` → `1 mile`. */
export function shortRange(range: string | null): string | null {
  if (!range) return null
  return capitalise(amount(range.trim()))
}

/**
 * `Instantaneous` → `Instant`; `Concentration, up to 10 minute` → `10 min` (the
 * card's Conc. flag says the rest); `8 hour` → `8 hours`.
 */
export function shortDuration(duration: string | null): string | null {
  if (!duration) return null
  const d = duration
    .trim()
    .replace(/^concentration,\s*up to\s*/i, '')
    .replace(/\binstantaneous\b/gi, 'Instant')
  return capitalise(amount(d))
}

// --- what a spell rolls -----------------------------------------------------

/** `8d6 fire`, `3d8 necrotic/radiant`, `2d4 + mod heal`, or null for a spell that rolls nothing. */
export function diceLabel(row: Pick<SpellRow, 'damageDice' | 'damageTypes' | 'healDice' | 'healMod'>): string | null {
  if (row.damageDice) return [row.damageDice, row.damageTypes.join('/')].filter(Boolean).join(' ')
  if (row.healDice) return `${row.healDice}${row.healMod ? ' + mod' : ''} heal`
  return null
}

/** The card's mono line: `Instant · 8d6 fire`, `10 min`. */
export function cardLine(row: SpellRow): string {
  return [shortDuration(row.duration), diceLabel(row)].filter(Boolean).join(' · ')
}

/**
 * `Evocation · Sorcerer, Wizard`, or `Evocation · 9 classes` when the names
 * would not fit on a card's second line — the canvas's own rule, which shows
 * "Bard, Cleric, Druid" and counts "Artificer, Sorcerer, Wizard".
 */
export function kindLine(row: Pick<SpellRow, 'school' | 'classes'>, school: string): string {
  const names = row.classes.join(', ')
  const classes = row.classes.length === 0 ? null : names.length <= 22 ? names : `${row.classes.length} classes`
  return [school, classes].filter(Boolean).join(' · ')
}

export interface Components {
  verbal: boolean
  somatic: boolean
  material: boolean
  /** What the M is, without its parentheses: `a ball of bat guano and sulfur`. */
  materialText: string | null
}

/** `V, S, M (a diamond worth 300+ GP, which the spell consumes)`, read without splitting on the comma inside. */
export function parseComponents(components: string | null): Components {
  const text = (components ?? '').trim()
  const paren = text.indexOf('(')
  const head = (paren >= 0 ? text.slice(0, paren) : text).toUpperCase()
  const letters = new Set(head.split(/[\s,]+/).filter(Boolean))
  const inner = paren >= 0 ? text.slice(paren + 1).replace(/\)\s*$/, '').trim() : ''
  return {
    verbal: letters.has('V'),
    somatic: letters.has('S'),
    material: letters.has('M'),
    materialText: inner || null,
  }
}

/** V, S, M as pips, each lit when the spell needs it. */
export function componentPips(components: string | null): Array<{ label: 'V' | 'S' | 'M'; on: boolean }> {
  const c = parseComponents(components)
  return [
    { label: 'V', on: c.verbal },
    { label: 'S', on: c.somatic },
    { label: 'M', on: c.material },
  ]
}

export interface Flag {
  text: string
  tone: 'conc' | 'ritual'
}

/** The card's bottom-right flags. */
export function spellFlagsOf(row: Pick<SpellRow, 'concentration' | 'ritual'>): Flag[] {
  const flags: Flag[] = []
  if (row.concentration) flags.push({ text: 'Conc.', tone: 'conc' })
  if (row.ritual) flags.push({ text: 'Ritual', tone: 'ritual' })
  return flags
}

export interface LadderStep {
  label: string
  dice: string
  /** The spell's own level, or the first cantrip tier: drawn as the base. */
  base: boolean
}

/**
 * The detail panel's "Higher-level slot" row: Fireball's 8d6 at level 3 up to
 * 14d6 at 9. Null when the spell rolls nothing or does not grow.
 */
export function upcastLadder(row: SpellRow): { steps: LadderStep[]; note: string } | null {
  const base = row.damageDice ?? row.healDice
  if (row.level < 1 || row.level > 9 || !base || !row.upcastDice) return null
  const steps = Array.from({ length: 10 - row.level }, (_, i) => {
    const rank = row.level + i
    return { label: `L${rank}`, dice: diceAtRank(base, row.upcastDice, row.level, rank), base: rank === row.level }
  })
  return { steps, note: `+${row.upcastDice} for each slot level above ${row.level}` }
}

const CANTRIP_LEVELS = [1, 5, 11, 17]

/** A cantrip's dice at character levels 1, 5, 11 and 17. Null when it rolls nothing. */
export function cantripLadder(row: SpellRow): LadderStep[] | null {
  if (row.level !== 0 || row.cantripDice.length === 0) return null
  return CANTRIP_LEVELS.map((lvl, i) => ({ label: `Lvl ${lvl}`, dice: row.cantripDice[i] || '—', base: i === 0 }))
}

/** `Wizard 5`, `Cleric 3 · Wizard 2`. */
export const classSummary = (classes: ReadonlyArray<{ name: string; level: number }>): string =>
  classes.map(c => `${c.name} ${c.level}`).join(' · ')
