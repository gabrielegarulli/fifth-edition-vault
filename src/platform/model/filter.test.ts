import { describe, expect, it } from 'vitest'

import { applyFacets, countValues, distinctValues, matchAnyField, paginate } from './filter'

interface Row {
  name: string
  source: string | null
  level: number
  tags: string[]
}

const rows: Row[] = [
  { name: 'Fireball', source: 'XPHB', level: 3, tags: ['spell', 'damage'] },
  { name: 'Light', source: 'XPHB', level: 0, tags: ['spell'] },
  { name: 'Abduct', source: 'VSS', level: 7, tags: ['spell', 'homebrew'] },
  { name: 'Haste', source: null, level: 3, tags: [] },
]

describe('applyFacets', () => {
  it('ANDs every predicate', () => {
    const out = applyFacets(rows, [
      { predicate: r => r.level === 3, active: true },
      { predicate: r => r.source === 'XPHB', active: true },
    ])
    expect(out.map(r => r.name)).toEqual(['Fireball'])
  })

  it('ignores a facet with no predicate', () => {
    expect(applyFacets(rows, [{ active: true }])).toHaveLength(4)
  })

  // The source-visibility case: a filter that narrows without being "on", so
  // `Clear filters` does not offer to clear a setting from another page.
  it('applies an inactive facet that still has a predicate', () => {
    const out = applyFacets(rows, [{ predicate: r => r.source !== 'VSS', active: false }])
    expect(out.map(r => r.name)).toEqual(['Fireball', 'Light', 'Haste'])
  })

  it('searches with the supplied matcher, case- and space-insensitively', () => {
    const search = { query: '  FIRE ', match: matchAnyField<Row>([r => r.name]) }
    expect(applyFacets(rows, [], search).map(r => r.name)).toEqual(['Fireball'])
  })

  it('treats a blank query as no search at all', () => {
    const search = { query: '   ', match: () => false }
    expect(applyFacets(rows, [], search)).toHaveLength(4)
  })
})

describe('matchAnyField', () => {
  const match = matchAnyField<Row>([r => r.name, r => r.source, r => r.tags])

  it('matches on any listed field, including inside an array', () => {
    expect(match(rows[2], 'homebrew')).toBe(true)
    expect(match(rows[2], 'vss')).toBe(true)
    expect(match(rows[2], 'abd')).toBe(true)
  })

  it('tolerates a null field rather than throwing', () => {
    expect(match(rows[3], 'xphb')).toBe(false)
  })
})

describe('paginate', () => {
  it('slices the requested page and reports its range', () => {
    const page = paginate(rows, 2, 2)
    expect(page.items.map(r => r.name)).toEqual(['Abduct', 'Haste'])
    expect([page.first, page.last, page.total, page.totalPages]).toEqual([3, 4, 4, 2])
  })

  // The filter-shrinks-the-list case: on page 4 of spells, typing a search that
  // leaves six rows must not show an empty page with no way back.
  it('clamps a page past the end rather than stranding on an empty slice', () => {
    const page = paginate(rows, 9, 2)
    expect(page.page).toBe(2)
    expect(page.items).toHaveLength(2)
  })

  it('clamps a page below one', () => {
    expect(paginate(rows, 0, 2).page).toBe(1)
    expect(paginate(rows, -3, 2).page).toBe(1)
  })

  it('gives an empty list one page and a zero range', () => {
    const page = paginate([], 1, 50)
    expect([page.page, page.totalPages, page.first, page.last, page.total]).toEqual([1, 1, 0, 0, 0])
  })
})

describe('countValues', () => {
  it('counts a scalar field, commonest first', () => {
    expect(countValues(rows, r => r.source)).toEqual([
      ['XPHB', 2],
      ['VSS', 1],
    ])
  })

  it('counts every entry of an array field', () => {
    expect(countValues(rows, r => r.tags)).toEqual([
      ['spell', 3],
      ['damage', 1],
      ['homebrew', 1],
    ])
  })

  // Stability matters: a Map's insertion order would make the chip order depend
  // on which note Obsidian happened to index first.
  it('breaks ties alphabetically, not by insertion', () => {
    const ties = [{ v: 'zebra' }, { v: 'apple' }, { v: 'mango' }]
    expect(countValues(ties, r => r.v).map(([v]) => v)).toEqual(['apple', 'mango', 'zebra'])
  })

  it('skips null, undefined and blank values', () => {
    const messy = [{ v: null }, { v: undefined }, { v: '   ' }, { v: 'real' }]
    expect(countValues(messy, r => r.v)).toEqual([['real', 1]])
  })

  it('trims before counting, so a stray space is not a second source', () => {
    const spaced = [{ v: 'XPHB' }, { v: ' XPHB' }]
    expect(countValues(spaced, r => r.v)).toEqual([['XPHB', 2]])
  })
})

describe('distinctValues', () => {
  it('returns values alphabetically, not by frequency', () => {
    expect(distinctValues(rows, r => r.source)).toEqual(['VSS', 'XPHB'])
  })
})
