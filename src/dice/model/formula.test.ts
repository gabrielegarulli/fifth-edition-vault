import { describe, expect, it } from 'vitest'

import { toFormula } from './formula'

/**
 * Ported from `obsidian-vault-characters`' `testPureHelpers` (MYDND-7).
 *
 * Small, and the one that would break everything: every clickable number on the
 * sheet goes through this, so a modifier that stops gaining its `1d20` turns
 * every ability check into a flat number Atlas rolls as nothing.
 */
describe('toFormula', () => {
  it('puts a d20 in front of a bare modifier', () => {
    expect(toFormula('+7')).toBe('1d20+7')
    expect(toFormula('-1')).toBe('1d20-1')
  })

  it('signs an unsigned modifier', () => {
    expect(toFormula('0')).toBe('1d20+0')
    expect(toFormula('5')).toBe('1d20+5')
    expect(toFormula(7)).toBe('1d20+7')
  })

  it('passes a dice expression through untouched', () => {
    expect(toFormula('2d8+3')).toBe('2d8+3')
    expect(toFormula('1d20')).toBe('1d20')
    expect(toFormula('13d8')).toBe('13d8')
    expect(toFormula('7d6')).toBe('7d6')
  })

  it('ignores whitespace', () => {
    expect(toFormula(' +5 ')).toBe('1d20+5')
  })

  it('never emits keep-highest notation', () => {
    // Atlas' parser sums every dice term it finds, so `2d20kh1` would roll two
    // d20s and *add* them. Advantage is two rolls; nothing here may produce a
    // formula that pretends otherwise.
    for (const input of ['+7', '-1', '0', '1d20', '2d8+3']) {
      expect(toFormula(input)).not.toMatch(/k[hl]/i)
    }
  })
})
