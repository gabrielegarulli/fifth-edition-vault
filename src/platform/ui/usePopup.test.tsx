import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { useRef, useState } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { MainNav } from '../../app/ui/MainNav'
import { MenuButton } from './MenuButton'
import { TabBar } from '../../app/ui/NarrowNav'

/** A menu with a disabled first item, and something else on the page to move to. */
function Harness({ onPick = () => {} }: { onPick?(): void }) {
  return (
    <>
      <MenuButton
        label="Actions"
        items={[
          { caption: 'synced an hour ago' },
          { label: 'Disabled', disabled: true, onSelect() {} },
          { label: 'Rest', onSelect: onPick },
          { label: 'Award', onSelect() {} },
        ]}
      />
      <button type="button">Elsewhere</button>
    </>
  )
}

const trigger = () => screen.getByRole('button', { name: 'Actions' })
const popup = () => screen.queryByRole('group', { name: 'Actions' })

function openMenu(): HTMLElement {
  fireEvent.click(trigger())
  const menu = popup()
  if (!menu) throw new Error('the menu did not open')
  return menu
}

describe('a popup holds focus and gives it back (MYDND-166)', () => {
  it('moves focus to the first item that can take it', () => {
    render(<Harness />)
    openMenu()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Rest' }))
  })

  it('hands focus back to the trigger on Escape from inside', () => {
    render(<Harness />)
    openMenu()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Award' }), { key: 'Escape' })
    expect(popup()).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })

  it('hands focus back when an item is chosen, since the item goes with the popup', () => {
    render(<Harness />)
    openMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Rest' }))
    expect(popup()).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })

  it('leaves focus alone when an item moved it on purpose', () => {
    function Moves() {
      const target = useRef<HTMLButtonElement | null>(null)
      const [, setPicked] = useState(false)
      return (
        <>
          <MenuButton
            label="Actions"
            items={[
              {
                label: 'Rest',
                onSelect() {
                  setPicked(true)
                  target.current?.focus()
                },
              },
            ]}
          />
          <button ref={target} type="button">
            Form
          </button>
        </>
      )
    }
    render(<Moves />)
    openMenu()
    fireEvent.click(screen.getByRole('button', { name: 'Rest' }))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Form' }))
  })

  it('closes when focus leaves it, and does not pull focus back', () => {
    render(<Harness />)
    openMenu()
    const elsewhere = screen.getByRole('button', { name: 'Elsewhere' })
    act(() => elsewhere.focus())
    expect(popup()).toBeNull()
    expect(document.activeElement).toBe(elsewhere)
  })

  it('closes on a press outside it, and stays open for a press on its own trigger', () => {
    render(<Harness />)
    openMenu()
    fireEvent.pointerDown(trigger())
    expect(popup()).not.toBeNull()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Elsewhere' }))
    expect(popup()).toBeNull()
  })

  it('promises no keys it lacks: no menu roles, on the popup or its trigger', () => {
    render(<Harness />)
    const menu = openMenu()
    expect(screen.queryByRole('menu')).toBeNull()
    expect(screen.queryByRole('menuitem')).toBeNull()
    expect(trigger().hasAttribute('aria-haspopup')).toBe(false)
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    expect(menu.textContent).toContain('synced an hour ago')
  })
})

describe('the narrow nav’s sheet (MYDND-166)', () => {
  function openSheet() {
    render(
      <MemoryRouter>
        <TabBar pathname="/spells" />
      </MemoryRouter>,
    )
    const more = screen.getByRole('button', { name: 'More' })
    fireEvent.click(more)
    const sheet = screen.getByRole('dialog', { name: 'All sections' })
    const stops = within(sheet).getAllByRole('button')
    return { more, sheet, first: stops[0], last: stops[stops.length - 1] }
  }

  it('is modal, and focus moves in', () => {
    const { sheet, first } = openSheet()
    expect(sheet.getAttribute('aria-modal')).toBe('true')
    expect(document.activeElement).toBe(first)
  })

  it('wraps Tab from the last stop to the first', () => {
    const { first, last } = openSheet()
    last.focus()
    // `fireEvent` answers false when the handler called `preventDefault`.
    expect(fireEvent.keyDown(last, { key: 'Tab' })).toBe(false)
    expect(document.activeElement).toBe(first)
  })

  it('wraps Shift+Tab from the first stop, and from the sheet itself, to the last', () => {
    const { sheet, first, last } = openSheet()
    expect(fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })).toBe(false)
    expect(document.activeElement).toBe(last)

    sheet.focus()
    expect(fireEvent.keyDown(sheet, { key: 'Tab', shiftKey: true })).toBe(false)
    expect(document.activeElement).toBe(last)
  })

  it('leaves Tab to the browser between the ends', () => {
    const { first } = openSheet()
    expect(fireEvent.keyDown(first, { key: 'Tab' })).toBe(true)
  })

  it('hands focus back to More on Escape, and after choosing a page', () => {
    const { more, first } = openSheet()
    fireEvent.keyDown(first, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(more)

    fireEvent.click(more)
    fireEvent.click(within(screen.getByRole('dialog')).getAllByRole('button')[0])
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(more)
  })
})

describe('the wide nav’s More (MYDND-166)', () => {
  it('hands focus back on Escape, with the keydown on the document rather than the popup', () => {
    // Unmeasured shows every item, so make the row too narrow for most of them.
    const rect = HTMLElement.prototype.getBoundingClientRect
    HTMLElement.prototype.getBoundingClientRect = function () {
      return { width: this.hasAttribute('data-nav-row') ? 200 : 80 } as DOMRect
    }
    try {
      render(
        <MemoryRouter>
          <MainNav />
        </MemoryRouter>,
      )
      const more = screen.getByRole('button', { name: 'More' })
      fireEvent.click(more)
      expect(screen.getByRole('group', { name: 'More sections' })).toBeTruthy()
      fireEvent.keyDown(document.body, { key: 'Escape' })
      expect(screen.queryByRole('group', { name: 'More sections' })).toBeNull()
      expect(document.activeElement).toBe(more)
    } finally {
      HTMLElement.prototype.getBoundingClientRect = rect
    }
  })
})
