import type { NoteRef } from '../content/source'

/**
 * The vault, as the state layer needs it — the exact counterpart of
 * `VaultSource` for the content layer, and the only thing in `src/state/` that
 * has an Obsidian implementation.
 *
 * **Writing is one method, and that is the design.** The plan's requirement for
 * this phase is that "each write should still be one file write, not a
 * sequence". Expressing the whole write API as a single atomic read-modify-write
 * makes that structural rather than a promise somebody has to keep: there is no
 * `setFrontmatter` to pair with a `setBody`, so a caller cannot accidentally
 * spend two writes — or leave a note half-updated between them — on one
 * mutation. Obsidian's `Vault.process` is exactly this primitive.
 *
 * Nothing here imports `obsidian`, so every writer above it is testable in plain
 * Node against the in-memory implementation in `__fixtures__/memoryVault.ts` —
 * the same property that lets the readers be verified against a fixture vault.
 */
export interface StateVault {
  /**
   * Every markdown note directly inside `folder`, frontmatter already parsed.
   * Empty when the folder does not exist, which is the normal state of a vault
   * nothing has been written to yet.
   */
  notesIn(folder: string): NoteRef[]

  /**
   * Every markdown note in the vault, frontmatter already parsed.
   *
   * Needed by exactly one writer: a character is identified by its `vc_ddb_id`
   * frontmatter and not by its folder, so re-syncing one in place means finding
   * it wherever the player has moved it (MYDND-7). Resolving by folder and
   * filename instead is what produces a second note claiming the same
   * character.
   */
  allNotes(): NoteRef[]

  /** The full text of one note, or `null` when there is no such note. */
  read(path: string): Promise<string | null>

  /**
   * Transform one note atomically: read, apply, write, in one operation.
   *
   * `transform` is handed `''` when the note does not exist, and the note — and
   * any missing parent folders — are created from what it returns. It must be
   * pure: Obsidian may call it again if the file changed underneath, and a
   * transform with a side effect would run that side effect twice.
   */
  write(path: string, transform: (markdown: string) => string): Promise<void>
}

export type { NoteRef }
