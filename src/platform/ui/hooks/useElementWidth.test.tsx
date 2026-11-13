import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useElementWidth } from './useElementWidth'

/**
 * A `ResizeObserver` the test drives: it records what it watches, and `resize`
 * delivers a width to whoever is watching that element — or to nobody.
 */
class FakeResizeObserver implements ResizeObserver {
  static live = new Set<FakeResizeObserver>()
  watched = new Set<Element>()
  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.live.add(this)
  }
  observe(element: Element): void {
    this.watched.add(element)
  }
  unobserve(element: Element): void {
    this.watched.delete(element)
  }
  disconnect(): void {
    this.watched.clear()
    FakeResizeObserver.live.delete(this)
  }
  static resize(element: Element, width: number): void {
    for (const observer of FakeResizeObserver.live) {
      if (!observer.watched.has(element)) continue
      const entry = { target: element, contentRect: { width } } as unknown as ResizeObserverEntry
      observer.callback([entry], observer)
    }
  }
}

let original: typeof ResizeObserver

beforeEach(() => {
  original = globalThis.ResizeObserver
  globalThis.ResizeObserver = FakeResizeObserver
})

afterEach(() => {
  globalThis.ResizeObserver = original
  FakeResizeObserver.live.clear()
})

/**
 * The shape `CharacterSheetPage` has: a bare root while loading, and the same
 * root wrapped in a provider once loaded. The wrapper changes the root's type,
 * so React mounts a new element rather than reusing the first.
 */
function Page({ loaded }: { loaded: boolean }) {
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const body = (
    <div ref={ref} data-testid="root">
      {width}
    </div>
  )
  return loaded ? <section>{body}</section> : body
}

describe('useElementWidth', () => {
  it('reports the width of the element it is attached to', () => {
    render(<Page loaded />)
    act(() => FakeResizeObserver.resize(screen.getByTestId('root'), 900))
    expect(screen.getByTestId('root').textContent).toBe('900')
  })

  it('follows the ref to a new element when the root is remounted', () => {
    const { rerender } = render(<Page loaded={false} />)
    const before = screen.getByTestId('root')
    rerender(<Page loaded />)
    const after = screen.getByTestId('root')
    expect(after).not.toBe(before)

    act(() => FakeResizeObserver.resize(after, 1300))
    expect(screen.getByTestId('root').textContent).toBe('1300')
  })

  it('stops watching an element once it is gone', () => {
    const { rerender } = render(<Page loaded={false} />)
    const before = screen.getByTestId('root')
    rerender(<Page loaded />)
    expect([...FakeResizeObserver.live].some(o => o.watched.has(before))).toBe(false)
  })
})
