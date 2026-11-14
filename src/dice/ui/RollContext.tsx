// The roll provider: every roll goes through it (mode, interventions, the
// engine, the Atlas roller) and lands in the log.

import { resolveRoll } from '@vault/derive/rollEngine.js'
import { Notice } from 'obsidian'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

import type { ResolvedEffect } from '../../compendium'
import { useObsidian, useOptionalPlatform } from '../../platform/host'
import type { RollContext as Character } from '../obsidian/atlas'
import { parseFormula } from '../model/groups'
import {
  applyOffer,
  offersFor,
  interventionRecord,
  type InterventionOffer,
  type RollState,
} from '../model/interventions'
import { createAtlasRoller } from '../obsidian/roller'
import { appendRoll, describeRoll, logEntry, newRollId, rollActivity, type RollLogEntry } from '../model/rollLog'
import { toFormula } from '../model/formula'

/**
 * Rolling, as the pane does it.
 *
 * **`rollEngine.js` owns the mechanics now.** Before this (MYDND-7) `useRoll`
 * owned advantage directly: it fired the whole formula twice and compared the
 * totals. That gives the right *number* for `1d20+5` — `max(d20+5, d20+5)` is
 * `max(d20)+5` — and stops being right the moment anything reads the dice
 * rather than the total, which is everything this phase adds. The engine
 * appends one extra d20 *group*, applies keep-highest to the faces, and records
 * the discard under `dropped`.
 *
 * So the shape is: parse the formula into groups → `resolveRoll` with an
 * Atlas-backed roller → log it → offer an intervention → apply it → log the
 * change. Every rule in that sentence belongs to the engine; this owns the
 * plumbing, the log and the prompt.
 *
 * ## Why this is a provider and `useRoll` was a hook
 *
 * The log and the prompt are shared: a roll from the vitals strip and a roll
 * from the skill list land in the same log, and only one prompt may be open.
 * A hook per rollable would give each one its own.
 */

export type RollMode = 'normal' | 'advantage' | 'disadvantage'

export interface RollRequest {
  expr: string | number
  label?: string | null
  character?: Character | null
  /** `'attack'`, `'damage'`, `'check'`, `'save'` — matched against an effect's `scope`. */
  rollType?: string | null
  damageType?: string | null
  modifiers?: { shiftKey?: boolean; altKey?: boolean }
}

/** A prompt waiting on the player. Only ever one. */
export interface PendingIntervention {
  offer: InterventionOffer
  entryId: string
  accept: () => void
  decline: () => void
}

/**
 * What a roll came to, for a caller that needs the number.
 *
 * **Added in MYDND-16, and the reason that ticket is one ticket.** A clickable
 * number does not care what it rolled — `Rollable` ignores this entirely. A
 * harvest check, an initiative order and a quirk draw all *do*, and before this
 * the only way to get a number back was to call `rollInScene` directly, which is
 * what `PartyInitiativeButton` did: no engine, no log, no advantage, no reveal
 * wait, no fallback. One roll path is worth more than five workarounds.
 *
 * `faces` is every die thrown **including the one advantage discarded**, in
 * group order — so a caller that wants to show its working can, and
 * `assembleHarvestRoll`'s `[12, 4] → 4` detail string is reproducible.
 */
export interface RollOutcome {
  /** After the modifier, and after an accepted intervention. */
  total: number
  /** Kept faces, group by group. */
  faces: number[]
  /** What advantage or disadvantage set aside. Empty on a normal roll. */
  dropped: number[]
  modifier: number
  mode: RollMode
  /** `true` when no Atlas scene answered and the engine's RNG stood in. */
  simulated: boolean
}

export interface RollHost {
  /**
   * Rolls, and resolves to what it came to — or `null` when there was nothing
   * to roll. **Resolves after an intervention is settled**, not before, so the
   * total a caller reads is the total the log shows.
   */
  roll: (request: RollRequest) => Promise<RollOutcome | null>
  log: readonly RollLogEntry[]
  clearLog: () => void
  pending: PendingIntervention | null
  /** The effects interventions are drawn from, set by whatever page knows. */
  setEffects: (effects: readonly ResolvedEffect[], activeKeys: readonly string[]) => void
}

const RollCtx = createContext<RollHost | null>(null)

export function modeOf(modifiers?: { shiftKey?: boolean; altKey?: boolean }): RollMode {
  if (modifiers?.shiftKey) return 'advantage'
  if (modifiers?.altKey) return 'disadvantage'
  return 'normal'
}

export function RollProvider({ children }: { children: ReactNode }) {
  const app = useObsidian()
  const [log, setLog] = useState<readonly RollLogEntry[]>([])
  const [pending, setPending] = useState<PendingIntervention | null>(null)

  // Refs, not state: a roll handler reads these at click time and must never
  // see a stale closure, and nothing renders from them.
  const effectsRef = useRef<readonly ResolvedEffect[]>([])
  const activeRef = useRef<readonly string[]>([])

  // Where a settled roll is written (MYDND-27). A dependency of `roll`, not a
  // ref: the host changes only when the campaign does, and a new `roll` then is
  // exactly right — the next roll should land in the new campaign's log.
  const platform = useOptionalPlatform()

  const setEffects = useCallback((effects: readonly ResolvedEffect[], activeKeys: readonly string[]) => {
    effectsRef.current = effects
    activeRef.current = activeKeys
  }, [])

  const roll = useCallback(
    async (request: RollRequest): Promise<RollOutcome | null> => {
      const formula = toFormula(request.expr)
      const label = request.label || formula
      const { dice, modifier } = parseFormula(formula, request.damageType ?? null)

      if (dice.length === 0) {
        new Notice(`Nothing to roll in "${formula}".`)
        return null
      }

      const mode = modeOf(request.modifiers)
      // Advantage is only a d20 thing — Shift-clicking a damage expression
      // rolls it once. The engine would append a d20 to a 2d6 bundle otherwise.
      const effectiveMode = dice.some(d => d.sides === 20) ? mode : 'normal'

      // The modifier rides with the dice so Atlas' popup shows the total
      // (MYDND-75); the engine still totals from the faces it reads back.
      const roller = createAtlasRoller(app, label, request.character ?? null, {
        modifier,
        advantage: effectiveMode === 'normal' ? null : effectiveMode,
      })

      // The campaign is taken when the roll starts, not when it settles: a
      // roll belongs to the session it was thrown in, even if the GM switches
      // campaign while an intervention prompt is open.
      const target = platform
      const campaignId = target?.activeCampaignId ?? null

      /**
       * The one place a roll leaves for `/gm/log` — **one write per roll**.
       * Every path out of `run` goes through here exactly once, after the
       * intervention (if any) is answered, so an accepted reroll is one line
       * with `from` on it rather than two lines that disagree.
       *
       * No campaign, no write — the log is per campaign and every other writer
       * skips the same way. A failed write is said and swallowed: the roll has
       * already happened, and the caller is owed its outcome regardless.
       */
      const settle = (final: RollLogEntry, outcome: RollOutcome): RollOutcome => {
        if (target && campaignId) {
          target.activity.append(campaignId, rollActivity(final)).catch((error: unknown) => {
            new Notice(`Could not write the roll to the session log: ${(error as Error).message}`)
          })
        }
        return outcome
      }

      async function run(): Promise<RollOutcome | null> {
        // `resolveRoll` falls back to `rngRoller` when the roller declines, by
        // design — so a roll always happens. The only way to know which
        // answered is to ask Atlas separately, which is what `simulated` is.
        let simulated = false
        const watched = async (groups: Parameters<typeof roller>[0]) => {
          const result = await roller(groups)
          if (result === null) simulated = true
          return result
        }

        // `resolveRoll` answers the groups it was given with their results; the
        // adapter's `RollState` is its own, stricter spelling of the same object.
        const resolved = (await resolveRoll({ dice, mode: effectiveMode, modifier }, { roller: watched })) as RollState

        const entryId = newRollId()
        const entry = logEntry({
          id: entryId,
          label,
          dice: resolved.dice,
          modifier,
          total: resolved.total,
          mode: effectiveMode,
          character: request.character?.name ?? null,
          simulated,
        })
        setLog(current => appendRoll(current, entry))

        if (simulated) {
          // Said once, here, rather than by every call site. The roll is real;
          // it just did not land on a table.
          new Notice(`${describeRoll(entry)} — no Atlas scene, rolled locally.`)
        } else if (effectiveMode !== 'normal') {
          new Notice(describeRoll(entry))
        }

        // The ~400ms reveal wait has already happened inside the roller, so
        // anything from here on arrives after the player can see the faces.
        // That ordering is this phase's done-when and it is structural.
        const offers = offersFor(resolved, effectsRef.current, {
          rollType: request.rollType ?? null,
          activeKeys: activeRef.current,
          modifier,
        })
        if (offers.length === 0) return settle(entry, outcomeOf(resolved, effectiveMode, simulated))

        // The head of the list, and only the head: at most one intervention per
        // roll, in bake order. Ranking by gain would be the app choosing which
        // of a player's feats they use.
        const offer = offers[0]

        // **The promise is held open across the prompt** (MYDND-16). An
        // intervention changes the total, so resolving before the player has
        // answered would hand a caller a number the log then contradicts — and
        // the one thing the roll log exists to guarantee is that what it shows
        // is what happened. A declined offer resolves with the roll as thrown.
        return await new Promise<RollOutcome>(resolve => {
          const close = (): void => setPending(null)
          setPending({
            offer,
            entryId,
            decline: () => {
              close()
              resolve(settle(entry, outcomeOf(resolved, effectiveMode, simulated)))
            },
            accept: () => {
              close()
              void (async () => {
                // A re-throw is one die (`reroll`) or the whole bundle again
                // (`twice`). Only the bundle is a roll in its own right with a
                // total to show; one die plus the modifier would put a number
                // on the table that is nobody's total.
                const rethrow = createAtlasRoller(app, `${label} — ${offer.source ?? 'reroll'}`, request.character ?? null, {
                  modifier: offer.mode === 'twice' ? modifier : 0,
                })
                const { roll: next, applied } = await applyOffer(resolved, offer, rethrow)
                if (!applied) {
                  new Notice('No Atlas scene to re-throw in — the roll stands.')
                  resolve(settle(entry, outcomeOf(resolved, effectiveMode, simulated)))
                  return
                }
                const record = interventionRecord(offer, resolved, next)
                const updated = logEntry({
                  id: entryId,
                  label,
                  dice: next.dice,
                  modifier,
                  total: next.total,
                  mode: effectiveMode,
                  character: request.character?.name ?? null,
                  simulated,
                  intervention: record,
                  at: entry.at,
                })
                // Replaced in place rather than appended: it is the same roll,
                // and two entries would make one attack look like two.
                setLog(current => current.map(e => (e.id === entryId ? updated : e)))
                new Notice(`${offer.source ?? 'Intervention'}: ${record.from} → ${record.to}`)
                resolve(settle(updated, outcomeOf(next, effectiveMode, simulated)))
              })()
            },
          })
        })
      }

      return await run()
    },
    [app, platform],
  )

  const host = useMemo<RollHost>(
    () => ({ roll, log, clearLog: () => setLog([]), pending, setEffects }),
    [roll, log, pending, setEffects],
  )

  return <RollCtx.Provider value={host}>{children}</RollCtx.Provider>
}

/**
 * The roll host.
 *
 * Falls back to a **no-op host** rather than throwing when there is no provider,
 * which is the opposite of the domain hooks (`useCompendium`, `useCharacters`,
 * …) — and deliberately so. Those answer "is the plugin wired up"; a missing `RollProvider` would
 * take out every catalog page that happens to contain a number, and a catalog is
 * not about rolling. The fallback refuses rather than pretending, so a test that
 * exercises a roll without a provider sees nothing happen rather than a pass.
 */
export function useRollHost(): RollHost {
  const host = useContext(RollCtx)
  return host ?? FALLBACK
}

const FALLBACK: RollHost = {
  // `null`, not a fabricated outcome: refusing is the point of the fallback, and
  // a caller that reads a total must not be handed a plausible one from a host
  // that never rolled anything.
  roll: () => Promise.resolve(null),
  log: [],
  clearLog: () => {},
  pending: null,
  setEffects: () => {},
}

/**
 * A resolved roll, as a caller sees it.
 *
 * `faces` flattens the groups because a caller asking for a number is not
 * asking about grouping — the log keeps the structure. `dropped` stays separate
 * from `faces` for the reason the log keeps them separate: a discarded die was
 * thrown and set aside, and adding it to the faces would make a disadvantaged
 * d20 look like 2d20.
 */
function outcomeOf(state: RollState, mode: RollMode, simulated: boolean): RollOutcome {
  return {
    total: state.total,
    faces: state.dice.flatMap(group => group.results),
    dropped: state.dice.flatMap(group => group.dropped ?? []),
    modifier: state.modifier,
    mode,
    simulated,
  }
}
