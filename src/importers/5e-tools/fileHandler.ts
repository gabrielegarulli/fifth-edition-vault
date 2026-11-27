import type { FiveEToolsCategory, FiveEToolsRecord } from './types'

export interface VaultAdapter {
  exists(path: string, sensitive?: boolean): Promise<boolean>
  list(path: string): Promise<{ files: string[]; folders: string[] }>
  read(path: string): Promise<string>
}

export interface ParsedImportFile {
  path: string
  category: FiveEToolsCategory
  data: Record<string, unknown>
  records: FiveEToolsRecord[]
}

export const IMPORT_CATEGORIES: readonly { value: FiveEToolsCategory; label: string }[] = [
  { value: 'spells', label: 'Spells' },
  { value: 'bestiary', label: 'Monsters' },
  { value: 'items', label: 'Items' },
  { value: 'feats', label: 'Feats' },
]

/**
 * Maps top-level 5etools JSON array keys to their corresponding importer category.
 * Add new entity keys here as additional importers are supported.
 */
export const JSON_KEY_TO_CATEGORY: Readonly<Record<string, FiveEToolsCategory>> = {
  monster: 'bestiary',
  feat: 'feats',
  item: 'items',
  baseitem: 'items',
  spell: 'spells',
}

/**
 * Collects `.json` file paths for a single-file or directory import without
 * reading or parsing file contents.
 */
export async function collectImportPaths(adapter: VaultAdapter, inputPath: string): Promise<string[]> {
  const path = normalisePath(inputPath)
  if (!path) throw new Error('Enter a 5etools JSON file or folder path.')

  if (!(await adapter.exists(path, true))) {
    throw new Error(`The path was not found: ${path}`)
  }

  if (isJson(path)) return [path]

  const jsonFiles = await collectJsonFilesRecursively(adapter, path)
  if (jsonFiles.length === 0) {
    throw new Error('The folder contains no recognized 5etools JSON files.')
  }
  return jsonFiles
}

/**
 * Reads and parses one 5etools JSON file once, detecting its category and
 * extracting its named records. Returns `null` when no supported category key
 * is present and no explicit category was requested.
 */
export async function readImportFile(
  adapter: VaultAdapter,
  filePath: string,
  explicitCategory?: FiveEToolsCategory,
): Promise<ParsedImportFile | null> {
  const text = await adapter.read(filePath)
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    if (explicitCategory) throw new Error(`Could not parse JSON: ${filePath}`)
    return null
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    if (explicitCategory) throw new Error(`The JSON file has no 5etools records: ${filePath}`)
    return null
  }

  const data = parsed as Record<string, unknown>
  const category = explicitCategory ?? detectCategory(data)
  if (!category) return null

  const records = extractRecords(data, filePath)
  return { path: filePath, category, data, records }
}

/**
 * Recursively traverses a folder and returns all `.json` file paths, skipping non-JSON files.
 */
async function collectJsonFilesRecursively(adapter: VaultAdapter, dirPath: string): Promise<string[]> {
  const listed = await adapter.list(dirPath)
  const results: string[] = listed.files.filter(isJson)

  for (const subFolder of listed.folders) {
    const nested = await collectJsonFilesRecursively(adapter, subFolder)
    results.push(...nested)
  }

  return results
}

function detectCategory(data: Record<string, unknown>): FiveEToolsCategory | null {
  for (const [key, category] of Object.entries(JSON_KEY_TO_CATEGORY)) {
    if (Array.isArray(data[key])) return category
  }
  return null
}

export function isJson(path: string): boolean {
  return path.toLowerCase().endsWith('.json')
}

function extractRecords(data: Record<string, unknown>, path: string): FiveEToolsRecord[] {
  const knownKey = Object.keys(JSON_KEY_TO_CATEGORY).find(key => Array.isArray(data[key]))
  const records = knownKey
    ? data[knownKey]
    : Object.values(data).find(value => Array.isArray(value))

  if (!Array.isArray(records) || !records.every(record => record && typeof record === 'object' && typeof (record as Record<string, unknown>).name === 'string')) {
    throw new Error(`The JSON file has no named 5etools records: ${path}`)
  }
  return records as FiveEToolsRecord[]
}

function normalisePath(path: string): string {
  return path.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
}
