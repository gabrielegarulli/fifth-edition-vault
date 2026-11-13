import { describe, expect, it } from 'vitest'

import {
  invocationOffered,
  invocationTargetKind,
  invocationTargets,
  invocationsComplete,
  keepingPrerequisites,
} from './invocations'

describe('invocations', () => {
  const blast = {
    name: 'Agonizing Blast',
    minLevel: 2,
    repeatable: true,
    cantripNote: 'Warlock Cantrip That Deals Damage',
    description: 'Choose one of your known Warlock cantrips that deals damage.',
  }
  const spear = {
    name: 'Eldritch Spear',
    minLevel: 2,
    repeatable: true,
    cantripNote: 'Warlock Cantrip That Deals Damage',
    description: 'Choose one of your known Warlock cantrips that deals damage and has a range of 10+ feet.',
  }
  const lessons = { name: 'Lessons of the First Ones', repeatable: true, description: 'You gain one Origin feat of your choice.' }
  const spell = (id: string, range: string, damageTypes: string[], level = 0) => ({
    id,
    name: id,
    level,
    range,
    damageTypes,
    damageDice: null,
  })
  const pool = {
    cantrips: [
      spell('eldritch-blast', '120 feet', ['force']),
      spell('chill-touch', 'Touch', ['necrotic']),
      spell('mage-hand', '30 feet', []),
      spell('hex', '90 feet', ['necrotic'], 1),
    ],
    originFeats: [{ id: 'alert', name: 'Alert', source: 'SRD 5.2.1' }],
  }
  const cantrip = (id: string) => ({ kind: 'cantrip' as const, id, name: id })

  it('asks a repeatable invocation for what its own text names, and nothing of the rest', () => {
    expect(invocationTargetKind(blast)).toBe('cantrip')
    expect(invocationTargetKind(lessons)).toBe('origin_feat')
    expect(invocationTargetKind({ name: 'Pact of the Blade' })).toBeNull()
    // A repeat naming neither: the old fixture's shape, and homebrew's.
    expect(invocationTargetKind({ name: 'Odd', repeatable: true })).toBeNull()
  })

  it('offers damaging cantrips, within reach when the invocation says so', () => {
    expect(invocationTargets(blast, pool).map(t => t.id)).toEqual(['eldritch-blast', 'chill-touch'])
    expect(invocationTargets(spear, pool).map(t => t.id)).toEqual(['eldritch-blast'])
    expect(invocationTargets(lessons, pool)).toEqual([{ kind: 'origin_feat', id: 'alert', name: 'Alert', source: 'SRD 5.2.1' }])
    expect(invocationTargets({ name: 'Pact of the Blade' }, pool)).toEqual([])
  })

  it('refuses a second copy of a plain invocation, and a repeat with nothing left to name', () => {
    const pact = { name: 'Pact of the Blade' }
    expect(invocationOffered(pact, [pact], 1, 5, 0)).toBe(false)
    expect(invocationOffered(pact, [pact], 0, 5, 0)).toBe(true)
    expect(invocationOffered(blast, [blast], 1, 5, 2)).toBe(true)
    expect(invocationOffered(blast, [blast, blast], 2, 5, 2)).toBe(false)
    expect(invocationOffered({ name: 'Odd', repeatable: true }, [{ name: 'Odd' }], 1, 5, 0)).toBe(true)
  })

  it('holds an invocation to its level and to its prerequisite in another slot', () => {
    const smite = { name: 'Eldritch Smite', minLevel: 5, requires: 'Pact of the Blade' }
    expect(invocationOffered(smite, [], 0, 5, 0)).toBe(false)
    expect(invocationOffered(smite, [{ name: 'Pact of the Blade' }], 1, 4, 0)).toBe(false)
    expect(invocationOffered(smite, [{ name: 'Pact of the Blade' }], 1, 5, 0)).toBe(true)
    expect(invocationOffered(smite, [{ name: 'Pact of the Blade' }], 0, 5, 0)).toBe(false)
  })

  it('drops what a removed prerequisite held up, all the way along the chain', () => {
    const thirst = { name: 'Thirsting Blade', requires: 'Pact of the Blade' }
    const devour = { name: 'Devouring Blade', requires: 'Thirsting Blade' }
    const armor = { name: 'Armor of Shadows' }
    expect(keepingPrerequisites([thirst, devour, armor])).toEqual([armor])
    const pact = { name: 'Pact of the Blade' }
    expect(keepingPrerequisites([pact, thirst, devour])).toEqual([pact, thirst, devour])
  })

  it('counts a slot answered only once its pick has named what it asks', () => {
    expect(invocationsComplete([{ name: 'Pact of the Blade' }], 1)).toBe(true)
    expect(invocationsComplete([blast], 1)).toBe(false)
    expect(invocationsComplete([{ ...blast, target: cantrip('eldritch-blast') }], 1)).toBe(true)
    expect(invocationsComplete([{ ...blast, target: cantrip('eldritch-blast') }], 2)).toBe(false)
    const feat = (name: string) => ({ kind: 'origin_feat' as const, id: name, name })
    expect(invocationsComplete([{ ...lessons, target: feat('Alert') }], 1)).toBe(true)
    expect(invocationsComplete([{ ...lessons, target: feat('Magic Initiate') }], 1)).toBe(false)
  })
})
