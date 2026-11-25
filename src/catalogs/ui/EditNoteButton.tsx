import { useCompendium } from '../../compendium/host'
import { isUnderFolder, noteEditPath } from '../../platform'
import { useRouteLink } from '../../platform/host'
import { useCatalogs } from './context'

/**
 * "Edit" beside a detail pane's "Open note" (MYDND-272): the note in its
 * builder, `/homebrew/edit/<kind>?path=…`. Only for a note under the homebrew
 * folder, and only where the host has the builders, which is the plugin
 * (ADR 0014): an exported note stays read-only, and the web build draws nothing.
 */
export function EditNoteButton({ kind, path, label }: { kind: string; path: string; label: string }) {
  const { noteBuilders } = useCatalogs()
  const compendium = useCompendium()
  const link = useRouteLink()
  if (!noteBuilders || !isUnderFolder(compendium.homebrewFolder(), path)) return null
  return (
    <button type="button" className="bst-plain bst-btn-secondary" aria-label={`Edit this ${label} in its builder`} {...link(noteEditPath(kind, path))}>
      Edit
    </button>
  )
}
