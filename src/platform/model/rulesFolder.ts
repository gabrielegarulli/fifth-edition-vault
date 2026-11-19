import {
  homebrewFolder,
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
 * user's own notes, so `state/` takes the plain source. `notesUnder` resolves a
 * rules folder as `notesIn` does and passes any other folder straight through
 * (the roster's character folder), and `readBody` passes straight through: a
 * path is already the whole path. `homebrewFolder` answers the setting
 * (MYDND-234), which every catalog reads as its third pass.
 *
 * Nothing is cached: the catalogs re-read on every vault change, so moving the
 * folders in Obsidian takes effect on the next read.
 */
export function rulesSource(source: VaultSource, root: string | (() => NoteFoldersSettings)): VaultSource {
  if (typeof root === 'string') {
    const prefix = normaliseFolder(root)
    if (!prefix) return source
    return rulesSource(source, () => ({ rulesRoot: prefix, overrides: {}, campaigns: '', sessions: '', homebrew: '' }))
  }
  // `notesIn` and `notesUnder` find their folder the same way: the override,
  // else `<rulesRoot>/<folder>` when it has notes, else a top-level `<folder>`.
  const resolved = (folder: string, read: (path: string) => NoteRef[]): NoteRef[] => {
    const folders = root()
    const override = ruleFolderOverride(folder, folders)
    if (override) return read(override)
    const prefix = normaliseFolder(folders.rulesRoot)
    if (!prefix) return read(folder)
    const nested = read(`${prefix}/${folder}`)
    return nested.length > 0 ? nested : read(folder)
  }
  return {
    notesIn: folder => resolved(folder, path => source.notesIn(path)),
    // Only a rules folder is resolved: the roster asks for the character
    // folder, which is a path from the top of the vault already.
    notesUnder: folder =>
      isRuleFolderKey(folder) ? resolved(folder, path => source.notesUnder(path)) : source.notesUnder(folder),
    folderFor: folder => (isRuleFolderKey(folder) ? resolveRuleFolder(folder, root()) : folder),
    // A path from the top of the vault, never resolved under the rules root:
    // homebrew is the user's, not the exporter's (MYDND-234).
    homebrewFolder: () => homebrewFolder(root()),
    readBody: path => source.readBody(path),
  }
}
