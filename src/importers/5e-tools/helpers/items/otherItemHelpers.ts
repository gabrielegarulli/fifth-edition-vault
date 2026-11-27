/**
 * Pure parsing helpers for miscellaneous, mount, vehicle, and fallback items.
 *
 * This module is independent of Obsidian and vault APIs so fallback metadata
 * normalization remains deterministic and unit-testable.
 */
import {
  cleanItemTags,
  itemCostCopper,
  itemEntriesText,
  itemExportHash,
  itemSlug,
  itemSource,
  itemTags,
  itemTypeCode,
  itemWeight,
} from '../itemHelpers'

/**
 * Normalized values consumed by the fallback item Markdown builder.
 */
export interface OtherItemMarkdownData {
  /** Canonical item name. */
  name: string
  /** Canonical display source. */
  source: string
  /** Human-readable fallback item type. */
  itemType: string
  /** Cost in copper pieces. */
  costCp: number | null
  /** Weight in pounds. */
  weight: number | null
  /** Carrying capacity, when available. */
  carryingCapacity: string
  /** Movement speed, when available. */
  speed: string
  /** Clean description text from nested 5etools entries. */
  bodyText: string
}

/**
 * Maps a miscellaneous 5etools type code to a readable item type.
 *
 * @param value Raw `type` field.
 * @returns A readable fallback type or `Other`.
 */
export function otherItemTypeName(value: unknown): string {
  const code = itemTypeCode(value)
  const names: Readonly<Record<string, string>> = {
    MNT: 'Mount',
    TAH: 'Tack and Harness',
    AIR: 'Vehicle (Air)',
    LAND: 'Vehicle (Land)',
    SEA: 'Vehicle (Water)',
    SPACE: 'Vehicle (Space)',
    VEHICLE: 'Vehicle',
    GV: 'Generic Variant',
    TAT: 'Tattoo',
  }
  return names[code] ?? 'Other'
}

/**
 * Resolves the display source label for a fallback item.
 *
 * @param record Raw 5etools item record.
 * @returns The record's 5etools source code, such as `XPHB`, or `unknown`.
 */
export function sourceForOtherItem(record: Record<string, unknown>): string {
  return itemSource(record)
}

/**
 * Converts a fallback item value field into copper pieces.
 *
 * @param record Raw 5etools item record.
 * @returns Cost in copper pieces or `null` when absent.
 */
export function otherItemCostCopper(record: Record<string, unknown>): number | null {
  return itemCostCopper(record)
}

/**
 * Reads weight in pounds from a fallback item.
 *
 * @param record Raw 5etools item record.
 * @returns Numeric weight or `null`.
 */
export function otherItemWeight(record: Record<string, unknown>): number | null {
  return itemWeight(record)
}

/**
 * Extracts carrying capacity from common 5etools fields.
 *
 * @param record Raw 5etools item record.
 * @returns Carrying-capacity text or an empty string.
 */
export function otherItemCarryingCapacity(record: Record<string, unknown>): string {
  const value = record.carryingCapacity ?? record.capacity
  if (typeof value === 'number' && Number.isFinite(value)) return `${value} lb.`
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

/**
 * Extracts walking or general speed from a fallback item.
 *
 * @param record Raw 5etools item record.
 * @returns Speed text or an empty string.
 */
export function otherItemSpeed(record: Record<string, unknown>): string {
  const value = record.speed
  if (typeof value === 'number' && Number.isFinite(value)) return `${value} ft.`
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (value && typeof value === 'object') {
    const walk = (value as Record<string, unknown>).walk
    if (typeof walk === 'number' && Number.isFinite(walk)) return `${walk} ft.`
  }
  return ''
}

/**
 * Recursively converts fallback item entries to clean plain text.
 *
 * @param entries Raw `entries` field.
 * @returns Clean readable text.
 */
export function otherItemEntriesText(entries: unknown): string {
  return itemEntriesText(entries)
}

/**
 * Removes 5etools inline markup while preserving readable values.
 *
 * @param value Raw 5etools text.
 * @returns Plain readable text.
 */
export function cleanOtherItemTags(value: string): string {
  return cleanItemTags(value)
}

/**
 * Builds stable tags for a fallback item.
 *
 * @param itemType Human-readable item type.
 * @param source Canonical source label.
 * @returns Ordered tag list.
 */
export function otherItemTags(itemType: string, source: string): string[] {
  return itemTags(itemType, source)
}

/**
 * Converts a fallback item type into a lowercase hyphenated slug.
 *
 * @param value Human-readable item type.
 * @returns Lowercase URL-safe tag segment.
 */
export function otherItemSlug(value: string): string {
  return itemSlug(value)
}

/**
 * Computes a stable export fingerprint for fallback item body text.
 *
 * @param body Markdown body excluding frontmatter.
 * @returns SHA-256 fingerprint prefixed with `sha256-`.
 */
export function otherItemExportHash(body: string): Promise<string> {
  return itemExportHash(body)
}
