import { describe, expect, it } from 'vitest'

import { buildFeaturePicks } from './featurePicks'
import type { DdbPayload } from './payload'

/**
 * MYDND-53. Every id, label and shape below is copied from Gabriela's payload
 * (character 131273842, fetched 2026-10-14) — a level 13 College of Lore Bard —
 * trimmed to the features under test.
 */
const T = 12168134 // the class choices' componentTypeId
const F = 1088085227 // the feat choices'

const gabriela = {
  classes: [
    {
      level: 13,
      definition: { name: 'Bard' },
      subclassDefinition: { name: 'College of Lore' },
      classFeatures: [
        { definition: { id: 10292182, name: 'Bard Subclass', requiredLevel: 3 } },
        { definition: { id: 10292183, name: 'Ability Score Improvement', requiredLevel: 4 } },
        { definition: { id: 10292534, name: 'Magical Discoveries', requiredLevel: 6 } },
        { definition: { id: 10292186, name: '8: Ability Score Improvement', requiredLevel: 8 } },
        { definition: { id: 10292194, name: '9: Expertise', requiredLevel: 9 } },
        { definition: { id: 10292188, name: '12: Ability Score Improvement', requiredLevel: 12 } },
        { definition: { id: 10292189, name: '16: Ability Score Improvement', requiredLevel: 16 } },
      ],
    },
  ],
  feats: [
    { definition: { id: 1789092, name: 'Ability Score Improvement' }, componentId: 10292186 },
    { definition: { id: 1789156, name: 'Inspiring Leader' }, componentId: 10292183 },
    { definition: { id: 1789159, name: 'Lightly Armored' }, componentId: 10292188 },
    // A background feat: its componentId is no class feature's.
    { definition: { id: 1789160, name: 'Lucky' }, componentId: 16335 },
  ],
  choices: {
    class: [
      // The subclass choice resolves against no option list: skipped.
      { componentId: 10292182, componentTypeId: T, type: 7, optionValue: 2190914, label: null },
      // "Choose a Feat": the answer is the feat itself, read from `feats`.
      { componentId: 10292183, componentTypeId: T, type: 6, optionValue: 1789156, label: 'Choose a Feat' },
      { componentId: 10292186, componentTypeId: T, type: 6, optionValue: 1789092, label: 'Choose a Feat' },
      { componentId: 10292188, componentTypeId: T, type: 6, optionValue: 1789159, label: 'Choose a Feat' },
      { componentId: 10292194, componentTypeId: T, type: 2, optionValue: 6091, label: 'Choose a Skill Expertise' },
      { componentId: 10292194, componentTypeId: T, type: 2, optionValue: 6094, label: 'Choose a Skill Expertise' },
      { componentId: 10292534, componentTypeId: T, type: 4, optionValue: 2619141, label: 'Choose a Spell' },
      { componentId: 10292534, componentTypeId: T, type: 4, optionValue: 2619133, label: 'Choose a Spell' },
    ],
    feat: [
      { componentId: 1789092, componentTypeId: F, type: 2, optionValue: 3525, label: 'Choose an Ability Score' },
      { componentId: 1789092, componentTypeId: F, type: 2, optionValue: 3525, label: 'Choose an Ability Score' },
      { componentId: 1789156, componentTypeId: F, type: 3, optionValue: 4496760, label: null },
      { componentId: 1789159, componentTypeId: F, type: 2, optionValue: 4161, label: 'Choose Strength or Dexterity' },
    ],
    choiceDefinitions: [
      { id: `${T}-7`, options: [] },
      { id: `${T}-6`, options: [] },
      {
        id: `${T}-2`,
        options: [
          { id: 6091, label: 'Arcana' },
          { id: 6094, label: 'Nature' },
        ],
      },
      {
        id: `${T}-4`,
        options: [
          { id: 2619133, label: 'Misty Step' },
          { id: 2619141, label: 'Haste' },
        ],
      },
      {
        id: `${F}-2`,
        options: [
          { id: 3525, label: 'Charisma Score' },
          { id: 4161, label: 'Dexterity Score' },
        ],
      },
      { id: `${F}-3`, options: [{ id: 4496760, label: 'Charisma' }] },
    ],
  },
} as unknown as DdbPayload

describe('buildFeaturePicks', () => {
  const picks = buildFeaturePicks(gabriela)
  const at = (feature: string, level: number) => picks.find(p => p.feature === feature && p.level === level)?.picks

  it('names the two spells picked at Magical Discoveries', () => {
    expect(at('Magical Discoveries', 6)).toEqual(['Haste', 'Misty Step'])
  })

  it('names the feat taken at each Ability Score Improvement, with its own choices', () => {
    expect(at('Ability Score Improvement', 4)).toEqual(['Inspiring Leader (Charisma)'])
    // Two +1s to the same score read as one line, not "Charisma, Charisma".
    expect(at('Ability Score Improvement', 8)).toEqual(['Ability Score Improvement (Charisma ×2)'])
    expect(at('Ability Score Improvement', 12)).toEqual(['Lightly Armored (Dexterity)'])
  })

  it("strips D&D Beyond's level prefix from a repeated feature", () => {
    expect(at('Expertise', 9)).toEqual(['Arcana', 'Nature'])
    expect(picks.some(p => /^\d+:/.test(p.feature))).toBe(false)
  })

  it('files every pick under the class, and leaves out features with nothing picked', () => {
    expect(picks.every(p => p.class === 'Bard')).toBe(true)
    // Level 16 is not reached, the subclass choice resolves to nothing, and
    // Lucky is a background feat.
    expect(at('Ability Score Improvement', 16)).toBeUndefined()
    expect(at('Bard Subclass', 3)).toBeUndefined()
    expect(picks.flatMap(p => p.picks).some(s => s.startsWith('Lucky'))).toBe(false)
  })

  it('is empty for a payload with no choices', () => {
    expect(buildFeaturePicks({ classes: [{ level: 1, definition: { name: 'Bard' } }] })).toEqual([])
  })
})
