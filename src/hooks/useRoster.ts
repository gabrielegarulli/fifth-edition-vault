import { useEffect, useState } from 'react'

import { useContent } from '../ContentContext'
import type { RosterEntry } from '../content/index'
import { useVaultGeneration } from './useVaultGeneration'

/**
 * The party — every character note in the vault, with its sheet read.
 *
 * **Asynchronous, unlike every catalog list.** A catalog row comes out of
 * frontmatter Obsidian has already parsed, so `list()` is synchronous and there
 * is no loading state anywhere in the plugin. A character's sheet is in the
 * note *body*, so this is one `cachedRead` per character — affordable because a
 * party is five notes, and the reason `useDetail` is no longer the only
 * asynchronous read here.
 *
 * `loading` is **derived from which vault generation the stored response
 * belongs to**, the same shape `useDetail` uses and for the same reason: a
 * separate boolean has to be set true, set false and reset on every path out,
 * and the path that gets forgotten leaves a spinner up forever. "The response
 * in hand is for an older vault" and "still loading" are one statement here.
 *
 * Re-reads on every vault change, which is the signal for an import, a re-sync
 * and a hand-edit alike — and is already coalesced over 250ms, so a re-sync of
 * six characters does not re-read six times.
 */
export interface RosterState {
  entries: RosterEntry[]
  loading: boolean
}

export function useRoster(): RosterState {
  const content = useContent()
  const generation = useVaultGeneration()
  const [loaded, setLoaded] = useState<{ key: number; value: RosterEntry[] } | null>(null)

  useEffect(() => {
    let cancelled = false
    // A local async function rather than an async effect: an effect must return
    // its cleanup, and an async one returns a promise React cannot call.
    async function run() {
      const value = await content.characters.entries()
      if (!cancelled) setLoaded({ key: generation, value })
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [content, generation])

  const ready = loaded?.key === generation
  return {
    // The previous generation's roster is kept on screen while the next one
    // loads. Blanking it would flash the whole party away on every keystroke in
    // an unrelated note.
    entries: loaded?.value ?? [],
    loading: !ready,
  }
}
