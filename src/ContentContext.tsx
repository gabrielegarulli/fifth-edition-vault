import { createContext, useContext, type ReactNode } from 'react'

import type { Content } from './content/index'

/**
 * The content layer, provided once by the view and read anywhere below it.
 *
 * A context rather than prop drilling because by Phase 2 every catalog page
 * needs it, and because the readers are stateless — there is nothing to
 * synchronise, so there is no reason for this to be state.
 *
 * Deliberately **not** defaulted to a stub. A missing provider is a wiring bug,
 * and an empty-but-valid default would turn it into "the vault has no content",
 * which looks like a data problem and sends you to the wrong place entirely.
 */
const ContentContext = createContext<Content | null>(null)

export function ContentProvider({ content, children }: { content: Content; children: ReactNode }) {
  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>
}

export function useContent(): Content {
  const content = useContext(ContentContext)
  if (!content) throw new Error('useContent must be used inside a ContentProvider')
  return content
}

/**
 * The content layer where one may be absent, as `useOptionalStateHost` is.
 *
 * For a component that renders both in the pane and somewhere content is a
 * garnish rather than the point — `CharacterSheet` links spell names to their
 * notes when it can, and lists them as text when it cannot. Still **not** a
 * stub: `null` says "no provider", which the caller must handle in the open.
 */
export function useOptionalContent(): Content | null {
  return useContext(ContentContext)
}
