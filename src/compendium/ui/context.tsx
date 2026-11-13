import { createContext, useContext, type ReactNode } from 'react'

import type { Compendium } from '../model/compendium'

/**
 * The compendium's readers — spells, monsters, classes, feats, items, lineage,
 * conditions — provided once and read anywhere below (MYDND-199).
 *
 * This was `ContentContext`, which also carried the roster and so made a spell
 * detail pane depend on every character. It holds the ten readers and
 * `ruleFolder` now, and nothing above the compendium in the domain order.
 *
 * A plain value rather than state: the readers are stateless, and the vault's
 * own change events (`useVaultGeneration`) are what tell React to re-read.
 * **Never call `list()`, `byId()` or `byName()` in a render** — go through
 * `useCatalogRows` (`docs/lessons/content-layer.md`).
 *
 * Deliberately **not** defaulted to a stub. A missing provider is a wiring bug,
 * and an empty-but-valid default would turn it into "the vault has no content",
 * which looks like a data problem and sends you to the wrong place entirely.
 */
const CompendiumContext = createContext<Compendium | null>(null)

export function CompendiumProvider({ compendium, children }: { compendium: Compendium; children: ReactNode }) {
  return <CompendiumContext.Provider value={compendium}>{children}</CompendiumContext.Provider>
}

export function useCompendium(): Compendium {
  const compendium = useContext(CompendiumContext)
  if (!compendium) throw new Error('useCompendium must be used inside a CompendiumProvider')
  return compendium
}

/**
 * The compendium where one may be absent.
 *
 * For a component that renders both in the pane and somewhere the readers are
 * a garnish rather than the point — `SpellLink` links a spell name to its note
 * when it can, and prints it as text when it cannot. Still **not** a stub:
 * `null` says "no provider", which the caller must handle in the open.
 */
export function useOptionalCompendium(): Compendium | null {
  return useContext(CompendiumContext)
}
