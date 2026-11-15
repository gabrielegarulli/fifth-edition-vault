import { describe, expect, it, vi } from 'vitest'

import type { ReleaseNotes } from '../model/changelog'
import { drawWhatsNew } from './whatsNewModal'

/** What's new's body, drawn into a plain element (MYDND-215). */
const releases: ReleaseNotes[] = [
  {
    version: '0.1.0',
    date: '2026-12-01',
    title: 'Draw tools',
    sections: [
      { heading: 'New', groups: [{ title: 'Pen and line', items: ['Draw a line', 'Draw a shape'] }] },
      { heading: 'Fixed', groups: [{ title: null, items: ['A bug'] }] },
    ],
  },
  { version: '0.0.9', date: '2026-11-20', title: 'Older', sections: [{ heading: 'Fixed', groups: [{ title: null, items: ['Old bug'] }] }] },
]

function draw(unseen: string[] = []) {
  const setPrefs = vi.fn()
  const close = vi.fn()
  // Attached, or jsdom fires no `change` on a checkbox's click.
  const parent = document.body.appendChild(document.createElement('div'))
  const root = drawWhatsNew(parent, { installed: '0.1.0', releases, unseen: new Set(unseen), prefs: { showAfterUpdate: true, featureOnly: false }, setPrefs }, close)
  return { root, setPrefs, close }
}

describe("What's new", () => {
  it('sits inside the stylesheet scope', () => {
    expect(draw().root.classList).toContain('my-dnd-vault')
  })

  it('heads with the installed version and a link to the releases', () => {
    const { root } = draw()
    expect(root.querySelector('h2')?.textContent).toBe("What's new in Fifth Edition Vault")
    expect(root.querySelector('.mdv-whats-new__chip')?.textContent).toBe('v0.1.0')
    const link = root.querySelector('a')!
    expect(link.getAttribute('href')).toBe('https://github.com/gabrielegarulli/fifth-edition-vault/releases')
    expect(link.textContent).toBe('Releases on GitHub')
  })

  it('draws a release as a summary and its notes, groups in order', () => {
    const entry = draw().root.querySelector('details')!
    const summary = entry.querySelector('summary')!
    expect(summary.querySelector('.mdv-release__version')?.textContent).toBe('0.1.0')
    expect(summary.querySelector('time')?.getAttribute('datetime')).toBe('2026-12-01')
    expect(summary.querySelector('.mdv-release__title')?.textContent).toBe('Draw tools')
    expect([...entry.querySelectorAll('h3')].map(h => h.textContent)).toEqual(['New', 'Fixed'])
    expect(entry.querySelector('.mdv-release__group')?.textContent).toBe('Pen and line')
    expect([...entry.querySelectorAll('li')].map(li => li.textContent)).toEqual(['Draw a line', 'Draw a shape', 'A bug'])
  })

  it('marks unseen releases New in words, and opens those', () => {
    const entries = [...draw(['0.1.0']).root.querySelectorAll('details')]
    expect(entries.map(e => e.querySelector('.mdv-release__new')?.textContent ?? null)).toEqual(['New', null])
    expect(entries.map(e => e.open)).toEqual([true, false])
  })

  it('saves each switch as it changes, and Close closes', () => {
    const { root, setPrefs, close } = draw()
    const boxes = [...root.querySelectorAll<HTMLInputElement>('input[type=checkbox]')]
    expect(boxes.map(b => [b.closest('label')?.textContent, b.checked])).toEqual([
      ['Show changelog after updates', true],
      ['Feature updates only', false],
    ])
    boxes[1].click()
    expect(setPrefs).toHaveBeenCalledWith({ featureOnly: true })
    boxes[0].click()
    expect(setPrefs).toHaveBeenCalledWith({ showAfterUpdate: false })
    root.querySelector<HTMLButtonElement>('button.mod-cta')!.click()
    expect(close).toHaveBeenCalledOnce()
  })

  it('says so when there are no notes', () => {
    const parent = document.createElement('div')
    const root = drawWhatsNew(parent, { installed: '0.1.0', releases: [], unseen: new Set(), prefs: { showAfterUpdate: true, featureOnly: false }, setPrefs: vi.fn() }, vi.fn())
    expect(root.textContent).toContain('No release notes yet.')
  })
})
