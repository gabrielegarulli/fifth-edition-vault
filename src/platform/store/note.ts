import { parse, stringify, type ToStringOptions } from 'yaml'

import { fenceRange, splitLines } from '../model/fence'

/**
 * Reading and rewriting one note, as a document.
 *
 * The readers read notes; this is what *writes* them, and the difference
 * between the two is the whole reason this file exists rather than being folded
 * into the content layer.
 *
 * **A reader degrades; a writer must refuse.** `createCatalog` treats a
 * malformed fence as absent and says why — a broken note should not take out a
 * whole catalog. Here the same leniency would be destruction: parse the
 * frontmatter to `{}`, write it back, and the GM's unparseable block is gone
 * with no undo, because nothing in the lore vault is in any repository. So
 * `parseNote` throws on frontmatter it cannot read, and every write path lets
 * that reach the UI.
 *
 * **One YAML implementation in both directions.** The readers take Obsidian's
 * `parseYaml` injected, which keeps `obsidian` out of testable code. This module
 * uses the `yaml` package for parse *and* stringify instead, so the thing that
 * rewrites a user's files is round-tripped against the exact code that will run
 * in Obsidian, in plain Node, with no stub standing in for it.
 */

/** A note, split at its frontmatter. */
export interface NoteDoc {
  frontmatter: Record<string, unknown>
  /** Everything after the frontmatter block, verbatim — prose and fences. */
  body: string
}

/**
 * How generated YAML is written here.
 *
 * `QUOTE_DOUBLE` on every string is the plan's "quote aggressively", and it is
 * not cosmetic. A CR band is `3-6` and a size is `large`; unquoted, a reader on
 * YAML 1.1 turns `no` into `false` and `1/4` stays a string only by luck. The
 * project has already paid for the reading end of this — `cr: 1/4` parsed as
 * `NaN` on 78 of 336 bestiary notes — and quoting at the writing end is how the
 * same class of bug stops being possible in notes we author.
 *
 * `lineWidth: 0` disables folding. A folded long string is still valid YAML and
 * is unreadable in Obsidian's Properties UI, which is where these are edited.
 */
const YAML: ToStringOptions = {
  lineWidth: 0,
  defaultStringType: 'QUOTE_DOUBLE',
  // Keys stay bare. They are all `snake_case` identifiers, and quoting them
  // would make the frontmatter look generated in the one place a human reads it.
  defaultKeyType: 'PLAIN',
}

/** YAML for a fence body — same rules, used by `setFence` and by the readers' mirror. */
export const toYaml = (value: unknown): string => stringify(value, YAML)

export const fromYaml = (text: string): unknown => parse(text)

/**
 * Split a note into frontmatter and body.
 *
 * Frontmatter is only frontmatter when the file *opens* with `---`; a horizontal
 * rule further down is just a rule, which is the same rule `proseOf` follows.
 *
 * @throws when the note opens with a frontmatter block that does not parse, or
 *   whose content is not a mapping. Both are cases where writing back would
 *   discard something a human wrote.
 */
export function parseNote(markdown: string): NoteDoc {
  const lines = splitLines(markdown)
  if (lines[0]?.trim() !== '---') return { frontmatter: {}, body: markdown }

  const end = lines.findIndex((line, n) => n > 0 && line.trim() === '---')
  // An opening `---` with no closer is not a frontmatter block at all — it is a
  // note that happens to start with a rule. Treating it as an unterminated block
  // would swallow the entire note into frontmatter on the next write.
  if (end === -1) return { frontmatter: {}, body: markdown }

  const text = lines.slice(1, end).join('\n')
  const body = lines.slice(end + 1).join('\n')

  let parsed: unknown
  try {
    parsed = parse(text)
  } catch (cause) {
    throw new Error(`This note's frontmatter is not valid YAML, so it cannot be written to safely. Fix it in Obsidian first.`, { cause })
  }
  // `null` is an empty block (`---\n---`) and is fine. An array or a scalar is
  // not frontmatter, and overwriting it with a mapping would lose it.
  if (parsed == null) return { frontmatter: {}, body }
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`This note's frontmatter is a ${Array.isArray(parsed) ? 'list' : typeof parsed}, not a set of properties, so it cannot be written to safely.`)
  }

  return { frontmatter: parsed as Record<string, unknown>, body }
}

/**
 * The inverse of `parseNote`.
 *
 * An empty frontmatter object writes **no** block rather than an empty one: a
 * stray `---\n---` at the top of a note is the kind of thing that accumulates.
 * Keys are written in insertion order, so a writer that spreads the parsed
 * frontmatter and then assigns keeps the author's ordering and appends anything
 * new at the end.
 */
export function serialiseNote({ frontmatter, body }: NoteDoc): string {
  if (Object.keys(frontmatter).length === 0) return body
  return `---\n${toYaml(frontmatter)}---\n${body}`
}

/**
 * Replace the contents of the first ` ```<lang> ` fence in `body`, or append the
 * fence when there is none.
 *
 * Appending rather than prepending, and only ever touching the *first* matching
 * fence, because the body is the GM's: prose above a managed block stays where
 * it was put, and a second fence someone added by hand is left alone.
 */
export function setFence(body: string, lang: string, value: unknown): string {
  const block = ['```' + lang, toYaml(value).trimEnd(), '```']
  const lines = splitLines(body)
  const range = fenceRange(lines, lang)

  if (!range) {
    const trimmed = body.replace(/\s+$/, '')
    return trimmed === '' ? `${block.join('\n')}\n` : `${trimmed}\n\n${block.join('\n')}\n`
  }

  return [
    ...lines.slice(0, range.open),
    ...block,
    // `close` is the closing line, or `lines.length` for an unterminated fence —
    // in which case there is nothing after it and this slice is empty.
    ...lines.slice(Math.min(range.close + 1, lines.length)),
  ].join('\n')
}

export function noteName(title: string): string {
  const cleaned = title
    .replace(/[*"\\/<>:|?#^[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
  return cleaned === '' ? 'Untitled' : cleaned
}

/**
 * `base`, or `base 2`, `base 3`, … — the first that is not already taken.
 *
 * Obsidian's own "note already exists" behaviour, reproduced rather than
 * overwriting: two harvests of the same creature on the same day are two
 * harvests, and a silent clobber would lose one of them.
 */
export function uniqueName(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base
  for (let n = 2; ; n += 1) {
    const candidate = `${base} ${n}`
    if (!taken.has(candidate)) return candidate
  }
}
