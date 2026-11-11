import { describe, expect, it } from 'vitest'

import { extractFence, proseOf } from './fence'

describe('extractFence', () => {
  it('returns the body of a matching fence', () => {
    const md = ['# Title', '', '```statblock', 'name: Aboleth', 'ac: 17', '```', '', 'prose'].join('\n')
    expect(extractFence(md, 'statblock')).toBe('name: Aboleth\nac: 17')
  })

  it('returns null when there is no such fence', () => {
    expect(extractFence('```js\nconsole.log(1)\n```', 'statblock')).toBeNull()
  })

  it('does not mistake a different fence that mentions the name', () => {
    // A ```js block containing the word statblock must not be harvested as one;
    // this is why the scanner skips past non-matching fences rather than just
    // continuing line by line.
    const md = ['```js', 'const statblock = 1', '```', '```statblock', 'name: Real', '```'].join('\n')
    expect(extractFence(md, 'statblock')).toBe('name: Real')
  })

  it('lets a longer opener contain shorter backtick runs', () => {
    // Markdown closes a fence only on a run at least as long as the opener, so
    // a ````-opened block may legally contain ```.
    const md = ['````vault-feat', 'text: |', '  ```', '  nested', '  ```', '````'].join('\n')
    expect(extractFence(md, 'vault-feat')).toBe('text: |\n  ```\n  nested\n  ```')
  })

  it('returns what it has when a fence is never closed', () => {
    // A truncated note should degrade to partial data rather than throw and
    // take out the whole catalog.
    expect(extractFence('```statblock\nname: Half', 'statblock')).toBe('name: Half')
  })

  it('handles CRLF line endings', () => {
    // Every file in these repos is checked out with CRLF on Windows.
    expect(extractFence('```statblock\r\nac: 17\r\n```\r\n', 'statblock')).toBe('ac: 17')
  })

  it('ignores an indented would-be fence', () => {
    expect(extractFence('   ```statblock\nac: 17\n```', 'statblock')).toBeNull()
  })
})

describe('proseOf', () => {
  it('strips frontmatter and every fence', () => {
    const md = [
      '---', 'title: Aboleth', '---', '', '# Aboleth', 'It lurks.', '',
      '```statblock', 'ac: 17', '```', '', 'More prose.',
    ].join('\n')
    expect(proseOf(md)).toBe('# Aboleth\nIt lurks.\n\n\nMore prose.')
  })

  it('treats a mid-document rule as a rule, not a delimiter', () => {
    // Frontmatter is only frontmatter when the file opens with `---`. Reading a
    // horizontal rule as a delimiter would silently eat the first half.
    const md = ['# Title', '', 'Before.', '', '---', '', 'After.'].join('\n')
    expect(proseOf(md)).toContain('Before.')
    expect(proseOf(md)).toContain('After.')
  })

  it('returns the whole body when there is no frontmatter', () => {
    expect(proseOf('# Just prose')).toBe('# Just prose')
  })
})
