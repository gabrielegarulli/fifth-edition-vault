import { PREFERRED_SOURCE, grantsFor, resolveStartingEquipment } from '@vault/derive/startingEquipment.js'
import { resolveToolSlug } from '@vault/derive/tools.js'

import { type ClassFence, packContentsFrom, type LineageFence } from '../../../compendium'
import { PREFERRED_ITEM_SOURCES } from '../../../platform'

import { asRecord } from './shared'

// Starting equipment: note-to-row adapters, kit options and grants.
// One module of the builder's choices (MYDND-197); index.ts says what the folder is.

// --- Starting equipment -------------------------------------------------------

export function itemRowForEquipment(row: {
  id: string
  name: string
  source: string | null
  itemType: string | null
  scfType?: string | null
  packContents?: readonly string[]
  tags?: readonly string[]
}) {
  const data: {
    scfType?: string
    packContents?: Array<{ name: string; quantity: number }>
    variantGroup?: boolean
  } = {}
  if (row.scfType) data.scfType = row.scfType
  const pack = packContentsFrom(row.packContents ?? [])
  if (pack.length > 0) data.packContents = pack
  // Six XPHB umbrella notes (`artisans-tools`, `musical-instrument`, `gaming-set`,
  // `holy-symbol`, `arcane-focus`, `druidic-focus`) share the category's own name
  // and carry `variant-group`; left in the catalog, `resolveStartingItem` matches
  // the umbrella note before `resolveCategory` can turn the line into a choice.
  if (row.tags?.includes('variant-group')) data.variantGroup = true
  return {
    id: row.id,
    name: row.name,
    source_slug: PREFERRED_ITEM_SOURCES.has(row.source ?? '') ? PREFERRED_SOURCE : row.source,
    item_type: row.itemType,
    data,
  }
}

export type EquipmentCatalogRow = ReturnType<typeof itemRowForEquipment>

export interface EquipmentEntry {
  kind: 'item' | 'bundle' | 'choice' | 'unavailable'
  name: string
  quantity: number
  item?: EquipmentCatalogRow
  categoryId?: string
  label?: string
  options?: EquipmentCatalogRow[]
}

export interface EquipmentOption {
  key: string
  entries: EquipmentEntry[]
  gold: number
}

function resolveKitOptions(raw: object | undefined, catalog: readonly EquipmentCatalogRow[]): EquipmentOption[] {
  const concrete = catalog.filter(i => !i.data.variantGroup)
  const gamingOptions = concrete
    .filter(i => i.item_type === 'Gaming Set')
    .sort((a, b) => a.name.localeCompare(b.name))
  const options = resolveStartingEquipment(raw, concrete) as EquipmentOption[]
  if (gamingOptions.length === 0) return options
  return options.map(opt => ({
    ...opt,
    entries: opt.entries.map(entry =>
      entry.kind === 'unavailable' && /^gaming set\b/i.test(entry.name)
        ? {
            kind: 'choice' as const,
            name: entry.name,
            quantity: entry.quantity,
            categoryId: 'gaming-set',
            label: 'A gaming set',
            options: gamingOptions,
          }
        : entry,
    ),
  }))
}

/** The primary class's lettered starting-equipment options, resolved against the item notes. */
export function equipmentOptions(fence: ClassFence | null, catalog: readonly EquipmentCatalogRow[]): EquipmentOption[] {
  return resolveKitOptions(fence?.data?.startingEquipment as object | undefined, catalog)
}

/** 5e.tools' `equipmentType` codes on raw `vault-background` `starting_equipment` entries (MYDND-174). */
const BACKGROUND_EQUIPMENT_TYPE: Record<string, string> = {
  weaponSimple: 'simple weapon',
  weaponSimpleMelee: 'simple melee weapon',
  weaponMartial: 'martial weapon',
  weaponMartialMelee: 'martial melee weapon',
  instrumentMusical: 'musical instrument',
  toolArtisan: "artisan's tools",
  setGaming: 'gaming set',
  focusSpellcastingArcane: 'arcane focus',
  focusSpellcastingHoly: 'holy symbol',
  focusSpellcastingDruidic: 'druidic focus',
}

/** 2014 comma-inverted item names that appear in homebrew `vault-background` kits. */
const BACKGROUND_ITEM_ALIAS: Record<string, string> = {
  'clothes, fine': 'fine clothes',
  "clothes, traveler's": "traveler's clothes",
  'tent, two-person': 'tent',
  'mirror, steel': 'mirror',
  'lamp, hooded': 'hooded lantern',
  'rope, hempen (50 feet)': 'rope',
}

function backgroundEquipmentEntry(entry: unknown): Record<string, unknown> | null {
  if (typeof entry === 'string') return backgroundEquipmentEntry({ item: entry })
  const e = asRecord(entry)
  if (!e) return null
  // Raw 5e.tools `startingEquipment` writes currency `value` in copper pieces
  // (`1400` = 14 gp, `5000` = 50 gp), as `vaultClassFence.ts` divides by 100.
  if (e.value != null && e.item == null && e.equipmentType == null && e.special == null) {
    return { value: Number(e.value) / 100 }
  }
  const types = Array.isArray(e.equipmentTypes)
    ? e.equipmentTypes
        .map(t => BACKGROUND_EQUIPMENT_TYPE[String(t)] ?? String(t))
        .sort()
        .join(' or ')
    : null
  const eqType =
    typeof e.equipmentType === 'string' ? (BACKGROUND_EQUIPMENT_TYPE[e.equipmentType] ?? e.equipmentType) : null
  const raw = e.item ?? e.special ?? types ?? eqType
  if (typeof raw !== 'string' || !raw.trim()) return null
  const tag = /\{@item\s+([^|}]+)/i.exec(raw.trim())
  let name = (tag ? tag[1] : raw.split('|')[0])
    .replace(/\{@\w+\s+([^|}]+)(?:\|[^}]*)?\}/g, '$1')
    .trim()
    .toLowerCase()
  name = BACKGROUND_ITEM_ALIAS[name] ?? name
  let quantity = typeof e.quantity === 'number' ? e.quantity : 1
  const pack = /^(.*\S)\s*\((\d+)\)$/.exec(name)
  if (pack) {
    name = pack[1]
    quantity *= Number(pack[2])
  }
  return quantity === 1 ? { item: name } : { item: name, quantity }
}

function normalizeBackgroundStartingEquipment(raw: unknown): Record<string, unknown> | undefined {
  const first: unknown = Array.isArray(raw) ? raw[0] : raw
  const block = asRecord(first)
  if (!block) return undefined
  const out: Record<string, unknown> = {}
  for (const [key, entries] of Object.entries(block)) {
    if (!Array.isArray(entries)) continue
    out[key.toLowerCase()] = entries.map(backgroundEquipmentEntry).filter(Boolean)
  }
  return Object.keys(out).length > 0 ? out : undefined
}

/**
 * The chosen background's lettered starting-equipment options (MYDND-174).
 *
 * `export-lineage-to-lore.ts` writes 5e.tools' raw `startingEquipment` array
 * (`[{ A, B }]`, copper `value`, `equipmentType` codes) directly to
 * `starting_equipment` on the `vault-background` fence; `vaultClassFence.ts`
 * reshaped class kits at export time, so this normalises the background's fence
 * into the same shape before handing it to `resolveStartingEquipment`.
 */
export function backgroundEquipmentOptions(
  fence: LineageFence | null,
  catalog: readonly EquipmentCatalogRow[],
): EquipmentOption[] {
  const raw = fence?.starting_equipment ?? asRecord(fence?.data)?.startingEquipment
  return resolveKitOptions(normalizeBackgroundStartingEquipment(raw), catalog)
}

/**
 * Pre-fills a kit option's category choices (`choice` entries) from tool
 * proficiencies already chosen on the Background step (`draft.backgroundTools`),
 * when a chosen tool is among the entry's options (MYDND-174).
 */
export function defaultEquipmentChoices(
  option: EquipmentOption | null,
  tools: readonly string[] | undefined,
): Record<string, EquipmentCatalogRow> {
  if (!option || !tools || tools.length === 0) return {}
  // `@vault/derive/tools.js` spells `jewellers-tools` in British English while
  // the exported XPHB note is `items/jewelers-tools.md` ("Jeweler's Tools").
  const slugs = tools
    .map(
      t =>
        ((resolveToolSlug(t) ?? resolveToolSlug(t.replace(/-/g, ' '))))?.replace(
          'jewellers-',
          'jewelers-',
        ) ?? t.trim().toLowerCase(),
    )
    .filter(Boolean)
  if (slugs.length === 0) return {}
  const used = new Set<string>()
  const choices: Record<string, EquipmentCatalogRow> = {}
  option.entries.forEach((entry, i) => {
    if (entry.kind !== 'choice' || !entry.options) return
    for (const slug of slugs) {
      if (used.has(slug)) continue
      const match = entry.options.find(o => o.id === slug || o.name.toLowerCase() === slug)
      if (match) {
        choices[String(i)] = match
        used.add(slug)
        break
      }
    }
  })
  return choices
}

export interface EquipmentDraft {
  option: string | null
  /** Entry index (as a string, since it is a YAML map key) → the item picked. */
  choices: Record<string, EquipmentCatalogRow>
  /** The chosen background's starting-equipment option (`'a'` / `'b'`), when taken (MYDND-174). */
  backgroundOption?: string | null
  /** Entry index → the item picked for the background kit's open choices. */
  backgroundChoices?: Record<string, EquipmentCatalogRow>
  granted: boolean
}

/** What Create hands over for one kit option: item notes and quantities, gold, and what no note answered. */
export function equipmentGrants(
  option: EquipmentOption | null,
  equipment: Pick<EquipmentDraft, 'choices'> & Partial<EquipmentDraft>,
) {
  return grantsFor(option, equipment.choices ?? {}) as {
    items: Array<{ item: EquipmentCatalogRow; quantity: number }>
    gold: number
    unavailable: string[]
  }
}

/**
 * Combined items and gold from the class kit and background kit (MYDND-174):
 * identical item ids merge their quantities and gold sums into one total.
 */
export function combinedEquipmentGrants(
  classOption: EquipmentOption | null,
  backgroundOption: EquipmentOption | null,
  equipment: EquipmentDraft,
) {
  const cls = equipmentGrants(classOption, { choices: equipment.choices })
  const bg = equipmentGrants(backgroundOption, { choices: equipment.backgroundChoices ?? {} })
  const items: Array<{ item: EquipmentCatalogRow; quantity: number }> = []
  const byId = new Map<string, { item: EquipmentCatalogRow; quantity: number }>()
  for (const g of [...cls.items, ...bg.items]) {
    const prev = byId.get(g.item.id)
    if (prev) prev.quantity += g.quantity
    else {
      const next = { item: g.item, quantity: g.quantity }
      byId.set(g.item.id, next)
      items.push(next)
    }
  }
  return {
    items,
    gold: cls.gold + bg.gold,
    unavailable: [...cls.unavailable, ...bg.unavailable],
  }
}
