import { createContext, useContext, type ReactNode } from 'react'

import type { RollModeInfo, RollTarget } from '../model/rollModes'

/**
 * The sheet's current roll modes, for any `Rollable` under it (MYDND-45).
 *
 * Provided by the sheet page from its effects, switched-on benefits and
 * conditions. **Absent everywhere else** — a note's `charsheet` fence and the
 * catalogs have no vitals, so a roll there asks and gets `null`, which is "no
 * marker, roll as clicked": the right answer for a sheet that cannot know.
 */
type Resolver = (target: RollTarget) => RollModeInfo

const RollModeContext = createContext<Resolver | null>(null)

export function RollModeProvider({ value, children }: { value: Resolver; children: ReactNode }) {
  return <RollModeContext.Provider value={value}>{children}</RollModeContext.Provider>
}

export function useRollMode(target: RollTarget | null | undefined): RollModeInfo | null {
  const resolve = useContext(RollModeContext)
  if (!resolve || !target) return null
  return resolve(target)
}
