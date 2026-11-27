/**
 * Pure parsing and normalization helpers for 5etools gear and food records.
 *
 * These helpers intentionally avoid Obsidian and vault dependencies so gear
 * mapping remains deterministic and directly unit-testable.
 */
import {
  itemCostCopper,
  itemEntriesText,
  itemExportHash,
  itemSource,
  itemTags,
  itemTypeCode,
  itemWeight,
  cleanItemTags,
} from '../itemHelpers'

/**
 * Normalized gear values consumed by the Markdown builder.
 */
export interface GearMarkdownData {
  /** Canonical gear name. */
  name: string
  /** Canonical display source. */
  source: string
  /** Human-readable gear category. */
  itemType: string
  /** Cost in copper pieces. */
  costCp: number | null
  /** Weight in pounds. */
  weight: number | null
  /** Whether the item is consumable. */
  consumable: boolean
  /** Clean rendered description text. */
  bodyText: string
}

/**
 * Converts a 5etools gear type code into a human-readable item type.
 *
 * @param value Raw `type` field.
 * @returns `Food and Drink`, `Adventuring Gear`, or a suitable gear fallback.
 */
export function gearTypeName(value: unknown): string {
  const code = itemTypeCode(value)
  if (code === 'FD' || code === 'FOOD') return 'Food and Drink'
  if (code === 'G' || code === 'GEAR') return 'Adventuring Gear'
  if (code === 'EXP') return 'Explosives'
  if (code === 'MNT') return 'Mount'
  if (code === 'P' || code === 'POTION') return 'Potion'
  if (code === 'RG' || code === 'RING') return 'Ring'
  if (code === 'RD' || code === 'ROD') return 'Rod'
  if (code === 'SC' || code === 'SCROLL') return 'Scroll'
  if (code === 'SCF') return 'Spellcasting Focus'
  if (code === 'ST' || code === 'STAFF') return 'Staff'
  if (code === 'TAH') return 'Tack and Harness'
  if (code === 'WD' || code === 'WAND') return 'Wand'
  return 'Adventuring Gear'
}

/**
 * Resolves the display source label for a gear record.
 *
 * @param record Raw 5etools gear record.
 * @returns The record's 5etools source code, such as `XPHB`, or `unknown`.
 */
export function sourceForGear(record: Record<string, unknown>): string {
  return itemSource(record)
}

/**
 * Converts a 5etools value field into copper pieces.
 *
 * @param record Raw 5etools gear record.
 * @returns Cost in copper pieces or `null` when value is absent.
 */
export function gearCostCopper(record: Record<string, unknown>): number | null {
  return itemCostCopper(record)
}

/**
 * Reads weight in pounds from a gear record.
 *
 * @param record Raw 5etools gear record.
 * @returns Numeric weight or `null`.
 */
export function gearWeight(record: Record<string, unknown>): number | null {
  return itemWeight(record)
}

/**
 * Detects whether a gear item is consumable.
 *
 * @param record Raw 5etools gear record.
 * @returns True when explicit or conventional consumable fields are set.
 */
export function isConsumableGear(record: Record<string, unknown>): boolean {
  if (record.consumable === true || record.expendable === true) return true
  return typeof record.entries === 'object'
    && Array.isArray(record.entries)
    && record.entries.some(entry => typeof entry === 'string' && /\bconsume\b|expend|single use/i.test(entry))
}

/**
 * Recursively renders nested 5etools entries as clean prose.
 *
 * @param entries Raw `entries` field.
 * @returns Clean readable text paragraphs.
 */
export function gearEntriesText(entries: unknown): string {
  return itemEntriesText(entries)
}

/**
 * Replaces 5etools inline markup with clean readable text.
 *
 * @param value Raw 5etools text.
 * @returns Plain text with DC, damage, action, item, and hazard tags cleaned.
 */
export function cleanGearTags(value: string): string {
  return cleanItemTags(value)
}

/**
 * Builds stable frontmatter tags for a gear item.
 *
 * @param itemType Human-readable gear item type.
 * @param source Canonical source label.
 * @returns Ordered tag list.
 */
export function gearTags(itemType: string, source: string): string[] {
  return itemTags(itemType, source)
}

/**
 * Computes a stable export fingerprint for a gear body.
 *
 * @param body Markdown body excluding frontmatter.
 * @returns SHA-256 fingerprint prefixed with `sha256-`.
 */
export function gearExportHash(body: string): Promise<string> {
  return itemExportHash(body)
}
