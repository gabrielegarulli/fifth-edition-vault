import { useCallback, useEffect, useState } from 'react'

import { useObsidian } from '../ObsidianContext'
import { atlasAvailable, type RollContext } from './atlas'
import { useRollHost, type RollOutcome } from './RollContext'

/**
 * Rolling, from a component's point of view.
 *
 * **This no longer owns advantage.** MYDND-7's version fired the whole formula
 * twice and compared totals; MYDND-10 moved the mechanics into
 * `rollEngine.js`'s `buildGroups`/`applyKeep`, where one extra d20 *group* is
 * appended and the discard is recorded as `dropped`. The old shape gave the same
 * number and could not give the log, the `dropped` die or an intervention — see
 * `RollContext.tsx`.
 *
 * What survives is the *call shape*: `roll(expr, label, character, modifiers)`,
 * so every `Rollable` on the sheet is untouched. Shift is advantage, Alt is
 * disadvantage, and both only apply to a roll with a d20 in it.
 *
 * **It now returns the outcome** (MYDND-16). `Rollable` still ignores it — a
 * clickable number has nothing to do with the result — but a harvest check, an
 * initiative order and a quirk draw all need the number, and before this the
 * only way to get one was to bypass the engine. See `RollOutcome`.
 */

/** The modifier keys a roll reads. Taken as data so a test needs no DOM event. */
export interface RollModifiers {
  shiftKey?: boolean
  altKey?: boolean
}

export type RollFn = (
  expr: string | number,
  label?: string | null,
  character?: RollContext | null,
  modifiers?: RollModifiers,
  /** `'attack'`, `'damage'`, … — what an effect's `scope` is matched against. */
  rollType?: string | null,
  damageType?: string | null,
) => Promise<RollOutcome | null>

export function useRoll(): RollFn {
  const { roll } = useRollHost()

  return useCallback(
    (expr, label, character, modifiers, rollType, damageType) =>
      roll({ expr, label, character, modifiers, rollType, damageType }),
    [roll],
  )
}

/**
 * Whether a scene is open to roll into, kept current.
 *
 * Opening or closing an Atlas map changes whether rolls have anywhere to go,
 * and the sheet's footer says which — so this re-checks on `layout-change`,
 * which is the event that fires for both.
 */
export function useAtlasReady(): boolean {
  const app = useObsidian()
  const [ready, setReady] = useState(() => atlasAvailable(app))

  useEffect(() => {
    const check = (): void => setReady(atlasAvailable(app))
    const ref = app.workspace.on('layout-change', check)
    // The scene may have opened between the initial state and this effect.
    check()
    return () => app.workspace.offref(ref)
  }, [app])

  return ready
}
