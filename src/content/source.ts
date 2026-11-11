import { type App, type TFile, parseYaml } from 'obsidian'

/**
 * **The only file in `src/content/` that imports `obsidian`.**
 *
 * Everything else takes a `VaultSource` and is therefore testable in plain Node
 * against an in-memory implementation. That boundary is the reason the reader
 * contract can be verified against a fixture vault before any UI exists, which
 * the plan calls the single most important property of this phase.
 */

/** A note as the catalogs see it in list context: identity plus frontmatter. */
export interface NoteRef {
  /** Vault-relative path, e.g. `spells/fireball.md`. The true identity. */
  path: string
  /** Filename without extension — the slug used as `id`. */
  slug: string
  /** Parsed frontmatter. Flat by convention; never trust it to be. */
  frontmatter: Record<string, unknown>
}

export interface VaultSource {
  /**
   * Every markdown note directly inside `folder`, with frontmatter already
   * parsed. **Must not read file contents** — that is the whole point.
   */
  notesIn(folder: string): NoteRef[]
  /**
   * Where `notesIn(folder)` looks, from the top of the vault, when that is not
   * `folder` itself (MYDND-184). Only for *naming* the folder to the user: an
   * empty state says which folder it wants. Absent means `folder`.
   */
  folderFor?(folder: string): string
  /**
   * Every markdown note in the vault, with frontmatter already parsed.
   *
   * For the one content type whose membership is **a frontmatter key rather
   * than a folder**: a character note is one that carries `vc_ddb_id`, and
   * moving it out of `characters/` does not stop it being a character
   * (MYDND-7). Every catalog uses `notesIn` instead, because a folder is
   * exactly what they are defined by.
   *
   * Still no file reads — this is the same already-parsed cache, just
   * unfiltered.
   */
  allNotes(): NoteRef[]
  /** The full text of one note. Only called for a detail view. */
  readBody(path: string): Promise<string>
}

/** YAML parser, injected so `source.ts` stays the only Obsidian import. */
export type ParseYaml = (text: string) => unknown

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
    return this.app.vault.cachedRead(file as TFile)
  }
}
