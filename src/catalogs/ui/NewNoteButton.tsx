import { noteBuilderPath } from '../../platform'
import { useRouteLink } from '../../platform/host'
import { useCatalogs } from './context'

/**
 * "New homebrew spell" on a catalog page's header (MYDND-233): the way into
 * that kind's note builder. Drawn only where the host has the builders, which
 * is the plugin (ADR 0014); the web build and the harness draw nothing.
 */
export function NewNoteButton({ kind, label }: { kind: string; label: string }) {
  const { noteBuilders } = useCatalogs()
  const link = useRouteLink()
  if (!noteBuilders) return null
  return (
    <button type="button" className="bst-plain bst-btn-secondary bst-btn-sm bst-new-note" {...link(noteBuilderPath(kind))}>
      New homebrew {label}
    </button>
  )
}
