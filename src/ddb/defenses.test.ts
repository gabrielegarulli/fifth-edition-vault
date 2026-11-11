import { describe, expect, it } from 'vitest'

import { buildDefenses, buildProficiencies, buildSenses, buildSpeeds } from './defenses'
import type { DdbPayload } from './payload'

/**
 * MYDND-48. Modifier shapes copied from Gabriela's and Gibbs's payloads
 * (2026-10-14), not invented — the two traps below are both real.
 */
const payload = {
  modifiers: {
    race: [
      { type: 'set-base', subType: 'darkvision', value: 60, friendlySubtypeName: 'Darkvision' },
      { type: 'language', subType: 'common', friendlySubtypeName: 'Common' },
      { type: 'proficiency', subType: 'deception', friendlySubtypeName: 'Deception' },
    ],
    class: [
      { type: 'proficiency', subType: 'light-armor', friendlySubtypeName: 'Light Armor' },
      { type: 'proficiency', subType: 'simple-weapons', friendlySubtypeName: 'Simple Weapons' },
      { type: 'proficiency', subType: 'rapier', friendlySubtypeName: 'Rapier' },
      { type: 'proficiency', subType: 'thieves-tools', friendlySubtypeName: "Thieves' Tools" },
      { type: 'proficiency', subType: 'lute', friendlySubtypeName: 'Lute' },
      { type: 'proficiency', subType: 'dexterity-saving-throws', friendlySubtypeName: 'Dexterity Saving Throws' },
      { type: 'proficiency', subType: 'choose-a-gaming-set', friendlySubtypeName: 'Choose a Gaming Set' },
    ],
    item: [
      // The bare damage type, which `getDamageDefenses` reads since VAULT-247.
      { type: 'resistance', subType: 'cold', value: null, friendlySubtypeName: 'Cold' },
      // The flag beside the real range.
      { type: 'set-base', subType: 'darkvision', value: 1 },
      { type: 'sense', subType: 'darkvision', value: 90 },
      { type: 'set-innate-speed', subType: 'innate-speed-flying', value: 50 },
    ],
    feat: [
      { type: 'proficiency', subType: 'shields', friendlySubtypeName: 'Shields' },
      { type: 'immunity', subType: 'poisoned', friendlySubtypeName: 'Poisoned' },
      { type: 'resistance', subType: 'fire-damage', friendlySubtypeName: 'Fire Damage' },
    ],
  },
  race: { weightSpeeds: { normal: { walk: 30, fly: 0, swim: 0, climb: 0, burrow: 0 } } },
} as unknown as DdbPayload

describe('buildDefenses', () => {
  it('skips a potion in the bag (MYDND-53)', () => {
    // Gabriela's Potion of Cold Resistance, unequipped, as the payload has it:
    // its resistance sits in `modifiers.item` all the same.
    const bag = {
      inventory: [{ equipped: false, isAttuned: false, definition: { id: 5137, name: 'Potion of Cold Resistance' } }],
      modifiers: {
        item: [{ type: 'resistance', subType: 'cold', value: null, requiresAttunement: false, componentId: 5137 }],
      },
    } as unknown as DdbPayload
    expect(buildDefenses(bag)).toEqual([])
  })

  it('reads the bare and the -damage spelling, and the condition immunity, each sourced', () => {
    expect(buildDefenses(payload)).toEqual([
      { type: 'resistance', value: 'cold', source: 'Item' },
      { type: 'condition_immunity', value: 'poisoned', source: 'Feat' },
      { type: 'resistance', value: 'fire', source: 'Feat' },
    ])
  })
})

describe('buildSenses', () => {
  it('keeps the largest range and ignores the set-base flag of 1', () => {
    expect(buildSenses(payload)).toEqual([{ name: 'darkvision', range: 90, source: 'Item' }])
  })
})

describe('buildSpeeds', () => {
  it('drops zero modes and raises one from an innate-speed modifier', () => {
    expect(buildSpeeds(payload, 30)).toEqual({ walk: 30, fly: 50 })
  })
})

describe('buildProficiencies', () => {
  it('sorts the one proficiency type into armour, weapons and tools, and skips skills, saves and choices', () => {
    expect(buildProficiencies(payload)).toEqual({
      armor: ['Light Armor', 'Shields'],
      weapons: ['Rapier', 'Simple Weapons'],
      tools: ['Lute', "Thieves' Tools"],
      languages: ['Common'],
    })
  })
})
