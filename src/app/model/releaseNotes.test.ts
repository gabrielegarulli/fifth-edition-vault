import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { parseRelease } from './changelog'
import { RELEASE_FILES, releases } from './releaseNotes'
import { isNewer } from './updates'

/**
 * The real `changelog/` (MYDND-215): every file in the format, and the release
 * in `manifest.json` covered. A release commit adds its notes; this is what
 * fails when one does not.
 */
const root = path.resolve(__dirname, '../../..')
const onDisk = fs.readdirSync(path.join(root, 'changelog')).filter(f => f.endsWith('.md'))
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8')) as { version: string }

describe('changelog/', () => {
  it('is what the bundle carries: the glob finds every file', () => {
    expect(Object.keys(RELEASE_FILES).map(f => path.basename(f)).sort()).toEqual([...onDisk].sort())
    expect(onDisk.length).toBeGreaterThan(0)
  })

  it.each(Object.entries(RELEASE_FILES))('%s keeps to the format', (file, text) => {
    expect(parseRelease(text, file).problems).toEqual([])
  })

  it("covers manifest.json's version", () => {
    expect(releases().map(r => r.version)).toContain(version)
  })

  it('drafts at most the next release ahead of it', () => {
    expect(releases().filter(r => isNewer(r.version, version)).length).toBeLessThanOrEqual(1)
  })
})
