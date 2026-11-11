import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import type { ConvertInput } from './obsidian/vaultCharacterActions'
import type { DdbPayload } from './ddb/payload'
import type { State } from './state/index'
import type { SrdNotesHost } from './ui/SrdSetupCard'
import type { VaultCharacterJson } from './vaultCharacter/fence'

/**
 * The state layer, plus the one setting that is not in the vault.
 *
 * `ContentContext` is a plain value because the readers are stateless and there
 * is nothing to synchronise. This one carries a little state, and only a little:
 * **which campaign is active**, which is a per-machine choice and therefore
 * lives in the plugin's `data.json` rather than in a note (see `campaigns.ts`
 * for where that line is drawn and why).
 *
 * The writers themselves are still stateless. Everything they change is in the
 * vault, and the vault's own change events — `useVaultGeneration` — are what
 * tells React to re-read. So there is no store here, no cache to invalidate and
 * no second copy of a campaign's settings that could disagree with its note.
 */
export interface StateHost {
  state: State
  /** The active campaign's slug, or `null` when none has been chosen. */
  activeCampaignId: string | null
  setActiveCampaignId(id: string | null): void
  /**
   * Import or re-sync a character from D&D Beyond (MYDND-7).
   *
   * Injected as a plain function for the same reason `onCampaignChange` is:
   * the real one needs the `Plugin` (for `data.json`) and the host `App` (for
   * the portrait write and the notices), and taking either here would stop
   * every page under this provider from mounting in the test harness.
   *
   * `targetPath` forces the note written, for re-syncing one in place.
   * Resolves to `true` when the character was written.
   */
  importCharacter(ddbId: string, targetPath?: string | null): Promise<boolean>
  /**
   * Bake, project and write a new Vault character from its choices (MYDND-23).
   * Injected for the same reasons as `importCharacter` — it needs the plugin's
   * folder settings and the host `App`. Resolves to the note's path, or `null`
   * when the write was refused (the reason is already on screen).
   *
   * `targetPath` saves over an existing Vault character — the builder's edit
   * mode (MYDND-24) — keeping its `local:` id and its note name.
   */
  saveVaultCharacter(json: VaultCharacterJson, targetPath?: string | null): Promise<string | null>
  /** Re-project a Vault character's charsheet from its own choices. */
  rebuildVaultCharacter(path: string): Promise<boolean>
  /**
   * Fetch a D&D Beyond payload, for the conversion review (MYDND-105). `null`
   * where the host cannot reach D&D Beyond at all — the web build — so the page
   * says so rather than offering a button that cannot work. Throws on a failed
   * fetch, with the reason.
   */
  fetchDdbPayload: ((ddbId: string) => Promise<DdbPayload>) | null
  /**
   * Write a reviewed conversion as a Vault character (MYDND-105). Resolves to the
   * note's path, or `null` when the write was refused (the reason is on screen).
   */
  convertDdbCharacter(input: Omit<ConvertInput, 'savePortrait'>): Promise<string | null>
  /**
   * The SRD edition's notes, installed from the bundle (MYDND-185), for Home's
   * setup card. `null` in the full plugin, the web build and the harness.
   */
  srdNotes: SrdNotesHost | null
}

const StateContext = createContext<StateHost | null>(null)

export function StateProvider({
  state,
  initialCampaignId,
  onCampaignChange,
  subscribeCampaign,
  importCharacter,
  saveVaultCharacter,
  rebuildVaultCharacter,
  fetchDdbPayload,
  convertDdbCharacter,
  srdNotes,
  children,
}: {
  state: State
  initialCampaignId: string | null
  /**
   * Persist the choice. Injected rather than taking the `Plugin` so this
   * provider — and every page under it — mounts in the test harness without
   * one.
   */
  onCampaignChange(id: string | null): void
  /**
   * Hear a campaign change made somewhere else (MYDND-61).
   *
   * Each Obsidian tab mounts its own provider, so with a section per tab there
   * are several copies of `activeCampaignId` — and choosing a campaign in
   * Settings would otherwise leave every other open tab on the old one, writing
   * to it, until it was closed and reopened. The plugin hands each provider the
   * change, the provider that made it included (a repeat of the same id is a
   * no-op). Returns the unsubscribe. Optional so the harness mounts without it.
   */
  subscribeCampaign?: (listener: (id: string | null) => void) => () => void
  /**
   * Import or re-sync a character. Optional so the harness can mount pages
   * without one; the default refuses rather than pretending to succeed, so a
   * test that exercises the button sees a failure rather than a false pass.
   */
  importCharacter?: (ddbId: string, targetPath?: string | null) => Promise<boolean>
  /** Optional, and refusing by default, for the same reason as `importCharacter`. */
  saveVaultCharacter?: (json: VaultCharacterJson, targetPath?: string | null) => Promise<string | null>
  rebuildVaultCharacter?: (path: string) => Promise<boolean>
  /** Absent where D&D Beyond cannot be reached; see `StateHost.fetchDdbPayload`. */
  fetchDdbPayload?: (ddbId: string) => Promise<DdbPayload>
  convertDdbCharacter?: (input: Omit<ConvertInput, 'savePortrait'>) => Promise<string | null>
  /** The SRD edition only; see `StateHost.srdNotes`. */
  srdNotes?: SrdNotesHost
  children: ReactNode
}) {
  const [activeCampaignId, setActive] = useState(initialCampaignId)

  // The listener sets state from a callback, not from the effect's body.
  useEffect(() => subscribeCampaign?.(setActive), [subscribeCampaign])

  const host = useMemo<StateHost>(
    () => ({
      state,
      activeCampaignId,
      setActiveCampaignId: id => {
        setActive(id)
        onCampaignChange(id)
      },
      importCharacter: importCharacter ?? (() => Promise.resolve(false)),
      saveVaultCharacter: saveVaultCharacter ?? (() => Promise.resolve(null)),
      rebuildVaultCharacter: rebuildVaultCharacter ?? (() => Promise.resolve(false)),
      fetchDdbPayload: fetchDdbPayload ?? null,
      convertDdbCharacter: convertDdbCharacter ?? (() => Promise.resolve(null)),
      srdNotes: srdNotes ?? null,
    }),
    [
      state,
      activeCampaignId,
      onCampaignChange,
      importCharacter,
      saveVaultCharacter,
      rebuildVaultCharacter,
      fetchDdbPayload,
      convertDdbCharacter,
      srdNotes,
    ],
  )

  return <StateContext.Provider value={host}>{children}</StateContext.Provider>
}

/** Deliberately not defaulted to a stub — a missing provider is a wiring bug. */
export function useStateHost(): StateHost {
  const host = useContext(StateContext)
  if (!host) throw new Error('useStateHost must be used inside a StateProvider')
  return host
}

/**
 * The host, or `null` with no provider — for the one consumer that is
 * legitimately useful without one.
 *
 * That consumer is `RollProvider` (MYDND-27). Rolling is complete without the
 * state layer; writing the roll into `/gm/log` is the extra. Throwing here
 * would make every roll depend on a session log, which is the wrong way round.
 */
export function useOptionalStateHost(): StateHost | null {
  return useContext(StateContext)
}
