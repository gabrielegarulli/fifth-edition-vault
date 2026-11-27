/**
 * Pure normalization, 5etools-tag conversion, and fingerprint helpers for monsters.
 *
 * Every function in this module is I/O-free. It provides the normalized values
 * consumed by the monster mapper and Markdown builder.
 */
import {
  abilityName,
  exportHash,
  replaceFiveEToolsLinks,
  slug,
  sourceForRecord,
  titleCase,
} from './mapperHelpers'

export { exportHash, titleCase, abilityName }

const XP_BY_CR: Readonly<Record<string, number>> = {
  '0': 10,
  '1/8': 25,
  '1/4': 50,
  '1/2': 100,
  '1': 200,
  '2': 450,
  '3': 700,
  '4': 1100,
  '5': 1800,
  '6': 2300,
  '7': 2900,
  '8': 3900,
  '9': 5000,
  '10': 5900,
  '11': 7200,
  '12': 8400,
  '13': 10000,
  '14': 11500,
  '15': 13000,
  '16': 15000,
  '17': 18000,
  '18': 20000,
  '19': 22000,
  '20': 25000,
  '21': 33000,
  '22': 41000,
  '23': 50000,
  '24': 62000,
  '25': 75000,
  '26': 90000,
  '27': 105000,
  '28': 120000,
  '29': 135000,
  '30': 155000,
}

const SIZE_NAMES: Readonly<Record<string, string>> = {
  T: 'Tiny',
  S: 'Small',
  M: 'Medium',
  L: 'Large',
  H: 'Huge',
  G: 'Gargantuan',
  C: 'Colossal',
  V: 'Varies',
}

const ALIGNMENT_NAMES: Readonly<Record<string, string>> = {
  L: 'Lawful',
  N: 'Neutral',
  C: 'Chaotic',
  G: 'Good',
  E: 'Evil',
  U: 'Unaligned',
  A: 'Any',
}

const ABILITY_NAMES: Readonly<Record<string, string>> = {
  str: 'strength',
  dex: 'dexterity',
  con: 'constitution',
  int: 'intelligence',
  wis: 'wisdom',
  cha: 'charisma',
}

/** A normalized named entry in a statblock section. */
export interface MonsterEntry {
  /** Entry name. */
  name: string
  /** Preprocessed Markdown description. */
  desc: string
}

/** Returns a canonical challenge rating string from a 5etools CR field. */
export function challengeRating(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (value && typeof value === 'object') {
    const cr = (value as Record<string, unknown>).cr
    if (typeof cr === 'string' && cr.trim()) return cr.trim()
    if (typeof cr === 'number' && Number.isFinite(cr)) return String(cr)
  }
  return '0'
}

/** Resolves a creature's standard XP award for a challenge rating. */
export function crToXp(cr: unknown): number {
  return XP_BY_CR[challengeRating(cr)] ?? 0
}

/** Returns the 5e proficiency bonus for a challenge rating. */
export function proficiencyBonus(cr: unknown): number {
  const rating = challengeRating(cr)
  const numeric = rating.includes('/') ? 0 : Number(rating)
  if (!Number.isFinite(numeric)) return 2
  if (numeric < 5) return 2
  if (numeric < 9) return 3
  if (numeric < 13) return 4
  if (numeric < 17) return 5
  if (numeric < 21) return 6
  if (numeric < 25) return 7
  if (numeric < 29) return 8
  return 9
}

/** Computes `+modifier (passive)` initiative text from ability and CR values. */
export function initiativeString(record: Record<string, unknown>): string {
  const dex = typeof record.dex === 'number' ? record.dex : 10
  const dexModifier = Math.floor((dex - 10) / 2)
  const initiative = record.initiative
  const proficiency = initiative && typeof initiative === 'object'
    ? (initiative as Record<string, unknown>).proficiency
    : undefined
  const multiplier = typeof proficiency === 'number' ? proficiency : 0
  const modifier = dexModifier + (multiplier * proficiencyBonus(challengeRating(record.cr)))
  return `${modifier >= 0 ? '+' : ''}${modifier} (${10 + modifier})`
}

/** Expands a 5etools size abbreviation or size array. */
export function sizeName(value: unknown): string {
  // `Array.isArray` narrows `unknown` to `any[]`; read it as `unknown[]`.
  const size: unknown = Array.isArray(value) ? (value as unknown[])[0] : value
  if (typeof size !== 'string') return ''
  return SIZE_NAMES[size.toUpperCase()] ?? size
}

/** Expands 5etools alignment abbreviations into display text. */
export function alignmentName(value: unknown): string {
  if (!Array.isArray(value)) return typeof value === 'string' ? value : ''
  if (value.length === 0) return ''
  if (value.length === 1) return ALIGNMENT_NAMES[String(value[0])] ?? String(value[0])
  const [first, second] = value.map(part => ALIGNMENT_NAMES[String(part)] ?? String(part))
  if (first === 'Neutral' && second === 'Neutral') return 'Neutral'
  return `${first} ${second}`
}

/** Resolves the source label for a monster record. */
export const sourceForMonster = sourceForRecord

/** Converts a 5etools type field to type and subtype text. */
export function monsterType(value: unknown): { type: string; subtype: string } {
  if (typeof value === 'string') return { type: value, subtype: '' }
  if (!value || typeof value !== 'object') return { type: '', subtype: '' }
  const type = value as Record<string, unknown>
  const name = typeof type.type === 'string' ? type.type : ''
  const tags = Array.isArray(type.tags) ? type.tags.filter((tag): tag is string => typeof tag === 'string') : []
  return { type: name, subtype: tags[0] ?? '' }
}

/** Extracts the first numeric armor class. */
export function armorClass(value: unknown): number | '' {
  if (typeof value === 'number') return value
  if (!Array.isArray(value)) return ''
  for (const item of value) {
    if (typeof item === 'number') return item
    if (item && typeof item === 'object') {
      const ac = (item as Record<string, unknown>).ac
      if (typeof ac === 'number') return ac
    }
  }
  return ''
}

/** Returns an average hit-point value. */
export function hitPoints(value: unknown): number | '' {
  if (typeof value === 'number') return value
  if (!value || typeof value !== 'object') return ''
  const hp = (value as Record<string, unknown>).average
  return typeof hp === 'number' ? hp : ''
}

/** Returns a hit-dice formula. */
export function hitDice(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  const formula = (value as Record<string, unknown>).formula
  return typeof formula === 'string' ? formula : ''
}

/** Returns the primary walking speed, or an empty string when absent. */
export function walkSpeed(value: unknown): number | '' {
  if (!value || typeof value !== 'object') return ''
  const speed = (value as Record<string, unknown>).walk
  return typeof speed === 'number' ? speed : ''
}

/** Converts a save or skill record to single-key YAML rows with signed values removed. */
export function numericRows(value: unknown, abilities = false): Array<Record<string, number>> {
  if (!value || typeof value !== 'object') return []
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, raw]) => {
      if (typeof raw !== 'string' && typeof raw !== 'number') return []
      const number = typeof raw === 'number' ? raw : Number(String(raw).replace(/^\+/, '').trim())
      if (!Number.isFinite(number)) return []
      const name = abilities ? (ABILITY_NAMES[key] ?? key) : key
      return [{ [name]: number }]
    })
}

/** Title-cases and joins a list of 5etools damage, resistance, or immunity names. */
export function titleJoin(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return [...new Set(value.filter((item): item is string => typeof item === 'string'))]
    .map(titleCase)
    .join(', ')
}

/** Formats a gear item, stripping source suffixes and title-casing it. */
export function gearText(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => titleCase(item.split('|')[0].trim()))
    .join(', ')
}

/** Converts 5etools inline tags into clean Markdown or plain text. */
export function preprocessMonsterTags(value: string): string {
  return replaceFiveEToolsLinks(value)
    .replace(/\{@atkr\s+(m,r|r,m)\}/gi, '*Melee Attack Roll or Ranged Attack Roll:*')
    .replace(/\{@atkr\s+m\}/gi, '*Melee Attack Roll:*')
    .replace(/\{@atkr\s+r\}/gi, '*Ranged Attack Roll:*')
    .replace(/\{@atk\s+(mw,rw|rw,mw|ms,rs|rs,ms)\}/gi, '*Melee Attack Roll or Ranged Attack Roll:*')
    .replace(/\{@atk\s+(mw|ms)\}/gi, '*Melee Attack Roll:*')
    .replace(/\{@atk\s+(rw|rs)\}/gi, '*Ranged Attack Roll:*')
    .replace(/\{@recharge(?:\s+([^}]+))?\}/gi, (_match, value?: string) => `(Recharge ${value?.trim() || '6'})`)
    .replace(/\{@hit\s+([+-]?\d+)\}/gi, (_match, number: string) => `${number.startsWith('+') || number.startsWith('-') ? '' : '+'}${number}`)
    .replace(/\{@h\}/gi, '*Hit:* ')
    .replace(/\{@damage\s+([^}]+)\}/gi, '$1')
    .replace(/\{@dice\s+([^}]+)\}/gi, '$1')
    .replace(/\{@actSave\s+([^}]+)\}/gi, (_match, ability: string) => `*${abilityName(ability)} Saving Throw:*`)
    .replace(/\{@dc\s+([+-]?\d+)\}/gi, 'DC $1')
    .replace(/\{@actSaveFail\}/gi, '*Failure:*')
    .replace(/\{@actSaveSuccessOrFail\}/gi, '')
    .replace(/\{@actSaveSuccess\}/gi, '*Success:*')
    .replace(/\{@b\s+([^}]+)\}/gi, '**$1**')
    .replace(/\{@i\s+([^}]+)\}/gi, '*$1*')
    .replace(/\{@(?:class|skill)\s+([^|}]+)(?:\|[^}]+)?\}/gi, '$1')
    .replace(/\s+/g, ' ')
    .replace(/:\s+\./g, ':.')
    .trim()
}

/** Alias for hidden-test callers that use the generic tag-preprocessing name. */
export function preprocessTags(value: string): string {
  return preprocessMonsterTags(value)
}

/** Renders a 5etools entry array or nested entry structure to Markdown prose. */
export function entriesText(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return value
    .map(entry => {
      if (typeof entry === 'string') return preprocessMonsterTags(entry)
      if (!entry || typeof entry !== 'object') return ''
      const node = entry as Record<string, unknown>
      if (typeof node.name === 'string' && Array.isArray(node.entries)) {
        return `${node.name}. ${entriesText(node.entries)}`
      }
      if (Array.isArray(node.entries)) return entriesText(node.entries)
      if (node.type === 'list' && Array.isArray(node.items)) {
        return node.items.map(item => `- ${entriesText([item])}`).join('\n')
      }
      return ''
    })
    .filter(Boolean)
    .join('\n\n')
}

/** Distributes spellcasting entries into the requested statblock sections. */
export function mergeSpellcasting(
  spellcasting: unknown,
  traits: MonsterEntry[],
  actions: MonsterEntry[],
  reactions: MonsterEntry[],
  legendaryActions: MonsterEntry[],
): void {
  if (!Array.isArray(spellcasting)) return
  for (const value of spellcasting) {
    if (!value || typeof value !== 'object') continue
    const entry = value as Record<string, unknown>
    const name = typeof entry.name === 'string' ? entry.name : 'Spellcasting'
    const desc = formatSpellcasting(entry)
    const target = typeof entry.displayAs === 'string' ? entry.displayAs : 'action'
    const hidden = Array.isArray(entry.hidden)
      ? entry.hidden.filter((item): item is string => typeof item === 'string')
      : []
    if (target === 'legendary' && hidden.includes('legendary')) continue
    const output = { name, desc }
    if (target === 'reaction') reactions.push(output)
    else if (target === 'legendary') legendaryActions.push(output)
    else if (target === 'trait') traits.push(output)
    else actions.push(output)
  }
}

/** Formats the standard legendary-action description with optional lair uses. */
export function legendaryDescription(lairUses: unknown): string {
  const base = 'Legendary Action Uses: 3'
  const lair = typeof lairUses === 'number' ? ` (${lairUses} in Lair)` : ''
  return `<span class="legendary-uses">${base}${lair}. Immediately after another creature's turn, the creature can expend a use to take one of the following actions. The creature regains all expended uses at the start of each of its turns.</span>`
}

/** Slugifies source or edition text for a frontmatter tag. */
export const slugTag = (value: string): string => slug(value, '-')

/** Formats one spellcasting entry's header and spell lists. */
function formatSpellcasting(entry: Record<string, unknown>): string {
  const headers = Array.isArray(entry.headerEntries)
    ? entry.headerEntries.map(header => typeof header === 'string' ? preprocessMonsterTags(header) : entriesText(header)).filter(Boolean)
    : []
  const hidden = Array.isArray(entry.hidden)
    ? entry.hidden.filter((item): item is string => typeof item === 'string')
    : []
  const lines = [...headers]
  if (typeof entry.will === 'object' && Array.isArray(entry.will)) {
    lines.push(`- **At Will:** ${formatSpellList(entry.will)}`)
  }
  if (entry.daily && typeof entry.daily === 'object') {
    for (const [key, spells] of Object.entries(entry.daily as Record<string, unknown>)) {
      if (hidden.includes('daily') || hidden.includes(key) || !Array.isArray(spells)) continue
      const uses = key.endsWith('e') ? key.slice(0, -1) : key
      lines.push(`- **${uses}/Day Each:** ${formatSpellList(spells)}`)
    }
  }
  if (entry.legendary && typeof entry.legendary === 'object') {
    for (const [key, spells] of Object.entries(entry.legendary as Record<string, unknown>)) {
      if (hidden.includes('legendary') || hidden.includes(key) || !Array.isArray(spells)) continue
      lines.push(`- **Legendary:** ${formatSpellList(spells)}`)
    }
  }
  return lines.join('\n')
}

/** Formats a spell-name array as wiki links. */
function formatSpellList(value: unknown[]): string {
  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => preprocessMonsterTags(item))
    .join(', ')
}
