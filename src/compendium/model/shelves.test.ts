import { describe, expect, it } from 'vitest'

import { booksInPlay, booksOf, shelvesBySource, sourceShelfOf } from './shelves'
import { sourceLabel } from './sourceNames'

const row = (name: string, source: string | null, edition = '5.5e') => ({ id: name.toLowerCase(), name, source, edition })

const ROWS = [
  row('Wizard', 'XPHB'),
  row('Alchemist', 'VSS'),
  row('Bender (Air)', 'RyokoGuideToYokaiRealms'),
  row('Bender (Fire)', 'RyokoGuideToYokaiRealms'),
  row('Nameless', null),
]

describe('the books a table plays with (MYDND-219)', () => {
  it('drops the rows of a book turned off, so it is no shelf at all', () => {
    const shown = booksInPlay(ROWS, new Set(['RyokoGuideToYokaiRealms']))
    expect(shown.map(r => r.name)).toEqual(['Wizard', 'Alchemist', 'Nameless'])
    expect(shelvesBySource(shown).flatMap(s => s.sources)).not.toContain('RyokoGuideToYokaiRealms')
  })

  it('keeps a row already picked, from a book turned off', () => {
    const shown = booksInPlay(ROWS, new Set(['RyokoGuideToYokaiRealms', 'VSS']), ['bender (fire)', null])
    expect(shown.map(r => r.name)).toEqual(['Wizard', 'Bender (Fire)', 'Nameless'])
  })

  it('never drops a row naming no book: there is no key to turn off', () => {
    expect(booksInPlay(ROWS, new Set(['']))).toHaveLength(ROWS.length)
  })

  it('hands back the same array when nothing is off', () => {
    expect(booksInPlay(ROWS, new Set())).toBe(ROWS)
  })

  // Which shelf a book is on is the edition's (`platform/model/edition.ts`):
  // XPHB is Core in the full plugin and third-party in the SRD edition, whose
  // public tree runs this test too. So the kinds are asked of `sourceShelfOf`
  // rather than written down.
  it('lists the books in shelf order, each once, with its title and count', () => {
    const rows = [...ROWS, row('Fighter', 'PHB', '5.0e'), row('Ranger', 'XPHB'), row('Paladin', 'PHB', '5.0e')]
    const books = booksOf(rows)
    expect(Object.fromEntries(books.map(b => [b.source, b.count]))).toEqual({
      XPHB: 2,
      RyokoGuideToYokaiRealms: 2,
      VSS: 1,
      PHB: 2,
    })
    expect(books).toHaveLength(4)
    for (const b of books) expect(b.kind).toBe(sourceShelfOf(rows.find(r => r.source === b.source)!).kind)
    const rank = (kind: string) => ['core', 'official', 'book', 'legacy'].indexOf(kind)
    expect(books.map(b => rank(b.kind))).toEqual(books.map(b => rank(b.kind)).sort((x, y) => x - y))
    for (const b of books) expect(b.label).toBe(sourceLabel(b.source))
  })
})
