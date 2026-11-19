// The homebrew tutorial quotes the note templates; it never copies them
// (MYDND-235).
//
// `docs/homebrew/` teaches a GM to write each kind of rules note by hand, and
// every example it shows is one of `src/compendium/templates/`, quoted under a
// `<!-- template: <file> -->` marker. This suite holds each quote to its file,
// so the tests that hold the templates to the readers (`noteTemplates.test.ts`
// here and in `choices/model/`) hold the tutorial's examples too. A page
// that pasted a template instead would drift the first time a reader changed.
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TEMPLATE_FILES } from './noteTemplates'

const DIR = resolve(__dirname, '../../../docs/homebrew')
const lf = (s: string) => s.replace(/\r\n/g, '\n')

const pages = Object.fromEntries(
  readdirSync(DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => [f, lf(readFileSync(join(DIR, f), 'utf8'))]),
)

const templates = Object.fromEntries(
  Object.entries(TEMPLATE_FILES).map(([path, text]) => [path.split('/').pop()!, lf(text)]),
)

const MARKER = /^<!-- template: (\S+) -->$/

interface Quote {
  page: string
  line: number
  file: string
  body: string | null
}

/**
 * Every marker on a page, and the fenced block on the line after it. A
 * template holds fences of its own, so the quote's fence is four backticks or
 * more, and closes on a line of the same run exactly.
 */
function quotesIn(page: string, text: string): Quote[] {
  const lines = text.split('\n')
  const out: Quote[] = []
  for (const [i, line] of lines.entries()) {
    const m = MARKER.exec(line.trim())
    if (!m) continue
    const open = /^(`{4,})\w*$/.exec(lines[i + 1] ?? '')
    if (!open) {
      out.push({ page, line: i + 1, file: m[1], body: null })
      continue
    }
    const close = lines.indexOf(open[1], i + 2)
    out.push({ page, line: i + 1, file: m[1], body: close < 0 ? null : lines.slice(i + 2, close).join('\n') + '\n' })
  }
  return out
}

const quotes = Object.entries(pages).flatMap(([page, text]) => quotesIn(page, text))

/** A page's prose: what is left once every fenced block is taken out. */
function prose(text: string): string {
  return text.replace(/^(`{3,})[^\n]*\n[\s\S]*?^\1$/gm, '')
}

describe('the homebrew tutorial (MYDND-235)', () => {
  it('has the index, a page per kind and the effects page', () => {
    expect(Object.keys(pages).sort()).toEqual(
      [
        'backgrounds.md',
        'classes.md',
        'conditions.md',
        'effects.md',
        'feats.md',
        'index.md',
        'items.md',
        'magic-items.md',
        'monsters.md',
        'species.md',
        'spells.md',
        'subclasses.md',
      ].sort(),
    )
  })

  it('links every page from the index', () => {
    for (const page of Object.keys(pages)) {
      if (page !== 'index.md') expect(pages['index.md'], page).toContain(`(${page})`)
    }
  })

  it('quotes every template, each under a marker naming a real file', () => {
    expect(quotes.length).toBeGreaterThanOrEqual(20)
    for (const q of quotes) expect(Object.keys(templates), `${q.page}:${q.line}`).toContain(q.file)
    expect(new Set(quotes.map(q => q.file))).toEqual(new Set(Object.keys(templates)))
  })

  it('quotes each one exactly as the file has it', () => {
    for (const q of quotes) {
      expect(q.body, `${q.page}:${q.line}: no fenced block of four backticks after the marker`).not.toBeNull()
      expect(q.body, `${q.page}:${q.line} has drifted from ${q.file}`).toBe(templates[q.file])
    }
  })

  it('names a folder as the settings do, never as a path', () => {
    // "your Spells folder", not `spells/`: the folders are settings, and a GM
    // who moved theirs would follow a path to nothing.
    const PATH = /\b(spells|bestiary|classes|subclasses|species|backgrounds|feats|items|magic-items|conditions|homebrew|campaigns|sessions)\//i
    for (const [page, text] of Object.entries(pages)) {
      for (const [i, line] of prose(text).split('\n').entries()) {
        expect(PATH.exec(line)?.[0], `${page}, prose line ${i + 1}: ${line}`).toBeUndefined()
      }
    }
  })
})
