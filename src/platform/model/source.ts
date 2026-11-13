/**
 * The reader contract: what every catalog reads the vault through.
 *
 * Everything takes a `VaultSource` and is therefore testable in plain Node
 * against an in-memory implementation. That boundary is the reason the reader
 * contract can be verified against a fixture vault before any UI exists, which
 * the plan calls the single most important property of this phase.
 * `obsidian/source.ts` is the implementation over Obsidian's own APIs; these
 * types live here, in `model/`, so a reader names them without reaching a file
 * that imports `obsidian` (MYDND-201).
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

/** YAML parser, injected so `obsidian/source.ts` stays the only Obsidian import. */
export type ParseYaml = (text: string) => unknown
