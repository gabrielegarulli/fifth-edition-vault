import { describe, expect, it } from 'vitest'

import { changelogOnStart, parseRelease, readReleases, unseenVersions, type ReleaseNotes } from './changelog'

const note = (version: string, body = '## New\n\n- A thing', meta = `version: ${version}\ndate: 2026-11-14\ntitle: A release`) =>
  `---\n${meta}\n---\n\n${body}\n`

describe('parseRelease', () => {
  it('reads headings, bold groups and bullets', () => {
    const text = note('0.1.0', '## New\n\n**Draw tool**\n- Pen\n- Line\n\n**Text**\n- Labels\n\n## Fixed\n\n- A bug\n- Another')
    const { release, problems } = parseRelease(text, 'changelog/0.1.0.md')
    expect(problems).toEqual([])
    expect(release).toEqual({
      version: '0.1.0',
      date: '2026-11-14',
      title: 'A release',
      sections: [
        {
          heading: 'New',
          groups: [
            { title: 'Draw tool', items: ['Pen', 'Line'] },
            { title: 'Text', items: ['Labels'] },
          ],
        },
        { heading: 'Fixed', groups: [{ title: null, items: ['A bug', 'Another'] }] },
      ],
    })
  })

  it('reads CRLF and a quoted title', () => {
    const text = note('0.1.0', '## New\n- A', 'version: 0.1.0\ndate: 2026-11-14\ntitle: "Quoted: yes"').replaceAll('\n', '\r\n')
    expect(parseRelease(text, '0.1.0.md').release?.title).toBe('Quoted: yes')
  })

  it.each([
    ['no frontmatter', '## New\n- A', 'does not open with frontmatter'],
    ['an unclosed frontmatter', '---\nversion: 0.1.0\n', 'never closes'],
    ['a missing title', note('0.1.0', '## New\n- A', 'version: 0.1.0\ndate: 2026-11-14'), 'no title'],
    ['an unknown key', note('0.1.0', '## New\n- A', 'version: 0.1.0\ndate: 2026-11-14\ntitle: T\nauthor: me'), 'unknown key "author"'],
    ['a version that is not x.y.z', note('v0.1.0'), 'is not x.y.z'],
    ['a file named for another version', note('0.2.0'), 'is named 0.1.0, but its version is 0.2.0'],
    ['a bad date', note('0.1.0', '## New\n- A', 'version: 0.1.0\ndate: 14/11/2026\ntitle: T'), 'is not YYYY-MM-DD'],
    ['a paragraph', note('0.1.0', '## New\n\nSome prose.\n- A'), 'only "## heading"'],
    ['a # heading', note('0.1.0', '# New\n- A'), 'only "## heading"'],
    ['a * bullet', note('0.1.0', '## New\n* A'), 'only "## heading"'],
    ['a bullet before a heading', note('0.1.0', '- A\n## New\n- B'), 'a bullet before any ## heading'],
    ['a heading with no bullets', note('0.1.0', '## New\n- A\n## Fixed'), '"## Fixed" has no bullets'],
    ['a group with no bullets', note('0.1.0', '## New\n**Empty**\n**Full**\n- A'), '"**Empty**" has no bullets'],
    ['no heading at all', note('0.1.0', ''), 'no ## heading'],
  ])('names %s, and returns no release', (_, text, problem) => {
    const { release, problems } = parseRelease(text, 'changelog/0.1.0.md')
    expect(release).toBeNull()
    expect(problems.join('\n')).toContain(problem)
  })
})

describe('readReleases', () => {
  it('sorts newest first, numerically, and leaves a broken file out', () => {
    const releases = readReleases({
      'changelog/0.0.9.md': note('0.0.9'),
      'changelog/0.0.10.md': note('0.0.10'),
      'changelog/0.1.0.md': note('0.1.0', 'not a bullet'),
    })
    expect(releases.map(r => r.version)).toEqual(['0.0.10', '0.0.9'])
  })
})

const releases: ReleaseNotes[] = ['0.2.0', '0.1.1', '0.1.0', '0.0.5'].map(version => ({
  version,
  date: '2026-11-14',
  title: version,
  sections: [{ heading: 'New', groups: [{ title: null, items: ['x'] }] }],
}))
const on = { showAfterUpdate: true, featureOnly: false }

describe('changelogOnStart', () => {
  it('records a fresh install and shows nothing', () => {
    expect(changelogOnStart(null, '0.1.0', on, releases)).toEqual({ open: false, acknowledge: '0.1.0' })
  })

  it('opens once after an update, and records it', () => {
    expect(changelogOnStart('0.1.0', '0.1.1', on, releases)).toEqual({ open: true, acknowledge: '0.1.1' })
    // The next start, with that recorded, has nothing to say.
    expect(changelogOnStart('0.1.1', '0.1.1', on, releases)).toEqual({ open: false, acknowledge: null })
  })

  it('leaves the record alone on a downgrade', () => {
    expect(changelogOnStart('0.2.0', '0.1.1', on, releases)).toEqual({ open: false, acknowledge: null })
  })

  it('records but stays shut when switched off', () => {
    expect(changelogOnStart('0.1.0', '0.2.0', { ...on, showAfterUpdate: false }, releases)).toEqual({ open: false, acknowledge: '0.2.0' })
  })

  it('skips a patch with Feature updates only, and opens for a feature release', () => {
    const feature = { ...on, featureOnly: true }
    expect(changelogOnStart('0.1.0', '0.1.1', feature, releases)).toEqual({ open: false, acknowledge: '0.1.1' })
    expect(changelogOnStart('0.1.1', '0.2.0', feature, releases)).toEqual({ open: true, acknowledge: '0.2.0' })
  })

  it('stays shut when no notes cover the update', () => {
    expect(changelogOnStart('0.2.0', '0.2.1', on, releases)).toEqual({ open: false, acknowledge: '0.2.1' })
  })
})

describe('unseenVersions', () => {
  it('marks what came after the acknowledged version, up to the installed one', () => {
    expect([...unseenVersions(releases, '0.1.0', '0.2.0')].sort()).toEqual(['0.1.1', '0.2.0'])
    expect([...unseenVersions(releases, '0.0.5', '0.1.0')]).toEqual(['0.1.0'])
    expect(unseenVersions(releases, null, '0.2.0').size).toBe(0)
  })
})
