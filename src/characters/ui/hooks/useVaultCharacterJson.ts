import { useEffect, useState } from 'react'

import { useCharacters } from '../context'
import type { VaultCharacterJson } from '../../../characterModel'

/**
 * A Vault character's own ` ```vault-character ` fence, re-read on every vault
 * generation (MYDND-51) — the same read `SpellPanel` makes for the spell list.
 *
 * `null` for a D&D Beyond character (`enabled` false), while the first read is
 * in flight, and when the note cannot be read: every caller treats all three as
 * "nothing to show". The last answer stays up while the next generation is
 * read, so a write does not blink the familiars off and on.
 *
 * Loading is derived from the key, not a boolean set in the effect
 * (`react-hooks/set-state-in-effect`).
 */
export function useVaultCharacterJson(
  notePath: string,
  enabled: boolean,
  generation: number,
): VaultCharacterJson | null {
  const { characters } = useCharacters()
  const [loaded, setLoaded] = useState<{ path: string; json: VaultCharacterJson | null } | null>(null)
  const key = `${notePath}:${generation}`

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    async function run() {
      try {
        const json = await characters.readVaultCharacter(notePath)
        if (!cancelled) setLoaded({ path: notePath, json })
      } catch {
        if (!cancelled) setLoaded({ path: notePath, json: null })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [characters, notePath, key, enabled])

  return enabled && loaded?.path === notePath ? loaded.json : null
}
