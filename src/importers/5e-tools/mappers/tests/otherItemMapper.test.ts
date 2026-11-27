import { describe, expect, it } from 'vitest'
import {
  importItems,
  itemKind,
  mapItem,
  mapOtherItem,
  otherItemCostCopper,
  otherItemTypeName,
  type ItemVault,
} from '../../'
import { DEFAULT_NOTE_FOLDERS } from '../../../../platform'

const camel = {
  name: 'Camel',
  source: 'XPHB',
  srd52: true,
  basicRules2024: true,
  rarity: 'none',
  type: 'MNT|XPHB',
  value: 5000,
  carryingCapacity: 450,
  speed: { walk: 50 },
}

const stabling = {
  name: 'Stabling (per day)',
  source: 'XPHB',
  srd52: true,
  basicRules2024: true,
  rarity: 'none',
  type: 'TAH|XPHB',
  value: 5,
}

const generic = {
  name: 'Mystery Object',
  source: 'XPHB',
  srd52: true,
  rarity: 'none',
  type: 'GV|XPHB',
  weight: 2,
  entries: ['This object has a {@variantrule Strange Property|XPHB}.'],
}

describe('other item fallback mapper', () => {
  it('renders exact mount fallback metadata', async () => {
    const markdown = (await mapOtherItem(camel)).markdown

    expect(markdown).toContain('title: "Camel"')
    expect(markdown).toContain('source: "XPHB"')
    expect(markdown).toContain('edition: "5.5e"')
    expect(markdown).toContain('item_type: "Mount"')
    expect(markdown).toContain('cost_cp: 5000')
    expect(markdown).toContain('carrying_capacity: "450 lb."')
    expect(markdown).toContain('speed: "50 ft."')
    expect(markdown).toContain('  - "item/mount"')
    expect(markdown).toContain('*Mount | Source: XPHB*')
    expect(markdown).toMatch(/export_hash: "sha256-[0-9a-f]{12}"/)
  })

  it('renders tack and harness fallback metadata', async () => {
    const markdown = (await mapOtherItem(stabling)).markdown

    expect(markdown).toContain('title: "Stabling (per day)"')
    expect(markdown).toContain('item_type: "Tack and Harness"')
    expect(markdown).toContain('cost_cp: 5')
    expect(markdown).toContain('  - "item/tack-and-harness"')
    expect(markdown).toContain('*Tack and Harness | Source: XPHB*')
  })

  it('handles unknown types and generic nested entries', async () => {
    const markdown = (await mapItem(generic)).markdown

    expect(markdown).toContain('item_type: "Generic Variant"')
    expect(markdown).toContain('weight: 2')
    expect(markdown).toContain('This object has a Strange Property.')
    expect(markdown).toContain('```vault-item\nweight: 2\n```')
  })

  it('maps fallback type codes and copper values', () => {
    expect(otherItemTypeName('MNT|XPHB')).toBe('Mount')
    expect(otherItemTypeName('TAH|XPHB')).toBe('Tack and Harness')
    expect(otherItemTypeName('GV|XPHB')).toBe('Generic Variant')
    expect(otherItemTypeName('Unknown|XPHB')).toBe('Other')
    expect(otherItemCostCopper({ value: '50 gp' })).toBe(5000)
    expect(otherItemCostCopper({ value: 5 })).toBe(5)
  })

  it('routes MNT, TAH, and unknown items to the Other fallback', async () => {
    expect(itemKind(camel)).toBe('Other')
    expect(itemKind(stabling)).toBe('Other')
    expect(itemKind(generic)).toBe('Other')
    expect((await mapItem(camel)).markdown).toContain('item_type: "Mount"')
  })

  it('imports fallback items through the configured items folder', async () => {
    const created: string[] = []
    const vault: ItemVault = {
      exists: async () => false,
      list: async () => ({ files: [], folders: [] }),
      read: async () => JSON.stringify({
        item: [
          { ...camel, srd52: undefined },
          { ...stabling, srd52: undefined },
          { ...generic, srd52: undefined },
        ],
      }),
      create: async path => {
        created.push(path)
      },
    }

    await expect(importItems(vault, 'items.json', DEFAULT_NOTE_FOLDERS)).resolves.toEqual({ imported: 3, skipped: 0 })
    expect(created).toEqual([
      'Homebrew/5etools/items/camel.md',
      'Homebrew/5etools/items/stabling-per-day.md',
      'Homebrew/5etools/items/mystery-object.md',
    ])
  })
})
