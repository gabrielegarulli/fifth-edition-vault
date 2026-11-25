import { describe, expect, it } from 'vitest'

import type { Sheet, VaultCharacterJson } from '../../characterModel'
import { benefitStatusLabel, featLines } from './featLines'

/**
 * The Features tab's feat lines (MYDND-274): the picks, and each benefit's
 * status. The sorting is `@vault/derive`'s `featContributionGroups`; what is
 * pinned here is the adapter — that a Vault sheet's bake reaches it, and that a
 * feat's answers come back named.
 */

const sheet = (effects: Record<string, unknown>[] | null): Sheet =>
  ({
    proficiency_bonus: 2,
    abilities: [{ label: 'WIS', score: 14, mod: 2 }],
    ...(effects ? { vault_bake: { effects, proficiency_baseline: null } } : {}),
  }) as unknown as Sheet

const TRUESIGHT = {
  id: 'boon-of-truesight',
  name: 'Boon of Truesight',
  kind: 'epic_boon',
  fence: {
    benefits: [
      { key: 'ability_score_increase', name: 'Ability Score Increase', effects: [{ type: 'ability_score_choice' }] },
      { key: 'truesight', name: 'Truesight', effects: [{ type: 'sense', sense: 'truesight', range: 60 }] },
    ],
  },
}

const GRAPPLER = {
  id: 'grappler',
  name: 'Grappler',
  kind: 'general',
  fence: {
    benefits: [
      { key: 'punch_and_grab', name: 'Punch and Grab' },
      { key: 'attack_advantage', name: 'Attack Advantage', effects: [{ type: 'attack_roll_advantage', activation: 'activated' }] },
    ],
  },
}

const envelope = (featId: string, benefitKey: string) => ({ source: featId, sourceKind: 'feat', sourceFeatureId: featId, benefitKey })

describe('featLines (MYDND-274)', () => {
  it("says what each benefit does on a Vault sheet: computed, switched on, or the table's", () => {
    const baked = [
      { type: 'sense', sense: 'truesight', range: 60, ...envelope('boon-of-truesight', 'truesight') },
      { type: 'attack_roll_advantage', activation: 'activated', ...envelope('grappler', 'attack_advantage') },
    ]
    const { byId, summary } = featLines(sheet(baked), null, [TRUESIGHT, GRAPPLER])
    expect(byId.get('boon-of-truesight')?.benefits.find(b => b.key === 'truesight')?.status).toBe('computed')
    expect(byId.get('grappler')?.benefits.map(b => [b.key, b.status])).toEqual([
      ['punch_and_grab', 'reminder'],
      ['attack_advantage', 'activated'],
    ])
    expect(summary).toMatch(/^2 feats · /)
  })

  it('says nothing about benefits for a sheet that was never baked here, such as D&D Beyond’s', () => {
    const { byId, summary } = featLines(sheet(null), null, [GRAPPLER])
    expect(byId.get('grappler')?.benefits).toEqual([])
    expect(summary).toBeNull()
  })

  it("names a feat's picks, every copy of it", () => {
    const skilled = { id: 'skilled', name: 'Skilled', kind: 'origin', fence: {} }
    const picks = (slugs: string[]) => ({ picks: slugs.map(slug => ({ kind: 'skill', slug })) })
    const json = {
      featureChoices: {
        feat_skilled: { type: 'feat', featId: 'skilled', featName: 'Skilled', choices: picks(['arcana', 'history', 'nature']) },
        feat_skilled_2: { type: 'feat', featId: 'skilled', featName: 'Skilled', choices: picks(['stealth', 'insight', 'religion']) },
      },
    } as unknown as VaultCharacterJson
    expect(featLines(sheet([]), json, [skilled]).byId.get('skilled')?.picks).toEqual([
      'Arcana', 'History', 'Nature', 'Stealth', 'Insight', 'Religion',
    ])
  })

  it('labels every status in words', () => {
    expect(benefitStatusLabel('computed')).toBe('on the sheet')
    expect(benefitStatusLabel('reminder')).toBe('at the table')
  })
})
