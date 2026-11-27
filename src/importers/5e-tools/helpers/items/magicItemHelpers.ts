/**
 * Pure parsing and normalization helpers for 5etools magic-item records.
 *
 * This module deliberately has no Obsidian or vault dependencies.  It owns
 * inline-tag cleanup, structured attunement parsing, spell/charge extraction,
 * table normalization, and stable export metadata.
 */
import { firstNumber, itemExportHash, itemSlug, itemSource, itemTypeCode, itemWeight, stringValue } from '../itemHelpers'

/** A single 5etools table row normalized for Markdown rendering. */
export interface MagicItemTableRow {
  /** Ordered Markdown cell values. */
  cells: string[]
}

/** A normalized 5etools table. */
export interface MagicItemTable {
  /** Readable table headers. */
  headers: string[]
  /** Ordered table rows. */
  rows: MagicItemTableRow[]
}

/** A spell attached to a magic item and its charge cost. */
export interface MagicItemSpellCharge {
  /** Spell name. */
  name: string
  /** Charge cost, when specified. */
  chargeCost: string
}

/** Normalized values consumed by the magic-item Markdown builder. */
export interface MagicItemMarkdownData {
  /** Canonical item name. */
  name: string
  /** Canonical source label. */
  source: string
  /** Human-readable item category. */
  itemType: string
  /** Rarity, including `varies` for item groups. */
  rarity: string
  /** Whether the item requires attunement. */
  requiresAttunement: boolean
  /** Human-readable attunement restriction. */
  attunementRestriction: string
  /** Whether the item is marked cursed. */
  cursed: boolean
  /** Whether the item is wondrous. */
  wondrous: boolean
  /** Weight in pounds. */
  weight: number | null
  /** Short description used in frontmatter. */
  summary: string
  /** Total charges. */
  charges: number | null
  /** Recharge interval, such as `dawn`. */
  recharge: string
  /** Recharge expression, such as `2d8 + 4`. */
  rechargeAmount: string
  /** AC bonus. */
  bonusAc: number | null
  /** Weapon attack/damage bonus. */
  bonusWeapon: string
  /** Saving throw bonus. */
  bonusSavingThrow: number | null
  /** Spell attack bonus. */
  bonusSpellAttack: number | null
  /** Main normalized description, including named sections and tables. */
  description: string
  /** Spells grouped by charge cost. */
  spellCharges: MagicItemSpellCharge[]
  /** Additional 5etools tables found in entries. */
  tables: MagicItemTable[]
  /** Variant items declared by an item group. */
  variants: string[]
}

/**
 * Resolves the display source for a magic-item record.
 *
 * @param record Raw 5etools magic-item record.
 * @returns The record's 5etools source code, such as `XPHB`, or `unknown`.
 */
export function sourceForMagicItem(record: Record<string, unknown>): string {
  return itemSource(record)
}

/**
 * Returns the canonical magic-item rarity.
 *
 * @param record Raw 5etools magic-item record.
 * @returns Lowercase rarity or `unknown`.
 */
export function magicItemRarity(record: Record<string, unknown>): string {
  return stringValue(record.rarity)?.toLowerCase() ?? 'unknown'
}

/**
 * Determines the human-readable category for a magic item.
 *
 * @param record Raw 5etools magic-item record.
 * @returns Item category such as `Wondrous Item`, `Staff`, or `Item Group`.
 */
export function magicItemTypeName(record: Record<string, unknown>): string {
  if (magicItemRarity(record) === 'varies' && (Array.isArray(record.items) || record.itemType === 'Item Group')) {
    return 'Item Group'
  }
  if (record.staff === true) return 'Staff'
  if (record.wondrous === true) return 'Wondrous Item'
  const code = itemTypeCode(record.type)
  if (code === 'M' || code === 'R') return 'Magic Weapon'
  if (code === 'LA' || code === 'MA' || code === 'HA' || code === 'S') return 'Magic Armor'
  if (record.armor === true) return 'Magic Armor'
  if (record.weapon === true || record.weaponCategory === 'simple' || record.weaponCategory === 'martial') return 'Magic Weapon'
  if (record.type === 'Item Group') return 'Item Group'
  return 'Magic Item'
}

/**
 * Reads the attunement value and whether it requires attunement.
 *
 * @param record Raw 5etools magic-item record.
 * @returns An object containing the boolean and readable restriction.
 */
export function magicItemAttunement(record: Record<string, unknown>): { requiresAttunement: boolean; restriction: string } {
  if (record.reqAttune === true) {
    return { requiresAttunement: true, restriction: magicItemAttunementTags(record) }
  }
  if (typeof record.reqAttune === 'string') {
    const restriction = cleanInlineTags(record.reqAttune)
      .trim()
    return { requiresAttunement: true, restriction }
  }
  const tags = magicItemAttunementTags(record)
  return { requiresAttunement: tags.length > 0, restriction: tags }
}

/**
 * Formats attunement restriction tags and optional prose.
 *
 * @param record Raw 5etools magic-item record.
 * @param prose Optional reqAttune prose.
 * @returns A human-readable attunement restriction.
 */
export function magicItemAttunementTags(record: Record<string, unknown>, prose = ''): string {
  const restrictions: string[] = []
  if (prose) restrictions.push(prose)
  if (Array.isArray(record.reqAttuneTags)) {
    for (const tag of record.reqAttuneTags) {
      if (!tag || typeof tag !== 'object') continue
      const object = tag as Record<string, unknown>
      for (const key of ['class', 'subclass', 'background', 'race', 'subrace', 'creature']) {
        const value = stringValue(object[key])
        if (value) restrictions.push(key === 'class' ? value : `${titleCase(key)}: ${value}`)
      }
    }
  }
  return [...new Set(restrictions)].join(', ')
}

/**
 * Reads numeric magic-item weight.
 *
 * @param record Raw 5etools magic-item record.
 * @returns Weight in pounds or `null`.
 */
export function magicItemWeight(record: Record<string, unknown>): number | null {
  return itemWeight(record)
}

/**
 * Reads numeric charge and bonus fields.
 *
 * @param record Raw 5etools magic-item record.
 * @returns An object of normalized numeric or string bonus values.
 */
export function magicItemMetrics(record: Record<string, unknown>): {
  charges: number | null
  recharge: string
  rechargeAmount: string
  bonusAc: number | null
  bonusWeapon: string
  bonusSavingThrow: number | null
  bonusSpellAttack: number | null
} {
  const rechargeAmount = typeof record.rechargeAmount === 'string'
    ? cleanInlineTags(record.rechargeAmount)
    : ''
  return {
    charges: firstNumber(record.charges),
    recharge: stringValue(record.recharge)?.toLowerCase() ?? '',
    rechargeAmount,
    bonusAc: signedNumber(record.bonusAc),
    bonusWeapon: stringValue(record.bonusWeapon) ?? '',
    bonusSavingThrow: signedNumber(record.bonusSavingThrow),
    bonusSpellAttack: signedNumber(record.bonusSpellAttack),
  }
}

/**
 * Formats a short frontmatter summary from a summary field or first entry.
 *
 * @param record Raw 5etools magic-item record.
 * @returns A cleaned single-sentence summary or empty text.
 */
export function magicItemSummary(record: Record<string, unknown>): string {
  if (typeof record.summary === 'string') return cleanInlineTags(record.summary).trim()
  if (typeof record.entries === 'undefined') return ''
  const first = firstEntryText(record.entries)
  return cleanInlineTags(first).replace(/\s+/g, ' ').trim()
}

/**
 * Finds the first readable text in nested entries.
 *
 * @param value Raw entry collection.
 * @returns First readable text or an empty string.
 */
export function firstEntryText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    for (const entry of value) {
      const text = firstEntryText(entry)
      if (text) return text
    }
  }
  if (!value || typeof value !== 'object') return ''
  const entry = value as Record<string, unknown>
  if (typeof entry.entry === 'string') return entry.entry
  if (typeof entry.entries !== 'undefined') return firstEntryText(entry.entries)
  return ''
}

/**
 * Removes 5etools inline tags and converts common tags to readable text.
 *
 * @param value Raw 5etools text.
 * @returns Clean Markdown/plain text.
 */
export function cleanInlineTags(value: string): string {
  let result = value
  result = result.replace(/\{@dc\s+([^}]+)\}/gi, 'DC $1')
  result = result.replace(/\{@chance\s+([^}]+)\}/gi, '$1%')
  result = result.replace(/\{@dice\s+([^}]+)\}/gi, '$1')
  result = result.replace(/\{@[^}\s]+\s+([^}]*)\}/gi, (_match, content: string) => {
    const parts = content.split('|').map(part => part.trim()).filter(Boolean)
    if (parts.length === 0) return ''
    if (parts.length >= 3) return parts[parts.length - 1] || parts[0]
    return parts[0]
  })
  result = result.replace(/\{@b\s+([^}]+)\}/gi, '**$1**')
  result = result.replace(/\{@i\s+([^}]+)\}/gi, '*$1*')
  result = result.replace(/\{@[^|\s}]+\s+([^}|]+)(?:\|[^}]*)?\}/gi, '$1')
  return result.replace(/\s+/g, ' ').trim()
}

/**
 * Converts a 5etools entry tree into readable Markdown.
 *
 * @param entries Raw 5etools `entries` value.
 * @returns Markdown description.
 */
export function magicItemEntriesMarkdown(entries: unknown): string {
  return renderEntryValue(entries, 0).trim()
}

/**
 * Renders unknown entry values recursively.
 *
 * @param value Entry collection or object.
 * @param depth Current named-heading depth.
 * @returns Rendered Markdown.
 */
function renderEntryValue(value: unknown, depth: number): string {
  if (typeof value === 'string') return cleanInlineTags(value)
  if (Array.isArray(value)) {
    return value.map(entry => renderEntryValue(entry, depth)).filter(Boolean).join('\n\n')
  }
  if (!value || typeof value !== 'object') return ''
  const entry = value as Record<string, unknown>
  const entryType = typeof entry.type === 'string' ? entry.type.trim().toLowerCase() : ''
  if (entryType === 'list' && Array.isArray(entry.items)) {
    return renderListItems(entry.items, depth)
  }
  if (Array.isArray(entry.rows) && Array.isArray(entry.colLabels)) {
    return magicItemTableMarkdown(normalizeMagicItemTable(entry))
  }
  const name = stringValue(entry.name)
  if (name) {
    const nested = typeof entry.entries !== 'undefined'
      ? renderEntryValue(entry.entries, depth + 1)
      : typeof entry.entry === 'string'
        ? cleanInlineTags(entry.entry)
        : ''
    const cleanName = cleanInlineTags(name).replace(/[.:]$/, '').trim()
    if (!nested) return `**${cleanName}.**`
    if (nested.startsWith('- ') || nested.startsWith('| ') || nested.startsWith('**')) {
      return `**${cleanName}.**\n\n${nested}`
    }
    return `**${cleanName}.** ${nested}`
  }
  if (typeof entry.entry === 'string') return cleanInlineTags(entry.entry)
  if (typeof entry.entries !== 'undefined') return renderEntryValue(entry.entries, depth)
  return ''
}

/**
 * Renders all items in a 5etools list object at arbitrary nesting depth.
 *
 * @param items Raw list-item collection.
 * @param depth Current recursive entry depth.
 * @returns Markdown bullet list text.
 */
function renderListItems(items: unknown[], depth: number): string {
  return items.flatMap(item => {
    if (typeof item === 'string') {
      const text = cleanInlineTags(item).trim()
      return text ? [`- ${text}`] : []
    }
    if (!item || typeof item !== 'object') return []
    const object = item as Record<string, unknown>
    if (typeof object.entry === 'string') {
      const text = cleanInlineTags(object.entry).trim()
      if (!text) return []
      const nested = Array.isArray(object.entries)
        ? renderEntryValue(object.entries, depth + 1)
        : ''
      return [`- ${text}${nested ? `\n\n${nested}` : ''}`]
    }
    const rendered = renderEntryValue(object, depth + 1).trim()
    return rendered ? [`- ${rendered}`] : []
  }).join('\n')
}

/**
 * Extracts tables from entry objects.
 *
 * @param entries Raw 5etools entries.
 * @returns Ordered normalized tables.
 */
export function magicItemTables(entries: unknown): MagicItemTable[] {
  const tables: MagicItemTable[] = []
  visitTableEntries(entries, tables)
  return tables
}

/**
 * Visits entries recursively and collects table objects.
 *
 * @param value Raw entry value.
 * @param tables Destination table collection.
 * @returns No return value.
 */
function visitTableEntries(value: unknown, tables: MagicItemTable[]): void {
  if (Array.isArray(value)) {
    for (const entry of value) visitTableEntries(entry, tables)
    return
  }
  if (!value || typeof value !== 'object') return
  const entry = value as Record<string, unknown>
  if (Array.isArray(entry.rows) && Array.isArray(entry.colLabels)) tables.push(normalizeMagicItemTable(entry))
  if (Array.isArray(entry.entries)) visitTableEntries(entry.entries, tables)
}

/**
 * Converts a raw 5etools table object into normalized headers and rows.
 *
 * @param table Raw 5etools table object.
 * @returns Normalized table.
 */
export function normalizeMagicItemTable(table: Record<string, unknown>): MagicItemTable {
  const headers = Array.isArray(table.colLabels)
    ? table.colLabels.flatMap(label => typeof label === 'string' ? [cleanInlineTags(label)] : [])
    : []
  const rows = Array.isArray(table.rows)
    ? table.rows.flatMap(row => {
      if (!Array.isArray(row)) return []
      return [{
        cells: row.map(cell => typeof cell === 'string'
          ? cleanInlineTags(cell)
          : typeof cell === 'number' ? String(cell) : ''),
      }]
    })
    : []
  return { headers, rows }
}

/**
 * Builds Markdown for a normalized 5etools table.
 *
 * @param table Normalized table.
 * @returns Markdown table with separator row.
 */
export function magicItemTableMarkdown(table: MagicItemTable): string {
  if (!table.headers.length) return ''
  const separator = table.headers.map(() => '---')
  const lines = [
    `| ${table.headers.join(' | ')} |`,
    `| ${separator.join(' | ')} |`,
    ...table.rows.map(row => `| ${row.cells.join(' | ')} |`),
  ]
  return lines.join('\n')
}

/**
 * Extracts attached spells and their charge costs.
 *
 * @param record Raw 5etools magic-item record.
 * @returns Ordered spell-charge entries.
 */
export function magicItemSpellCharges(record: Record<string, unknown>): MagicItemSpellCharge[] {
  const attached = record.attachedSpells
  const casts = record.casts
  const chargesObject = attached && typeof attached === 'object'
    ? (attached as Record<string, unknown>).charges
    : undefined
  const source = chargesObject && typeof chargesObject === 'object'
    ? chargesObject
    : casts && typeof casts === 'object'
      ? casts
      : null
  if (!source) return []
  const spells: MagicItemSpellCharge[] = []
  for (const [cost, value] of Object.entries(source as Record<string, unknown>).sort((a, b) => {
    const first = Number(a[0])
    const second = Number(b[0])
    return Number.isFinite(first) && Number.isFinite(second) ? first - second : a[0].localeCompare(b[0])
  })) {
    if (!Array.isArray(value)) continue
    for (const spell of value) {
      if (typeof spell !== 'string') continue
      const name = spell.split('|', 1)[0]?.replace(/^[^|]*?\./, '').trim() ?? ''
      spells.push({ name: name ? titleCase(name) : spell, chargeCost: cost })
    }
  }
  return spells
}

/**
 * Builds a Markdown spell-charge table.
 *
 * @param spells Ordered attached spell entries.
 * @returns Markdown table or empty string.
 */
export function magicItemSpellTable(spells: MagicItemSpellCharge[]): string {
  if (!spells.length) return ''
  return magicItemTableMarkdown({
    headers: ['Spell', 'Charge Cost'],
    rows: spells.map(spell => ({ cells: [spell.name, spell.chargeCost] })),
  })
}

/**
 * Reads variant item names from an item-group record.
 *
 * @param record Raw 5etools magic-item record.
 * @returns Ordered unique variant names.
 */
export function magicItemVariants(record: Record<string, unknown>): string[] {
  if (!Array.isArray(record.items)) return []
  return [...new Set(record.items.flatMap(item => {
    if (typeof item !== 'string') return []
    const name = item.split('|', 1)[0]?.trim()
    return name ? [name] : []
  }))]
}

/**
 * Builds stable frontmatter tags for a magic item.
 *
 * @param data Normalized magic-item data.
 * @returns Ordered tag list.
 */
export function magicItemTags(data: MagicItemMarkdownData): string[] {
  const tags = ['magic-item', `item/${itemSlug(data.itemType)}`, `rarity/${itemSlug(data.rarity)}`]
  if (data.requiresAttunement) tags.push('attunement')
  if (data.cursed) tags.push('cursed')
  return tags
}

/**
 * Determines whether a record is marked as cursed.
 *
 * @param record Raw 5etools magic-item record.
 * @returns True for an explicit cursed flag.
 */
export function magicItemIsCursed(record: Record<string, unknown>): boolean {
  return record.curse === true || record.cursed === true
}

/**
 * Computes a stable export fingerprint for a magic-item body.
 *
 * @param body Complete Markdown body excluding frontmatter.
 * @returns SHA-256 fingerprint prefixed with `sha256-`.
 */
export function magicItemExportHash(body: string): Promise<string> {
  return itemExportHash(body)
}

/**
 * Reads a signed numeric field represented as a number or 5etools string.
 *
 * @param value Numeric or signed-string candidate.
 * @returns Parsed finite number or `null`.
 */
function signedNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^[+-]?\d+(?:\.\d+)?$/.test(value.trim())) {
    const parsed = Number(value.trim())
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/**
 * Applies title case to a short identifier.
 *
 * @param value Raw identifier.
 * @returns Title-cased text.
 */
function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/(?:^|\s)[a-z]/g, letter => letter.toUpperCase())
}
