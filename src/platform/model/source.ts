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
   * Every markdown note under `folder`, **at any depth**, with frontmatter
   * already parsed. An empty `folder` answers `[]`: nothing walks the vault
   * from its root (MYDND-226, ADR 0013).
   *
   * For the content whose membership is **a frontmatter key rather than a
   * folder's direct children**: a character note is one that carries
   * `vc_ddb_id` anywhere under the character folder, and a hand-written feat is
   * a note tagged `feat` anywhere under the feats folder. Every catalog list
   * uses `notesIn`, because a folder is exactly what it is defined by.
   *
   * Still no file reads — this is the same already-parsed cache.
   */
  notesUnder(folder: string): NoteRef[]
  /**
   * The homebrew folder from the top of the vault (MYDND-234): where every
   * catalog also looks, at any depth, for a note carrying its bare kind tag.
   * Absent is none, and so is `''`, since `notesUnder('')` answers `[]`.
   */
  homebrewFolder?(): string
  /** The full text of one note. Only called for a detail view. */
  readBody(path: string): Promise<string>
}

/** YAML parser, injected so `obsidian/source.ts` stays the only Obsidian import. */
export type ParseYaml = (text: string) => unknown
