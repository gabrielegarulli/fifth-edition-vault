import {
  addCombatants,
  EMPTY_ENCOUNTER,
  makeCombatant,
} from '@vault/derive/combatant.js'
import { nextTurn, previousTurn, removeCombatant, sortCombatants } from '@vault/derive/initiative.js'

import { extractFence, fromYaml, parseNote, serialiseNote, setFence } from '../../platform'
import type { StateVault } from '../../platform'

/**
 * The encounter — one note per campaign, replaced in place.
 *
 * ## It decides nothing
 *
 * Every rule is `@vault/derive`'s: `makeCombatant` normalises a row,
 * `addCombatants` deduplicates, `sortCombatants` is the turn order,
 * `nextTurn`/`previousTurn` walk it, `removeCombatant` keeps the pointer
 * straight when the active combatant dies. This module is storage, and if
 * something here starts looking like a rule it belongs upstream.
 *
 * ## One note, overwritten — not a note per encounter
 *
 * The opposite choice from the harvest log, and for the opposite reason. A
 * harvest is a *record*: it happened, and the point is to still have it in six
 * months. An encounter is *working state* — a pointer into a turn order that is
 * meaningless once the fight ends — so a note per encounter would be a folder
 * filling with half-finished initiative lists nobody will read.
 *
 * What is worth keeping about a fight goes in the activity log, which is where
 * `/gm/log` reads it from.
 *
 * ## `publicCombatant` is not used, and that is the single-player decision
 *
 * It exists to strip a monster's hit points before players see them. With one
 * seat there is nobody to hide them from, so the GM view is the only view. It is
 * still the right place to ask the question, so nothing here reimplements it —
 * and if Atlas ever ships an online mode, that is the function to reach for.
 */

export const ENCOUNTERS_FOLDER = 'encounters'
export const ENCOUNTER_FENCE = 'vault-encounter'

export interface Combatant {
  id: string
  name: string
  kind: 'pc' | 'monster' | 'other'
  characterId: string | null
  monsterId: string | null
  tokenId: string | null
  initiative: number | null
  dexMod: number
  hp: number
  maxHp: number
  tempHp: number
  ac: number | null
  imageUrl: string | null
}

export interface EncounterState {
  combatants: Combatant[]
  turnIndex: number
  round: number
  started: boolean
}

export interface EncounterStore {
  read(campaignId: string): Promise<EncounterState>
  /** Apply a pure transform and write it. One mutation, one file write. */
  mutate(campaignId: string, transform: (state: EncounterState) => EncounterState): Promise<EncounterState>
}

export const emptyEncounter = (): EncounterState => ({
  ...(EMPTY_ENCOUNTER as EncounterState),
  combatants: [],
})

/**
 * Read an encounter fence.
 *
 * **A reader degrades.** A malformed fence is an empty encounter rather than an
 * exception: a tracker that refuses to open mid-fight is worse than one that has
 * forgotten the order, and the GM can re-add the party in two clicks.
 */
export function parseEncounter(text: string | null | undefined): EncounterState {
  if (!text) return emptyEncounter()
  let parsed: unknown
  try {
    parsed = fromYaml(text)
  } catch {
    return emptyEncounter()
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyEncounter()

  const raw = parsed as Record<string, unknown>
  const list = Array.isArray(raw.combatants) ? raw.combatants : []
  // Through `makeCombatant`, so every field is present even when null — the
  // reason that function exists, and what stops every reader guarding each key.
  const combatants = list.map(c => makeCombatant(c) as Combatant)
  const round = Number(raw.round)
  const turnIndex = Number(raw.turn_index ?? raw.turnIndex)

  return {
    combatants,
    // Clamped to the list, because a pointer past the end is how a tracker
    // shows nobody's turn and gives no way back.
    turnIndex:
      Number.isFinite(turnIndex) && combatants.length > 0
        ? Math.max(0, Math.min(combatants.length - 1, Math.floor(turnIndex)))
        : 0,
    round: Number.isFinite(round) && round > 0 ? Math.floor(round) : 1,
    started: raw.started === true,
  }
}

export function serialiseEncounter(state: EncounterState): Record<string, unknown> {
  return {
    round: state.round,
    turn_index: state.turnIndex,
    started: state.started,
    combatants: state.combatants.map(c => ({ ...c })),
  }
}

export function extractEncounterFromNote(markdown: string): EncounterState {
  return parseEncounter(extractFence(markdown, ENCOUNTER_FENCE))
}

export function createEncounters(vault: StateVault): EncounterStore {
  const pathFor = (campaignId: string): string => `${ENCOUNTERS_FOLDER}/${campaignId}.md`

  const read = async (campaignId: string): Promise<EncounterState> => {
    const markdown = await vault.read(pathFor(campaignId))
    return extractEncounterFromNote(markdown ?? '')
  }

  const mutate = async (
    campaignId: string,
    transform: (state: EncounterState) => EncounterState,
  ): Promise<EncounterState> => {
    let result: EncounterState | null = null
    await vault.write(pathFor(campaignId), markdown => {
      const next = transform(extractEncounterFromNote(markdown))
      result = next
      const doc = parseNote(markdown)
      return serialiseNote({
        frontmatter: {
          ...doc.frontmatter,
          title: campaignId,
          campaign: campaignId,
          // Flat and filterable, so a Base can answer "is a fight running" from
          // frontmatter alone, with no fence parsing.
          round: next.round,
          started: next.started,
          combatant_count: next.combatants.length,
        },
        body: setFence(doc.body, ENCOUNTER_FENCE, serialiseEncounter(next)),
      })
    })
    if (result === null) throw new Error(`Nothing was written to ${pathFor(campaignId)}`)
    return result
  }

  return { read, mutate }
}

// ---------------------------------------------------------------------------
// The transforms. All pure, all over `@vault/derive`'s rules.
// ---------------------------------------------------------------------------

export function addToEncounter(state: EncounterState, incoming: Partial<Combatant>[]): EncounterState {
  return { ...state, combatants: addCombatants(state.combatants, incoming) as Combatant[] }
}

export function removeFromEncounter(state: EncounterState, id: string): EncounterState {
  // `removeCombatant` returns the corrected pointer as well as the list, which
  // is the whole reason not to splice the array here: removing the combatant
  // whose turn it is has to move the pointer, and removing one *before* them has
  // to move it too, by one, or the turn silently jumps.
  const next = removeCombatant(state.combatants, id, state.turnIndex) as {
    combatants: Combatant[]
    turnIndex: number
  }
  return { ...state, combatants: next.combatants, turnIndex: next.turnIndex }
}

export function setInitiative(state: EncounterState, id: string, initiative: number | null): EncounterState {
  return {
    ...state,
    combatants: state.combatants.map(c => (c.id === id ? { ...c, initiative } : c)),
  }
}

export function setCombatantHp(state: EncounterState, id: string, hp: number): EncounterState {
  return {
    ...state,
    combatants: state.combatants.map(c =>
      c.id === id ? { ...c, hp: Math.max(0, Math.min(c.maxHp > 0 ? c.maxHp : hp, Math.floor(hp))) } : c,
    ),
  }
}

/** Sort into turn order and start. Round 1, first combatant. */
export function startEncounter(state: EncounterState): EncounterState {
  return {
    ...state,
    combatants: sortCombatants(state.combatants) as Combatant[],
    turnIndex: 0,
    round: 1,
    started: true,
  }
}

export function advanceTurn(state: EncounterState): EncounterState {
  if (state.combatants.length === 0) return state
  const next = nextTurn({ turnIndex: state.turnIndex, round: state.round, count: state.combatants.length }) as {
    turnIndex: number
    round: number
  }
  return { ...state, ...next }
}

export function rewindTurn(state: EncounterState): EncounterState {
  if (state.combatants.length === 0) return state
  const next = previousTurn({
    turnIndex: state.turnIndex,
    round: state.round,
    count: state.combatants.length,
  }) as { turnIndex: number; round: number }
  return { ...state, ...next }
}

/**
 * End the fight.
 *
 * **It clears the combatants.** An ended encounter that kept its list would be
 * indistinguishable from a paused one, and the next fight would start with the
 * last fight's goblins in it. What is worth keeping about the fight is in the
 * activity log by then.
 */
export function endEncounter(): EncounterState {
  return emptyEncounter()
}
