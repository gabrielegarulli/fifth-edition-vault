import { type App, parseYaml } from 'obsidian'
import type { NoteRef, ParseYaml, VaultSource } from '../model/source'

/**
 * **The only reader-side file that imports `obsidian`**, apart from the
 * compendium's wrapper over it (`compendium/obsidian/vaultCompendium.ts`).
 * The contract it implements, `VaultSource`, is `model/source.ts`.
 */
export const obsidianParseYaml: ParseYaml = parseYaml

/**
 * Reads the host vault through Obsidian's own APIs.
 *
 * `metadataCache.getFileCache()` returns frontmatter Obsidian has **already
 * parsed** while indexing, so building a 1785-entry list costs no file reads and
 * no YAML parsing. This is the entire performance argument for being local, and
 * it is lost the moment someone reaches for `vault.read` in a list path.
 */
export class ObsidianVaultSource implements VaultSource {
  constructor(private readonly app: App) {}

  notesIn(folder: string): NoteRef[] {
    const prefix = folder.endsWith('/') ? folder : `${folder}/`
    const out: NoteRef[] = []

    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!file.path.startsWith(prefix)) continue
      // Direct children only. `bestiary/` must not absorb
      // `bestiary/homebrew/…` without someone deciding that it should.
      if (file.path.slice(prefix.length).includes('/')) continue

      out.push({
        path: file.path,
        slug: file.basename,
        frontmatter: this.app.metadataCache.getFileCache(file)?.frontmatter ?? {},
      })
    }

    return out
  }

  allNotes(): NoteRef[] {
    return this.app.vault.getMarkdownFiles().map(file => ({
      path: file.path,
      slug: file.basename,
      frontmatter: this.app.metadataCache.getFileCache(file)?.frontmatter ?? {},
    }))
  }

  readBody(path: string): Promise<string> {
    const file = this.app.vault.getFileByPath(path)
    if (!file) return Promise.resolve('')
    // `cachedRead`, not `read`: these notes are read for display and never
    // written back, which is exactly the case the cached variant exists for.
    return this.app.vault.cachedRead(file)
  }
}
