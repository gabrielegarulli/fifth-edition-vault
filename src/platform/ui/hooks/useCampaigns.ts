import { CAMPAIGN_VALUE_PERCENT_DEFAULT } from '@vault/derive/campaignPricing.js'

import type { Campaign } from '../../store/campaigns'
import { usePlatform } from '../context'
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
  const { campaigns } = usePlatform()
  return useCatalogRows(() => campaigns.list())
}

/**
 * The campaign whose rules are in play, or `null`.
 *
 * A lookup of the provider's `activeCampaignId`, which is already resolved —
 * the chosen campaign, else the only one, never the first of several
 * (`resolveCampaignId`). It used to do that resolving itself while every other
 * reader took the raw choice, which is how Home and the log came to disagree
 * (MYDND-204); now there is one answer and this is its row.
 *
 * It returns `null` rather than a default-shaped campaign so that a surface
 * which needs one can say so. The one caller that only wants the economy uses
 * `useCampaignValuePercent` below, where "no campaign" has a correct answer.
 */
export function useActiveCampaign(): Campaign | null {
  const { activeCampaignId } = usePlatform()
  const campaigns = useCampaigns()
  return campaigns.find(c => c.id === activeCampaignId) ?? null
}

/**
 * What the magic economy runs at, as a whole percent of the book's prices.
 *
 * 100 — the book — when there is no campaign or none is chosen, which is
 * `campaignPricing.js`'s own default and means an untouched vault prices
 * exactly as it did before any of this existed.
 */
export function useCampaignValuePercent(): number {
  return useActiveCampaign()?.magicItemValuePercent ?? (CAMPAIGN_VALUE_PERCENT_DEFAULT)
}
