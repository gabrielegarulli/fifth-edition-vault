import { describe, expect, it } from 'vitest'

import { withFeatureChoice } from '@vault/derive/builderDraft.js'

import { featureId } from '../../../characterModel/model/vaultCharacter/bake'
import { blankDraft, type BuilderDraft } from '../draft'

import { featureRows, featureTitle, itemLabel } from './features'
import { levelItems } from './completeness'

import { WARLOCK, ctx, pickClass } from './__fixtures__/classes'

describe('featureRows', () => {
  it('keys a fence feature exactly as the bake does — the one contract a saved choice depends on', () => {
    const [first] = featureRows('warlock', WARLOCK.features)
    expect(first.id).toBe(featureId('warlock', WARLOCK.features[0]))
    expect(first.id).toBe('warlock:1:eldritch-invocations')
  })
})

describe('featureTitle', () => {
  const d = pickClass(blankDraft(), 0, 'warlock', WARLOCK, 4)
  const asi = levelItems(d, [ctx(0, 'warlock', WARLOCK)]).find(i => i.kind === 'asi')!
  const answered = (choice: unknown) => withFeatureChoice(d, asi.feature.id, choice) as unknown as BuilderDraft

  it('names an improvement by what it was spent on', () => {
    expect(featureTitle(asi, d)).toBe('Ability Score Improvement')
    expect(featureTitle(asi, answered({ type: 'score', first: 'cha', second: 'con' }))).toBe('Ability Score Improvement')
    expect(featureTitle(asi, answered({ type: 'feat', featId: null, featName: null }))).toBe('Feat')
    expect(featureTitle(asi, answered({ type: 'feat', featId: 'alert', featName: 'Alert' }))).toBe('Feat: Alert')
  })

  it('leaves every other feature its own name', () => {
    const inv = levelItems(d, [ctx(0, 'warlock', WARLOCK)])[0]
    expect(featureTitle(inv, d)).toBe('Eldritch Invocations')
    expect(itemLabel(asi, answered({ type: 'feat', featId: 'alert', featName: 'Alert' }))).toBe('Warlock 4: Feat: Alert')
    expect(itemLabel(asi)).toBe('Warlock 4: Ability Score Improvement')
  })
})
