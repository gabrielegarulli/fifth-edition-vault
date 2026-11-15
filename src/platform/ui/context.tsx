import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import type { Activity } from '../store/activity'
import type { Campaign, Campaigns } from '../store/campaigns'
import { useCatalogRows } from './hooks/useVaultGeneration'

/**
 * What every domain may read about the campaign in play: the campaigns, the
 * activity log and session notes, and **which campaign is active** (MYDND-199).
 *
 * The stored choice is the one piece of real state here, and only a little:
 * a per-machine choice that lives in the plugin's `data.json` rather than in a
 * note (see `state/campaigns.ts` for where that line is drawn and why). The
 * stores themselves are stateless; everything they change is in the vault, and
 * the vault's change events — `useVaultGeneration` — tell React to re-read. So
 * there is no cache to invalidate and no second copy of a campaign's settings
 * that could disagree with its note.
 *
 * The bottom of the order above `derive`, so the dice, the GM surfaces and
 * harvesting all read the campaign from here without depending on each other.
 */
export interface PlatformHost {
  campaigns: Campaigns
  activity: Activity
  /**
   * The campaign in play: the slug every campaign-keyed reader and writer uses
   * (MYDND-204). **Resolved, not stored** — see `resolveCampaignId`. `null`
   * only when there is no answer: no campaign, or several and none chosen.
   */
  activeCampaignId: string | null
  /**
   * The stored choice, as `data.json` (or the web build's `localStorage`) has
   * it: `null` when nobody chose, and possibly a campaign that no longer
   * exists. Only Settings wants this; everything else wants `activeCampaignId`.
   */
  chosenCampaignId: string | null
  setActiveCampaignId: (id: string | null) => void
}

/**
 * Which campaign is in play, given the stored choice (MYDND-204).
 *
 * The chosen campaign when a note by that name exists; otherwise **the only
 * campaign, and never the first of several**. A vault with one campaign should
 * not make the GM choose it; a vault with three and no choice made has no
 * answer, and inventing one is the bug `campaignCodes.listAll` was written to
 * fix — the web app read `limit(1)` for years, so a second campaign was
 * invisible and the active one could not be picked.
 *
 * A choice naming a missing campaign — its note renamed or deleted — answers
 * like no choice, rather than sending the log and the encounter to a folder no
 * campaign owns.
 *
 * Resolved **once, here**, because it used to be resolved in one hook and read
 * raw everywhere else: with one campaign and no choice, Home named the campaign
 * and priced at its rules while the log, the encounter and every roll said none
 * was active and silently skipped their writes.
 */
export function resolveCampaignId(campaigns: readonly Campaign[], chosen: string | null): string | null {
  if (chosen !== null && campaigns.some(c => c.id === chosen)) return chosen
  return campaigns.length === 1 ? campaigns[0].id : null
}

const PlatformContext = createContext<PlatformHost | null>(null)

export function PlatformProvider({
  campaigns,
  activity,
  initialCampaignId,
  onCampaignChange,
  subscribeCampaign,
  children,
}: {
  campaigns: Campaigns
  activity: Activity
  initialCampaignId: string | null
  /**
   * Persist the choice. Injected rather than taking the `Plugin` so this
   * provider — and every page under it — mounts in the test harness without
   * one.
   */
  onCampaignChange: (id: string | null) => void
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
  children: ReactNode
}) {
  const [chosenCampaignId, setActive] = useState(initialCampaignId)
  // Over `useCatalogRows` so the answer follows a campaign note being created,
  // renamed or deleted. `useCampaigns` reads the same memo; this cannot call it,
  // because it reads the host this provider is building.
  const all = useCatalogRows(() => campaigns.list())
  const activeCampaignId = resolveCampaignId(all, chosenCampaignId)

  // The listener sets state from a callback, not from the effect's body.
  useEffect(() => subscribeCampaign?.(setActive), [subscribeCampaign])

  const host = useMemo<PlatformHost>(
    () => ({
      campaigns,
      activity,
      activeCampaignId,
      chosenCampaignId,
      setActiveCampaignId: id => {
        setActive(id)
        onCampaignChange(id)
      },
    }),
    [campaigns, activity, activeCampaignId, chosenCampaignId, onCampaignChange],
  )

  return <PlatformContext.Provider value={host}>{children}</PlatformContext.Provider>
}

/** Deliberately not defaulted to a stub — a missing provider is a wiring bug. */
export function usePlatform(): PlatformHost {
  const host = useContext(PlatformContext)
  if (!host) throw new Error('usePlatform must be used inside a PlatformProvider')
  return host
}

/**
 * The host, or `null` with no provider — for the one consumer that is
 * legitimately useful without one.
 *
 * That consumer is `RollProvider` (MYDND-27). Rolling is complete without a
 * campaign; writing the roll into `/gm/log` is the extra. Throwing here would
 * make every roll depend on a session log, which is the wrong way round.
 */
export function useOptionalPlatform(): PlatformHost | null {
  return useContext(PlatformContext)
}
