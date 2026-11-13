import { useCallback, useEffect, useMemo, useState } from 'react'

import type { ActivityEntry, SessionNoteRow } from '../../../platform'
import type { EncounterState } from '../../store/encounter'
import { dayKey } from '../../../platform'
import { emptyEncounter } from '../../store/encounter'
import { useGmStores } from '../context'
import { usePlatform, useVaultGeneration } from '../../../platform/host'

/**
 * The GM surfaces' data, keyed by the active campaign.
 *
 * **Everything here waits for a campaign**, which is the one trap
 * `docs/lessons/gm-and-session.md` names in the web app: anything keyed by the
 * active campaign that does not wait mounts under a `'none'` key and then never
 * re-reads. There is no `campaignsLoaded` flag here because campaigns come out
 * of `metadataCache` synchronously — but `activeCampaignId` can still be `null`
 * when nobody has chosen one, and that is the case every hook below returns
 * empty for *and says so*, rather than inventing a campaign.
 *
 * Loading is derived from the vault generation, the same shape as `useDetail`,
 * `useRoster` and `useVitals`.
 */

export interface GmLogState {
  entries: ActivityEntry[]
  days: string[]
  today: string
  loading: boolean
  append(entry: { kind: ActivityEntry['kind']; text: string; character?: string | null }): void
}

export function useActivityLog(limitDays = 14): GmLogState {
  const { activity, activeCampaignId } = usePlatform()
  const generation = useVaultGeneration()
  const [loaded, setLoaded] = useState<{ key: string; entries: ActivityEntry[] } | null>(null)

  const key = `${activeCampaignId ?? ''}:${generation}`

  useEffect(() => {
    if (!activeCampaignId) return
    const campaign = activeCampaignId
    let cancelled = false
    async function run() {
      const entries = await activity.recent(campaign, limitDays)
      if (!cancelled) setLoaded({ key, entries })
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [activeCampaignId, key, activity, limitDays])

  const append = useCallback(
    (entry: { kind: ActivityEntry['kind']; text: string; character?: string | null }) => {
      if (!activeCampaignId) return
      void activity.append(activeCampaignId, entry)
    },
    [activeCampaignId, activity],
  )

  const ready = activeCampaignId === null || loaded?.key === key
  return {
    entries: activeCampaignId === null ? [] : (loaded?.entries ?? []),
    days: activeCampaignId === null ? [] : activity.days(activeCampaignId),
    today: dayKey(new Date()),
    loading: !ready,
    append,
  }
}

export interface GmSessionsState {
  sessions: SessionNoteRow[]
  create(title?: string, session?: number | null): Promise<string | null>
}

export function useSessions(): GmSessionsState {
  const { activity, activeCampaignId } = usePlatform()
  const generation = useVaultGeneration()

  // Synchronous — session notes are listed from frontmatter, so this costs no
  // file I/O and needs no loading state. Memoised per vault generation, because
  // `sessions()` walks the folder and a render must not.
  const sessions = useMemo(
    () => activity.sessions(activeCampaignId),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `generation` is the cache key
    [activity, activeCampaignId, generation],
  )

  const create = useCallback(
    async (title?: string, session?: number | null) =>
      activity.createSession({ campaignId: activeCampaignId, title, session }),
    [activity, activeCampaignId],
  )

  return { sessions, create }
}

export interface GmEncounterState {
  encounter: EncounterState
  loading: boolean
  busy: boolean
  /** Apply a pure transform from `gm/store/encounter.ts` and write it. */
  update(transform: (state: EncounterState) => EncounterState): void
}

export function useEncounter(): GmEncounterState {
  const { activeCampaignId } = usePlatform()
  const { encounters } = useGmStores()
  const generation = useVaultGeneration()
  const [loaded, setLoaded] = useState<{ key: string; value: EncounterState } | null>(null)
  const [busy, setBusy] = useState(false)

  const key = `${activeCampaignId ?? ''}:${generation}`

  useEffect(() => {
    if (!activeCampaignId) return
    const campaign = activeCampaignId
    let cancelled = false
    async function run() {
      const value = await encounters.read(campaign)
      if (!cancelled) setLoaded({ key, value })
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [activeCampaignId, key, encounters])

  const update = useCallback(
    (transform: (s: EncounterState) => EncounterState) => {
      if (!activeCampaignId || busy) return
      setBusy(true)
      void encounters
        .mutate(activeCampaignId, transform)
        .finally(() => setBusy(false))
    },
    [activeCampaignId, busy, encounters],
  )

  const ready = activeCampaignId === null || loaded?.key === key
  return {
    encounter: (activeCampaignId === null ? null : loaded?.value) ?? emptyEncounter(),
    loading: !ready,
    busy,
    update,
  }
}
