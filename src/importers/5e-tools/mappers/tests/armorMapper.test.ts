import { describe, expect, it } from 'vitest'
import {
  armorAc,
  armorTypeName,
  costCopper,
  isMagicItem,
  mapArmor,
  mapItem,
  mapShield,
} from '../../'  

const shield = {
  name: 'Shield',
  source: 'XPHB',
  srd52: true,
  basicRules2024: true,
  type: 'S|XPHB',
  rarity: 'none',
  weight: 6,
  value: 1000,
  ac: 2,
}

const breastplate = {
  name: 'Breastplate',
  source: 'XPHB',
  srd52: true,
  basicRules2024: true,
  type: 'MA|XPHB',
  rarity: 'none',
  weight: 20,
  value: 40000,
  ac: 14,
}

describe('armor mapper', () => {
  it('renders exact shield frontmatter and vault-item metadata', async () => {
    const markdown = (await mapShield(shield)).markdown

    expect(markdown).toContain('title: "Shield"')
    expect(markdown).toContain('source: "XPHB"')
    expect(markdown).toContain('edition: "5.5e"')
    expect(markdown).toContain('item_type: "Shield"')
    expect(markdown).toContain('cost_cp: 1000')
    expect(markdown).toContain('weight: 6')
    expect(markdown).toContain('ac: 2')
    expect(markdown).toContain('  - "item/shield"')
    expect(markdown).not.toContain('srd-5-2-1')
    expect(markdown).toContain('*Shield | Source: XPHB*')
    expect(markdown).toContain('```vault-item\nweight: 6\nac: 2\n```')
    expect(markdown).toMatch(/export_hash: "sha256-[0-9a-f]{12}"/)
  })

  it('renders exact breastplate frontmatter and vault-item metadata', async () => {
    const markdown = (await mapArmor(breastplate)).markdown

    expect(markdown).toContain('title: "Breastplate"')
    expect(markdown).toContain('item_type: "Medium Armor"')
    expect(markdown).toContain('cost_cp: 40000')
    expect(markdown).toContain('weight: 20')
    expect(markdown).toContain('ac: 14')
    expect(markdown).toContain('  - "item/medium-armor"')
    expect(markdown).toContain('*Medium Armor | Source: XPHB*')
    expect(markdown).toContain('```vault-item\nweight: 20\nac: 14\n```')
  })

  it('maps all armor type codes and currency values', () => {
    expect(armorTypeName('S|XPHB')).toBe('Shield')
    expect(armorTypeName('LA|XPHB')).toBe('Light Armor')
    expect(armorTypeName('MA|XPHB')).toBe('Medium Armor')
    expect(armorTypeName('HA|XPHB')).toBe('Heavy Armor')
    expect(costCopper({ value: '10 gp' })).toBe(1000)
    expect(costCopper({ value: 40000 })).toBe(40000)
    expect(armorAc({ ac: '14' })).toBe(14)
  })

  it('routes mundane armor into the items pipeline and magic armor into magic items', async () => {
    expect(isMagicItem({ ...shield, rarity: 'none' })).toBe(false)
    expect(isMagicItem({ ...shield, rarity: 'rare' })).toBe(true)
    expect((await mapItem(shield)).kind).toBe('item')
    expect((await mapItem(shield)).markdown).toContain('item_type: "Shield"')
    expect((await mapItem({ ...breastplate, rarity: 'uncommon' })).kind).toBe('magicItem')
  })
})
