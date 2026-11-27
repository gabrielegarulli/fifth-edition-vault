import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DetailsTab } from './DetailsTab'

/**
 * The sheet's Details tab (MYDND-275): what the builder's Background step wrote
 * to the note, read back where the player plays. `Markdown` is the renderer's
 * business, so it is stood in for with its text.
 */

vi.mock('../../platform/host', () => ({
  Markdown: ({ markdown }: { markdown: string }) => <div>{markdown}</div>,
}))

describe('DetailsTab', () => {
  it('shows the background, the short details and the long ones, and only those given', () => {
    render(
      <DetailsTab
        details={{ alignment: 'Lawful Good', faith: 'Lathander', bonds: 'The temple raised me.' }}
        background="Acolyte"
        notePath="characters/Brenna.md"
      />,
    )
    expect(screen.getByText('Background').nextSibling?.textContent).toBe('Acolyte')
    expect(screen.getByText('Alignment').nextSibling?.textContent).toBe('Lawful Good')
    expect(screen.getByText('Faith').nextSibling?.textContent).toBe('Lathander')
    expect(screen.getByRole('heading', { name: 'Bonds' })).toBeTruthy()
    expect(screen.getByText('The temple raised me.')).toBeTruthy()
    expect(screen.queryByText('Lifestyle')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Flaws' })).toBeNull()
    expect(screen.queryByText(/No details yet/)).toBeNull()
  })

  it('says where the details come from when there are none', () => {
    render(<DetailsTab details={{}} background={null} notePath="characters/Brenna.md" />)
    expect(screen.getByText(/No details yet/)).toBeTruthy()
  })
})
