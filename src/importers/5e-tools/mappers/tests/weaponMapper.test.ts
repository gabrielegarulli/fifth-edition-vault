import { describe, expect, it } from 'vitest'
import {
  importItems,
  isMagicItem,
  mapItem,
  mapWeapon,
  type ItemVault,
  weaponDamageType,
  weaponProperties,
  weaponMastery
} from '../../'
import { DEFAULT_NOTE_FOLDERS } from '../../../../platform'

const dagger = {
  name: 'Dagger',
  source: 'XPHB',
  page: 215,
  srd52: true,
  basicRules2024: true,
  type: 'M|XPHB',
  rarity: 'none',
  weight: 1,
  value: 200,
  weaponCategory: 'simple',
  property: ['F|XPHB', 'L|XPHB', 'T|XPHB'],
  mastery: ['Nick|XPHB'],
  range: '20/60',
  dmg1: '1d4',
  dmgType: 'P',
  dagger: true,
  weapon: true,
}

describe('weapon mapper', () => {
  it('renders the dagger frontmatter and vault-item metadata', async () => {
    const markdown = (await mapWeapon(dagger)).markdown

    expect(markdown).toContain('title: "Dagger"')
    expect(markdown).toContain('source: "XPHB"')
    expect(markdown).toContain('edition: "5.5e"')
    expect(markdown).toContain('item_type: "Melee Weapon"')
    expect(markdown).toContain('weapon_category: "simple"')
    expect(markdown).toContain('cost_cp: 200')
    expect(markdown).toContain('weight: 1')
    expect(markdown).toContain('damage: "1d4"')
    expect(markdown).toContain('damage_type: "Piercing"')
    expect(markdown).toContain('range: "20/60"')
    expect(markdown).toContain('  - "Finesse"')
    expect(markdown).toContain('  - "Light"')
    expect(markdown).toContain('  - "Thrown"')
    expect(markdown).toContain('mastery: "Nick"')
    expect(markdown).toContain('  - "item/melee-weapon"')
    expect(markdown).toContain('  - "weapon/simple"')
    expect(markdown).not.toContain('srd-5-2-1')
    expect(markdown).toContain('```vault-item')
    expect(markdown).toMatch(/export_hash: "sha256-[0-9a-f]{12}"/)
  })

  it('maps weapon types, properties, ranges, and damage types', async () => {
    expect((await mapWeapon({ ...dagger, name: 'Longbow', type: 'R|XPHB', range: '150/600', dmg1: '1d8', dmgType: 'P', property: ['A|XPHB', '2H|XPHB'] })).markdown)
      .toContain('item_type: "Ranged Weapon"')
    expect(weaponProperties(['F|XPHB', 'L|XPHB', 'T|XPHB', '2H|XPHB', 'A|XPHB', 'LD|XPHB']))
      .toEqual(['Finesse', 'Light', 'Thrown', 'Two-Handed', 'Ammunition', 'Loading'])
    expect(weaponDamageType('S')).toBe('Slashing')
  })

  it('parses string and object-form weapon masteries', async () => {
    expect(weaponMastery(['Nick|XPHB'])).toBe('Nick')
    expect(weaponMastery([{ uid: 'Vex|XPHB', note: 'When you hit...' }])).toBe('Vex')

    const markdown = (await mapWeapon({
      ...dagger,
      name: 'Vexing Dagger',
      mastery: [{ uid: 'Vex|XPHB', note: 'When you hit...' }],
      baseitem: [],
    })).markdown
    expect(markdown).toContain('mastery: "Vex"')
  })

  it('routes rarity and item kind correctly', async () => {
    expect(isMagicItem({ ...dagger, rarity: 'none' })).toBe(false)
    expect(isMagicItem({ ...dagger, rarity: 'uncommon' })).toBe(true)
    expect((await mapItem(dagger)).kind).toBe('item')
    expect((await mapItem(dagger)).markdown).toContain('item_type: "Melee Weapon"')
    expect((await mapItem({ ...dagger, name: '+1 Dagger', rarity: 'uncommon' })).kind).toBe('magicItem')
  })

  it('imports dagger into the configured items folder and skips existing notes', async () => {
    const created: string[] = []
    const vault: ItemVault = {
      exists: async path => path.endsWith('dagger.md'),
      list: async () => ({ files: [], folders: [] }),
      read: async () => JSON.stringify({ item: [dagger] }),
      create: async path => {
        created.push(path)
      },
    }

    await expect(importItems(vault, 'items.json', DEFAULT_NOTE_FOLDERS)).resolves.toEqual({ imported: 0, skipped: 1 })
    expect(created).toEqual([])
  })
})
