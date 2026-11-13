import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import type { Activity } from '../store/activity'
import type { Campaigns } from '../store/campaigns'

/**
 * What every domain may read about the campaign in play: the campaigns, the
 * activity log and session notes, and **which campaign is active** (MYDND-199).
 *
 * `activeCampaignId` is the one piece of real state here, and only a little:
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
  /** The active campaign's slug, or `null` when none has been chosen. */
  activeCampaignId: string | null
  setActiveCampaignId(id: string | null): void
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
  children: ReactNode
}) {
  const [activeCampaignId, setActive] = useState(initialCampaignId)

  // The listener sets state from a callback, not from the effect's body.
  useEffect(() => subscribeCampaign?.(setActive), [subscribeCampaign])

  const host = useMemo<PlatformHost>(
    () => ({
      campaigns,
      activity,
      activeCampaignId,
      setActiveCampaignId: id => {
        setActive(id)
        onCampaignChange(id)
      },
    }),
    [campaigns, activity, activeCampaignId, onCampaignChange],
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
