import { useEffect, useState } from 'react'

import { improvementDefs, type ImprovementDef } from '../model/companion'
import type { MonsterCatalog } from '../../compendium'

/**
 * The improvement trees of the familiars a draft has picked, by monster id
 * (MYDND-126) — `useDetails`'s shape over `monsters.companion`, since the tree is
 * a second fence on the note and `detail` returns only the statblock.
 *
 * `loading` is derived from whether the stored response is for these ids, never
 * held as a flag, for the reason `useDetails` gives.
 */
export interface CompanionsState {
  trees: ReadonlyMap<string, ImprovementDef[]>
  loading: boolean
}

const EMPTY = new Map<string, never>()

export function useCompanions(monsters: MonsterCatalog, ids: readonly string[]): CompanionsState {
  const key = [...new Set(ids)].sort().join('\u0001')
  const [loaded, setLoaded] = useState<{ key: string; value: Map<string, ImprovementDef[]> } | null>(null)

  useEffect(() => {
    if (key === '') return
    let cancelled = false
    async function run() {
      const value = new Map<string, ImprovementDef[]>()
      for (const id of key.split('\u0001')) value.set(id, improvementDefs(await monsters.companion(id)))
      if (!cancelled) setLoaded({ key, value })
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [monsters, key])

  if (key === '') return { trees: EMPTY, loading: false }
  const ready = loaded?.key === key
  return { trees: ready ? loaded.value : EMPTY, loading: !ready }
}
