import { useMemo } from 'react'

import { noteProblems, type ProblemKind } from '@vault/derive/noteProblems.js'

import { MessageIcon } from './Messages'

/**
 * What a hand-written rules note gets wrong without a sound, said where the
 * note is shown (MYDND-238): an unknown skill key, or an effect type that does
 * not exist. Since MYDND-234 the homebrew folder lets anyone write these, and
 * both grant nothing on the sheet with nothing saying so.
 *
 * Draws nothing when there is nothing to say, which is every exported note
 * (`realVault.test.ts`), so the catalogs look as they did.
 */
export function NoteProblems({
  kind,
  fence,
  frontmatter,
}: {
  kind: ProblemKind
  fence: unknown
  frontmatter?: unknown
}) {
  const problems = useMemo(() => noteProblems(kind, fence, frontmatter), [kind, fence, frontmatter])
  if (problems.length === 0) return null
  return (
    <section aria-label="Mistakes in this note" className="bst-banner bst-banner--warn bst-note-problems">
      <MessageIcon kind="warning" />
      <div>
        <p>
          {problems.length === 1
            ? 'One thing in this note does nothing on a sheet:'
            : `${problems.length} things in this note do nothing on a sheet:`}
        </p>
        <ul>
          {problems.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
