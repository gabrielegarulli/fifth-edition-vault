import { describe, expect, it } from 'vitest'

import type { FeatRow } from '../../compendium/model/feats'
import {
  abilityPips,
  coverage,
  fullyApplied,
  prerequisiteLine,
  prerequisiteParts,
  raisesChip,
  raisesShort,
  shelfColumns,
  shelve,
} from './featShelves'

const feat = (over: Partial<FeatRow>): FeatRow => ({
  id: over.name?.toLowerCase().replace(/\s+/g, '-') ?? 'x',
  path: 'feats/x.md',
  name: 'X',
  source: 'XPHB',
  kind: 'general',
  prerequisite: null,
  prerequisiteClass: null,
  abilities: [],
  benefitCount: 3,
  modelledCount: 1,
  tags: [],
  aliases: [],
  ...over,
})

describe('the shelves (MYDND-62)', () => {
  it('puts each kind on its shelf in the order a character meets them, names sorted', () => {
    const rows = [
      feat({ name: 'Boon of Speed', kind: 'epic_boon' }),
      feat({ name: 'Sentinel', kind: 'general' }),
      feat({ name: 'Alert', kind: 'origin' }),
      feat({ name: 'Actor', kind: 'general' }),
      feat({ name: 'Dark Bargain', kind: null }),
    ]
    expect(shelve(rows).map(s => [s.shelf.id, s.rows.map(r => r.name)])).toEqual([
      ['origin', ['Alert']],
      ['general', ['Actor', 'Sentinel']],
      ['fighting_style', []],
      ['epic_boon', ['Boon of Speed']],
      ['other', ['Dark Bargain']],
    ])
  })

  it('fits a card per 320px, one to four, and three before it is measured (MYDND-120)', () => {
    expect(shelfColumns(0)).toBe(3)
    expect(shelfColumns(180)).toBe(1)
    expect(shelfColumns(680)).toBe(2)
    expect(shelfColumns(983)).toBe(2)
    expect(shelfColumns(984)).toBe(3)
    expect(shelfColumns(2000)).toBe(4)
  })
})

describe('coverage', () => {
  it('reads the derived counts as the sheet sees them', () => {
    expect(coverage(feat({ benefitCount: 3, modelledCount: 2 }))?.label).toBe('2 of 3 on sheet')
    expect(coverage(feat({ benefitCount: 2, modelledCount: 2 }))?.label).toBe('All on sheet')
    expect(coverage(feat({ benefitCount: 2, modelledCount: 0 }))?.label).toBe('Prose only')
  })

  it('is null, not zero, for a note exported before the keys', () => {
    expect(coverage(feat({ benefitCount: null, modelledCount: null }))).toBeNull()
  })

  it('calls a feat fully applied only with every benefit modelled', () => {
    expect(fullyApplied(feat({ benefitCount: 2, modelledCount: 2 }))).toBe(true)
    expect(fullyApplied(feat({ benefitCount: 3, modelledCount: 2 }))).toBe(false)
    expect(fullyApplied(feat({ benefitCount: 0, modelledCount: 0 }))).toBe(false)
    expect(fullyApplied(feat({ benefitCount: null, modelledCount: null }))).toBe(false)
  })
})

describe('what a feat raises', () => {
  it('lights one pip per ability it can raise, STR to CHA', () => {
    expect(abilityPips(['dex', 'str']).map(p => `${p.short}${p.on ? '*' : ''}`)).toEqual([
      'STR*',
      'DEX*',
      'CON',
      'INT',
      'WIS',
      'CHA',
    ])
  })

  it('says ANY for all six, and nothing for none', () => {
    expect(raisesShort(['str', 'dex', 'con', 'int', 'wis', 'cha'])).toBe('ANY')
    expect(raisesShort(['wis', 'int'])).toBe('INT/WIS')
    expect(raisesShort([])).toBeNull()
    expect(raisesChip(['str', 'dex'])).toBe('Raises STR or DEX +1')
    expect(raisesChip(['str', 'dex', 'con', 'int', 'wis', 'cha'], 2)).toBe('Raises any +2')
  })
})

describe('prerequisites', () => {
  it('splits the exporter’s comma list into chips, keeping an "or" whole', () => {
    expect(prerequisiteParts('Level 4+, Strength 13+, Dexterity 13+')).toEqual(['Level 4+', 'Strength 13+', 'Dexterity 13+'])
    expect(prerequisiteParts('Level 4+, Spellcasting or Pact Magic feature')).toEqual([
      'Level 4+',
      'Spellcasting or Pact Magic feature',
    ])
    expect(prerequisiteParts(null)).toEqual([])
  })

  it('prints a card line, and says so when there is none', () => {
    expect(prerequisiteLine('Level 4+, Strength 13+')).toBe('Level 4+ · Strength 13+')
    expect(prerequisiteLine(null)).toBe('No prerequisite')
  })
})
