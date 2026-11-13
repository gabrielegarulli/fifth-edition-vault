import { describe, expect, it } from 'vitest'

import type { MonsterRow } from '../../compendium/model/monsters'
import {
  budgets,
  cardColumns,
  crGlyph,
  encounterGroups,
  flagsOf,
  kindLine,
  movePips,
  partyLabel,
  shelveMonsters,
  spentXp,
  statLine,
  tierOf,
} from './bestiary'

const row = (name: string, cr: number | null, extra: Partial<MonsterRow> = {}): MonsterRow => ({
  id: name.toLowerCase().replace(/\s+/g, '-'),
  path: `bestiary/${name}.md`,
  name,
  source: 'XMM',
  cr,
  creatureType: 'beast',
  size: 'Medium',
  edition: '5.5e',
  image: null,
  tags: [],
  isFamiliar: false,
  xp: null,
  ac: null,
  hp: null,
  speed: null,
  moves: [],
  legendary: false,
  spellcasting: false,
  ...extra,
})

describe('tierOf', () => {
  it('puts each tier edge on the right shelf', () => {
    expect(tierOf(0)?.id).toBe('cr-0')
    expect(tierOf(0.5)?.id).toBe('cr-0')
    expect(tierOf(1)?.id).toBe('cr-1')
    expect(tierOf(4)?.id).toBe('cr-1')
    expect(tierOf(5)?.id).toBe('cr-5')
    expect(tierOf(10)?.id).toBe('cr-5')
    expect(tierOf(11)?.id).toBe('cr-11')
    expect(tierOf(16)?.id).toBe('cr-11')
    expect(tierOf(17)?.id).toBe('cr-17')
    expect(tierOf(30)?.id).toBe('cr-17')
  })

  it('puts a monster with no CR on no shelf', () => {
    expect(tierOf(null)).toBeNull()
  })
})

describe('shelveMonsters', () => {
  it('shelves by tier, in tier order, each sorted by name, with the CR-less last rather than lost', () => {
    const shelves = shelveMonsters([row('Wolf', 0.25), row('Troll', 5), row('Ape', 0.5), row('Summon', null)])
    expect(shelves.map(s => [s.tier.id, s.rows.map(r => r.name)])).toEqual([
      ['cr-0', ['Ape', 'Wolf']],
      ['cr-1', []],
      ['cr-5', ['Troll']],
      ['cr-11', []],
      ['cr-17', []],
      ['cr-none', ['Summon']],
    ])
  })
})

describe('the card', () => {
  it('writes a fractional CR as the canvas does, one glyph', () => {
    expect([0.125, 0.25, 0.5, 3, null].map(crGlyph)).toEqual(['⅛', '¼', '½', '3', '—'])
  })

  it('says size and type, lower-casing the type', () => {
    expect(kindLine({ size: 'Large', creatureType: 'Monstrosity' })).toBe('Large monstrosity')
    expect(kindLine({ size: null, creatureType: null })).toBe('Creature')
  })

  it('leaves out of the stat line what the note does not say', () => {
    expect(statLine({ ac: 13, hp: 59, speed: 40 })).toBe('AC 13 · HP 59 · 40 ft.')
    expect(statLine({ ac: null, hp: 59, speed: null })).toBe('HP 59')
    expect(statLine({ ac: null, hp: null, speed: null })).toBeNull()
  })

  it('lights a pip per movement mode, always four in the same order', () => {
    expect(movePips(['climb']).map(p => `${p.label}:${p.on}`)).toEqual([
      'FLY:false',
      'SWIM:false',
      'CLIMB:true',
      'BURROW:false',
    ])
  })

  it('flags legendary and casting', () => {
    expect(flagsOf({ legendary: true, spellcasting: true })).toEqual(['Legendary', 'Caster'])
    expect(flagsOf({ legendary: false, spellcasting: false })).toEqual([])
  })

  it('never draws a card under 320px, one to four columns (MYDND-120)', () => {
    // The canvas's 632px shelf held three ~200px cards; now it holds one.
    expect(cardColumns(632)).toBe(1)
    expect(cardColumns(651)).toBe(1)
    expect(cardColumns(652)).toBe(2) // 320 + 12 + 320
    expect(cardColumns(984)).toBe(3)
    expect(cardColumns(150)).toBe(1)
    expect(cardColumns(2000)).toBe(4)
  })
})

describe('pricing a fight', () => {
  it('names the party by size and level range', () => {
    expect(partyLabel([5, 5, 5, 5])).toBe('4 characters · level 5')
    expect(partyLabel([3, 5, 4])).toBe('3 characters · levels 3–5')
    expect(partyLabel([7])).toBe('1 character · level 7')
    expect(partyLabel([])).toBe('No characters')
  })

  it('prices the canvas’s party: four level 5s are 2,000 / 3,000 / 4,400', () => {
    expect(budgets([5, 5, 5, 5])).toEqual({ low: 2000, moderate: 3000, high: 4400 })
  })

  it('groups the encounter’s monsters by note, ignoring characters, and prices them', () => {
    const owlbear = row('Owlbear', 3, { xp: 700 })
    const harpy = row('Harpy', 1, { xp: 200 })
    const groups = encounterGroups(
      [
        { kind: 'pc', monsterId: null, name: 'Brakka' },
        { kind: 'monster', monsterId: 'owlbear', name: 'Owlbear' },
        { kind: 'monster', monsterId: 'harpy', name: 'Harpy' },
        { kind: 'monster', monsterId: 'harpy', name: 'Harpy' },
        { kind: 'monster', monsterId: 'gone', name: 'Deleted Note' },
      ],
      [owlbear, harpy],
    )
    expect(groups.map(g => [g.name, g.count, g.xp])).toEqual([
      ['Owlbear', 1, 700],
      ['Harpy', 2, 200],
      ['Deleted Note', 1, null],
    ])
    expect(spentXp(groups)).toBe(1100)
  })
})
