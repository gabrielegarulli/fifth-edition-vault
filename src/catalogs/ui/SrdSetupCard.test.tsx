import { fireEvent, render, screen } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it } from 'vitest'

import type { SeedReport } from '../../compendium/store/srd/seed'
import { SrdSetupCard, type SrdNotesHost } from './SrdSetupCard'

/** A host whose install resolves when the test says so. */
function host() {
  let finish: (report: SeedReport | null) => void = () => {}
  const srd: SrdNotesHost = {
    notes: 1441,
    install: () => new Promise(resolve => (finish = resolve)),
    openSettings: () => {},
  }
  return { srd, finish: (report: SeedReport | null) => act(async () => finish(report)) }
}

const report: SeedReport = { created: 1453, updated: 0, unchanged: 0, preserved: [] }

describe('SrdSetupCard (MYDND-188)', () => {
  it('draws Install as the filled primary button, not the muted nav style', () => {
    render(<SrdSetupCard srd={host().srd} total={0} />)
    const install = screen.getByRole('button', { name: /^Install SRD 5\.2\.1 rules notes/ })
    expect(install.classList.contains('bst-btn-primary')).toBe(true)
    expect(install.classList.contains('btn-ui-primary')).toBe(false)
  })

  it('stops saying the vault has no notes once the install has finished', async () => {
    const { srd, finish } = host()
    const { rerender } = render(<SrdSetupCard srd={srd} total={0} />)
    expect(screen.getByText(/no rules notes yet/)).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: /^Install/ }))
    expect(screen.queryByText(/no rules notes yet/)).toBeNull()
    expect(screen.getByText(/^Writing the System Reference Document/)).toBeDefined()

    await finish(report)
    // The counts rise behind it; the card stays up, and its lead now fits.
    rerender(<SrdSetupCard srd={srd} total={1441} />)
    expect(screen.queryByText(/no rules notes yet/)).toBeNull()
    expect(screen.getByText(/^The SRD 5\.2\.1 rules notes are in this vault/)).toBeDefined()
    expect(screen.getByRole('status').textContent).toContain('1,453 created')
  })

  it('says the install stopped, not that the vault is empty, when it fails', async () => {
    const { srd, finish } = host()
    render(<SrdSetupCard srd={srd} total={0} />)
    fireEvent.click(screen.getByRole('button', { name: /^Install/ }))
    await finish(null)
    expect(screen.queryByText(/no rules notes yet/)).toBeNull()
    expect(screen.getByText(/^The install stopped before it finished/)).toBeDefined()
  })
})
