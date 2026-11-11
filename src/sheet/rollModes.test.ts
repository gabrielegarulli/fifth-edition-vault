import { describe, expect, it } from 'vitest'

import { describeRollMode, rollModes } from './rollModes'

const check = (ability: string) => ({ kind: 'check' as const, ability })
const save = (ability: string) => ({ kind: 'save' as const, ability })
const attack = { kind: 'attack' as const }

describe('rollModes (MYDND-45)', () => {
  it('puts a Poisoned character at disadvantage on checks and attacks, not saves', () => {
    const at = rollModes([], [], ['poisoned'])
    expect(at(check('DEX')).mode).toBe('disadvantage')
    expect(at(attack).mode).toBe('disadvantage')
    expect(at(save('CON')).mode).toBeNull()
    expect(at(check('DEX')).disadvantage).toEqual(['Poisoned'])
  })

  it('narrows Restrained to Dexterity saves', () => {
    const at = rollModes([], [], ['Restrained'])
    expect(at(save('DEX')).mode).toBe('disadvantage')
    expect(at(save('STR')).mode).toBeNull()
  })

  it('cancels advantage against disadvantage, and says both', () => {
    const at = rollModes([], [], ['poisoned', 'invisible'])
    const info = at(attack)
    expect(info.mode).toBeNull()
    expect(describeRollMode(info, 'attack rolls')).toMatch(/cancel.*Invisible, Poisoned/)
  })

  it('leaves out conditions that are not a mode', () => {
    // Exhaustion is a penalty, Stunned an automatic failure: neither is a roll mode.
    const at = rollModes([], [], ['exhaustion', 'stunned', 'grappled', 'bleeding'])
    for (const t of [check('STR'), save('DEX'), attack]) expect(at(t).mode).toBeNull()
  })

  it('reads an effect, gated on activation, and names its source', () => {
    const rage = {
      type: 'ability_check_advantage',
      ability: 'str',
      source: 'Rage',
      activation: 'activated',
      sourceKind: 'feature',
      sourceFeatureId: 'rage',
    }
    expect(rollModes([rage], [], [])(check('STR')).mode).toBeNull()
    const on = rollModes([rage], ['rage'], [])
    expect(on(check('STR'))).toEqual({ mode: 'advantage', advantage: ['Rage'], disadvantage: [] })
    expect(on(check('DEX')).mode).toBeNull()
  })

  it('ignores a save advantage narrowed to a condition, and an attack narrowed to a weapon', () => {
    const effects = [
      { type: 'saving_throw_advantage', condition: 'frightened', source: 'Brave' },
      { type: 'attack_roll_advantage', weapon: { property: 'heavy' }, source: 'Reckless' },
    ]
    const at = rollModes(effects, [], [])
    expect(at(save('WIS')).mode).toBeNull()
    expect(at(attack).mode).toBeNull()
  })

  // MYDND-118. The exporter's exact shape for War Caster's Concentration benefit.
  const warCaster = {
    type: 'saving_throw_advantage',
    ability: 'con',
    trigger: 'to maintain Concentration',
    source: 'War Caster',
  }
  const concentrationSave = { kind: 'save' as const, ability: 'CON', concentration: true }

  it("gives War Caster's advantage to the concentration save, and not to a plain Con save", () => {
    const at = rollModes([warCaster], [], [])
    expect(at(concentrationSave)).toEqual({ mode: 'advantage', advantage: ['War Caster'], disadvantage: [] })
    expect(at(save('CON')).mode).toBeNull()
    expect(at(save('WIS')).mode).toBeNull()
    expect(describeRollMode(at(concentrationSave), 'this concentration save')).toBe(
      'Advantage on this concentration save — War Caster',
    )
  })

  it('lets an unqualified Con save advantage reach the concentration save too', () => {
    const at = rollModes([{ type: 'saving_throw_advantage', ability: 'con', source: 'Blessing' }], [], [])
    expect(at(concentrationSave).mode).toBe('advantage')
  })

  it('ignores any other passive trigger, but honours an activated one (Actor)', () => {
    const passive = { type: 'ability_check_advantage', ability: 'cha', trigger: 'to convince others', source: 'X' }
    expect(rollModes([passive], [], [])(check('CHA')).mode).toBeNull()
    const actor = {
      ...passive,
      source: 'Actor',
      activation: 'activated',
      sourceKind: 'feat',
      sourceFeatureId: 'actor',
      benefitKey: 'impersonation',
    }
    expect(rollModes([actor], ['feat:actor:impersonation'], [])(check('CHA')).mode).toBe('advantage')
  })
})
