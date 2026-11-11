import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { App as ObsidianApp } from 'obsidian'

import { ObsidianProvider } from '../ObsidianContext'
import { RollProvider } from './RollContext'
import type { RollOutcome } from './RollContext'
import { useRoll } from './useRoll'

/**
 * `roll()` resolves to what the roll came to (MYDND-16).
 *
 * **This is the enabler the rest of that ticket rests on**, so it is tested on
 * its own rather than only through the four surfaces that use it. Before it,
 * `RollHost.roll` returned `void` and the only way to get a number back was to
 * call `rollInScene` directly — which `PartyInitiativeButton` did, at the cost
 * of the log, advantage, the reveal wait, interventions and the local fallback.
 *
 * The thing worth pinning: the modifier goes to Atlas **for the popup** and the
 * engine still totals from the faces, so it is counted once (MYDND-75 — before
 * that, Atlas got dice only and its popup showed a bare face). A test that
 * asserted the total while the fake quietly dropped the modifier is exactly the
 * bug MYDND-16 found in `characters.test.tsx`, where an assertion of `11` had
 * been passing against a number production could not produce.
 */

const rolled: string[] = []
const asked: unknown[] = []

/**
 * `native` is an Atlas 0.9.1 scene with the built-in d20 dice set: it rolls
 * advantage itself when asked (`{ advantage }`), one more d20 beside the first,
 * marking the one it leaves out `dropped` (MYDND-119).
 */
function fakeApp({ atlas = true, faces = [] as number[], native = false } = {}): ObsidianApp {
  const events = { on: () => ({}), offref: () => {} }
  // Per *die*, not per call: a `2d6` group must not receive the same face twice.
  let cursor = 0
  const diceTool = {
    ...(native && {
      rollingDice: () => ({
        dice: [{ count: 1, sides: 20 }],
        crit: 'natural',
        advantage: { kind: 'keep' },
        disadvantage: { kind: 'keep' },
      }),
    }),
    rollDice: (formula: string, _source: unknown, _origin?: unknown, options?: { advantage?: string }) => {
      rolled.push(formula)
      asked.push(options?.advantage)
      // Atlas' own shape: each die in `rolls`, constants in `modifiers`, and a
      // total that adds both — which is what its popup shows (MYDND-75).
      const rolls: { die: string; value: number; dropped?: true }[] = []
      let modifiers = 0
      let helped = false
      for (const m of formula.matchAll(/([+-]?)(\d*)d(\d+)|([+-]?\d+)/g)) {
        if (m[3] === undefined) {
          modifiers += parseInt(m[4], 10)
          continue
        }
        const pair = options?.advantage !== undefined && !helped && m[3] === '20'
        const term: { die: string; value: number; dropped?: true }[] = []
        for (let i = 0; i < (m[2] ? parseInt(m[2], 10) : 1) + (pair ? 1 : 0); i += 1) {
          term.push({ die: `d${m[3]}`, value: faces[cursor] ?? 10 })
          cursor += 1
        }
        if (pair) {
          helped = true
          const [a, b] = term
          const out = (options?.advantage === 'advantage' ? a.value >= b.value : a.value <= b.value) ? 1 : 0
          term[out] = { ...term[out], dropped: true }
        }
        rolls.push(...term)
      }
      const total = rolls.reduce((a, r) => a + (r.dropped ? 0 : r.value), 0) + modifiers
      return { rolls, modifiers, total, ...(helped && { advantage: options?.advantage }) }
    },
  }
  const leaf = {
    view: { serviceManager: { getToolController: () => ({ getDiceTool: () => diceTool }) } },
  }
  return {
    workspace: { ...events, openLinkText: () => Promise.resolve(), getLeavesOfType: () => (atlas ? [leaf] : []) },
    vault: { ...events, getFileByPath: () => null, getResourcePath: () => '' },
    metadataCache: { ...events, getFileCache: () => null },
  } as unknown as ObsidianApp
}

/** Clicks once, then renders the resolved outcome as JSON for assertion. */
function Probe({
  expr,
  modifiers,
}: {
  expr: string
  modifiers?: { shiftKey?: boolean; altKey?: boolean }
}) {
  const roll = useRoll()
  const [outcome, setOutcome] = useState<RollOutcome | null | 'pending'>('pending')

  return (
    <>
      <button
        type="button"
        onClick={() => void roll(expr, 'Probe', null, modifiers, 'check').then(setOutcome)}
      >
        go
      </button>
      <pre data-testid="outcome">{outcome === 'pending' ? '' : JSON.stringify(outcome)}</pre>
    </>
  )
}

function mount(ui: React.ReactElement, opts?: { atlas?: boolean; faces?: number[]; native?: boolean }) {
  rolled.length = 0
  asked.length = 0
  return render(
    <ObsidianProvider app={fakeApp(opts)}>
      <RollProvider>{ui}</RollProvider>
    </ObsidianProvider>,
  )
}

async function outcomeOf(): Promise<RollOutcome> {
  await waitFor(() => expect(screen.getByTestId('outcome').textContent).not.toBe(''))
  return JSON.parse(screen.getByTestId('outcome').textContent ?? 'null') as RollOutcome
}

describe('roll() resolves to its outcome', () => {
  it('returns the total with the modifier added by the engine', async () => {
    mount(<Probe expr="+7" />, { faces: [10] })
    screen.getByText('go').click()

    const outcome = await outcomeOf()
    expect(outcome.total).toBe(17)
    expect(outcome.faces).toEqual([10])
    expect(outcome.modifier).toBe(7)
    expect(outcome.simulated).toBe(false)
    // Atlas is sent the modifier so its popup reads 17, and the total above is
    // still 17 rather than 24: the engine reads the face, not Atlas' total.
    expect(rolled).toEqual(['1d20+7'])
  })

  it('reports the kept face and the discarded one separately on advantage', async () => {
    mount(<Probe expr="+2" modifiers={{ shiftKey: true }} />, { faces: [5, 18] })
    screen.getByText('go').click()

    const outcome = await outcomeOf()
    expect(outcome.mode).toBe('advantage')
    // Kept 18, set 5 aside, then +2.
    expect(outcome.faces).toEqual([18])
    expect(outcome.dropped).toEqual([5])
    expect(outcome.total).toBe(20)
    // Two separate d20s, never one `2d20kh1` — each showing its own total.
    expect(rolled).toEqual(['1d20+2', '1d20+2'])
  })

  it("rolls advantage as one throw where Atlas' dice set keeps a d20 (MYDND-119)", async () => {
    mount(<Probe expr="+2" modifiers={{ shiftKey: true }} />, { faces: [5, 18], native: true })
    screen.getByText('go').click()

    const outcome = await outcomeOf()
    // The engine's reading is the same as with two throws: 18 kept, 5 aside.
    expect(outcome.mode).toBe('advantage')
    expect(outcome.faces).toEqual([18])
    expect(outcome.dropped).toEqual([5])
    expect(outcome.total).toBe(20)
    expect(outcome.simulated).toBe(false)
    // One popup, which Atlas rolled with advantage.
    expect(rolled).toEqual(['1d20+2'])
    expect(asked).toEqual(['advantage'])
  })

  it('rolls disadvantage the same way, keeping the lower face', async () => {
    mount(<Probe expr="+0" modifiers={{ altKey: true }} />, { faces: [14, 6], native: true })
    screen.getByText('go').click()

    const outcome = await outcomeOf()
    expect(outcome.faces).toEqual([6])
    expect(outcome.dropped).toEqual([14])
    expect(asked).toEqual(['disadvantage'])
  })

  it('keeps the lower face on disadvantage, which is how harvesting asks for it', async () => {
    mount(<Probe expr="+0" modifiers={{ altKey: true }} />, { faces: [14, 6] })
    screen.getByText('go').click()

    const outcome = await outcomeOf()
    expect(outcome.mode).toBe('disadvantage')
    expect(outcome.faces).toEqual([6])
    expect(outcome.dropped).toEqual([14])
  })

  it('marks the outcome simulated when no scene answered, rather than refusing', async () => {
    // The designed fallback. A caller still gets a usable number and the log
    // says where it came from — `/harvesting` and the initiative order both
    // depend on this not being a refusal.
    mount(<Probe expr="+3" />, { atlas: false })
    screen.getByText('go').click()

    const outcome = await outcomeOf()
    expect(outcome.simulated).toBe(true)
    expect(outcome.faces).toHaveLength(1)
    expect(outcome.total).toBe(outcome.faces[0] + 3)
    expect(rolled).toEqual([])
  })

  it('still rolls a d20 for an expression it cannot read, because toFormula adds one', async () => {
    // Worth pinning because it surprised this suite. `toFormula` only passes an
    // expression through when it finds `d<digits>` in it, and otherwise treats
    // the whole thing as a *modifier* and prepends `1d20`. So `nonsense`
    // becomes `1d20+nonsense`, `parseFormula` keeps the d20 and drops the word,
    // and the roll happens with a modifier of 0 rather than being refused.
    //
    // That is the right direction — a sheet value this layer cannot parse
    // should still roll the d20 the player clicked — but it means `null` is a
    // much narrower case than "bad input".
    mount(<Probe expr="nonsense" />, { faces: [10] })
    screen.getByText('go').click()

    const outcome = await outcomeOf()
    expect(outcome.total).toBe(10)
    expect(outcome.modifier).toBe(0)
    expect(rolled).toEqual(['1d20'])
  })

  it('resolves to null only when the formula genuinely has no dice in it', async () => {
    // `0d6` reads as a dice term with a zero count, which `parseFormula`
    // refuses — so there is nothing to roll and the caller must be able to tell
    // that from a roll that came to zero.
    mount(<Probe expr="0d6" />)
    screen.getByText('go').click()

    await waitFor(() => expect(screen.getByTestId('outcome').textContent).toBe('null'))
    expect(rolled).toEqual([])
  })
})
