// How items are shelved and labelled: rarity shelves, categories, icons, and
// the short facts (bonuses, charges, recharge, weight, restrictions) the
// cards show.

import { magicItemValueCp } from '@vault/derive/magicItemValue.js'

import type { MagicItemRow } from './items'

/**
 * The magic-item catalog's shelves and its character lens — the "Magic Items
 * Layout Proposal" canvas (MYDND-76), as pure functions the page and its tests
 * share.
 *
 * **Shelves are rarities**, the item's level: what a GM hands out at a table of
 * a given tier, and what it costs. The dots are the canvas's rarity colours,
 * grey common up to rose artifact.
 *
 * Everything here reads frontmatter only, so drawing the page reads no file.
 * Charges, recharge, weight, bonuses, `casts` and `summary` are written by
 * `export:items` since MYDND-76 (`magicItemFacts.ts` in the MCP server); a vault
 * exported before then has none of them, and every label below answers null
 * rather than guessing.
 */

export type RarityTone = 'common' | 'uncommon' | 'rare' | 'veryrare' | 'legendary' | 'artifact' | 'none'

export interface RarityShelf {
  id: string
  /** The frontmatter spelling, lower case; null for the shelf of items with none. */
  rarity: string | null
  label: string
  /** The narrow pane's chip. */
  chipLabel: string
  tone: RarityTone
  minLevel: number | null
}

export const RARITY_SHELVES: readonly RarityShelf[] = [
  { id: 'r-common', rarity: 'common', label: 'Common', chipLabel: 'Common', tone: 'common', minLevel: 1 },
  { id: 'r-uncommon', rarity: 'uncommon', label: 'Uncommon', chipLabel: 'Uncommon', tone: 'uncommon', minLevel: 1 },
  { id: 'r-rare', rarity: 'rare', label: 'Rare', chipLabel: 'Rare', tone: 'rare', minLevel: 5 },
  { id: 'r-veryrare', rarity: 'very rare', label: 'Very rare', chipLabel: 'Very rare', tone: 'veryrare', minLevel: 11 },
  { id: 'r-legendary', rarity: 'legendary', label: 'Legendary', chipLabel: 'Legendary', tone: 'legendary', minLevel: 17 },
  { id: 'r-artifact', rarity: 'artifact', label: 'Artifact', chipLabel: 'Artifact', tone: 'artifact', minLevel: null },
]

/** `varies` — 417 notes, mostly generic variants whose tier depends on the version. */
export const VARIES: RarityShelf = {
  id: 'r-varies',
  rarity: 'varies',
  label: 'Varies',
  chipLabel: 'Varies',
  tone: 'none',
  minLevel: null,
}

/** No rarity, `unknown (magic)`, or a homebrew tier. Last, and only drawn when something is on it. */
export const UNKNOWN: RarityShelf = {
  id: 'r-unknown',
  rarity: null,
  label: 'Unknown',
  chipLabel: 'Unknown',
  tone: 'none',
  minLevel: null,
}

export const shelfOf = (rarity: string | null): RarityShelf => {
  const key = (rarity ?? '').trim().toLowerCase()
  return RARITY_SHELVES.find(s => s.rarity === key) ?? (key === 'varies' ? VARIES : UNKNOWN)
}

/** Rows onto their rarity shelves, common first, then Varies and Unknown, each by name. */
export function shelveItems(rows: readonly MagicItemRow[]): Array<{ shelf: RarityShelf; rows: MagicItemRow[] }> {
  const byName = (a: MagicItemRow, b: MagicItemRow) => a.name.localeCompare(b.name)
  return [...RARITY_SHELVES, VARIES, UNKNOWN].map(shelf => ({
    shelf,
    rows: rows.filter(r => shelfOf(r.rarity) === shelf).sort(byName),
  }))
}

/**
 * A shelf's subtitle: `≈5,000 GP · level 5+`. The price is the band the
 * campaign prices the rarity at (`magicItemValue.js`, scaled), passed in so
 * this stays pure; the level is the DMG's suggestion.
 */
export function itemShelfWhen(shelf: RarityShelf, count: number, bandCp: number | null): string {
  const level = shelf.minLevel === null ? null : shelf.minLevel <= 1 ? 'any level' : `level ${shelf.minLevel}+`
  if (shelf.tone === 'artifact') return 'priceless · one of a kind'
  if (shelf === VARIES) return 'tier depends on the version'
  const price = bandCp !== null && bandCp > 0 ? `≈${gp(bandCp)}` : null
  if (!price && !level) return count === 1 ? '1 item' : `${count.toLocaleString('en-US')} items`
  return [price, level].filter(Boolean).join(' · ')
}

/** `500000` cp → `5,000 GP`, as the canvas writes a price. */
const gp = (cp: number): string => `${Math.round(cp / 100).toLocaleString('en-US')} GP`

// --- what an item is ----------------------------------------------------------

export type Category =
  | 'Wondrous'
  | 'Weapon'
  | 'Armor'
  | 'Shield'
  | 'Ring'
  | 'Potion'
  | 'Scroll'
  | 'Wand'
  | 'Staff'
  | 'Rod'
  | 'Ammunition'
  | 'Focus'
  | 'Instrument'
  | 'Variant'
  | 'Other'

const TYPE_CATEGORY: Record<string, Category> = {
  'wondrous item': 'Wondrous',
  'melee weapon': 'Weapon',
  'ranged weapon': 'Weapon',
  weapon: 'Weapon',
  'light armor': 'Armor',
  'medium armor': 'Armor',
  'heavy armor': 'Armor',
  shield: 'Shield',
  ring: 'Ring',
  potion: 'Potion',
  scroll: 'Scroll',
  wand: 'Wand',
  staff: 'Staff',
  rod: 'Rod',
  ammunition: 'Ammunition',
  'spellcasting focus': 'Focus',
  instrument: 'Instrument',
  'generic variant': 'Variant',
}

/**
 * The Type filter's word for an item. A staff is a `Melee Weapon` to 5e.tools
 * with a `staff` flag beside it, and a wondrous item usually has no type at
 * all — 697 notes before MYDND-76 — so both flags are asked before the type.
 */
export function categoryOf(row: Pick<MagicItemRow, 'itemType' | 'wondrous' | 'staff'>): Category {
  if (row.staff) return 'Staff'
  const byType = TYPE_CATEGORY[(row.itemType ?? '').trim().toLowerCase()]
  if (byType) return byType
  return row.wondrous ? 'Wondrous' : 'Other'
}

/** The card's second line: `Wand`, `Wondrous item`, `Staff · quarterstaff`, `Melee weapon`. */
export function kindLabel(row: Pick<MagicItemRow, 'itemType' | 'wondrous' | 'staff'>): string {
  const category = categoryOf(row)
  if (category === 'Wondrous') return 'Wondrous item'
  if (category === 'Staff') return row.itemType && !/^staff$/i.test(row.itemType) ? 'Staff · quarterstaff' : 'Staff'
  if (category === 'Weapon' || category === 'Armor') return sentence(row.itemType ?? category)
  if (category === 'Focus') return 'Spellcasting focus'
  if (category === 'Variant') return 'Generic variant'
  if (category === 'Other') return row.itemType && !/[:|]/.test(row.itemType) ? sentence(row.itemType) : 'Magic item'
  return category
}

const sentence = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s)

export type ItemIcon =
  | 'potion'
  | 'scroll'
  | 'ring'
  | 'wand'
  | 'staff'
  | 'rod'
  | 'sword'
  | 'armor'
  | 'shield'
  | 'arrow'
  | 'music'
  | 'cloak'
  | 'amulet'
  | 'bag'
  | 'belt'
  | 'book'
  | 'boots'
  | 'stones'
  | 'gauntlet'
  | 'gem'

const CATEGORY_ICON: Partial<Record<Category, ItemIcon>> = {
  Potion: 'potion',
  Scroll: 'scroll',
  Ring: 'ring',
  Wand: 'wand',
  Staff: 'staff',
  Rod: 'rod',
  Weapon: 'sword',
  Armor: 'armor',
  Shield: 'shield',
  Ammunition: 'arrow',
  Instrument: 'music',
}

/** A wondrous item's icon, from the thing it is named for. First match wins. */
const NAMED: ReadonlyArray<[RegExp, ItemIcon]> = [
  [/\b(cloak|cape|mantle|robe|shawl)\b/i, 'cloak'],
  [/\b(amulet|necklace|periapt|medallion|talisman|brooch|pendant|scarab)\b/i, 'amulet'],
  [/\b(bag|sack|pouch|haversack|purse|quiver)\b/i, 'bag'],
  [/\b(belt|girdle)\b/i, 'belt'],
  [/\b(manual|tome|book|libram|spellbook|grimoire)\b/i, 'book'],
  [/\b(boots|slippers|sandals|horseshoes)\b/i, 'boots'],
  [/\b(gauntlets|gloves|bracers)\b/i, 'gauntlet'],
  [/\bstones\b/i, 'stones'],
]

/** The icon in an item's tile: its category's, or for a wondrous item, its namesake's. */
export function iconOf(row: Pick<MagicItemRow, 'name' | 'itemType' | 'wondrous' | 'staff'>): ItemIcon {
  const category = categoryOf(row)
  const byCategory = CATEGORY_ICON[category]
  if (byCategory) return byCategory
  // A generic variant is named for what it is stamped onto: `+1 Shield`, `Armor of Gleaming`.
  if (category === 'Variant') for (const [re, icon] of VARIANT) if (re.test(row.name)) return icon
  for (const [re, icon] of NAMED) if (re.test(row.name)) return icon
  return 'gem'
}

const VARIANT: ReadonlyArray<[RegExp, ItemIcon]> = [
  [/\bshield\b/i, 'shield'],
  [/\b(armor|armour|mail|plate)\b/i, 'armor'],
  [/\b(ammunition|arrows?|bolts?)\b/i, 'arrow'],
  [/\b(weapon|sword|blade|axe)\b/i, 'sword'],
]

/** The rail's Type label, short enough for half the rail. */
export const categoryLabel = (c: Category): string => (c === 'Ammunition' ? 'Ammo' : c)

export const CONSUMABLE: ReadonlySet<Category> = new Set(['Potion', 'Scroll', 'Ammunition'])

// --- what an item does --------------------------------------------------------

export interface Cast {
  name: string
  /** `1 charge`, `at will`, `1/day` — null where the cost is only in the prose. */
  cost: string | null
  /** The charges one cast takes, when that is the cost. */
  charges: number | null
}

/** `Fireball (1 charge)` → `{ name: 'Fireball', cost: '1 charge', charges: 1 }`. */
export function parseCast(text: string): Cast {
  const m = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(text.trim())
  if (!m) return { name: text.trim(), cost: null, charges: null }
  const charges = /^(\d+)\s+charges?$/i.exec(m[2].trim())
  return { name: m[1].trim(), cost: m[2].trim(), charges: charges ? Number(charges[1]) : null }
}

/** `+2 attack & damage · +1 AC · +1 saves`, or null for an item with no flat bonus. */
export function bonusLine(
  row: Pick<MagicItemRow, 'bonusAc' | 'bonusWeapon' | 'bonusSavingThrow' | 'bonusSpellAttack'>,
): string | null {
  const ac = row.bonusAc
  const saves = row.bonusSavingThrow
  const parts = [
    row.bonusWeapon ? `${row.bonusWeapon} attack & damage` : null,
    // "+1 AC and saving throws", as the Ring of Protection is drawn — one bonus, both things.
    ac && saves && ac === saves ? `${ac} AC and saving throws` : ac ? `${ac} AC` : null,
    saves && saves !== ac ? `${saves} saves` : null,
    row.bonusSpellAttack ? `${row.bonusSpellAttack} spell attacks` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

/**
 * The card's mono line: what it casts, then its flat bonuses — `Cast Fireball`,
 * `+1 AC and saving throws`. Null when the item has neither, and the card then
 * shows its `summary`, the note's first sentence, instead.
 */
export function effectLine(row: MagicItemRow): string | null {
  const casts = row.casts.map(parseCast)
  const spell =
    casts.length === 0
      ? null
      : casts.length === 1
        ? `Cast ${casts[0].name}${casts[0].cost && !casts[0].charges ? ` · ${casts[0].cost}` : ''}`
        : casts.length === 2
          ? `Cast ${casts[0].name}, ${casts[1].name}`
          : `Casts ${casts.length} spells`
  const line = [spell, bonusLine(row)].filter(Boolean).join(' · ')
  return line || null
}

/** `7`, `1d6 + 1` — the count a charge pip row can draw, or null for dice and none. */
export const chargeCount = (row: Pick<MagicItemRow, 'charges'>): number | null =>
  typeof row.charges === 'number' && row.charges > 0 ? row.charges : null

const PERIOD: Record<string, string> = {
  dawn: 'at dawn',
  dusk: 'at dusk',
  midnight: 'at midnight',
  restshort: 'on a short rest',
  restlong: 'on a long rest',
}

/**
 * When and how much: `+1d6+1 at dawn`, `all at dawn`, `on a long rest`. A
 * homebrew item that writes its amount where the period goes (`recharge: 1d4`)
 * is read as an amount with no period. Null for no recharge, and for `special`,
 * which only the prose explains.
 */
export function rechargeLine(row: Pick<MagicItemRow, 'recharge' | 'rechargeAmount'>): string | null {
  const key = (row.recharge ?? '').trim()
  if (!key || key.toLowerCase() === 'special') return null
  const period = PERIOD[key.toLowerCase()]
  const amount = period ? row.rechargeAmount : key
  const howMuch = amount ? (/^all$/i.test(amount) ? 'all' : `+${compactDice(amount)}`) : null
  return [howMuch, period].filter(Boolean).join(' ') || null
}

/** The detail tile's label and value: `AT DAWN` / `+1d6+1`. */
export function rechargeTile(row: Pick<MagicItemRow, 'recharge' | 'rechargeAmount'>): { label: string; value: string } {
  const key = (row.recharge ?? '').trim().toLowerCase()
  const period = PERIOD[key]
  const amount = period ? row.rechargeAmount : key && key !== 'special' ? row.recharge : null
  return {
    label: period ? period.toUpperCase() : 'RECHARGE',
    value: amount ? (/^all$/i.test(amount) ? 'All' : `+${compactDice(amount)}`) : key === 'special' ? 'See text' : '—',
  }
}

const compactDice = (s: string): string => s.replace(/\s+/g, '')

/** `1 lb`, `½ lb`, `0.25 lb`; null for no weight. */
export function weightLabel(weight: number | null): string | null {
  if (weight === null || weight <= 0) return null
  if (weight === 0.5) return '½ lb'
  return `${weight.toLocaleString('en-US')} lb`
}

const CLASSES = new Set([
  'artificer', 'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk',
  'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard',
])

/**
 * The restriction without its `by`: `by a spellcaster` → `a spellcaster`.
 * What the detail's chip says after "Attunement · ".
 */
export const restrictionText = (restriction: string | null): string | null =>
  restriction ? restriction.trim().replace(/^by\s+/i, '') : null

/**
 * The restriction short enough for a card's flag: `spellcaster`, `3 classes`,
 * `restricted` when it is a sentence. The detail says it in full.
 */
export function shortRestriction(restriction: string | null): string | null {
  const text = restrictionText(restriction)
  if (!text) return null
  const bare = text.replace(/^(a|an)\s+/i, '')
  const parts = bare.split(/\s*,\s*(?:or\s+)?|\s+or\s+/).map(p => p.replace(/^(a|an)\s+/i, '').trim().toLowerCase())
  if (parts.length > 1 && parts.every(p => CLASSES.has(p))) return `${parts.length} classes`
  return bare.length <= 16 ? bare : 'restricted'
}

export interface Flag {
  text: string
  tone: 'attune' | 'charges' | 'neutral' | 'curse'
  /** The full text, for a flag that had to be shortened. */
  title?: string
}

/** The card's foot: attunement, charges, consumable, cursed, sentient. */
export function itemFlagsOf(row: MagicItemRow): Flag[] {
  const flags: Flag[] = []
  if (row.requiresAttunement) {
    const short = shortRestriction(row.attunementRestriction)
    flags.push({
      text: short ? `Attune · ${short}` : 'Attune',
      tone: 'attune',
      title: row.attunementRestriction ? `Requires attunement ${row.attunementRestriction}` : 'Requires attunement',
    })
  }
  if (row.charges !== null) flags.push({ text: `${row.charges} charges`, tone: 'charges' })
  if (CONSUMABLE.has(categoryOf(row))) flags.push({ text: 'Consumable', tone: 'neutral' })
  if (row.cursed) flags.push({ text: 'Cursed', tone: 'curse' })
  if (row.sentient) flags.push({ text: 'Sentient', tone: 'neutral' })
  return flags
}

/** The narrow row's corner: `7 ch`, else the weight. */
export const rowCorner = (row: MagicItemRow): string =>
  row.charges !== null ? `${row.charges} ch` : (weightLabel(row.weight) ?? '')

/** The narrow row's flags: `ATT CURSE`. */
export const rowFlags = (row: MagicItemRow): string =>
  [row.requiresAttunement ? 'ATT' : null, row.cursed ? 'CURSE' : null, CONSUMABLE.has(categoryOf(row)) ? 'CONSUM' : null]
    .filter(Boolean)
    .join(' ')

// --- the open item ------------------------------------------------------------

export interface ChargeStep {
  label: string
  dice: string
  base: boolean
}

/**
 * The open item's "Charges per cast" row — 1 charge casts Fireball at level 3
 * (8d6), 2 at level 4, 3 at level 5 — or null when it cannot be read.
 *
 * Read from the note's prose, because no field carries it: the XDMG wands say
 * "expend no more than 3 charges", "For 1 charge, you cast the level 3
 * version" and "increase the spell's level by 1 for each additional charge".
 * All three must be there, and the item must cast exactly one spell for a
 * charge; `diceAt` turns a level into dice from the spell's own upcast.
 */
export function chargeLadder(
  prose: string,
  cast: Cast | null,
  diceAt: (level: number) => string | null,
): ChargeStep[] | null {
  if (!cast || cast.charges !== 1) return null
  const most = /no more than (\d+) charges/i.exec(prose)
  const base = /for 1 charge, you cast the level (\d+) version/i.exec(prose)
  const grows = /increase the spell's level by 1 for each additional charge/i.test(prose)
  if (!most || !base || !grows) return null
  const top = Number(most[1])
  const level = Number(base[1])
  if (!(top >= 1 && top <= 9) || !(level >= 1 && level <= 9)) return null
  return Array.from({ length: Math.min(top, 10 - level) }, (_, i) => {
    const dice = diceAt(level + i)
    return {
      label: `${i + 1} ${i === 0 ? 'CHARGE' : 'CHARGES'}`,
      dice: dice ? `L${level + i} · ${dice}` : `L${level + i}`,
      base: i === 0,
    }
  })
}

/** `save DC 15` in the prose → `Save DC 15`. The wands state their own DC. */
export function saveDcOf(prose: string): string | null {
  const m = /\bsave DC (\d+)\b/i.exec(prose)
  return m ? `Save DC ${m[1]}` : null
}

// --- the character lens & sheet inventory charges ----------------------------

export interface LensChip {
  tone: 'fits' | 'over'
  text: string
}

/** Charges left of the most, as a chip: `4 of 7 charges`, `Last charge`, `No charges left`. */
export function chargesChip(max: number, used: number): LensChip {
  const left = Math.max(0, max - used)
  if (left === 0) return { tone: 'over', text: 'No charges left' }
  if (left === 1) return { tone: 'over', text: 'Last charge' }
  if (left < max / 2) return { tone: 'over', text: `${left} of ${max} charges left` }
  return { tone: 'fits', text: `${left} of ${max} charges` }
}

/**
 * What one magic item is worth in this campaign, in copper — moved here from
 * the page in MYDND-76, unchanged. The override wins when set (including `0`),
 * anything else takes its rarity band scaled by the campaign's percentage, and
 * `varies`, `artifact` and `unknown (magic)` are in no band and stay null.
 * `magicItemValue.js` is canonical for it; see the page's history for why the
 * Value column read nothing before MYDND-5.
 */
export const itemValueCp = (item: Pick<MagicItemRow, 'rarity' | 'valueCp'>, percent: number): number | null =>
  magicItemValueCp({ rarity_id: item.rarity, value_cp: item.valueCp, component_type: null }, percent)
