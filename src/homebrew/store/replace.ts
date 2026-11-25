import type { StateVault } from '../../platform'

/**
 * Save an edited homebrew note over itself (MYDND-272, ADR 0014 condition 2 as
 * amended): **only if it is still the note Edit opened.**
 *
 * One `vault.write`, as every writer here (ADR 0003). `loaded` is the file's
 * text when Edit read it and checked that a save would lose nothing
 * (`loadNote`). The transform compares the file with it at the moment of the
 * write: a note changed since (an edit in Obsidian, Sync, another tab) is
 * handed back as it is and the save refused, so the builder never writes over
 * a change it has not seen. A note deleted since is refused too, rather than
 * created again with the edit. (Deleted in the instant between the read and
 * the write, `StateVault.write` hands the transform `''` and creates the file
 * from what it returns, so an empty file is left where the note was: the one
 * thing a single write cannot refuse, and nothing of the GM's is lost.)
 *
 * @throws with the sentence the page shows, when the note changed or is gone.
 */
export async function replaceHomebrewNote(vault: StateVault, path: string, loaded: string, text: string): Promise<void> {
  const changed = () => new Error(`${path} changed after it was opened here. Nothing was saved: open it in the builder again to edit what is there now.`)
  const gone = () => new Error(`${path} is no longer there. Nothing was saved.`)
  const before = await vault.read(path)
  if (before === null) throw gone()
  if (before !== loaded) throw changed()
  let refused: (() => Error) | null = null
  await vault.write(path, current => {
    if (current === loaded) return text
    refused = current === '' ? gone : changed
    return current
  })
  if (refused) throw (refused as () => Error)()
}
