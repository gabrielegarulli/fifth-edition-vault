import { describe, expect, it, vi } from 'vitest'

import { watchDetach } from './watchDetach'

/** MutationObserver delivers on a microtask; let it. */
const flush = () => new Promise(resolve => setTimeout(resolve, 0))

describe('watchDetach (MYDND-191)', () => {
  it('fires once the element leaves the page', async () => {
    const el = document.body.appendChild(document.createElement('div'))
    const gone = vi.fn()
    watchDetach(el, gone)
    document.body.appendChild(document.createElement('span'))
    await flush()
    expect(gone).not.toHaveBeenCalled()
    el.remove()
    await flush()
    expect(gone).toHaveBeenCalledTimes(1)
  })

  it('does not take "not attached yet" for gone', async () => {
    // Obsidian renders markdown into a detached element as often as not.
    const parent = document.createElement('div')
    const el = parent.appendChild(document.createElement('div'))
    const gone = vi.fn()
    watchDetach(el, gone)
    document.body.appendChild(document.createElement('span'))
    await flush()
    expect(gone).not.toHaveBeenCalled()

    document.body.appendChild(parent)
    await flush()
    parent.remove()
    await flush()
    expect(gone).toHaveBeenCalledTimes(1)
  })

  it('stops without firing when told to', async () => {
    const el = document.body.appendChild(document.createElement('div'))
    const gone = vi.fn()
    const stop = watchDetach(el, gone)
    stop()
    el.remove()
    await flush()
    expect(gone).not.toHaveBeenCalled()
  })
})
