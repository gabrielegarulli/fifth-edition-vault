import { useEffect, useMemo, useState } from 'react'
import type { EventRef, Events } from 'obsidian'

import { useObsidian } from '../../obsidian/ObsidianContext'
import { subscribeVaultGeneration } from './generationBus'

/**
 * A counter that increments when the vault's content changes.
 *
 * `createCatalog` deliberately rebuilds its row array on every `list()` call and
 * says why: Obsidian mutates its metadata cache as files change, and a cache with
 * no invalidation signal goes stale silently. That reasoning is right, and the
 * missing piece is exactly this — Obsidian *does* emit the signal, so the view
 * layer can memoise honestly where the content layer could not.
 *
 * It matters at this size. `notesIn('spells')` walks every markdown file in the
 * vault and `list()` then sorts 1785 rows with `localeCompare`; calling that on
 * every keystroke's render is the difference between a catalog that feels local
 * and one that does not.
 *
 * Coalesced over 250ms because `changed` fires per file, and Obsidian re-indexes
 * in bursts — opening the vault would otherwise rebuild every list hundreds of
 * times in a second.
 */
export function useVaultGeneration(): number {
  const app = useObsidian()
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    let timer: number | null = null
    const bump = () => {
      if (timer !== null) window.clearTimeout(timer)
      timer = window.setTimeout(() => setGeneration(g => g + 1), 250)
    }

    // Each ref is kept with the emitter that created it: `offref` belongs to the
    // `Events` instance that handed it out, and unregistering on the wrong one
    // leaves the listener attached for the life of the app.
    const subs: Array<[Events, EventRef]> = [
      [app.metadataCache, app.metadataCache.on('changed', bump)],
      // `resolved` is the "the cache has settled" signal, and the only one that
      // fires when frontmatter was parsed during startup rather than edited.
      [app.metadataCache, app.metadataCache.on('resolved', bump)],
      [app.vault, app.vault.on('create', bump)],
      [app.vault, app.vault.on('delete', bump)],
      [app.vault, app.vault.on('rename', bump)],
    ]

    // A changed folder setting moves no file, so the plugin says so itself, and
    // at once: there is no burst to coalesce (MYDND-184).
    const unsubscribe = subscribeVaultGeneration(() => setGeneration(g => g + 1))

    return () => {
      unsubscribe()
      if (timer !== null) window.clearTimeout(timer)
      for (const [emitter, ref] of subs) emitter.offref(ref)
    }
  }, [app])

  return generation
}

/**
 * A catalog's rows, rebuilt only when the vault changes.
 *
 * **`read` is intentionally not a dependency.** It is a fresh closure on every
 * render, so including it would memoise nothing; the vault generation is the real
 * input. The cost of that choice is that a `read` closing over changing state
 * would go stale — so it must close over the catalog and nothing else. Every
 * caller passes `() => content.spells.list()`.
 */
export function useCatalogRows<R>(read: () => R[]): R[] {
  const generation = useVaultGeneration()
  // Wrapped in an inline arrow rather than passed straight through:
  // `react-hooks/use-memo` requires the first argument to be a literal function,
  // because a `useMemo(someFn, deps)` it cannot see inside is a memo it cannot
  // check. The wrapper changes nothing at runtime.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- generation is what makes read() answer differently
  return useMemo(() => read(), [generation])
}
