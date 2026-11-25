import type { StateVault } from '../../platform'

/**
 * Write a builder's note (MYDND-233), **only where nothing is** (ADR 0014).
 *
 * One `vault.write`, as every writer here (ADR 0003). The read first is for the
 * sentence: a file at the path is refused before anything is written. The
 * transform checks again, because a file can appear between the read and the
 * write (Obsidian Sync, another tab), and then it hands the file back as it
 * found it and the save is refused rather than written over.
 *
 * @throws with the sentence the page shows, when anything is at `path`.
 */
export async function createHomebrewNote(vault: StateVault, path: string, text: string): Promise<void> {
  const taken = () => new Error(`A file is already at ${path}. A builder never writes over a note: change the name, or pick another folder.`)
  const before = await vault.read(path)
  // An empty file is still a file: only `null`, no note at all, is free.
  if (before !== null) throw taken()
  let raced = false
  await vault.write(path, current => {
    if (current === '') return text
    raced = true
    return current
  })
  if (raced) throw taken()
}
