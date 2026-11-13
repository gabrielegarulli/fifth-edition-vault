import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ActiveFilters, Check, facetFilters, FilterGroup, flagFilter } from './RailFilters'

const heading = (name: RegExp) => screen.getByRole('button', { name })

describe('FilterGroup (MYDND-163)', () => {
  it('starts open, and its heading folds it away and back', () => {
    render(
      <FilterGroup title="Raises">
        <span>Strength</span>
      </FilterGroup>,
    )
    const fold = heading(/^Raises/)
    expect(fold.getAttribute('aria-expanded')).toBe('true')
    expect(document.getElementById(fold.getAttribute('aria-controls')!)?.textContent).toBe('Strength')

    fireEvent.click(fold)
    expect(fold.getAttribute('aria-expanded')).toBe('false')
    expect(fold.hasAttribute('aria-controls')).toBe(false)
    expect(screen.queryByText('Strength')).toBeNull()

    fireEvent.click(fold)
    expect(screen.getByText('Strength')).toBeDefined()
  })

  it('stays a heading, so a screen reader can still jump between filters', () => {
    render(
      <FilterGroup title="Raises">
        <span>Strength</span>
      </FilterGroup>,
    )
    expect(screen.getByRole('heading', { name: /^Raises/ }).tagName).toBe('H3')
  })

  it('says what a folded filter is still doing, and only once it is folded', () => {
    render(
      <FilterGroup title="Type" active={2}>
        <span>Beast</span>
      </FilterGroup>,
    )
    expect(screen.queryByText('2 on')).toBeNull()
    fireEvent.click(heading(/^Type/))
    expect(screen.getByText('2 on')).toBeDefined()
    expect(heading(/^Type 2 on$/)).toBeDefined()
  })

  it('says nothing folded when none of its options is on', () => {
    render(
      <FilterGroup title="Type">
        <span>Beast</span>
      </FilterGroup>,
    )
    fireEvent.click(heading(/^Type/))
    expect(screen.queryByText(/ on$/)).toBeNull()
  })
})

describe('Check (MYDND-163)', () => {
  it('names the checkbox with a space, because a flex gap gives none', () => {
    render(<Check label="Strength" count={1234} checked={false} onChange={() => {}} />)
    expect(screen.getByRole('checkbox', { name: 'Strength 1,234' })).toBeDefined()
  })

  it('reports the new state', () => {
    const onChange = vi.fn()
    render(<Check label="Fly" count={3} checked={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})

describe('ActiveFilters (MYDND-163)', () => {
  const facet = (...values: string[]) => ({
    selected: new Set(values),
    toggle: vi.fn(),
    clear: vi.fn(),
    active: values.length > 0,
    key: values.join(),
    has: () => true,
  })

  it('names each one by its group, with the facet’s own label', () => {
    render(<ActiveFilters filters={facetFilters('Raises', facet('str'), () => 'Strength')} onClear={null} />)
    expect(screen.getByRole('button', { name: 'Remove filter Raises: Strength' }).textContent).toBe('Raises: Strength')
  })

  it('takes a tick off its facet by its value, not its label', () => {
    const raises = facet('str')
    render(<ActiveFilters filters={facetFilters('Raises', raises, () => 'Strength')} onClear={null} />)
    fireEvent.click(screen.getByRole('button', { name: /^Remove filter/ }))
    expect(raises.toggle).toHaveBeenCalledWith('str')
  })

  it('draws a flag only while it is on', () => {
    expect(flagFilter('Has: Ritual', false, () => {})).toEqual([])
    const remove = vi.fn()
    render(<ActiveFilters filters={flagFilter('Has: Ritual', true, remove)} onClear={null} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove filter Has: Ritual' }))
    expect(remove).toHaveBeenCalled()
  })

  it('ends with Clear filters, after every other chip', () => {
    const onClear = vi.fn()
    render(<ActiveFilters filters={flagFilter('Has: Ritual', true, () => {})} onClear={onClear} />)
    const chips = screen.getAllByRole('button')
    expect(chips.at(-1)?.textContent).toBe('Clear filters')
    fireEvent.click(chips.at(-1)!)
    expect(onClear).toHaveBeenCalled()
  })

  it('offers Clear filters with no chips, because search text has none', () => {
    render(<ActiveFilters filters={[]} onClear={() => {}} />)
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeDefined()
  })

  it('has no Clear filters when nothing is narrowing the list', () => {
    render(<ActiveFilters filters={[]} onClear={null} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('catches the focus Clear filters would drop', () => {
    const { rerender } = render(<ActiveFilters filters={[]} onClear={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    rerender(<ActiveFilters filters={[]} onClear={null} />)
    expect(document.activeElement).toBe(screen.getByRole('group', { name: 'Selected filters' }))
  })

  it('catches the focus a removed chip would drop, even with nothing left', () => {
    const { rerender } = render(<ActiveFilters filters={flagFilter('Has: Ritual', true, () => {})} onClear={null} />)
    fireEvent.click(screen.getByRole('button', { name: /^Remove filter/ }))
    rerender(<ActiveFilters filters={[]} onClear={null} />)
    expect(document.activeElement).toBe(screen.getByRole('group', { name: 'Selected filters' }))
  })
})
