import {
  normaliseFolder,
  resolveRuleFolder,
  ruleFolderOverride,
  isRuleFolderKey,
  type NoteFoldersSettings,
} from './folders'
import type { NoteRef, VaultSource } from './source'

export { SRD_RULES_FOLDER } from './folders'

/**
 * A `VaultSource` whose `notesIn(folder)` reads a rules folder from where the
 * settings put it (MYDND-180, MYDND-184).
 *
 * Per folder, on each read:
 *
 * 1. **Its own override**, when one is set, and nothing else. A folder the user
 *    named is the answer even when it is empty: falling back would fill the
 *    catalog from a folder they pointed away from.
 * 2. Else **`<rulesRoot>/<folder>`**, and the top-level `<folder>` when that has
 *    no notes. The fallback is what keeps a vault exported before MYDND-180
 *    (every folder at the top) working.
 * 3. Else the top-level `<folder>`.
 *
 * `root` is the settings getter, read on every call, so a changed setting takes
 * effect on the next read with nothing to rebuild. A plain string is the rules
 * root alone, with no overrides.
 *
 * **Only the catalogs read through this.** Campaigns and characters are the
 * user's own notes, so `state/` takes the plain source. `allNotes` and
 * `readBody` pass straight through: a path is already the whole path.
 *
 * Nothing is cached: the catalogs re-read on every vault change, so moving the
 * folders in Obsidian takes effect on the next read.
 */
export function rulesSource(source: VaultSource, root: string | (() => NoteFoldersSettings)): VaultSource {
  if (typeof root === 'string') {
    const prefix = normaliseFolder(root)
    if (!prefix) return source
    return rulesSource(source, () => ({ rulesRoot: prefix, overrides: {}, campaigns: '', sessions: '' }))
  }
  return {
    notesIn(folder: string): NoteRef[] {
      const folders = root()
      const override = ruleFolderOverride(folder, folders)
      if (override) return source.notesIn(override)
      const prefix = normaliseFolder(folders.rulesRoot)
      if (!prefix) return source.notesIn(folder)
      const nested = source.notesIn(`${prefix}/${folder}`)
      return nested.length > 0 ? nested : source.notesIn(folder)
    },
    folderFor: folder => (isRuleFolderKey(folder) ? resolveRuleFolder(folder, root()) : folder),
    allNotes: () => source.allNotes(),
    readBody: path => source.readBody(path),
  }
}
