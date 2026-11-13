import type { App } from 'obsidian'
import { describe, expect, it, vi } from 'vitest'

import {
  ATLAS_MAX_CHARACTERS,
  atlasKeepsD20,
  createAtlasRoller,
  facesOf,
  nativeFacesOf,
  REVEAL_WAIT_MS,
  throwsOf,
} from './roller'

/**
 * A fake Atlas, reachable through the same accessor walk `atlas.ts` performs.
 *
 * Built the long way — a leaf with a `serviceManager` and two getters — rather
 * than stubbing `resolveAtlasDice`, because the walk is the fragile part and a
 * test that skipped it would pass against an Atlas that had renamed a hop.
 */
function fakeApp(
  rollDice: ((formula: string, source: unknown, origin?: unknown, options?: unknown) => unknown) | null,
  extra: Record<string, unknown> = {},
): App {
  const leaves = rollDice
    ? [
        {
          view: {
            serviceManager: {
              getToolController: () => ({ getDiceTool: () => ({ rollDice, ...extra }) }),
            },
          },
        },
      ]
    : []
  return { workspace: { getLeavesOfType: () => leaves } } as unknown as App
}

const D20 = [{ qty: 1, sides: 20 }]
const D6x3 = [{ qty: 3, sides: 6 }]
const D8_2D6 = [
  { qty: 1, sides: 8 },
  { qty: 2, sides: 6 },
]
const ADVANTAGE = [
  { qty: 1, sides: 20 },
  { qty: 1, sides: 20 },
]
const noWait = async (): Promise<void> => {}

describe('facesOf', () => {
  it('reads an array of numbers', () => {
    expect(facesOf({ rolls: [4, 5, 6] }, D6x3)).toEqual([[4, 5, 6]])
  })

  it('reads the three object spellings a dice library might use', () => {
    expect(facesOf({ rolls: [{ value: 4 }, { result: 5 }, { roll: 6 }] }, D6x3)).toEqual([[4, 5, 6]])
  })

  it('slices one throw back into its groups, in order', () => {
    expect(facesOf({ rolls: [7, 2, 5] }, D8_2D6)).toEqual([[7], [2, 5]])
  })

  it("reads Atlas' own shape, and refuses a die filed under the wrong group", () => {
    const atlas = (dice: string[]): unknown => ({ rolls: dice.map((die, i) => ({ die, value: i + 1, max: 0 })) })
    expect(facesOf(atlas(['d8', 'd6', 'd6']), D8_2D6)).toEqual([[1], [2, 3]])
    // Out of order: slicing anyway would file a d6's face under the d8.
    expect(facesOf(atlas(['d6', 'd6', 'd8']), D8_2D6)).toBeNull()
  })

  it('refuses a count that does not match the groups', () => {
    // A short array is the case the engine's `isValid` already guards; refusing
    // here means the engine falls back wholesale rather than half-answering.
    expect(facesOf({ rolls: [4, 5] }, D6x3)).toBeNull()
    // An exploding die is the same case from the other side: more than asked for.
    expect(facesOf({ rolls: [4, 5, 6, 6] }, D6x3)).toBeNull()
  })

  it('falls back to the total for a single die, and only for one', () => {
    expect(facesOf({ total: 17 }, D20)).toEqual([[17]])
    // Splitting a total across several dice would put faces in the log that
    // nobody threw.
    expect(facesOf({ total: 17 }, D6x3)).toBeNull()
  })

  it('takes the modifier it sent back off a total', () => {
    // Atlas' total includes the `+15` since MYDND-75; the face is what is left.
    expect(facesOf({ total: 19 }, D20, 15)).toEqual([[4]])
  })

  it('refuses a result it cannot read at all', () => {
    expect(facesOf(null, D20)).toBeNull()
    expect(facesOf(undefined, D20)).toBeNull()
    expect(facesOf({ rolls: 'nope' }, D20)).toBeNull()
  })
})

describe('throwsOf', () => {
  it('throws everything together on a normal roll', () => {
    expect(throwsOf(['d8', 'd6'], false)).toEqual([['d8', 'd6']])
  })

  it('throws the advantage d20 — the last group — on its own', () => {
    expect(throwsOf(['d20', 'd4', 'extra'], true)).toEqual([['d20', 'd4'], ['extra']])
  })

  it('has nothing to throw for no groups', () => {
    expect(throwsOf([], false)).toEqual([])
  })
})

describe('createAtlasRoller', () => {
  it('declines with null when no scene is open', async () => {
    // Which the engine answers by using `rngRoller`. Falling back is correct;
    // throwing would take out the click.
    const roller = createAtlasRoller(fakeApp(null))
    await expect(roller([{ qty: 1, sides: 20 }])).resolves.toBeNull()
  })

  it('sends the modifier with the dice, so Atlas shows the total (MYDND-75)', async () => {
    // The bug: Atlas got `1d20`, its popup read 4, and the +15 lived only in
    // this plugin's log. A Persuasion check at +15 has to read 19 on the table.
    const seen: string[] = []
    const roller = createAtlasRoller(
      fakeApp(formula => {
        seen.push(formula)
        return { rolls: [{ die: 'd20', value: 4, max: 20 }], modifiers: 15, total: 19 }
      }),
      'Persuasion',
      null,
      { modifier: 15, wait: noWait },
    )

    await expect(roller(D20)).resolves.toEqual([{ results: [4] }])
    expect(seen).toEqual(['1d20+15'])
  })

  it('throws a multi-group roll as one formula, modifier and all', async () => {
    // Two popups — `1d8`, then `2d6` — showed neither the total nor the +3.
    const seen: string[] = []
    const roller = createAtlasRoller(
      fakeApp(formula => {
        seen.push(formula)
        return { rolls: [7, 2, 5] }
      }),
      null,
      null,
      { modifier: 3, wait: noWait },
    )
    await expect(roller(D8_2D6)).resolves.toEqual([{ results: [7] }, { results: [2, 5] }])
    expect(seen).toEqual(['1d8+2d6+3'])
  })

  it("splits a throw Atlas would refuse, rather than lose the roll", async () => {
    // Eleven terms is past Atlas' ten. Group by group, modifier on the first.
    const seen: string[] = []
    const roller = createAtlasRoller(
      fakeApp(formula => {
        seen.push(formula)
        return { rolls: [1] }
      }),
      null,
      null,
      { modifier: 2, wait: noWait },
    )
    const groups = [4, 6, 8, 10, 12, 20, 4, 6, 8, 10].map(sides => ({ qty: 1, sides }))
    await expect(roller(groups)).resolves.toHaveLength(10)
    expect(seen).toEqual(['1d4+2', '1d6', '1d8', '1d10', '1d12', '1d20', '1d4', '1d6', '1d8', '1d10'])
    expect(seen.every(f => f.length <= ATLAS_MAX_CHARACTERS)).toBe(true)
  })

  it('throws the advantage d20 apart, each with the modifier', async () => {
    const seen: string[] = []
    const roller = createAtlasRoller(
      fakeApp(formula => {
        seen.push(formula)
        return { rolls: [3] }
      }),
      null,
      null,
      { modifier: -1, advantage: 'advantage', wait: noWait },
    )

    await roller(ADVANTAGE)
    // Never `1d20+1d20`: Atlas' parser would sum both and report one number.
    expect(seen).toEqual(['1d20-1', '1d20-1'])
  })

  it('labels each throw of an advantage pair', async () => {
    // Two d20s in Atlas' log say nothing about which one counted.
    const labels: unknown[] = []
    const roller = createAtlasRoller(
      fakeApp((_f, source) => {
        labels.push((source as { abilityName?: string }).abilityName)
        return { rolls: [3] }
      }),
      'Stealth',
      null,
      { advantage: 'advantage', wait: noWait },
    )
    await roller(ADVANTAGE)
    expect(labels).toEqual(['Stealth (1/2)', 'Stealth (2/2)'])
  })

  it('passes the character through, so Atlas can say who rolled', async () => {
    let source: Record<string, unknown> = {}
    const roller = createAtlasRoller(
      fakeApp((_f, s) => {
        source = s as Record<string, unknown>
        return { rolls: [3] }
      }),
      'Stealth',
      { name: 'Gibbs', notePath: 'characters/Gibbs.md' },
      { wait: noWait },
    )
    await roller(D20)
    expect(source).toMatchObject({
      type: 'statblock',
      abilityName: 'Stealth',
      tokenName: 'Gibbs',
      statblockPath: 'characters/Gibbs.md',
    })
  })

  it('waits for the reveal once, after the last throw', async () => {
    // Atlas animates after `rollDice` returns, so the faces are in hand ~400ms
    // before a player can see them. Per throw would pause inside an advantage pair.
    const wait = vi.fn(async () => {})
    const roller = createAtlasRoller(fakeApp(() => ({ rolls: [3] })), null, null, { advantage: 'advantage', wait })
    await roller(ADVANTAGE)
    expect(wait).toHaveBeenCalledTimes(1)
    expect(wait).toHaveBeenCalledWith(REVEAL_WAIT_MS)
  })

  it('does not wait at all when it declines', async () => {
    const wait = vi.fn(async () => {})
    await createAtlasRoller(fakeApp(null), null, null, { wait })(D20)
    expect(wait).not.toHaveBeenCalled()
  })

  it('declines the whole roll when one throw cannot be read', async () => {
    // Keeping half would leave one roll mixing faces Atlas threw with faces
    // this plugin invented.
    let call = 0
    const roller = createAtlasRoller(
      fakeApp(() => {
        call += 1
        return call === 1 ? { rolls: [4] } : { rolls: 'nonsense' }
      }),
      null,
      null,
      { advantage: 'advantage', wait: noWait },
    )
    await expect(roller(ADVANTAGE)).resolves.toBeNull()
  })

  it('returns faces aligned to the groups it was given', async () => {
    const roller = createAtlasRoller(
      fakeApp(formula => (formula === '3d6' ? { rolls: [1, 2, 3] } : { rolls: [20] })),
      null,
      null,
      { advantage: 'advantage', wait: noWait },
    )
    await expect(
      roller([
        { qty: 3, sides: 6 },
        { qty: 1, sides: 20 },
      ]),
    ).resolves.toEqual([{ results: [1, 2, 3] }, { results: [20] }])
  })
})

/** Atlas' built-in `d20` dice set (`builtInDiceSets.ts`): one d20, keep the best or the worst. */
const D20_SET = { dice: [{ count: 1, sides: 20 }], crit: 'natural', advantage: { kind: 'keep' }, disadvantage: { kind: 'keep' } }

/**
 * A fake Atlas 0.9.1 that rolls advantage itself, as `withAdvantage` does: the
 * first d20 term rolls one die more, the better (worse) one kept and the other
 * marked `dropped` — of equal dice the earlier one is kept — and the result
 * says which side it rolled. `faces` are handed out per die, in order.
 */
function nativeAtlas(faces: number[], set: unknown = D20_SET) {
  const calls: { formula: string; label?: string; options?: { advantage?: string } }[] = []
  let cursor = 0
  const rollDice = (formula: string, source: unknown, _origin?: unknown, options?: unknown) => {
    const opts = options as { advantage?: 'advantage' | 'disadvantage' } | undefined
    calls.push({ formula, label: (source as { abilityName?: string }).abilityName, options: opts })
    const rolls: { die: string; value: number; max: number; dropped?: true }[] = []
    let modifiers = 0
    let helped = false
    for (const m of formula.matchAll(/([+-]?)(\d*)d(\d+)|([+-]?\d+)/g)) {
      if (m[3] === undefined) {
        modifiers += parseInt(m[4], 10)
        continue
      }
      const sides = parseInt(m[3], 10)
      const pair = opts?.advantage !== undefined && !helped && sides === 20
      const count = (m[2] ? parseInt(m[2], 10) : 1) + (pair ? 1 : 0)
      const term: { die: string; value: number; max: number; dropped?: true }[] = Array.from({ length: count }, () => ({
        die: `d${sides}`,
        value: faces[cursor++] ?? 10,
        max: sides,
      }))
      if (pair) {
        helped = true
        const [a, b] = term
        const keepFirst = opts?.advantage === 'advantage' ? a.value >= b.value : a.value <= b.value
        const out = keepFirst ? 1 : 0
        term[out] = { ...term[out], dropped: true }
      }
      rolls.push(...term)
    }
    const total = rolls.reduce((n, r) => n + (r.dropped ? 0 : r.value), 0) + modifiers
    return { rolls, modifiers, total, ...(helped && { advantage: opts?.advantage }) }
  }
  return { calls, app: fakeApp(rollDice, { rollingDice: () => set }) }
}

const tool = (rollingDice?: () => unknown): Parameters<typeof atlasKeepsD20>[0] =>
  ({ rollDice: () => undefined, ...(rollingDice && { rollingDice }) }) as Parameters<typeof atlasKeepsD20>[0]

describe('atlasKeepsD20 (MYDND-119)', () => {
  it("is true for Atlas' d20 set, on either side", () => {
    expect(atlasKeepsD20(tool(() => D20_SET), D20, 'advantage')).toBe(true)
    expect(atlasKeepsD20(tool(() => D20_SET), D20, 'disadvantage')).toBe(true)
  })

  it('is false wherever Atlas would not roll the pair the engine keeps from', () => {
    // An Atlas from before 0.9.1: no `rollingDice` at all.
    expect(atlasKeepsD20(tool(), D20, 'advantage')).toBe(false)
    // Collection dice rules from before dice sets read with no advantage rule.
    expect(atlasKeepsD20(tool(() => ({ dice: [{ count: 1, sides: 20 }], crit: 'natural' })), D20, 'advantage')).toBe(false)
    // A rule that adds rather than keeps: Draw Steel's edge, or an added die.
    expect(atlasKeepsD20(tool(() => ({ ...D20_SET, advantage: { kind: 'number', value: 2 } })), D20, 'advantage')).toBe(false)
    expect(atlasKeepsD20(tool(() => ({ ...D20_SET, advantage: { kind: 'die', sides: 6 } })), D20, 'advantage')).toBe(false)
    // Roll-under keeps the lower die for advantage; the engine keeps the higher.
    expect(atlasKeepsD20(tool(() => ({ ...D20_SET, crit: 'roll-under' })), D20, 'advantage')).toBe(false)
    // A set whose die is not one d20.
    expect(atlasKeepsD20(tool(() => ({ ...D20_SET, dice: [{ count: 2, sides: 10 }] })), D20, 'advantage')).toBe(false)
    // `2d20` keeps two of three in Atlas and one of two in `applyKeep`.
    expect(atlasKeepsD20(tool(() => D20_SET), [{ qty: 2, sides: 20 }], 'advantage')).toBe(false)
    // An accessor that throws is an Atlas this cannot read.
    const throwing = tool(() => {
      throw new Error('renamed')
    })
    expect(atlasKeepsD20(throwing, D20, 'advantage')).toBe(false)
  })
})

describe('nativeFacesOf (MYDND-119)', () => {
  const d20 = (value: number, dropped = false) => ({ die: 'd20', value, max: 20, ...(dropped && { dropped: true }) })

  it('puts the kept face in its group and the dropped one in the advantage group', () => {
    expect(nativeFacesOf({ rolls: [d20(5, true), d20(18)], advantage: 'advantage' }, D20, 'advantage')).toEqual([[18], [5]])
    expect(nativeFacesOf({ rolls: [d20(14, true), d20(6)], advantage: 'disadvantage' }, D20, 'disadvantage')).toEqual([
      [6],
      [14],
    ])
  })

  it('reads the pair among other dice, in group order', () => {
    const rolls = [d20(3, true), d20(12), { die: 'd4', value: 2, max: 4 }]
    const groups = [
      { qty: 1, sides: 20 },
      { qty: 1, sides: 4 },
    ]
    expect(nativeFacesOf({ rolls, advantage: 'advantage' }, groups, 'advantage')).toEqual([[12], [2], [3]])
  })

  it('refuses a result that is not the pair the engine would keep from', () => {
    // Atlas rolled it without advantage: the set had no rule after all.
    expect(nativeFacesOf({ rolls: [d20(9)] }, D20, 'advantage')).toBeNull()
    // The other side.
    expect(nativeFacesOf({ rolls: [d20(5, true), d20(18)], advantage: 'disadvantage' }, D20, 'advantage')).toBeNull()
    // Atlas kept the lower die on advantage: the engine would keep the other.
    expect(nativeFacesOf({ rolls: [d20(18, true), d20(5)], advantage: 'advantage' }, D20, 'advantage')).toBeNull()
    // Two dropped, or none.
    expect(
      nativeFacesOf({ rolls: [d20(1, true), d20(2, true), d20(3)], advantage: 'advantage' }, D20, 'advantage'),
    ).toBeNull()
    expect(nativeFacesOf({ rolls: [d20(1), d20(2)], advantage: 'advantage' }, D20, 'advantage')).toBeNull()
    // A re-rolled die, or one a `die` rule added.
    const rerolled = [{ ...d20(1), rerolled: true }, d20(5, true), d20(18)]
    expect(nativeFacesOf({ rolls: rerolled, advantage: 'advantage' }, D20, 'advantage')).toBeNull()
    const added = [d20(5, true), d20(18), { die: 'd6', value: 4, max: 6, advantage: true }]
    expect(nativeFacesOf({ rolls: added, advantage: 'advantage' }, D20, 'advantage')).toBeNull()
  })
})

describe('createAtlasRoller with native advantage (MYDND-119)', () => {
  it('throws once with the advantage option, unlabelled, and hands the engine both faces', async () => {
    const { calls, app } = nativeAtlas([5, 18])
    const roller = createAtlasRoller(app, 'Stealth', null, { modifier: 2, advantage: 'advantage', wait: noWait })

    await expect(roller(ADVANTAGE)).resolves.toEqual([{ results: [18] }, { results: [5] }])
    // One popup with the pair in it — no `(1/2)` and `(2/2)`.
    expect(calls).toEqual([{ formula: '1d20+2', label: 'Stealth', options: { advantage: 'advantage' } }])
  })

  it('asks for disadvantage by name', async () => {
    const { calls, app } = nativeAtlas([14, 6])
    const roller = createAtlasRoller(app, null, null, { advantage: 'disadvantage', wait: noWait })
    await expect(roller(ADVANTAGE)).resolves.toEqual([{ results: [6] }, { results: [14] }])
    expect(calls.map(c => c.options)).toEqual([{ advantage: 'disadvantage' }])
  })

  it('keeps the other dice and the modifier in the same throw', async () => {
    const { calls, app } = nativeAtlas([3, 12, 2])
    const roller = createAtlasRoller(app, null, null, { modifier: 5, advantage: 'advantage', wait: noWait })
    const groups = [
      { qty: 1, sides: 20 },
      { qty: 1, sides: 4 },
      { qty: 1, sides: 20 },
    ]
    await expect(roller(groups)).resolves.toEqual([{ results: [12] }, { results: [2] }, { results: [3] }])
    expect(calls.map(c => c.formula)).toEqual(['1d20+1d4+5'])
  })

  it('still waits for the reveal, once', async () => {
    const wait = vi.fn(async () => {})
    await createAtlasRoller(nativeAtlas([5, 18]).app, null, null, { advantage: 'advantage', wait })(ADVANTAGE)
    expect(wait).toHaveBeenCalledTimes(1)
  })

  it('throws the pair apart where the dice set has no keep rule', async () => {
    const { calls, app } = nativeAtlas([5, 18], { dice: [{ count: 1, sides: 20 }], crit: 'natural' })
    const roller = createAtlasRoller(app, 'Stealth', null, { modifier: 2, advantage: 'advantage', wait: noWait })
    await expect(roller(ADVANTAGE)).resolves.toEqual([{ results: [5] }, { results: [18] }])
    expect(calls).toEqual([
      { formula: '1d20+2', label: 'Stealth (1/2)', options: undefined },
      { formula: '1d20+2', label: 'Stealth (2/2)', options: undefined },
    ])
  })

  it('never asks a normal roll for advantage', async () => {
    const { calls, app } = nativeAtlas([11])
    await createAtlasRoller(app, null, null, { wait: noWait })(D20)
    expect(calls.map(c => c.options)).toEqual([undefined])
  })

  it('declines the roll when Atlas does not answer with the pair', async () => {
    // `rollingDice` promised a keep rule and the throw came back plain.
    const roller = createAtlasRoller(
      fakeApp(() => ({ rolls: [{ die: 'd20', value: 9, max: 20 }], total: 9 }), { rollingDice: () => D20_SET }),
      null,
      null,
      { advantage: 'advantage', wait: noWait },
    )
    await expect(roller(ADVANTAGE)).resolves.toBeNull()
  })
})
