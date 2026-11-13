import { describe, expect, it } from 'vitest'

import { actionRolls, initiativeMod } from './statblockRolls'
import { isRollable, parseFormula } from '../../dice/model/groups'

/**
 * Every string in this file is **copied out of `C:\DnD\lore\bestiary`**, not
 * composed to suit the regex. That is the whole point: a prose parser tested
 * against prose its author wrote is a parser tested against its own assumptions,
 * and the five dice shapes below were found by counting the corpus rather than
 * by reading a note.
 *
 * `src/__verify__/realVault.test.ts` carries the coverage assertion over all 422
 * notes. This file carries the shapes.
 */

describe('actionRolls — attack bonuses', () => {
  it('reads the common melee spelling', () => {
    const desc = '*Melee Attack Roll:* +9, reach 15 ft. *Hit:* 12 (2d6 + 5) Bludgeoning damage.'
    expect(actionRolls(desc).attack).toBe(9)
  })

  it('reads the ranged spelling', () => {
    expect(actionRolls('*Ranged Attack Roll:* +6, range 80/320 ft.').attack).toBe(6)
  })

  it('reads the combined spelling, which a literal pattern misses on 21 notes', () => {
    // The third measured spelling. `*Melee Attack Roll:*` as a literal finds
    // nothing here, and finding nothing is indistinguishable from an action that
    // makes no attack.
    const desc = '*Melee Attack Roll or Ranged Attack Roll:* +7, reach 5 ft. or range 20/60 ft.'
    expect(actionRolls(desc).attack).toBe(7)
  })

  it('reads a negative bonus as negative', () => {
    expect(actionRolls('*Melee Attack Roll:* -1, reach 5 ft.').attack).toBe(-1)
  })

  it('is null for an action that imposes a save rather than making an attack', () => {
    // A DC is not a roll. Nobody rolls it, and offering it as one would put a
    // clickable 16 on a line that reads "DC 16".
    const desc = '*Intelligence Saving Throw:* DC 16, one creature within 30 feet.'
    expect(actionRolls(desc).attack).toBeNull()
  })

  it('is null for Multiattack, which has no numbers at all', () => {
    expect(actionRolls('The aboleth makes two Tentacle attacks.').attack).toBeNull()
  })
})

describe('actionRolls — damage', () => {
  it('reads dice with a modifier and the type', () => {
    const { damage } = actionRolls('*Hit:* 12 (2d6 + 5) Bludgeoning damage.')
    expect(damage).toEqual([{ formula: '2d6 + 5', damageType: 'bludgeoning' }])
  })

  it('reads bare dice', () => {
    const { damage } = actionRolls('*Failure:* 10 (3d6) Psychic damage.')
    expect(damage).toEqual([{ formula: '3d6', damageType: 'psychic' }])
  })

  it('reads dice split by a newline inside the parentheses', () => {
    // 16 of 1,078 occurrences. A `\( ?\d+d\d+( ?[+-] ?\d+)? ?\)` pattern drops
    // them, which loses a damage die rather than failing visibly — the exact
    // failure mode this suite exists for.
    const { damage } = actionRolls('*Hit:* 13 (2d8 \n+ 4) Piercing damage.')
    expect(damage).toEqual([{ formula: '2d8 \n+ 4', damageType: 'piercing' }])
    expect(parseFormula(damage[0].formula)).toEqual({
      dice: [{ count: 2, sides: 8, damageType: null }],
      modifier: 4,
    })
  })

  it('reads the other newline placement too', () => {
    const { damage } = actionRolls('*Hit:* 13 (2d8 + \n4) Piercing damage.')
    expect(parseFormula(damage[0].formula).modifier).toBe(4)
  })

  it('reads a subtracted modifier', () => {
    const { damage } = actionRolls('*Hit:* 2 (1d6 - 1) Slashing damage.')
    expect(parseFormula(damage[0].formula)).toEqual({
      dice: [{ count: 1, sides: 6, damageType: null }],
      modifier: -1,
    })
  })

  it('reads both expressions of a two-damage action, in prose order', () => {
    // "plus" damage is a second die on one action. Offering only the first
    // understates the monster, and the understatement looks like the whole
    // answer.
    const desc = '*Hit:* 7 (1d8 + 3) Piercing damage plus 3 (1d6) Poison damage.'
    expect(actionRolls(desc).damage).toEqual([
      { formula: '1d8 + 3', damageType: 'piercing' },
      { formula: '1d6', damageType: 'poison' },
    ])
  })

  it('lower-cases a type the corpus wrote capitalised or not', () => {
    expect(actionRolls('(2d6) thunder damage').damage[0].damageType).toBe('thunder')
    expect(actionRolls('(2d6) Thunder damage').damage[0].damageType).toBe('thunder')
  })

  it('leaves the type null rather than inventing one from the next word', () => {
    // Four occurrences in the corpus read `) from its …`. "from" is not a damage
    // type, and a closed vocabulary is what keeps it out.
    const { damage } = actionRolls('*Hit:* 10 (3d6) from its searing hide.')
    expect(damage).toEqual([{ formula: '3d6', damageType: null }])
  })

  it('is empty for prose with no dice', () => {
    expect(actionRolls('*Success:* Half damage.').damage).toEqual([])
  })

  it('does not carry regex state between calls', () => {
    // `DICE` is a module-level `/g` regex, so `lastIndex` survives a call. Two
    // identical inputs must give two identical answers; without the reset the
    // second one starts mid-string and returns nothing.
    const desc = '*Hit:* 12 (2d6 + 5) Bludgeoning damage.'
    expect(actionRolls(desc)).toEqual(actionRolls(desc))
    expect(actionRolls(desc).damage).toHaveLength(1)
  })

  it('produces formulas the dice layer accepts', () => {
    // The parse is only worth anything if what comes out can be rolled.
    for (const desc of [
      '*Hit:* 12 (2d6 + 5) Bludgeoning damage.',
      '*Failure:* 10 (3d6) Psychic damage.',
      '*Hit:* 13 (2d8 \n+ 4) Piercing damage.',
      '*Hit:* 2 (1d6 - 1) Slashing damage.',
    ]) {
      for (const d of actionRolls(desc).damage) expect(isRollable(d.formula)).toBe(true)
    }
  })
})

describe('initiativeMod', () => {
  it('takes the modifier and never the bracketed passive score', () => {
    // `+7 (17)` is a +7 modifier and a passive 17. Reading the 17 would roll
    // `1d20+17` for a creature with +7 — ten points out, and plausible.
    expect(initiativeMod('+7 (17)')).toBe(7)
  })

  it('reads the negative form, which 31 notes carry', () => {
    expect(initiativeMod('-2 (8)')).toBe(-2)
  })

  it('passes a plain number through', () => {
    expect(initiativeMod(3)).toBe(3)
  })

  it('refuses rather than guessing', () => {
    expect(initiativeMod(undefined)).toBeNull()
    expect(initiativeMod('')).toBeNull()
    expect(initiativeMod('varies')).toBeNull()
  })
})
