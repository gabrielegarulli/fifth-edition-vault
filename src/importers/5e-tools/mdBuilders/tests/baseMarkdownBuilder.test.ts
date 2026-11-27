import { describe, expect, it } from 'vitest'

import { buildFrontmatter, editionOf } from '../baseMarkdownBuilder'

// `edition` is `5.5e` or `5.0e` on every other rules note, and the class and
// species readers compare it between notes (MYDND-287). A source code there
// matched nothing.
describe('the edition an imported note carries', () => {
  it('is 5.5e for a 2024 book, whatever its case', () => {
    expect(editionOf('XPHB')).toBe('5.5e')
    expect(editionOf('xmm')).toBe('5.5e')
  })

  it('is 5.0e for every other book', () => {
    expect(editionOf('PHB')).toBe('5.0e')
    expect(editionOf('XGE')).toBe('5.0e')
    expect(editionOf('')).toBe('5.0e')
  })

  it('is written beside the source, never as the source', () => {
    const frontmatter = buildFrontmatter({ title: 'Light', source: 'XPHB', tags: [], aliases: [] })
    expect(frontmatter).toMatchObject({ source: 'XPHB', edition: '5.5e' })
  })
})
