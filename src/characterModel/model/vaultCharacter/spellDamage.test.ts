import { describe, expect, it } from 'vitest'

import type { SheetAbility } from '../sheet/sheet'
import type { VaultCharacterJson } from './fence'
import { spellDamageBonuses } from './spellDamage'

/**
 * Which picks add to a spell's damage (MYDND-178). The wording is the option's
 * own, as the exporter writes it into `classes/warlock.md`; `realVault.test.ts`
 * notices if that changes.
 */

const AGONIZING = {
  name: 'Agonizing Blast',
  description:
    "Choose one of your known Warlock cantrips that deals damage. You can add your Charisma modifier to that spell's damage rolls.\n\n#### Repeatable\n\nYou can gain this invocation more than once.",
  minLevel: 2,
  cantripNote: 'Warlock Cantrip That Deals Damage',
  repeatable: true,
}
const SPEAR = {
  name: 'Eldritch Spear',
  description:
    'Choose one of your known Warlock cantrips that deals damage and has a range of 10+ feet. When you cast that spell, its range increases by a number of feet equal to 30 times your Warlock level.',
  minLevel: 2,
  cantripNote: 'Warlock Cantrip That Deals Damage',
  repeatable: true,
}
const blast = { kind: 'cantrip', id: 'eldritch-blast', name: 'Eldritch Blast' }
const touch = { kind: 'cantrip', id: 'chill-touch', name: 'Chill Touch' }

const charisma = (mod: number): SheetAbility[] => [
  { label: 'INT', score: 18, mod: 4 },
  { label: 'CHA', score: 10 + mod * 2, mod },
]

const warlock = (...invocations: unknown[]): VaultCharacterJson => ({
  name: 'Mordecai',
  classes: [{ id: 'warlock', name: 'Warlock', level: 20 }],
  featureChoices: { 'warlock:1:eldritch-invocations': { type: 'invocations', invocations } },
})

describe('spellDamageBonuses', () => {
  it('adds the modifier the invocation names to the cantrip it was pointed at', () => {
    expect(spellDamageBonuses(warlock({ ...AGONIZING, target: blast }), charisma(5))).toEqual([
      { id: 'eldritch-blast', name: 'Eldritch Blast', bonus: 5 },
    ])
  })

  it('names each cantrip a repeat was pointed at', () => {
    const json = warlock({ ...AGONIZING, target: blast }, { ...AGONIZING, target: touch })
    expect(spellDamageBonuses(json, charisma(3)).map(b => b.id)).toEqual(['eldritch-blast', 'chill-touch'])
  })

  // The sweep's Mordecai has nine of these: picked, and pointed at nothing.
  it('adds nothing for a pick that names no cantrip', () => {
    expect(spellDamageBonuses(warlock(AGONIZING), charisma(5))).toEqual([])
  })

  // Spear and Repelling Blast name a cantrip the same way and add no damage.
  it('adds nothing for an invocation that targets a cantrip for something else', () => {
    expect(spellDamageBonuses(warlock({ ...SPEAR, target: blast }), charisma(5))).toEqual([])
  })

  // The rule is "a different eligible cantrip", so a hand-edited repeat is one bonus.
  it('does not stack two picks on one cantrip', () => {
    const json = warlock({ ...AGONIZING, target: blast }, { ...AGONIZING, target: blast })
    expect(spellDamageBonuses(json, charisma(5))).toEqual([{ id: 'eldritch-blast', name: 'Eldritch Blast', bonus: 5 }])
  })

  it('carries a negative modifier, and says nothing of a zero', () => {
    const json = warlock({ ...AGONIZING, target: blast })
    expect(spellDamageBonuses(json, charisma(-1))[0]?.bonus).toBe(-1)
    expect(spellDamageBonuses(json, charisma(0))).toEqual([])
  })

  it('reads Charisma, not the spellcasting ability, for a Wizard/Warlock', () => {
    expect(spellDamageBonuses(warlock({ ...AGONIZING, target: blast }), charisma(2))[0]?.bonus).toBe(2)
  })

  it('reads a character with no invocations as having no bonus', () => {
    expect(spellDamageBonuses({ name: 'Wren', featureChoices: { 'wizard:1:x': { type: 'feat' } } }, charisma(5))).toEqual([])
    expect(spellDamageBonuses({ name: 'Wren' }, charisma(5))).toEqual([])
  })
})
