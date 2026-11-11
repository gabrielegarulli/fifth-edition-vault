import { useEffect, useState } from 'react'

import type { CharacterInventory } from '../state/inventory'
import { useStateHost } from '../StateContext'

const EMPTY: CharacterInventory = { currency: { pp: 0, gp: 0, sp: 0, cp: 0 }, items: [] }

/**
 * One character's ` ```vault-inventory `, re-read whenever the vault changes
 * (MYDND-37).
 *
 * After a write, the vault's change event bumps `generation` and that is what
 * brings the new bag back — never local React state, so a hand-edit in the note
 * and a write from another surface arrive the same way. `useVitals`' shape: the
 * response is stored against its request key and `loading` is *derived*, which
 * keeps `react-hooks/set-state-in-effect` satisfied without an effect that
 * resets state.
 */
export function useInventory(
  notePath: string | null,
  generation: number,
): { inventory: CharacterInventory; loading: boolean } {
  const { state } = useStateHost()
  const [loaded, setLoaded] = useState<{ key: string; inventory: CharacterInventory } | null>(null)
  const key = `${notePath ?? ''}:${generation}`

  useEffect(() => {
    if (!notePath) return
    const path = notePath
    let cancelled = false
    async function run() {
      let inventory = EMPTY
      try {
        inventory = await state.inventory.getInventory(path)
      } catch {
        // A note that cannot be read shows an empty bag; the write path is the
        // one that refuses (ADR 0003), and nothing is written from here.
      }
      if (!cancelled) setLoaded({ key, inventory })
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [notePath, key, state])

  // A stale response is kept on screen while the next one loads, so a write
  // does not flash the bag empty; only the very first read shows nothing.
  return { inventory: loaded?.inventory ?? EMPTY, loading: !notePath ? false : loaded?.key !== key }
}
