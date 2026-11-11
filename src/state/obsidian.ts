import { type App, type TFile, normalizePath } from 'obsidian'

import type { NoteFoldersSettings } from '../content/folders'
import { ObsidianVaultSource } from '../content/source'
import { createState, type State } from './index'
import type { NoteRef, StateVault } from './vault'

/**
 * **The only file in `src/state/` that imports `obsidian`** — the counterpart of
 * `content/source.ts`, and for the same reason.
 */

/**
 * Writes to the host vault through Obsidian's own APIs.
 *
 * `Vault.process` is the whole write path. It is Obsidian's atomic
 * read-modify-write: it reads the current contents, hands them to the transform
 * and writes the result in one operation, retrying if the file changed
 * underneath. That is why `StateVault` exposes nothing else — a `setFrontmatter`
 * paired with a `setBody` would be two writes and a window in which the note is
 * half-updated, which is exactly what the plan's "one file write" rules out.
 *
 * **`FileManager.processFrontMatter` is deliberately not used**, even though it
 * is the obvious API for editing frontmatter. It only edits frontmatter, so a
 * mutation that also touches a fence — every harvest, and every character in
 * MYDND-6 — would need it *and* a `process`, and that is the two-write shape
 * again. One primitive that can express both is worth re-serialising the
 * frontmatter ourselves for.
 */
export class ObsidianStateVault implements StateVault {
  /** Reading a folder is identical to the content layer's, so it is that code. */
  private readonly source: ObsidianVaultSource

  constructor(private readonly app: App) {
    this.source = new ObsidianVaultSource(app)
  }

  notesIn(folder: string): NoteRef[] {
    return this.source.notesIn(folder)
  }

  allNotes(): NoteRef[] {
    return this.source.allNotes()
  }

  async read(path: string): Promise<string | null> {
    const file = this.app.vault.getFileByPath(normalizePath(path))
    if (!file) return null
    // `cachedRead`, not `read`: the only caller is the harvest detail view, and
    // a note about to be *written* goes through `process`, which reads for
    // itself. Taking the cached copy here cannot therefore go stale under a
    // write.
    return this.app.vault.cachedRead(file as TFile)
  }

  async write(path: string, transform: (markdown: string) => string): Promise<void> {
    const target = normalizePath(path)
    const existing = this.app.vault.getFileByPath(target)

    if (existing) {
      await this.app.vault.process(existing as TFile, transform)
      return
    }

    // A vault that has never had a campaign has no `campaigns/` folder, which is
    // the normal first-run state rather than an error. `create` does not make
    // parents.
    await this.ensureFolder(target)
    await this.app.vault.create(target, transform(''))
  }

  /**
   * Create every missing ancestor folder of `path`.
   *
   * Each `createFolder` is wrapped because Obsidian throws "Folder already
   * exists" rather than succeeding quietly, and two writes racing to create the
   * same folder is a real sequence — the settings page can create a campaign
   * while an import is writing harvests. An existing folder is the outcome
   * wanted either way, so the throw carries no information worth propagating;
   * anything else fails the `create` immediately afterwards, where the error is
   * about the actual problem.
   */
  private async ensureFolder(path: string): Promise<void> {
    const parts = path.split('/').slice(0, -1)
    for (let i = 1; i <= parts.length; i += 1) {
      const folder = parts.slice(0, i).join('/')
      if (folder === '' || this.app.vault.getFolderByPath(folder)) continue
      try {
        await this.app.vault.createFolder(folder)
      } catch {
        /* already there, or about to fail louder on `create` */
      }
    }
  }
}

/** The Obsidian-flavoured entry point to the state layer. */
export function createVaultState(app: App, folders?: () => NoteFoldersSettings): State {
  return createState(new ObsidianStateVault(app), folders)
}
