import { useRouteLink, usePlatform } from '../../platform/host'

/**
 * What a campaign-keyed page shows when no campaign has been chosen.
 *
 * **It says the reason and offers the fix**, rather than rendering an empty
 * list. The web app's own trap, recorded in
 * `the-vault`'s `docs/lessons/gm-and-session.md`, is that anything keyed by
 * the active campaign which does not *wait* for one mounts under a `'none'` key
 * and silently never re-reads — so an empty page here is indistinguishable from
 * a working page with nothing in it.
 *
 * Shared by all five GM surfaces so the sentence is written once: five pages
 * each phrasing "no campaign" slightly differently is how one of them ends up
 * saying something subtly wrong.
 */
export function NoCampaign({ what }: { what: string }) {
  const link = useRouteLink()
  const { campaigns } = usePlatform()
  return (
    <div className="my-dnd-vault__scroll p-4">
      <p className="text-smaller text-muted">
        No campaign is active, and {what} belongs to one.
      </p>
      <p className="mt-2">
        <button type="button" className="btn-ui-primary" {...link('/settings')}>
          Choose a campaign
        </button>
      </p>
      <p className="mt-2 text-smallest text-faint">
        A campaign is a note under <code>{campaigns.folder()}/</code>. Settings can create one.
      </p>
    </div>
  )
}
