/**
 * Fenced-block extraction. Pure, dependency-free, and deliberately separate from
 * YAML parsing — a note's deep structure lives in a fenced code block in the
 * body, and getting the fence boundaries wrong is the kind of bug that silently
 * returns `null` for every entity.
 *
 * Why the body at all, rather than frontmatter: Obsidian's Properties UI has no
 * object type and rewrites frontmatter as a side effect of the vault being open.
 * The body is never touched by it. See ADR 0001, Decision 2.
 */

/** A fence opener: ``` or more backticks, then the info string. */
const OPENER = /^(`{3,})[ \t]*([^\s`]*)[ \t]*$/

/**
 * Split a note the one way this module splits notes.
 *
 * Exported so that anything *rewriting* a note cuts it on the same boundaries
 * the readers do. Both line endings are accepted and `\n` is what comes back
 * out, so a note rewritten through `src/state/` is normalised to LF — which is
 * what Obsidian and every exporter write anyway.
 */
export const splitLines = (markdown: string): string[] => markdown.split(/\r?\n/)

/** Where a fence sits in a line array. `close` is `lines.length` if unterminated. */
export interface FenceRange {
  /** Index of the opener line. */
  open: number
  /** Index of the closing line, or `lines.length` when the fence never closes. */
  close: number
  /** Length of the backtick run that opened it. */
  ticks: number
}

/**
 * Locate the first fenced block whose info string matches `lang`.
 *
 * Handles the three things that actually occur in these notes:
 *
 * - **More than three backticks.** A fence closes only on a run at least as long
 *   as its opener, so a block opened with ```` can legally contain ```.
 * - **Nested fences.** A ```statblock containing an indented ``` example must not
 *   terminate early, so the closer has to match the opener's length.
 * - **An unterminated fence** at end of file — reported as closing past the last
 *   line rather than as absent, because a truncated note should degrade to
 *   partial data, not take out the whole catalog.
 *
 * Separate from `extractFence` because a writer needs the *boundaries* and a
 * reader needs the text between them. Deriving both from one scan is the point:
 * getting fence boundaries wrong silently returns `null` for every entity, and
 * two implementations of this would be two chances to do it.
 */
export function fenceRange(lines: string[], lang: string): FenceRange | null {
  for (let i = 0; i < lines.length; i += 1) {
    const open = OPENER.exec(lines[i])
    if (!open) continue

    const ticks = open[1].length
    if (open[2] !== lang) {
      // A different fence. Skip past it so a ```js block containing the word
      // `statblock` cannot be mistaken for the one we want.
      i = skipToClose(lines, i + 1, ticks)
      continue
    }

    for (let j = i + 1; j < lines.length; j += 1) {
      if (isClose(lines[j], ticks)) return { open: i, close: j, ticks }
    }
    return { open: i, close: lines.length, ticks } // unterminated
  }

  return null
}

/**
 * Returns the raw text inside the first fenced block whose info string matches
 * `lang`, or `null` when there is none.
 */
export function extractFence(markdown: string, lang: string): string | null {
  const lines = splitLines(markdown)
  const range = fenceRange(lines, lang)
  if (!range) return null
  return lines.slice(range.open + 1, range.close).join('\n')
}

function isClose(line: string, minTicks: number): boolean {
  const m = /^(`{3,})[ \t]*$/.exec(line)
  return m !== null && m[1].length >= minTicks
}

/** Index of the line closing a fence opened before `from`, or the last line. */
function skipToClose(lines: string[], from: number, minTicks: number): number {
  for (let i = from; i < lines.length; i += 1) {
    if (isClose(lines[i], minTicks)) return i
  }
  return lines.length
}

/**
 * The note body with its frontmatter block and every fenced block removed —
 * i.e. the human-readable prose, which is what a detail view renders.
 *
 * Frontmatter is only frontmatter when the file *opens* with `---`; a horizontal
 * rule further down is just a rule, and treating it as a delimiter would eat the
 * first half of the note.
 */
export function proseOf(markdown: string): string {
  const lines = splitLines(markdown)
  let i = 0

  if (lines[0]?.trim() === '---') {
    const end = lines.findIndex((l, n) => n > 0 && l.trim() === '---')
    if (end !== -1) i = end + 1
  }

  const out: string[] = []
  for (; i < lines.length; i += 1) {
    const open = OPENER.exec(lines[i])
    if (open) {
      i = skipToClose(lines, i + 1, open[1].length)
      continue
    }
    out.push(lines[i])
  }

  return out.join('\n').trim()
}
