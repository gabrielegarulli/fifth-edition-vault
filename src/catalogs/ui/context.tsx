import { createContext, useContext, useMemo, type ReactNode } from 'react'

import type { MonsterRow } from '../../compendium'

/**
 * The open monster's place in the encounter: what `MonsterDetail`'s footer
 * draws (MYDND-64). `null` when there is no active campaign, which is where an
 * encounter lives.
 */
export interface MonsterEncounter {
  add(): Promise<void>
  /** How many of this monster are in the encounter already. */
  count: number
  busy: boolean
}

/**
 * The catalogs domain's slots (MYDND-200): features the catalog pages draw but
 * a domain above them owns. One so far — the bestiary's "Add to an encounter",
 * which is gm's, and gm draws the catalogs' `BestiaryDetail` on its own
 * encounter page, so gm cannot sit below.
 *
 * The slot is a **hook**, because the page's footer is read on every render.
 * `app` passes gm's `useMonsterEncounter`, the same function for the life of
 * the provider, so calling it from the context keeps the rules of hooks.
 */
export interface CatalogsHost {
  useMonsterEncounter: (monster: MonsterRow | null) => MonsterEncounter | null
}

const CatalogsContext = createContext<CatalogsHost | null>(null)

export function CatalogsProvider({
  useMonsterEncounter,
  children,
}: CatalogsHost & { children: ReactNode }) {
  const host = useMemo<CatalogsHost>(() => ({ useMonsterEncounter }), [useMonsterEncounter])
  return <CatalogsContext.Provider value={host}>{children}</CatalogsContext.Provider>
}

/** Deliberately not defaulted to a stub — a missing provider is a wiring bug. */
export function useCatalogs(): CatalogsHost {
  const host = useContext(CatalogsContext)
  if (!host) throw new Error('useCatalogs must be used inside a CatalogsProvider')
  return host
}
