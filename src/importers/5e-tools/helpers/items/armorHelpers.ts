/**
 * Pure normalization helpers for 5etools shield and armor records.
 *
 * The functions in this module have no vault or Obsidian dependencies and
 * provide the deterministic values consumed by armor Markdown rendering.
 */
import {
  firstNumber,
  itemCostCopper,
  itemExportHash,
  itemSlug,
  itemSource,
  itemTags,
  itemTypeCode,
  itemWeight,
  stringValue,
} from '../itemHelpers'

/**
 * Converts a 5etools armor type code into a human-readable item type.
 *
 * @param value Raw `type` field from a 5etools item record.
 * @returns `Shield`, `Light Armor`, `Medium Armor`, `Heavy Armor`, or `Armor`.
 */
export function armorTypeName(value: unknown): string {
  const code = itemTypeCode(value)
  if (code === 'S') return 'Shield'
  if (code === 'LA') return 'Light Armor'
  if (code === 'MA') return 'Medium Armor'
  if (code === 'HA') return 'Heavy Armor'
  return 'Armor'
}

/**
 * Determines whether an armor or shield record represents a shield.
 *
 * @param record Raw 5etools item record.
 * @returns True when the record's type code is `S`.
 */
export function isShield(record: Record<string, unknown>): boolean {
  return itemTypeCode(record.type) === 'S'
}

/**
 * Resolves the display source label for an armor or shield record.
 *
 * @param record Raw 5etools item record.
 * @returns The record's 5etools source code, such as `XPHB`, or `unknown`.
 */
export function sourceForArmor(record: Record<string, unknown>): string {
  return itemSource(record)
}

/**
 * Reads a 5etools value and converts it to copper pieces.
 *
 * @param record Raw 5etools item record.
 * @returns Cost in copper pieces or `null` when no numeric value is available.
 */
export function costCopper(record: Record<string, unknown>): number | null {
  return itemCostCopper(record)
}

/**
 * Reads numeric Armor Class metadata from a 5etools record.
 *
 * @param record Raw 5etools item record.
 * @returns Numeric AC or `null` when unavailable.
 */
export function armorAc(record: Record<string, unknown>): number | null {
  return firstNumber(record.ac, record.armorClass)
}

/**
 * Reads weight in pounds from a 5etools record.
 *
 * @param record Raw 5etools item record.
 * @returns Numeric weight or `null` when unavailable.
 */
export function armorWeight(record: Record<string, unknown>): number | null {
  return itemWeight(record)
}

/**
 * Normalizes a 5etools item name.
 *
 * @param record Raw 5etools item record.
 * @returns Record name or `Unnamed Armor`.
 */
export function armorName(record: Record<string, unknown>): string {
  return stringValue(record.name) ?? 'Unnamed Armor'
}

/**
 * Builds stable tags for a normalized armor or shield record.
 *
 * @param itemType Human-readable armor item type.
 * @param source Canonical display source.
 * @returns Ordered frontmatter tags.
 */
export function armorTags(itemType: string, source: string): string[] {
  return itemTags(itemType, source)
}

/**
 * Computes the stable export fingerprint for an armor body.
 *
 * @param body Markdown body excluding frontmatter.
 * @returns SHA-256 fingerprint prefixed with `sha256-`.
 */
export function armorExportHash(body: string): Promise<string> {
  return itemExportHash(body)
}

/**
 * Normalized data consumed by the armor Markdown builder.
 */
export interface ArmorMarkdownData {
  /** Canonical armor or shield name. */
  name: string
  /** Canonical source label. */
  source: string
  /** Human-readable item type. */
  itemType: string
  /** Cost in copper pieces. */
  costCp: number | null
  /** Weight in pounds. */
  weight: number | null
  /** Numeric Armor Class. */
  ac: number | null
}

/**
 * Converts a display label into a lowercase hyphenated slug.
 *
 * @param value Human-readable label.
 * @returns Lowercase URL-safe tag segment.
 */
export function slug(value: string): string {
  return itemSlug(value)
}
