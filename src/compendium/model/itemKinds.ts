import type { ItemRow } from './items'
import type { ItemIcon, RarityTone } from './itemShelves'

/**
 * The mundane-item catalog's shelves — the "Items · shelves by kind" board of
 * the all-sections canvas (MYDND-85), as pure functions the page and its tests
 * share.
 *
 * **Shelves are kinds**, because that is how a shopping list is read: what to
 * hit with, what to wear, what to carry. Weapons come first and are drawn as a
 * table, since a weapon is chosen by comparing its columns. The colours reuse
 * the magic items' tones (`RarityTone`), so the tile and dot classes are the
 * same ones; a kind has no rarity, only a colour.
 *
 * Every label reads frontmatter only. The weapon and armour numbers are
 * frontmatter since this ticket's exporter pass; a vault exported before it
 * answers null here and the table draws a dash.
 */

export type ItemKind = 'weapons' | 'armor' | 'gear' | 'tools' | 'treasure' | 'other'

export interface KindShelf {
  id: ItemKind
  label: string
  /** The narrow pane's chip. */
  chipLabel: string
  /** The subtitle beside the shelf's title. */
  when: string
  tone: RarityTone
  icon: ItemIcon
}

export const KIND_SHELVES: readonly KindShelf[] = [
  { id: 'weapons', label: 'Weapons', chipLabel: 'Weapons', when: 'compared across columns', tone: 'legendary', icon: 'sword' },
  { id: 'armor', label: 'Armor & shields', chipLabel: 'Armor', when: 'AC, Strength, Stealth', tone: 'rare', icon: 'shield' },
  { id: 'gear', label: 'Adventuring gear', chipLabel: 'Gear', when: 'what the pack is made of', tone: 'uncommon', icon: 'bag' },
  { id: 'tools', label: 'Tools & instruments', chipLabel: 'Tools', when: 'a proficiency each', tone: 'veryrare', icon: 'gauntlet' },
  { id: 'treasure', label: 'Treasure', chipLabel: 'Treasure', when: 'gems, art and trade goods', tone: 'artifact', icon: 'gem' },
  { id: 'other', label: 'Mounts, vehicles, other', chipLabel: 'Other', when: 'everything else', tone: 'none', icon: 'stones' },
]

const shelfById = new Map(KIND_SHELVES.map(s => [s.id, s]))
export const kindShelf = (kind: ItemKind): KindShelf => shelfById.get(kind)!

/**
 * Which shelf an item sits on, from its `item_type` — the exporter's decoded
 * 5e.tools type (`Melee Weapon`, `Heavy Armor`, `Artisan's Tools`,
 * `Treasure (Gemstone)`). A weapon category on its own is enough to be a
 * weapon: a hand-written note may say `martial` and no type.
 */
export function kindOf(item: Pick<ItemRow, 'itemType' | 'weaponCategory'>): ItemKind {
  const type = (item.itemType ?? '').toLowerCase()
  if (item.weaponCategory || /\bweapon\b/.test(type)) return 'weapons'
  if (/\barmou?r\b/.test(type) || type === 'shield') return 'armor'
  if (/\btools?\b|instrument|gaming set/.test(type)) return 'tools'
  if (type.startsWith('treasure') || type === 'trade good') return 'treasure'
  if (/adventuring gear|ammunition|spellcasting focus|explosive|food|potion/.test(type)) return 'gear'
  return 'other'
}

export interface KindGroup {
  shelf: KindShelf
  rows: ItemRow[]
}

/** Every kind, in shelf order, each holding its items by name. Empty shelves included. */
export function shelveByKind(rows: readonly ItemRow[]): KindGroup[] {
  const by = new Map<ItemKind, ItemRow[]>(KIND_SHELVES.map(s => [s.id, []]))
  for (const r of rows) by.get(kindOf(r))!.push(r)
  return KIND_SHELVES.map(shelf => ({
    shelf,
    rows: by.get(shelf.id)!.sort((a, b) => categoryRank(a) - categoryRank(b) || a.name.localeCompare(b.name)),
  }))
}

/** Simple weapons before martial ones, as the book's table runs; everything else by name. */
function categoryRank(item: ItemRow): number {
  const cat = (item.weaponCategory ?? '').toLowerCase()
  return cat === 'simple' ? 0 : cat === 'martial' ? 1 : 2
}

/** `1d8 S` — the die and the damage type's initial, the canvas's table cell. */
export function damageCell(item: Pick<ItemRow, 'damage' | 'damageType'>): string | null {
  if (!item.damage) return null
  const type = item.damageType ? ` ${item.damageType.charAt(0).toUpperCase()}` : ''
  return `${item.damage}${type}`
}

/**
 * The properties cell: `Versatile (1d10)`, `Ammunition 150/600, Heavy` — the
 * property names with the two numbers a property needs said beside it.
 */
export function propertiesCell(item: Pick<ItemRow, 'properties' | 'versatileDamage' | 'range'>): string {
  const out = item.properties.map(p => {
    const name = p.toLowerCase()
    if (name === 'versatile' && item.versatileDamage) return `${p} (${item.versatileDamage})`
    if ((name === 'thrown' || name === 'ammunition') && item.range) return `${p} ${item.range}`
    return p
  })
  return out.join(', ')
}

/** `AC 16 · Str 13 · Stealth Disadv.` for armour; `+2 AC` for a shield. */
export function armorLine(item: Pick<ItemRow, 'itemType' | 'ac' | 'strength' | 'stealthDisadvantage'>): string | null {
  if (item.ac === null) return null
  const type = (item.itemType ?? '').toLowerCase()
  if (type === 'shield') return `+${item.ac} AC`
  const parts = [
    type.startsWith('light') ? `AC ${item.ac} + Dex` : type.startsWith('medium') ? `AC ${item.ac} + Dex (max 2)` : `AC ${item.ac}`,
    item.strength !== null ? `Str ${item.strength}` : null,
    item.stealthDisadvantage ? 'Stealth Disadv.' : null,
  ]
  return parts.filter(Boolean).join(' · ')
}

/** A card's mono line: the armour line, the damage and properties, or nothing. */
export function itemLine(item: ItemRow): string | null {
  const armor = armorLine(item)
  if (armor) return armor
  const dmg = damageCell(item)
  if (!dmg) return null
  const props = propertiesCell(item)
  return props ? `${dmg} · ${props}` : dmg
}

/** `3 lb`, `½ lb`; null for no weight. */
export function poundsLabel(weight: number | null): string | null {
  if (weight === null || weight <= 0) return null
  if (weight === 0.5) return '½ lb'
  if (weight === 0.25) return '¼ lb'
  return `${weight} lb`
}

export type Proficiency = 'yes' | 'no' | 'unknown'

/**
 * Whether a character's proficiencies cover this item: a weapon by its
 * category (`Martial Weapons`) or its own name (`Rapier`), armour by its weight
 * class (`Heavy Armor`) or `Shields`. `unknown` when the sheet carries no
 * proficiency list at all, and for anything that is not a weapon or armour —
 * a tool is a different question this table does not ask.
 *
 * Exactly the list, nothing derived: a 2024 rogue's "martial weapons with the
 * Finesse or Light property" is a rule D&D Beyond already folds into the list it
 * exports, so the list is the answer.
 */
export function proficiencyFor(
  item: Pick<ItemRow, 'name' | 'itemType' | 'weaponCategory'>,
  lists: { weapons: string[]; armor: string[] } | null | undefined,
): Proficiency {
  if (!lists) return 'unknown'
  const kind = kindOf(item)
  const norm = (s: string) => s.toLowerCase().replace(/s$/, '').trim()
  if (kind === 'weapons') {
    const want = new Set(lists.weapons.map(norm))
    if (item.weaponCategory && want.has(`${item.weaponCategory.toLowerCase()} weapon`)) return 'yes'
    return want.has(norm(item.name)) ? 'yes' : 'no'
  }
  if (kind === 'armor') {
    const want = new Set(lists.armor.map(norm))
    const type = (item.itemType ?? '').toLowerCase()
    if (type === 'shield') return want.has('shield') ? 'yes' : 'no'
    const weight = type.split(' ')[0]
    return want.has(`${weight} armor`) || want.has(`${weight} armour`) ? 'yes' : 'no'
  }
  return 'unknown'
}
