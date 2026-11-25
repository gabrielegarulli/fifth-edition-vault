import { useEffect, useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { App as ObsidianApp } from 'obsidian'

import type { ResolvedEffect } from '../../compendium'
import { ObsidianProvider } from '../../platform/obsidian/ObsidianContext'
import type { RollSwing } from '../model/interventions'
import { RollProvider, useRollHost, type RollOutcome } from './RollContext'
import { InterventionPrompt } from './RollLog'
import { useRoll } from './useRoll'

/**
 * Savage Attacker: "roll the weapon's damage dice twice and use either roll"
 * (MYDND-274). Two things were wrong. It prompted on spell damage, because
 * nothing told the engine a roll was a weapon's; and accepting it always kept
 * the second throw, so a worse re-roll cost the player the better one.
 */

/** Atlas, answering each die from `faces` in order, constants into `modifiers`. */
function fakeApp(faces: number[]): ObsidianApp {
  const events = { on: () => ({}), offref: () => {} }
  let cursor = 0
  const diceTool = {
    rollDice: (formula: string) => {
      const rolls: { die: string; value: number }[] = []
      let modifiers = 0
      for (const m of formula.matchAll(/([+-]?)(\d*)d(\d+)|([+-]?\d+)/g)) {
        if (m[3] === undefined) {
          modifiers += parseInt(m[4], 10)
          continue
        }
        for (let i = 0; i < (m[2] ? parseInt(m[2], 10) : 1); i += 1) {
          rolls.push({ die: `d${m[3]}`, value: faces[cursor] ?? 1 })
          cursor += 1
        }
      }
      return { rolls, modifiers, total: rolls.reduce((a, r) => a + r.value, 0) + modifiers }
    },
  }
  const leaf = { view: { serviceManager: { getToolController: () => ({ getDiceTool: () => diceTool }) } } }
  return {
    workspace: { ...events, openLinkText: () => Promise.resolve(), getLeavesOfType: () => [leaf] },
    vault: { ...events, getFileByPath: () => null, getResourcePath: () => '' },
    metadataCache: { ...events, getFileCache: () => null },
  } as unknown as ObsidianApp
}

const SAVAGE = {
  type: 'dice_intervention',
  mode: 'twice',
  scope: 'damage',
  weapon: {},
  frequency: 'per_turn',
  source: 'Savage Attacker',
  sourceKind: 'feat',
  sourceFeatureId: 'savage-attacker',
  benefitKey: 'overview',
} as unknown as ResolvedEffect

const GREATAXE: RollSwing = {
  weapon: { name: 'Greataxe', itemType: 'Melee Weapon', category: 'martial', data: { properties: ['heavy', 'two-handed'] } },
  twoHanded: true,
  sole: true,
}

function Probe({ swing }: { swing: RollSwing | null }) {
  const roll = useRoll()
  const { setEffects } = useRollHost()
  const [outcome, setOutcome] = useState<RollOutcome | null | 'pending'>('pending')
  useEffect(() => setEffects([SAVAGE], []), [setEffects])
  return (
    <>
      <button
        type="button"
        onClick={() => void roll('2d6+3', 'Greataxe damage', null, {}, 'damage', 'slashing', swing).then(setOutcome)}
      >
        go
      </button>
      <InterventionPrompt />
      <pre data-testid="outcome">{outcome === 'pending' ? '' : JSON.stringify(outcome)}</pre>
    </>
  )
}

function mount(faces: number[], swing: RollSwing | null) {
  return render(
    <ObsidianProvider app={fakeApp(faces)}>
      <RollProvider>
        <Probe swing={swing} />
      </RollProvider>
    </ObsidianProvider>,
  )
}

async function outcomeOf(): Promise<RollOutcome> {
  await waitFor(() => expect(screen.getByTestId('outcome').textContent).not.toBe(''), { timeout: 3000 })
  return JSON.parse(screen.getByTestId('outcome').textContent ?? 'null') as RollOutcome
}

describe('Savage Attacker (MYDND-274)', () => {
  it('keeps the first roll when the second is worse, if the player says so', async () => {
    mount([5, 6, 1, 1], GREATAXE)
    screen.getByText('go').click()
    ;(await screen.findByRole('button', { name: /^Use it/ }, { timeout: 3000 })).click()

    // Both throws are on the table: 5+6+3 = 14, then 1+1+3 = 5.
    const first = await screen.findByRole('button', { name: 'Keep the first — 14' }, { timeout: 3000 })
    expect(screen.getByRole('button', { name: 'Keep the second — 5' })).toBeTruthy()
    first.click()

    const outcome = await outcomeOf()
    expect(outcome.total).toBe(14)
    expect(outcome.faces).toEqual([5, 6])
  })

  it('keeps the second when the player picks it', async () => {
    mount([1, 2, 6, 6], GREATAXE)
    screen.getByText('go').click()
    ;(await screen.findByRole('button', { name: /^Use it/ }, { timeout: 3000 })).click()
    ;(await screen.findByRole('button', { name: 'Keep the second — 15' }, { timeout: 3000 })).click()

    const outcome = await outcomeOf()
    expect(outcome.total).toBe(15)
    expect(outcome.faces).toEqual([6, 6])
  })

  it('is not offered on damage that is not a weapon’s, such as a spell', async () => {
    mount([1, 1], null)
    screen.getByText('go').click()

    const outcome = await outcomeOf()
    expect(outcome.total).toBe(5)
    expect(screen.queryByRole('button', { name: /^Use it/ })).toBeNull()
  })
})
