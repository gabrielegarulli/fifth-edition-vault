import { describe, expect, it } from 'vitest'

import type { VaultCharacterJson } from './fence'
import { spellPushes } from './spellPush'

const REPELLING = {
  name: 'Repelling Blast',
  description:
    'Choose one of your known Warlock cantrips that requires an attack roll. When you hit a Large or smaller creature with that cantrip, you can push the creature up to 10 feet straight away from you.',
}
const blast = { kind: 'cantrip', id: 'eldritch-blast', name: 'Eldritch Blast' }

const warlock = (...invocations: unknown[]): VaultCharacterJson => ({
  name: 'Mordecai',
  featureChoices: { 'warlock:1:eldritch-invocations': { type: 'invocations', invocations } },
})

describe('what a pick makes a spell push', () => {
  it('reads the distance off the option, for the cantrip it names', () => {
    expect(spellPushes(warlock({ ...REPELLING, target: blast }))).toEqual([
      { id: 'eldritch-blast', name: 'Eldritch Blast', feet: 10 },
    ])
  })

  it('pushes with nothing until a cantrip is named', () => {
    expect(spellPushes(warlock(REPELLING))).toEqual([])
  })

  // Eldritch Spear names a cantrip exactly as Repelling Blast does.
  it('takes no notice of a pick that names a cantrip and pushes nothing', () => {
    const spear = { name: 'Eldritch Spear', description: "That spell's range increases.", target: blast }
    expect(spellPushes(warlock(spear))).toEqual([])
  })

  it('needs the target to be a cantrip', () => {
    expect(spellPushes(warlock({ ...REPELLING, target: { kind: 'feat', id: 'x', name: 'X' } }))).toEqual([])
  })

  it('is one push however many picks name that cantrip', () => {
    expect(spellPushes(warlock({ ...REPELLING, target: blast }, { ...REPELLING, target: blast }))).toHaveLength(1)
  })

  it('reads nothing from a character with no invocations', () => {
    expect(spellPushes({ name: 'Brakka' })).toEqual([])
    expect(spellPushes({ name: 'Brakka', featureChoices: { x: null, y: { type: 'feat' } } })).toEqual([])
  })
})
