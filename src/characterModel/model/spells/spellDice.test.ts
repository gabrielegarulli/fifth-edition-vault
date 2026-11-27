import { describe, expect, it } from 'vitest'

import { cantripTier } from '../../../compendium/model/spellRanks'
import { spellDamageBonus, spellRiderBonus, spellRoll } from './spellDice'

const row = (over: Partial<Parameters<typeof spellRoll>[0]>) => ({
  level: 3,
  damageDice: null,
  healDice: null,
  healMod: false,
  upcastDice: null,
  cantripDice: [],
  damageTypes: [],
  ...over,
})

describe('spellDamageBonus (MYDND-178)', () => {
  const bonuses = [{ id: 'eldritch-blast', name: 'Eldritch Blast', bonus: 5 }]

  it('finds a spell by its note, or by name when another edition answers', () => {
    expect(spellDamageBonus(bonuses, 'Eldritch Blast', 'eldritch-blast')).toBe(5)
    expect(spellDamageBonus(bonuses, 'Eldritch Blast', 'eldritch-blast-phb')).toBe(5)
    expect(spellDamageBonus(bonuses, 'Blast', 'eldritch-blast')).toBe(5)
  })

  it('is 0 for any other spell, and for a sheet with none', () => {
    expect(spellDamageBonus(bonuses, 'Fire Bolt', 'fire-bolt')).toBe(0)
    expect(spellDamageBonus(undefined, 'Eldritch Blast', 'eldritch-blast')).toBe(0)
  })
})

describe('spellRoll', () => {
  it('rolls Fireball at the rank cast, with its damage type', () => {
    const fireball = row({ damageDice: '8d6', upcastDice: '1d6', damageTypes: ['fire'] })
    expect(spellRoll(fireball, { rank: 4, characterLevel: 9, spellMod: 4 })).toEqual({
      formula: '9d6',
      kind: 'damage',
      damageType: 'fire',
    })
  })

  it('heals with the spellcasting modifier when the spell says so', () => {
    const cure = row({ level: 1, healDice: '2d8', healMod: true, upcastDice: '2d8' })
    expect(spellRoll(cure, { rank: 2, characterLevel: 5, spellMod: 4 })?.formula).toBe('4d8+4')
  })

  it('rolls a cantrip by character level, and nothing for a tier that adds nothing', () => {
    const fireBolt = row({ level: 0, damageDice: '1d10', cantripDice: ['1d10', '2d10', '3d10', '4d10'] })
    expect(spellRoll(fireBolt, { rank: 0, characterLevel: 13, spellMod: 4 })?.formula).toBe('3d10')
    const trueStrike = row({ level: 0, cantripDice: ['', '1d6', '2d6', '3d6'] })
    expect(spellRoll(trueStrike, { rank: 0, characterLevel: 1, spellMod: 4 })).toBeNull()
    expect(cantripTier(4)).toBe(0)
    expect(cantripTier(17)).toBe(3)
  })

  // MYDND-178: Agonizing Blast, on the roll a beam makes.
  it('adds a flat damage bonus to the dice a cantrip rolls', () => {
    const at = (damageBonus: number, over = {}) =>
      spellRoll(row({ level: 0, damageDice: '1d10', ...over }), { rank: 0, characterLevel: 20, spellMod: 5, damageBonus })?.formula
    expect(at(5)).toBe('1d10+5')
    expect(at(-1)).toBe('1d10-1')
    expect(at(0)).toBe('1d10')
    expect(at(5, { damageDice: null, cantripDice: ['1d8', '2d8', '3d8', '4d8'] })).toBe('4d8+5')
  })

  it('never makes a roll out of a bonus alone', () => {
    const cantrip = row({ level: 0, cantripDice: ['', '1d6', '2d6', '3d6'] })
    expect(spellRoll(cantrip, { rank: 0, characterLevel: 1, spellMod: 5, damageBonus: 5 })).toBeNull()
    expect(spellRoll(row({ level: 1 }), { rank: 1, characterLevel: 1, spellMod: 5, damageBonus: 5 })).toBeNull()
  })

  it('adds a damage bonus to damage and never to a heal', () => {
    const opts = { rank: 3, characterLevel: 5, spellMod: 0, damageBonus: 2 }
    expect(spellRoll(row({ damageDice: '8d6' }), opts)?.formula).toBe('8d6+2')
    expect(spellRoll(row({ healDice: '2d8' }), opts)?.formula).toBe('2d8')
  })

  it('rolls nothing for a spell with no dice', () => {
    expect(spellRoll(row({}), { rank: 3, characterLevel: 5, spellMod: 4 })).toBeNull()
  })
})

describe('spellRiderBonus (MYDND-285)', () => {
  const fireball = { school: 'Evocation', damageTypes: ['fire'], classes: ['Sorcerer', 'Wizard'] }
  const sacredFlame = { school: 'Evocation', damageTypes: ['radiant'], classes: ['Cleric'] }
  const cure = { school: 'Abjuration', damageTypes: [], classes: ['Cleric'] }

  it('matches by school, damage type and list, and sums', () => {
    const riders = [
      { name: 'Empowered Evocation', kind: 'damage' as const, bonus: 5, schools: ['evocation'], list: 'Wizard' },
      { name: 'Radiant Soul', kind: 'damage' as const, bonus: 3, damage_types: ['radiant', 'fire'] },
    ]
    expect(spellRiderBonus(riders, fireball).damage).toBe(8)
    // Evocation, but not a Wizard spell.
    expect(spellRiderBonus(riders, sacredFlame).damage).toBe(3)
    expect(spellRiderBonus(riders, cure).damage).toBe(0)
    expect(spellRiderBonus(riders, null).damage).toBe(0)
  })

  it('Disciple of Life: 2 + the slot, and nothing without a slot', () => {
    const riders = [{ name: 'Disciple of Life', kind: 'heal' as const, bonus: 2, plus_rank: true, slot_only: true }]
    expect(spellRiderBonus(riders, cure).heal(1, true)).toBe(3)
    expect(spellRiderBonus(riders, cure).heal(4, true)).toBe(6)
    expect(spellRiderBonus(riders, cure).heal(1, false)).toBe(0)
    expect(spellRiderBonus(riders, cure).damage).toBe(0)
  })

  it('reaches the heal formula', () => {
    const roll = spellRoll(row({ level: 1, healDice: '2d8', healMod: true, upcastDice: '2d8' }), { rank: 2, characterLevel: 3, spellMod: 3, healBonus: 4 })
    expect(roll?.formula).toBe('4d8+7')
  })
})
