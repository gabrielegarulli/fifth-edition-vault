import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { App } from 'obsidian'

import { ObsidianProvider } from '../obsidian/ObsidianContext'
import { Markdown } from './Markdown'

/**
 * The harness's `MarkdownRenderer` writes late, as Obsidian's does (MYDND-203).
 *
 * This is a test of the harness more than of `Markdown`: it is what stops the
 * stub being made synchronous again. A synchronous stub lets a test read
 * rendered prose without waiting for it, which passes locally and fails CI at
 * random (MYDND-202). The stub ignores `app`, so an empty one will do.
 */

const app = {} as unknown as App
const prose = 'Your speed doubles.'

function mount() {
  return render(
    <ObsidianProvider app={app}>
      <Markdown markdown={prose} sourcePath="classes/Monk.md" />
    </ObsidianProvider>,
  )
}

/** One macrotask, which is when the stub's 0 ms timer fires. */
const aTick = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('the harness renders markdown late, as Obsidian does', () => {
  afterEach(() => vi.restoreAllMocks())

  it('is not there in the render that mounted it, and is once waited for', async () => {
    mount()
    // The read MYDND-202's two tests made. It must fail, every time.
    expect(screen.queryByText(prose)).toBeNull()
    expect(await screen.findByText(prose)).toBeTruthy()
  })

  it('lands harmlessly when the note is gone before it does', async () => {
    const errors = vi.spyOn(console, 'error')
    const { container, unmount } = mount()
    unmount()
    await aTick()
    await aTick()
    expect(container.textContent).toBe('')
    expect(screen.queryByText(prose)).toBeNull()
    expect(errors).not.toHaveBeenCalled()
  })
})
