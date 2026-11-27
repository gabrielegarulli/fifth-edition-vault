/**
 * Pure parsing and normalization helpers for 5etools tool and instrument records.
 *
 * This module has no Obsidian or vault dependencies so nested-entry parsing,
 * inline-tag cleanup, currency conversion, and tag generation remain deterministic.
 */
import {
  cleanItemTags,
  itemCostCopper,
  itemExportHash,
  itemSource,
  itemTags,
  itemTypeCode,
  itemWeight,
  stringValue,
} from '../itemHelpers'

/** Structured tool details extracted from nested 5etools entries. */
export interface ToolDetails {
  /** Ability associated with the tool. */
  ability: string
  /** Use statements available to the tool. */
  utilizes: string[]
  /** Craft statements or item names. */
  crafts: string[]
}

/** Normalized values consumed by the tool Markdown builder. */
export interface ToolMarkdownData {
  /** Canonical tool name. */
  name: string
  /** Canonical source label. */
  source: string
  /** Human-readable tool category. */
  itemType: string
  /** Cost in copper pieces. */
  costCp: number | null
  /** Weight in pounds. */
  weight: number | null
  /** Associated ability. */
  ability: string
  /** Utilize statements. */
  utilizes: string[]
  /** Craft statements. */
  crafts: string[]
}

/**
 * Converts a 5etools tool type code into a readable item type.
 *
 * @param value Raw `type` field.
 * @returns A canonical tool, instrument, or gaming-set label.
 */
export function toolTypeName(value: unknown): string {
  const code = itemTypeCode(value)
  if (code === 'AT') return "Artisan's Tools"
  if (code === 'GS') return 'Gaming Set'
  if (code === 'INS') return 'Musical Instrument'
  if (code === 'TK' || code === 'T') return 'Tools'
  return 'Tools'
}

/**
 * Resolves a stable display source label for a tool record.
 *
 * @param record Raw 5etools tool record.
 * @returns The record's 5etools source code, such as `XPHB`, or `unknown`.
 */
export function sourceForTool(record: Record<string, unknown>): string {
  return itemSource(record)
}

/**
 * Converts a 5etools value or currency field into copper pieces.
 *
 * @param record Raw 5etools tool record.
 * @returns Cost in copper pieces or `null` when unavailable.
 */
export function toolCostCopper(record: Record<string, unknown>): number | null {
  return itemCostCopper(record)
}

/**
 * Reads tool weight in pounds.
 *
 * @param record Raw 5etools tool record.
 * @returns Numeric weight or `null`.
 */
export function toolWeight(record: Record<string, unknown>): number | null {
  return itemWeight(record)
}

/**
 * Recursively parses Ability, Utilize, and Craft statements from nested entries.
 *
 * @param entries Raw `entries` field from a 5etools tool record.
 * @returns Normalized tool details.
 */
export function parseToolEntries(entries: unknown): ToolDetails {
  const result: ToolDetails = { ability: '', utilizes: [], crafts: [] }
  visitEntries(entries, result)
  return result
}

/**
 * Recursively visits nested tool entries and extracts labeled statements.
 *
 * @param value Unknown nested entry value.
 * @param output Mutable normalized output.
 * @returns No return value.
 */
function visitEntries(value: unknown, output: ToolDetails): void {
  if (Array.isArray(value)) {
    for (const entry of value) visitEntries(entry, output)
    return
  }
  if (typeof value === 'string') {
    addInlineStatement(value, output)
    return
  }
  if (!value || typeof value !== 'object') return
  const entry = value as Record<string, unknown>
  const label = stringValue(entry.name)?.replace(/:$/, '').trim() ?? ''
  if (label) addLabeledEntry(label, entry.entries, output)
  else if (typeof entry.entry === 'string') addInlineStatement(entry.entry, output)
  if (Array.isArray(entry.entries) && !label) {
    for (const child of entry.entries) visitEntries(child, output)
  }
}

/**
 * Adds a labeled named entry to normalized tool details.
 *
 * @param label Entry label such as `Ability`, `Utilize`, or `Craft`.
 * @param entries Nested entry content.
 * @param output Mutable normalized output.
 * @returns No return value.
 */
function addLabeledEntry(label: string, entries: unknown, output: ToolDetails): void {
  const clean = cleanInlineTags(flattenEntryText(entries)).replace(/^:\s*/, '').trim()
  if (!clean) return
  const normalizedLabel = label.toLowerCase()
  if (normalizedLabel === 'ability') output.ability = clean
  else if (normalizedLabel === 'utilize' || normalizedLabel === 'utilizes') output.utilizes.push(clean)
  else if (normalizedLabel === 'craft' || normalizedLabel === 'crafts') output.crafts.push(clean)
}

/**
 * Extracts label/text pairs from plain tool statements.
 *
 * @param text Raw statement text.
 * @param output Mutable normalized output.
 * @returns No return value.
 */
function addInlineStatement(text: string, output: ToolDetails): void {
  const clean = cleanInlineTags(text).trim()
  const match = clean.match(/^(Ability|Utilize|Utilizes|Craft|Crafts)\s*:?\s*(.*)$/i)
  if (!match || !match[2].trim()) return
  const label = match[1].toLowerCase()
  const value = match[2].trim()
  if (label === 'ability') output.ability = value
  else if (label === 'utilize' || label === 'utilizes') output.utilizes.push(value)
  else output.crafts.push(value)
}

/**
 * Flattens nested entries into one readable text string.
 *
 * @param value Raw nested entry value.
 * @returns Clean plain text.
 */
function flattenEntryText(value: unknown): string {
  if (typeof value === 'string') return cleanInlineTags(value)
  if (Array.isArray(value)) return value.map(flattenEntryText).filter(Boolean).join(' ')
  if (!value || typeof value !== 'object') return ''
  const entry = value as Record<string, unknown>
  if (typeof entry.entry === 'string') return cleanInlineTags(entry.entry)
  if (Array.isArray(entry.entries)) return flattenEntryText(entry.entries)
  return ''
}

/**
 * Removes 5etools inline tags and preserves readable display text.
 *
 * @param value Raw 5etools text.
 * @returns Plain readable text.
 */
export function cleanInlineTags(value: string): string {
  return cleanItemTags(value)
}

/**
 * Builds stable tags for one tool or instrument.
 *
 * @param itemType Human-readable item type.
 * @param source Canonical source label.
 * @returns Ordered frontmatter tags.
 */
export function toolTags(itemType: string, source: string): string[] {
  return itemTags(itemType, source)
}

/**
 * Computes a stable export fingerprint for a tool body.
 *
 * @param body Markdown body excluding frontmatter.
 * @returns SHA-256 fingerprint prefixed with `sha256-`.
 */
export function toolExportHash(body: string): Promise<string> {
  return itemExportHash(body)
}
