import { describe, expect, it } from 'vitest'

import type { ItemRow, MagicItemRow } from '../content/items'
import type { SheetItem } from '../ddb/sheet'
import type { InventoryItem } from '../state/inventory'
import { addInputFor, isEssence, pickerMatches, pouchGp, sortDdbItems, splitBag, tabOf } from './bag'

const row = (over: Partial<InventoryItem>): InventoryItem => ({ id: 'x', quantity: 1, ...over })

const item = (id: string, name: string, over: Partial<ItemRow> = {}): ItemRow => ({
  id,
  name,
  source: null,
  path: `items/${id}.md`,
  itemType: 'Melee Weapon',
  weaponCategory: null,
  costCp: null,
  tags: [],
  scfType: null,
  weight: null,
  packContents: [],
  damage: null,
  damageType: null,
  versatileDamage: null,
  range: null,
  properties: [],
  mastery: null,
  ac: null,
  strength: null,
  stealthDisadvantage: false,
  ...over,
})

const magic = (id: string, name: string, over: Partial<MagicItemRow> = {}): MagicItemRow =>
  ({
    id,
    name,
    source: null,
    path: `magic-items/${id}.md`,
    itemType: 'Weapon',
    rarity: 'rare',
    requiresAttunement: false,
    ...over,
  }) as MagicItemRow

describe('the bag', () => {
  it('puts each row in the tab a player looks for it in', () => {
    expect(tabOf(row({ content_item_id: 'longsword' }))).toBe('equipment')
    expect(tabOf(row({ name: 'A strange idol' }))).toBe('equipment')
    expect(tabOf(row({ magic_item_id: 'bag-of-holding' }))).toBe('items')
    expect(tabOf(row({ component_id: 'Dragon Scale' }))).toBe('components')
    // A component wins over a stray catalog id: crafting looks for it there.
    expect(tabOf(row({ component_id: 'Fang', content_item_id: 'fang' }))).toBe('components')

    const bag = splitBag([row({ id: 'a', content_item_id: 'rope' }), row({ id: 'b', essence_id: 'frail' })])
    expect(bag.equipment.map(r => r.id)).toEqual(['a'])
    expect(bag.components.map(r => r.id)).toEqual(['b'])
    expect(bag.items).toEqual([])
  })

  it('knows an essence from its name, since the harvest writes it as a component', () => {
    expect(isEssence(row({ component_id: 'Frail Essence' }))).toBe(true)
    expect(isEssence(row({ component_id: 'Essentially a Tooth' }))).toBe(false)
  })

  it('counts the pouch in whole gold, floored, with no rollup stored', () => {
    expect(pouchGp({ pp: 2, gp: 50, sp: 10, cp: 5 })).toBe(71)
    expect(pouchGp({ pp: 0, gp: 0, sp: 9, cp: 9 })).toBe(0)
  })

  it('orders D&D Beyond items worn first, then magic, then the rest', () => {
    const s = (name: string, equipped: boolean, magicItem: boolean): SheetItem => ({
      name,
      quantity: 1,
      type: null,
      rarity: null,
      magic: magicItem,
      equipped,
      attuned: false,
    })
    const sorted = sortDdbItems([s('Rope', false, false), s('Wand', false, true), s('Shield', true, false), s('Amulet', false, true)])
    expect(sorted.map(i => i.name)).toEqual(['Shield', 'Amulet', 'Wand', 'Rope'])
  })
})

describe('the add-item picker', () => {
  const items = [item('dagger', 'Dagger', { weaponCategory: 'simple', costCp: 200 }), item('leather-armor', 'Leather Armor')]
  const magicItems = [magic('dagger-of-venom', 'Dagger of Venom'), magic('sun-blade', 'Sun Blade', { requiresAttunement: true })]

  it('waits for two letters', () => {
    expect(pickerMatches('d', items, magicItems)).toEqual([])
  })

  it('offers the plain item before the magic one, and a prefix before a substring', () => {
    expect(pickerMatches('dagger', items, magicItems).map(o => o.id)).toEqual(['dagger', 'dagger-of-venom'])
    expect(pickerMatches('ER', items, magicItems).map(o => o.id)).toEqual(['dagger', 'leather-armor', 'dagger-of-venom'])
    expect(pickerMatches('dagger', items, magicItems)[0].detail).toBe('simple Melee Weapon · 2 gp')
  })

  it('stores the slug, never the typed name', () => {
    const [leather] = pickerMatches('leather', items, magicItems)
    expect(addInputFor(leather, 1)).toEqual({ content_item_id: 'leather-armor', name: 'Leather Armor', quantity: 1 })
    const [sun] = pickerMatches('sun', items, magicItems)
    expect(addInputFor(sun, 0)).toEqual({ magic_item_id: 'sun-blade', name: 'Sun Blade', quantity: 1 })
  })
})
