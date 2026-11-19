import { type App, parseYaml, TFile, TFolder } from 'obsidian'
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
 *
 * **Nothing here lists the vault (MYDND-226).** Both reads start at a named
 * folder, `getFolderByPath`, and walk its `children`: `notesIn` one level,
 * `notesUnder` all of them. Before, both filtered `getMarkdownFiles()`, which
 * the directory's review reports as "Vault Enumeration". An empty folder name
 * is the vault's root and answers nothing, so no setting can turn either back
 * into a walk of the whole vault. `lint:directory` fails on an enumeration call
 * anywhere outside `src/online/` (ADR 0013).
 */
export class ObsidianVaultSource implements VaultSource {
  constructor(private readonly app: App) {}

  notesIn(folder: string): NoteRef[] {
    // Direct children only. `bestiary/` must not absorb
    // `bestiary/homebrew/…` without someone deciding that it should.
    return this.children(folder)
      .filter(isNote)
      .map(file => this.ref(file))
  }

  notesUnder(folder: string): NoteRef[] {
    const out: NoteRef[] = []
    const walk = (children: readonly unknown[]): void => {
      for (const child of children) {
        if (isNote(child)) out.push(this.ref(child))
        else if (child instanceof TFolder) walk(child.children)
      }
    }
    walk(this.children(folder))
    return out
  }

  readBody(path: string): Promise<string> {
    const file = this.app.vault.getFileByPath(path)
    if (!file) return Promise.resolve('')
    // `cachedRead`, not `read`: these notes are read for display and never
    // written back, which is exactly the case the cached variant exists for.
    return this.app.vault.cachedRead(file)
  }

  /** A folder's direct children; none for a missing folder or the vault's root. */
  private children(folder: string): readonly unknown[] {
    const path = folder.replace(/^\/+|\/+$/g, '')
    if (!path) return []
    return this.app.vault.getFolderByPath(path)?.children ?? []
  }

  private ref(file: TFile): NoteRef {
    return {
      path: file.path,
      slug: file.basename,
      frontmatter: this.app.metadataCache.getFileCache(file)?.frontmatter ?? {},
    }
  }
}

const isNote = (child: unknown): child is TFile => child instanceof TFile && child.extension === 'md'
