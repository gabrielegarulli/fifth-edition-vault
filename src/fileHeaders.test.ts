import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * **A long source file opens with a comment saying what it owns** (MYDND-198).
 *
 * A file this long is one a reader opens without knowing what is in it. The
 * header is its one-line answer, and `ARCHITECTURE.md` is the map the answers
 * fit into. A fixture under `__fixtures__` counts as source; a test does not,
 * and neither does a generated file.
 *
 * The check is deliberately shallow: the first line that is not blank must be
 * a comment. Whether the comment says something useful is a reviewer's call.
 */
const root = path.resolve(__dirname, '..')
const LIMIT = 300
const SOURCE = /\.(m?[jt]sx?)$/
const EXEMPT = /\.test\.[jt]sx?$|\.generated\.|\.d\.ts$/

const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full)
    return SOURCE.test(entry.name) && !EXEMPT.test(entry.name) ? [full] : []
  })

const lineCount = (text: string) => text.split(/\r?\n/).length - (/\r?\n$/.test(text) ? 1 : 0)

/** Whether `text` opens, past any blank lines, with a `//` or `/*` comment. */
const opensWithComment = (text: string) => /^\s*(\/\/|\/\*)/.test(text)

/** Every source file under `dirs` longer than `LIMIT` lines with no opening comment, relative to the root. */
function headerless(dirs: string[]): string[] {
  return dirs
    .map(d => path.join(root, d))
    .filter(d => fs.existsSync(d))
    .flatMap(walk)
    .filter(file => {
      const text = fs.readFileSync(file, 'utf8')
      return lineCount(text) > LIMIT && !opensWithComment(text)
    })
    .map(file => path.relative(root, file).replaceAll('\\', '/'))
    .sort()
}

describe('file headers', () => {
  it(`every source file over ${LIMIT} lines opens with a comment`, () => {
    // `web/` is this repository's only; the public one has `src/` alone.
    expect(headerless(['src', 'web'])).toEqual([])
  })

  it('reads a comment after blank lines, and nothing else, as a header', () => {
    expect(opensWithComment('\n\n// The roster.\nimport x from "y"\n')).toBe(true)
    expect(opensWithComment('/** The roster. */\n')).toBe(true)
    expect(opensWithComment("import x from 'y'\n// late\n")).toBe(false)
    expect(opensWithComment('')).toBe(false)
  })
})
