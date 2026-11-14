import { parse } from 'yaml'

import { splitLines } from '../../model/fence'
import type { NoteRef, StateVault } from '../vault'

/**
 * A `StateVault` over a `Map` of path → markdown.
 *
 * **It parses frontmatter rather than storing it**, which is what makes it worth
 * having. A fixture that held the frontmatter as an object beside the text would
 * let a writer pass its tests while emitting YAML nothing can read back — and
 * that is the one failure mode that matters here, because the write path is what
 * touches files no repository holds a copy of. Every test through this fixture is
 * a real round-trip: serialise, re-parse, assert on the parsed result.
 *
 * It is not a model of Obsidian's cache. Obsidian re-indexes asynchronously
 * after a write and this is immediate, so a test cannot learn anything here
 * about the lag the settings page has to cope with.
 */
export class MemoryVault implements StateVault {
  readonly files: Map<string, string>
  /** Every `write` in order, so a test can assert that one mutation was one write. */
  readonly writes: string[] = []

  constructor(files: Record<string, string> = {}) {
    this.files = new Map(Object.entries(files))
  }

  notesIn(folder: string): NoteRef[] {
    const prefix = folder.endsWith('/') ? folder : `${folder}/`
    const out: NoteRef[] = []

    for (const [path, markdown] of this.files) {
      if (!path.startsWith(prefix) || !path.endsWith('.md')) continue
      // Direct children only, as `ObsidianVaultSource.notesIn` does.
      if (path.slice(prefix.length).includes('/')) continue
      out.push({
        path,
        slug: path.slice(prefix.length, -'.md'.length),
        frontmatter: frontmatterOf(markdown),
      })
    }

    return out
  }

  allNotes(): NoteRef[] {
    const out: NoteRef[] = []
    for (const [path, markdown] of this.files) {
      if (!path.endsWith('.md')) continue
      const slash = path.lastIndexOf('/')
      out.push({
        path,
        slug: path.slice(slash + 1, -'.md'.length),
        frontmatter: frontmatterOf(markdown),
      })
    }
    return out
  }

  async read(path: string): Promise<string | null> {
    return this.files.get(path) ?? null
  }

  async write(path: string, transform: (markdown: string) => string): Promise<void> {
    this.writes.push(path)
    this.files.set(path, transform(this.files.get(path) ?? ''))
  }
}

/**
 * Frontmatter as Obsidian's metadata cache would expose it.
 *
 * Tolerant on purpose — this stands in for the *cache*, which never throws and
 * reports no frontmatter for a note it could not parse. `parseNote` is the one
 * that refuses, and it must keep being the only one, or a test would stop being
 * able to tell the difference.
 */
function frontmatterOf(markdown: string): Record<string, unknown> {
  const lines = splitLines(markdown)
  if (lines[0]?.trim() !== '---') return {}
  const end = lines.findIndex((line, n) => n > 0 && line.trim() === '---')
  if (end === -1) return {}
  try {
    const parsed: unknown = parse(lines.slice(1, end).join('\n'))
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}
