import { CAMPAIGN_VALUE_PERCENT_DEFAULT } from '@vault/derive/campaignPricing.js'

import type { Campaign } from '../state/index'
import { useStateHost } from '../StateContext'
import { useCatalogRows } from './useVaultGeneration'

/**
 * Every campaign in the vault, rebuilt only when the vault changes.
 *
 * Through `useCatalogRows` for the same reason the catalogs are: `list()` walks
 * every markdown file. There are rarely more than two campaigns, so the cost is
 * nothing — but the *referential stability* is what the settings page's
 * optimistic overlay keys off, and that matters at any size.
 */
export function useCampaigns(): Campaign[] {
  const { state } = useStateHost()
  return useCatalogRows(() => state.campaigns.list())
}

/**
 * The campaign whose rules are in play, or `null`.
 *
 * **Falls back to the only campaign, and never to the first of several.** A
 * vault with one campaign should not make the GM choose it; a vault with three
 * and no choice made has no answer, and inventing one is the bug
 * `campaignCodes.listAll` was written to fix — the web app read `limit(1)` for
 * years, so a second campaign was invisible and the active one could not be
 * picked. Guessing here would reintroduce exactly that, one layer up.
 *
 * It returns `null` rather than a default-shaped campaign so that a surface
 * which needs one can say so. The one caller that only wants the economy uses
 * `useCampaignValuePercent` below, where "no campaign" has a correct answer.
 */
export function useActiveCampaign(): Campaign | null {
  const { activeCampaignId } = useStateHost()
  const campaigns = useCampaigns()

  const chosen = campaigns.find(c => c.id === activeCampaignId)
  if (chosen) return chosen
  return campaigns.length === 1 ? campaigns[0] : null
}

/**
 * What the magic economy runs at, as a whole percent of the book's prices.
 *
 * 100 — the book — when there is no campaign or none is chosen, which is
 * `campaignPricing.js`'s own default and means an untouched vault prices
 * exactly as it did before any of this existed.
 */
export function useCampaignValuePercent(): number {
  return useActiveCampaign()?.magicItemValuePercent ?? (CAMPAIGN_VALUE_PERCENT_DEFAULT as number)
}
