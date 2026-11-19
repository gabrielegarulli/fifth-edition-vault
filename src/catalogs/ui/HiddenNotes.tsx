import { MessageIcon } from '../../choices/host'
import { openNote, useObsidian } from '../../platform/host'
import type { HiddenNote } from '../../platform'

/**
 * The notes a catalog does not list because another has their filename
 * (MYDND-237), said on the page where they are missing.
 *
 * A catalog keeps one row per slug, because the slug is what a character's
 * saved choices address, so a homebrew `fireball.md` beside the exported one
 * is dropped. Before this nothing said so, and a character who picked the
 * homebrew spell got the exported rules. The fix is the author's, a rename,
 * so each path opens its note.
 *
 * Draws nothing when nothing is hidden, which is every exported vault
 * (`realVault.test.ts`).
 */
export function HiddenNotes({ hidden, noun }: { hidden: readonly HiddenNote[]; noun: string }) {
  const app = useObsidian()
  if (hidden.length === 0) return null
  const open = (path: string) => (
    <button type="button" className="bst-plain bst-hidden-notes-path" onClick={() => openNote(app, path)}>
      {path}
    </button>
  )
  return (
    <section aria-label="Notes not listed" className="bst-banner bst-banner--warn bst-note-problems bst-hidden-notes">
      <MessageIcon kind="warning" />
      <div>
        <p>
          {hidden.length === 1
            ? `One ${noun} note is not listed, because another note has its filename. Rename it to list it:`
            : `${hidden.length} ${noun} notes are not listed, because other notes have their filenames. Rename them to list them:`}
        </p>
        <ul>
          {hidden.map(h => (
            <li key={h.path}>
              {open(h.path)} is hidden behind {open(h.behind)}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
