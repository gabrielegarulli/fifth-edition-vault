import { describe, expect, it } from 'vitest'

import { appendRoll, describeRoll, logEntry, ROLL_LOG_LIMIT, type RollLogEntry } from './rollLog'

const entry = (over: Partial<Parameters<typeof logEntry>[0]> = {}): RollLogEntry =>
  logEntry({
    id: 'r1',
    label: 'Stealth',
    dice: [{ count: 1, sides: 20, results: [18] }],
    modifier: 7,
    total: 25,
    mode: 'normal',
    at: 0,
    ...over,
  })

describe('logEntry', () => {
  it('flattens the engine groups into one list of faces', () => {
    const e = entry({
      dice: [
        { count: 1, sides: 8, results: [5] },
        { count: 1, sides: 6, results: [3] },
      ],
      modifier: 4,
      total: 12,
    })
    expect(e.dice).toEqual([
      { face: 5, sides: 8 },
      { face: 3, sides: 6 },
    ])
    expect(e.formula).toBe('1d8+1d6+4')
  })

  it('marks a dropped die as dropped and appends it', () => {
    // `applyKeep` removes it from `results` — being dropped is exactly that —
    // so it has no index to sit at.
    const e = entry({
      dice: [{ count: 1, sides: 20, results: [18], dropped: [4] }],
      mode: 'advantage',
    })
    expect(e.dice).toEqual([
      { face: 18, sides: 20 },
      { face: 4, sides: 20, dropped: true },
    ])
  })

  it('keeps a replaced die legible, and does not call it dropped', () => {
    // The distinction `rollEngine.js` draws and the log makes visible: a dropped
    // die stopped counting, a replaced one changed its face. One key for both
    // would make a Great Weapon Fighting floor look like a discard.
    const e = entry({
      dice: [{ count: 2, sides: 6, results: [3, 5], replaced: [{ index: 0, from: 1, to: 3 }] }],
      modifier: 0,
      total: 8,
    })
    expect(e.dice).toEqual([
      { face: 3, sides: 6, from: 1 },
      { face: 5, sides: 6 },
    ])
    expect(e.dice.some(d => d.dropped)).toBe(false)
  })

  it('records whether the faces were simulated, because only the caller knows', () => {
    // The engine falls back to `rngRoller` silently and by design.
    expect(entry().simulated).toBe(false)
    expect(entry({ simulated: true }).simulated).toBe(true)
  })
})

describe('describeRoll', () => {
  it('brackets a dropped die and arrows a replaced one', () => {
    expect(
      describeRoll(entry({ dice: [{ count: 1, sides: 20, results: [18], dropped: [4] }], mode: 'advantage' })),
    ).toBe('Stealth: 18 (4) + 7 = 25 (advantage)')

    expect(
      describeRoll(
        entry({
          dice: [{ count: 1, sides: 6, results: [3], replaced: [{ index: 0, from: 1, to: 3 }] }],
          modifier: 0,
          total: 3,
        }),
      ),
    ).toBe('Stealth: 1→3 = 3')
  })

  it('writes a negative modifier as a subtraction', () => {
    expect(describeRoll(entry({ modifier: -1, total: 17 }))).toBe('Stealth: 18 - 1 = 17')
  })
})

describe('appendRoll', () => {
  it('puts the newest first and never mutates the log', () => {
    const first = entry({ id: 'a' })
    const log = [first]
    const next = appendRoll(log, entry({ id: 'b' }))
    expect(next.map(e => e.id)).toEqual(['b', 'a'])
    expect(log).toHaveLength(1)
  })

  it('caps at the limit', () => {
    let log: RollLogEntry[] = []
    for (let i = 0; i < ROLL_LOG_LIMIT + 10; i += 1) log = appendRoll(log, entry({ id: `r${i}` }))
    expect(log).toHaveLength(ROLL_LOG_LIMIT)
    expect(log[0].id).toBe(`r${ROLL_LOG_LIMIT + 9}`)
  })
})
