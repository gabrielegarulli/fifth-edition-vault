import { describe, expect, it } from 'vitest'
import {
  cleanGearTags,
  gearCostCopper,
  gearEntriesText,
  gearTypeName,
  mapItem,
  type ItemVault,
  importItems,
} from '../../'
import { DEFAULT_NOTE_FOLDERS } from '../../../../platform'

const ale = {
  name: 'Ale (mug)',
  source: 'XPHB',
  srd52: true,
  basicRules2024: true,
  rarity: 'none',
  type: 'FD|XPHB',
  value: 4,
}

const alchemistFire = {
  name: "Alchemist's Fire",
  source: 'XPHB',
  srd52: true,
  basicRules2024: true,
  rarity: 'none',
  type: 'G|XPHB',
  weight: 1,
  value: 5000,
  entries: [
    'When you take the {@action Attack|XPHB} action, you can replace one of your attacks with throwing a flask of Alchemist\'s Fire. Target one creature or object you can see within 20 feet of yourself. The target must succeed on a Dexterity saving throw ({@dc 8} plus your Dexterity modifier and Proficiency Bonus) or take {@damage 1d4} Fire damage and start burning.',
  ],
}

describe('gear mapper', () => {
  it('renders simple food and drink frontmatter without a vault block', async () => {
    const markdown = (await mapItem(ale)).markdown

    expect(markdown).toContain('title: "Ale (mug)"')
    expect(markdown).toContain('source: "XPHB"')
    expect(markdown).toContain('edition: "5.5e"')
    expect(markdown).toContain('item_type: "Food and Drink"')
    expect(markdown).toContain('cost_cp: 4')
    expect(markdown).not.toContain('weight:')
    expect(markdown).toContain('  - "item/food-and-drink"')
    expect(markdown).not.toContain('srd-5-2-1')
    expect(markdown).toContain('*Food and Drink | Source: XPHB*')
    expect(markdown).not.toContain('```vault-item')
    expect(markdown).toMatch(/export_hash: "sha256-[0-9a-f]{12}"/)
  })

  it('renders complex gear entries and conditional physical metadata', async () => {
    const markdown = (await mapItem(alchemistFire)).markdown

    expect(markdown).toContain('title: "Alchemist\'s Fire"')
    expect(markdown).toContain('item_type: "Adventuring Gear"')
    expect(markdown).toContain('cost_cp: 5000')
    expect(markdown).toContain('weight: 1')
    expect(markdown).toContain('  - "item/adventuring-gear"')
    expect(markdown).toContain('*Adventuring Gear | Source: XPHB*')
    expect(markdown).toContain('take the Attack action')
    expect(markdown).toContain('Dexterity saving throw (DC 8')
    expect(markdown).toContain('take 1d4 Fire damage')
    expect(markdown).toContain('```vault-item\nweight: 1\n```')
    expect(markdown).not.toContain('{@action')
    expect(markdown).not.toContain('{@dc')
    expect(markdown).not.toContain('{@damage')
  })

  it('maps type codes, currency units, and recursive entries', () => {
    expect(gearTypeName('FD|XPHB')).toBe('Food and Drink')
    expect(gearTypeName('G|XPHB')).toBe('Adventuring Gear')
    expect(gearCostCopper({ value: 4 })).toBe(4)
    expect(gearCostCopper({ value: '50 gp' })).toBe(5000)
    expect(cleanGearTags('See {@hazard burning|XPHB} and {@action Attack|XPHB}')).toBe('See burning and Attack')
    expect(gearEntriesText([
      'First paragraph.',
      { type: 'entries', name: 'Rule', entries: ['Second paragraph.'] },
    ])).toBe('First paragraph.\n\n**Rule.** Second paragraph.')
  })

  it('imports gear through the item importer and skips existing notes', async () => {
    const created: string[] = []
    const vault: ItemVault = {
      exists: async path => path.endsWith('ale-mug.md'),
      list: async () => ({ files: [], folders: [] }),
      read: async () => JSON.stringify({
        item: [
          { ...ale, srd52: undefined },
          { ...alchemistFire, srd52: undefined },
        ],
      }),
      create: async path => {
        created.push(path)
      },
    }

    await expect(importItems(vault, 'items.json', DEFAULT_NOTE_FOLDERS)).resolves.toEqual({ imported: 1, skipped: 1 })
    expect(created).toEqual(['Homebrew/5etools/items/alchemists-fire.md'])
  })
})
