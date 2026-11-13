import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ProjectedVitals } from '../../characterModel/model/vitalsProjection'
import type { RollFn } from '../../dice/ui/useRoll'
import { HitDiceRows } from './HpPanel'

/**
 * The hit die's one control (MYDND-155), with `useRoll` stood in for: nothing
 * reaches the engine with a formula it would refuse, so a `null` outcome can
 * only be arranged here. The whole path, through the note, is `sheet.test.tsx`.
 */

const roll = vi.fn<RollFn>()
vi.mock('../../dice/ui/useRoll', () => ({ useRoll: () => roll }))

const vitals = {
  hitDice: [{ label: 'Rogue', sides: 8, total: 5, spent: 1, remaining: 4 }],
} as unknown as ProjectedVitals

const outcome = (total: number) => ({ total, faces: [total], dropped: [], modifier: 0, mode: 'normal' as const, simulated: false })

function mount(conMod = 2) {
  const spent: Array<[string, number]> = []
  render(<HitDiceRows vitals={vitals} actions={{ spendHitDie: (l, n) => spent.push([l, n]) }} conMod={conMod} />)
  return { spent, button: screen.getByRole<HTMLButtonElement>('button', { name: 'Spend a Rogue hit die' }) }
}

beforeEach(() => roll.mockReset())

describe('HitDiceRows', () => {
  it('shows what is left and hands the roll to the one write', async () => {
    roll.mockResolvedValue(outcome(7))
    const { spent, button } = mount()
    expect(screen.getByText('4/5d8')).toBeTruthy()
    fireEvent.click(button)
    await waitFor(() => expect(spent).toEqual([['Rogue', 7]]))
    expect(roll.mock.calls[0].slice(0, 2)).toEqual(['1d8+2', 'Rogue hit die'])
  })

  it('spends nothing and heals nothing on a refused roll', async () => {
    roll.mockResolvedValue(null)
    const { spent, button } = mount()
    fireEvent.click(button)
    await waitFor(() => expect(button.disabled).toBe(false))
    expect(roll).toHaveBeenCalledTimes(1)
    expect(spent).toEqual([])
  })

  it('writes a negative Constitution into the formula', () => {
    expect(mount(-1).button.textContent).toBe('Spend 1d8-1')
  })
})
