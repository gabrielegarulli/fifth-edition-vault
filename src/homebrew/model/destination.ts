import { nameKey, normaliseFolder } from '../../platform'

/**
 * Where a builder's note goes (MYDND-233, ADR 0014): a subfolder of the
 * homebrew folder, never anywhere else. That folder is the one place outside
 * the exported folders every catalog reads (MYDND-234), so a note saved there
 * lists, and no export or SRD release can reach it.
 */

/** Characters Obsidian refuses in a folder name, as `noteName` refuses them in a note's. */
const BAD = /[*"\\<>:|?#^[\]]/

/** Why `subfolder` cannot hold the note, in a sentence, or null when it can. `''` is the homebrew folder itself. */
export function subfolderProblem(subfolder: string): string | null {
  const raw = subfolder.trim()
  if (raw.startsWith('/')) return 'Name a folder inside your homebrew folder, without a leading slash.'
  const parts = raw.split('/').map(p => p.trim()).filter(p => p !== '')
  if (parts.some(p => p === '.' || p === '..')) return 'The folder cannot step out of your homebrew folder: no "." or ".." in it.'
  const bad = parts.find(p => BAD.test(p) || p.startsWith('.'))
  if (bad !== undefined) return `"${bad}" is not a folder name Obsidian accepts: no * " \\ < > : | ? # ^ [ ], and no leading dot.`
  return null
}

/** The vault path the note is written at. Call `subfolderProblem` first. */
export function notePath(homebrewFolder: string, subfolder: string, fileName: string): string {
  const folder = [normaliseFolder(homebrewFolder), normaliseFolder(subfolder.trim())].filter(Boolean).join('/')
  return `${folder}/${fileName}`
}

/** A row of the kind's catalog, as the name check needs it. */
export interface NamedRow {
  id: string
  name: string
  path: string
}

/**
 * The row a new note would collide with, or null. **A warning, not a refusal**
 * (ADR 0014): a slug already in the catalog hides the new note behind it
 * (the folder pass wins, MYDND-237), and a title already there is the one a
 * lookup by name finds first. The GM may mean either.
 */
export function nameClash(rows: readonly NamedRow[], slug: string, title: string): NamedRow | null {
  const want = nameKey(title)
  return rows.find(r => r.id === slug) ?? rows.find(r => want !== '' && nameKey(r.name) === want) ?? null
}

/** A free name to offer instead: `Alert (Homebrew)`, then `Alert (Homebrew 2)`. */
export function suggestName(rows: readonly NamedRow[], title: string, slugOf: (name: string) => string): string {
  for (let n = 1; n < 100; n += 1) {
    const candidate = `${title.trim()} (Homebrew${n === 1 ? '' : ` ${n}`})`
    if (!nameClash(rows, slugOf(candidate), candidate)) return candidate
  }
  return `${title.trim()} (Homebrew)`
}
