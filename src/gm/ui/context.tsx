import { createContext, useContext, type ReactNode } from 'react'

import type { EncounterStore } from '../store/encounter'
import type { Shop } from '../store/shop'

/**
 * The GM surfaces' own stores: the encounter and the shop (MYDND-199). The log
 * and session notes are the platform's (`usePlatform().activity`), because the
 * dice write to the log too.
 */
export interface GmHost {
  encounters: EncounterStore
  shop: Shop
}

const GmContext = createContext<GmHost | null>(null)

export function GmProvider({ gm, children }: { gm: GmHost; children: ReactNode }) {
  return <GmContext.Provider value={gm}>{children}</GmContext.Provider>
}

/** Deliberately not defaulted to a stub — a missing provider is a wiring bug. */
export function useGmStores(): GmHost {
  const host = useContext(GmContext)
  if (!host) throw new Error('useGmStores must be used inside a GmProvider')
  return host
}
