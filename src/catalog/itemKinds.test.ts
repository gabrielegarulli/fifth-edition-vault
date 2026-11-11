import { describe, expect, it } from 'vitest'

import type { ItemRow } from '../content/items'
import { armorLine, damageCell, itemLine, kindOf, poundsLabel, proficiencyFor, propertiesCell, shelveByKind } from './itemKinds'

const row = (name: string, over: Partial<ItemRow> = {}): ItemRow => ({
  id: name.toLowerCase().replace(/\W+/g, '-'),
  name,
  path: `items/${name}.md`,
  source: 'XPHB',
  itemType: null,
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

describe('kindOf', () => {
  it('shelves each exported item_type where a buyer looks for it', () => {
    expect(kindOf(row('Longsword', { itemType: 'Melee Weapon', weaponCategory: 'martial' }))).toBe('weapons')
    expect(kindOf(row('Longbow', { itemType: 'Ranged Weapon' }))).toBe('weapons')
    expect(kindOf(row('Chain Mail', { itemType: 'Heavy Armor' }))).toBe('armor')
    expect(kindOf(row('Shield', { itemType: 'Shield' }))).toBe('armor')
    expect(kindOf(row("Smith's Tools", { itemType: "Artisan's Tools" }))).toBe('tools')
    expect(kindOf(row('Lute', { itemType: 'Instrument' }))).toBe('tools')
    expect(kindOf(row('Diamond', { itemType: 'Treasure (Gemstone)' }))).toBe('treasure')
    expect(kindOf(row('Silk', { itemType: 'Trade Good' }))).toBe('treasure')
    expect(kindOf(row('Rope', { itemType: 'Adventuring Gear' }))).toBe('gear')
    expect(kindOf(row('Arrows', { itemType: 'Ammunition' }))).toBe('gear')
    expect(kindOf(row('Riding Horse', { itemType: 'Mount' }))).toBe('other')
    expect(kindOf(row('Mystery', {}))).toBe('other')
  })

  it('takes a weapon category alone as a weapon — a hand-written note may omit the type', () => {
    expect(kindOf(row('Club', { weaponCategory: 'simple' }))).toBe('weapons')
  })
})

describe('shelveByKind', () => {
  it('keeps every shelf, in order, each sorted by name', () => {
    const shelves = shelveByKind([
      row('Rapier', { itemType: 'Melee Weapon' }),
      row('Dagger', { itemType: 'Melee Weapon' }),
      row('Rope', { itemType: 'Adventuring Gear' }),
    ])
    expect(shelves.map(s => s.shelf.id)).toEqual(['weapons', 'armor', 'gear', 'tools', 'treasure', 'other'])
    expect(shelves[0].rows.map(r => r.name)).toEqual(['Dagger', 'Rapier'])
    expect(shelves[1].rows).toEqual([])
  })
})

describe('the weapons table cells', () => {
  it('writes damage as die and type initial', () => {
    expect(damageCell(row('Longsword', { damage: '1d8', damageType: 'Slashing' }))).toBe('1d8 S')
    expect(damageCell(row('Net'))).toBeNull()
  })

  it('says the number a property needs beside it', () => {
    expect(propertiesCell(row('Longsword', { properties: ['Versatile'], versatileDamage: '1d10' }))).toBe('Versatile (1d10)')
    expect(propertiesCell(row('Longbow', { properties: ['Ammunition', 'Heavy', 'Two-Handed'], range: '150/600' }))).toBe(
      'Ammunition 150/600, Heavy, Two-Handed',
    )
    expect(propertiesCell(row('Dagger', { properties: ['Finesse', 'Light', 'Thrown'], range: '20/60' }))).toBe(
      'Finesse, Light, Thrown 20/60',
    )
  })
})

describe('armorLine', () => {
  it('adds Dex as the weight class allows, and says Strength and Stealth', () => {
    expect(armorLine(row('Leather', { itemType: 'Light Armor', ac: 11 }))).toBe('AC 11 + Dex')
    expect(armorLine(row('Half Plate', { itemType: 'Medium Armor', ac: 15, stealthDisadvantage: true }))).toBe(
      'AC 15 + Dex (max 2) · Stealth Disadv.',
    )
    expect(armorLine(row('Chain Mail', { itemType: 'Heavy Armor', ac: 16, strength: 13, stealthDisadvantage: true }))).toBe(
      'AC 16 · Str 13 · Stealth Disadv.',
    )
    expect(armorLine(row('Shield', { itemType: 'Shield', ac: 2 }))).toBe('+2 AC')
  })

  it('answers null for an item with no AC — a vault exported before MYDND-85 included', () => {
    expect(armorLine(row('Chain Mail', { itemType: 'Heavy Armor' }))).toBeNull()
    expect(itemLine(row('Rope', { itemType: 'Adventuring Gear' }))).toBeNull()
  })
})

describe('poundsLabel', () => {
  it('prints halves and quarters as fractions and drops a weightless item', () => {
    expect(poundsLabel(3)).toBe('3 lb')
    expect(poundsLabel(0.5)).toBe('½ lb')
    expect(poundsLabel(0)).toBeNull()
    expect(poundsLabel(null)).toBeNull()
  })
})

describe('proficiencyFor', () => {
  const fighter = { weapons: ['Simple Weapons', 'Martial Weapons'], armor: ['Light Armor', 'Medium Armor', 'Heavy Armor', 'Shields'] }
  const wizard = { weapons: ['Simple Weapons'], armor: [] }
  const rogue = { weapons: ['Simple Weapons', 'Rapier', 'Shortsword'], armor: ['Light Armor'] }
  const longsword = row('Longsword', { itemType: 'Melee Weapon', weaponCategory: 'martial' })
  const rapier = row('Rapier', { itemType: 'Melee Weapon', weaponCategory: 'martial' })

  it('reads a weapon by its category, or by its own name', () => {
    expect(proficiencyFor(longsword, fighter)).toBe('yes')
    expect(proficiencyFor(longsword, wizard)).toBe('no')
    expect(proficiencyFor(rapier, rogue)).toBe('yes')
  })

  it('reads armour by its weight class, and a shield by Shields', () => {
    expect(proficiencyFor(row('Chain Mail', { itemType: 'Heavy Armor' }), fighter)).toBe('yes')
    expect(proficiencyFor(row('Chain Mail', { itemType: 'Heavy Armor' }), rogue)).toBe('no')
    expect(proficiencyFor(row('Shield', { itemType: 'Shield' }), fighter)).toBe('yes')
    expect(proficiencyFor(row('Shield', { itemType: 'Shield' }), wizard)).toBe('no')
  })

  it('does not know when the sheet has no list, or for anything else', () => {
    expect(proficiencyFor(longsword, null)).toBe('unknown')
    expect(proficiencyFor(row('Rope', { itemType: 'Adventuring Gear' }), fighter)).toBe('unknown')
  })
})
