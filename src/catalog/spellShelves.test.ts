import { describe, expect, it } from 'vitest'

import type { SpellRow } from '../content/spells'
import {
  cantripLadder,
  cardLine,
  castAsOf,
  diceLabel,
  flagsOf,
  kindLine,
  LEVEL_SHELVES,
  parseComponents,
  shelfWhen,
  shelveSpells,
  shortDuration,
  shortRange,
  shortTime,
  upcastLadder,
} from './spellShelves'

/** A row as the reader makes it, with every derived key the exporter writes. */
function spell(over: Partial<SpellRow>): SpellRow {
  return {
    id: 'x',
    path: 'spells/x.md',
    name: 'X',
    source: 'XPHB',
    level: 1,
    school: 'Evocation',
    castingTime: '1 action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    edition: '5.5e',
    classes: ['Wizard'],
    affinities: [],
    damageTypes: [],
    damageDice: null,
    healDice: null,
    healMod: false,
    upcastDice: null,
    cantripDice: [],
    tags: [],
    ...over,
  }
}

/** Fireball's frontmatter, from `lore/spells/fireball.md`. */
const FIREBALL = spell({
  id: 'fireball',
  name: 'Fireball',
  level: 3,
  range: '150 feet',
  components: 'V, S, M (a ball of bat guano and sulfur)',
  classes: ['Sorcerer', 'Wizard'],
  damageTypes: ['fire'],
  damageDice: '8d6',
  upcastDice: '1d6',
})

describe('shelves by level', () => {
  it('puts cantrips first and every level on its own shelf, by name', () => {
    const shelves = shelveSpells([
      spell({ id: 'b', name: 'Bless', level: 1 }),
      spell({ id: 'l', name: 'Light', level: 0 }),
      spell({ id: 'a', name: 'Alarm', level: 1 }),
      FIREBALL,
    ])
    const filled = shelves.filter(s => s.rows.length > 0)
    expect(filled.map(s => s.shelf.label)).toEqual(['Cantrips', 'Level 1', 'Level 3'])
    expect(filled[1].rows.map(r => r.name)).toEqual(['Alarm', 'Bless'])
  })

  it('keeps a note with no level off the level shelves, on a last one', () => {
    const shelves = shelveSpells([spell({ id: 'n', name: 'Nameless', level: -1 })])
    expect(shelves.at(-1)?.shelf.id).toBe('lv-none')
    expect(shelves.at(-1)?.rows.map(r => r.name)).toEqual(['Nameless'])
    expect(shelves.slice(0, -1).every(s => s.rows.length === 0)).toBe(true)
  })

  it('tones the levels as the canvas does: teal, violet ×3, orange ×2, gold ×2, rose ×2', () => {
    expect(LEVEL_SHELVES.map(s => s.tone)).toEqual([
      'teal',
      'violet',
      'violet',
      'violet',
      'orange',
      'orange',
      'gold',
      'gold',
      'rose',
      'rose',
    ])
  })

  it('subtitles a level with its count and the cantrips with how they scale', () => {
    expect(shelfWhen(LEVEL_SHELVES[0], 150)).toBe('at will · damage grows at 5, 11, 17')
    expect(shelfWhen(LEVEL_SHELVES[1], 1195)).toBe('1,195 spells')
    expect(shelfWhen(LEVEL_SHELVES[1], 1)).toBe('1 spell')
  })
})

describe('how a spell is cast', () => {
  it('reads the exporter’s spelling and a hand-written one alike', () => {
    expect(castAsOf('1 action')).toBe('action')
    expect(castAsOf('Action')).toBe('action')
    expect(castAsOf('1 bonus')).toBe('bonus')
    expect(castAsOf('1 reaction')).toBe('reaction')
    expect(castAsOf('10 minute')).toBe('longer')
    expect(castAsOf('1 action, 8 hour')).toBe('action')
    expect(castAsOf(null)).toBeNull()
  })

  it('shortens the casting time to what the card’s corner says', () => {
    expect(shortTime('1 action')).toBe('Action')
    expect(shortTime('1 bonus')).toBe('Bonus')
    expect(shortTime('1 reaction')).toBe('Reaction')
    expect(shortTime('1 hour')).toBe('1 hour')
    expect(shortTime('10 minute')).toBe('10 min')
    expect(shortTime('8 hour')).toBe('8 hours')
  })

  /** The exporter writes units in the singular on most notes, and "1 miles" on nine. */
  it('normalises the exporter’s units', () => {
    expect(shortRange('150 feet')).toBe('150 ft')
    expect(shortRange('self')).toBe('Self')
    expect(shortRange('touch')).toBe('Touch')
    expect(shortRange('1 miles')).toBe('1 mile')
    expect(shortRange('500 miles')).toBe('500 miles')
    expect(shortDuration('Instantaneous')).toBe('Instant')
    expect(shortDuration('Concentration, up to 10 minute')).toBe('10 min')
    expect(shortDuration('Concentration, up to 1 hour')).toBe('1 hour')
    expect(shortDuration('8 hour')).toBe('8 hours')
    expect(shortDuration('1 round')).toBe('1 round')
    expect(shortDuration('Instantaneous or 1 hour')).toBe('Instant or 1 hour')
  })
})

describe('a card', () => {
  /** The canvas's own cards: names that fit, counted classes that do not. */
  it('names the classes when they fit and counts them when they do not', () => {
    expect(kindLine(spell({ classes: ['Sorcerer', 'Wizard'] }), 'Evocation')).toBe('Evocation · Sorcerer, Wizard')
    expect(kindLine(spell({ classes: ['Bard', 'Cleric', 'Druid'] }), 'Abjuration')).toBe('Abjuration · Bard, Cleric, Druid')
    expect(kindLine(spell({ classes: ['Artificer', 'Sorcerer', 'Wizard'] }), 'Evocation')).toBe('Evocation · 3 classes')
    expect(kindLine(spell({ classes: ['Sorcerer', 'Warlock', 'Wizard'] }), 'Conjuration')).toBe('Conjuration · 3 classes')
    expect(kindLine(spell({ classes: [] }), 'Biomancy')).toBe('Biomancy')
  })

  it('says what it rolls', () => {
    expect(diceLabel(FIREBALL)).toBe('8d6 fire')
    expect(diceLabel(spell({ damageDice: '3d8', damageTypes: ['necrotic', 'radiant'] }))).toBe('3d8 necrotic/radiant')
    expect(diceLabel(spell({ healDice: '2d4', healMod: true }))).toBe('2d4 + mod heal')
    expect(diceLabel(spell({}))).toBeNull()
    expect(cardLine(FIREBALL)).toBe('Instant · 8d6 fire')
    expect(cardLine(spell({ duration: 'Concentration, up to 1 minute' }))).toBe('1 min')
  })

  it('reads the components without splitting on a comma inside the material', () => {
    expect(parseComponents('V, S, M (a diamond worth 300+ GP, which the spell consumes)')).toEqual({
      verbal: true,
      somatic: true,
      material: true,
      materialText: 'a diamond worth 300+ GP, which the spell consumes',
    })
    expect(parseComponents('S')).toEqual({ verbal: false, somatic: true, material: false, materialText: null })
    expect(parseComponents(null).verbal).toBe(false)
  })

  it('flags concentration and rituals', () => {
    expect(flagsOf(spell({ concentration: true, ritual: true })).map(f => f.text)).toEqual(['Conc.', 'Ritual'])
    expect(flagsOf(spell({}))).toEqual([])
  })
})

describe('what a spell rolls higher', () => {
  it('climbs Fireball from 8d6 at level 3 to 14d6 at 9', () => {
    const ladder = upcastLadder(FIREBALL)
    expect(ladder?.steps.map(s => `${s.label} ${s.dice}`)).toEqual([
      'L3 8d6',
      'L4 9d6',
      'L5 10d6',
      'L6 11d6',
      'L7 12d6',
      'L8 13d6',
      'L9 14d6',
    ])
    expect(ladder?.steps.filter(s => s.base).map(s => s.label)).toEqual(['L3'])
    expect(ladder?.note).toBe('+1d6 for each slot level above 3')
  })

  it('has no ladder for a spell that does not grow', () => {
    expect(upcastLadder(spell({ damageDice: '1d10' }))).toBeNull()
    expect(upcastLadder(spell({ level: 0, damageDice: '1d10', upcastDice: '1d10' }))).toBeNull()
  })

  it('tiers a cantrip at levels 1, 5, 11 and 17', () => {
    const tiers = cantripLadder(spell({ level: 0, cantripDice: ['1d10', '2d10', '3d10', '4d10'] }))
    expect(tiers?.map(t => `${t.label} ${t.dice}`)).toEqual(['Lvl 1 1d10', 'Lvl 5 2d10', 'Lvl 11 3d10', 'Lvl 17 4d10'])
  })
})
