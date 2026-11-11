import type { ComponentType } from 'react'
import { useLocation } from 'react-router-dom'

import { BUILDER_EDIT_PREFIX, BUILDER_NEW_PATH, CHARACTER_SHEET_PREFIX, destinationFor } from './routes'
import CharactersPage from './pages/CharactersPage'
import CharacterBuilderPage from './pages/CharacterBuilderPage'
import CharacterSheetPage from './pages/CharacterSheetPage'
import ClassesPage from './pages/ClassesPage'
import GmEncounterPage from './pages/GmEncounterPage'
import GmLogPage from './pages/GmLogPage'
import GmNotesPage from './pages/GmNotesPage'
import GmPartyPage from './pages/GmPartyPage'
import GmShopPage from './pages/GmShopPage'
import HomePage from './pages/HomePage'
import FeatsPage from './pages/FeatsPage'
import ItemsPage from './pages/ItemsPage'
import MagicItemsPage from './pages/MagicItemsPage'
import MonstersPage from './pages/MonstersPage'
import SettingsPage from './pages/SettingsPage'
import SpellsPage from './pages/SpellsPage'
import { useElementWidth } from './hooks/useElementWidth'
import { AppBar, type AccountHost } from './ui/AppBar'
import { BlazeBackground } from './ui/BlazeBackground'
import { GroupStrip, NARROW_NAV_WIDTH, TabBar } from './ui/NarrowNav'

/**
 * The frame, and the route dispatch.
 *
 * `apps/vault/src/App.jsx` dispatches on a cascade of `pathname === '…'` checks
 * rather than `<Routes>`/`<Route>`, and that is still what happens here — the
 * cascade is now a lookup in `PAGES`, which is the same decision with the
 * comparisons factored out. It reads a pathname and does not care that there is
 * no URL behind it; `MemoryRouter` (see `view.tsx`) supplies the history.
 *
 * The layout is not the web app's. There is no nav rail on a field of chrome and
 * no inset page sheet — the pane *is* the viewport, and Obsidian's own chrome is
 * already around it. Colours come from Obsidian's CSS variables via Tailwind.
 *
 * **`<main>` no longer scrolls.** It did after Phase 0, which is right for a page
 * read top to bottom and wrong for a catalog: scrolling 1785 spells would carry
 * the filters off the top of the pane. It is now a flex column that clips, and
 * each page scrolls the region it wants to — see `ui/CatalogShell.tsx`. Nothing
 * positions against the window either way, which is the invariant that matters.
 */
const PAGES: Record<string, ComponentType> = {
  '/': HomePage,
  '/spells': SpellsPage,
  '/feats': FeatsPage,
  '/items': ItemsPage,
  '/magic-items': MagicItemsPage,
  '/monsters': MonstersPage,
  '/classes': ClassesPage,
  '/characters': CharactersPage,
  [BUILDER_NEW_PATH]: CharacterBuilderPage,
  '/settings': SettingsPage,
  '/gm/party': GmPartyPage,
  '/gm/encounter': GmEncounterPage,
  '/gm/shop': GmShopPage,
  '/gm/log': GmLogPage,
  '/gm/notes': GmNotesPage,
  ...({}),
}

/**
 * `navInHeader`: the host draws its own bar, `MainNav` in it, so the frame draws
 * none. The web build passes it. The plugin does not, and the frame draws
 * `AppBar` (MYDND-131), whose menu acts through `account`.
 *
 * `embers`: draw the fire behind the pages. The plugin passes its setting; the
 * web build has no such setting, so it stays off there.
 */
export function App({
  navInHeader = false,
  account,
  embers = false,
}: {
  navInHeader?: boolean
  account?: AccountHost
  embers?: boolean
}) {
  const { pathname } = useLocation()
  const destination = destinationFor(pathname)
  // The pane's width, not the screen's (MYDND-122). Unmeasured — jsdom, or
  // the first frame — is 0, and draws the row.
  const [mainRef, width] = useElementWidth<HTMLElement>()
  const narrow = width > 0 && width <= NARROW_NAV_WIDTH
  // The exact-match table first, then the one parameterised route. A character
  // sheet is addressed by its note's *path* — characters are identified by
  // frontmatter and may live anywhere, so there is no folder to make a slug
  // unique against. The page reads the pathname itself; see its own note on why
  // not `useParams`.
  // The builder's edit route and the conversion review share the sheet's
  // prefix, so they are matched first. The SRD edition has no conversion: it
  // fetches from D&D Beyond (MYDND-133).
  const Page =
    PAGES[pathname] ??
    (pathname.startsWith(BUILDER_EDIT_PREFIX)
      ? CharacterBuilderPage
      : (pathname.startsWith(CHARACTER_SHEET_PREFIX)
        ? CharacterSheetPage
        : undefined))

  return (
    <>
      {embers ? <BlazeBackground /> : null}
      {/* Each slot keeps its place when the layout flips, so `<main>` and the
          page inside it are never remounted by a resize. Over 760px the nav is
          in the bar — this one, or the web build's. */}
      {navInHeader ? null : <AppBar narrow={narrow} account={account} />}
      {narrow ? <GroupStrip pathname={pathname} /> : null}

      <main ref={mainRef} className="my-dnd-vault__main">
        {Page ? (
          <Page />
        ) : destination ? (
          <Stub label={destination.label} path={destination.path} phase={destination.phase} />
        ) : (
          <NotFound pathname={pathname} />
        )}
      </main>
      {narrow && <TabBar pathname={pathname} />}
    </>
  )
}

/**
 * The fallback for a destination with no page.
 *
 * **Nothing reaches it today** — every one of `DESTINATIONS`' entries has a
 * `PAGES` key since MYDND-14 dropped `/map`, which was the last stub. It stays
 * because the alternative for a destination added ahead of its page is
 * `NotFound`, and "nothing here" is the wrong sentence for a tile the nav drew.
 */
function Stub({ label, path, phase }: { label: string; path: string; phase: number }) {
  return (
    <div className="my-dnd-vault__scroll p-4">
      <h2 className="text-ui-larger font-bold text-normal">{label}</h2>
      <p className="mt-1 text-muted">
        <code>{path}</code> — arrives in phase {phase}.
      </p>
    </div>
  )
}

function NotFound({ pathname }: { pathname: string }) {
  return (
    <div className="my-dnd-vault__scroll p-4">
      <h2 className="text-ui-larger font-bold text-normal">Nothing here</h2>
      <p className="mt-1 text-muted">
        No destination matches <code>{pathname}</code>.
      </p>
    </div>
  )
}
