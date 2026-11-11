/**
 * Every destination the plugin will eventually have, and the phase that brings
 * it in. One list, read by the nav and by the route dispatch — the same
 * arrangement as `apps/vault/src/components/navItems.js`.
 *
 * `/login` is deliberately absent. There is no auth: the vault is the auth.
 * The `/gm/*` broadcast surfaces are absent for the same kind of reason —
 * single-player has nobody to broadcast to, so `campaign_note`'s `kind` column
 * collapses and `/gm/notes` is session notes only.
 *
 * **`/map` is absent, and that is a closed decision rather than a gap** (MYDND-14).
 * The campaign map's whole point in `apps/vault` was *shared* fog —
 * `campaign_map_state` holds the revealed set because the GM reveals and the
 * players watch — and single-player removes the half that justified building it.
 * Maps in this toolchain belong to the **Atlas VTT plugin**, which is already the
 * host for a scene and already where the dice land. It was listed here at phase 5
 * and rendered a stub; a tile that permanently promises a phase that has shipped
 * is worse than no tile. `hexGrid.js` and `perilousShores.js` are still in
 * `@vault/derive` if anyone ever wants a single-seat version.
 *
 * **`/inventory` is absent too** (MYDND-159). A bag lives on the character sheet's
 * Inventory tab, and items change hands there with Give.
 */
export type Phase = 0 | 1 | 2 | 3 | 4 | 5

export interface Destination {
  path: string
  label: string
  /** Obsidian's bundled Lucide icon name. */
  icon: string
  phase: Phase
  /** Which of the narrow nav's groups it is listed under (MYDND-122). */
  group: NavGroup
}

/**
 * The narrow nav's groups (MYDND-122). Seventeen buttons wrapped onto four
 * rows of a phone before any page showed, so under `NARROW_NAV_WIDTH` the nav
 * is five tabs along the bottom, and a group's own pages are one strip of
 * chips under the header.
 *
 * Home, Library, Heroes and Table are tabs. Workshop and Vault are reached from
 * More, which lists every group, so every destination is one tap from any page.
 */
export type NavGroup = 'home' | 'library' | 'heroes' | 'table' | 'workshop' | 'vault'

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  home: 'Home',
  library: 'Library',
  heroes: 'Heroes',
  table: 'Table',
  workshop: 'Workshop',
  vault: 'Vault',
}

const ALL_DESTINATIONS: Destination[] = [
  { path: '/', label: 'Home', icon: 'home', phase: 0, group: 'home' },

  // Phase 2 — the read-only catalogs. First real import.
  { path: '/spells', label: 'Spells', icon: 'sparkles', phase: 2, group: 'library' },
  { path: '/feats', label: 'Feats', icon: 'award', phase: 2, group: 'library' },
  { path: '/items', label: 'Items', icon: 'package', phase: 2, group: 'library' },
  { path: '/magic-items', label: 'Magic Items', icon: 'wand', phase: 2, group: 'library' },
  { path: '/monsters', label: 'Bestiary', icon: 'paw-print', phase: 2, group: 'library' },
  { path: '/classes', label: 'Classes', icon: 'graduation-cap', phase: 2, group: 'library' },

  // Arrived early, with MYDND-7: the roster and the sheet came across from
  // `obsidian-vault-characters` rather than being built here, so Phase 4's
  // remaining work is the rest of the sheet (HP, rests, XP) and the roll log.
  { path: '/characters', label: 'Characters', icon: 'users', phase: 4, group: 'heroes' },

  // Phase 5 — the workflows and the GM surfaces (MYDND-11 onward).
  { path: '/harvesting', label: 'Harvesting', icon: 'scissors', phase: 5, group: 'workshop' },
  { path: '/crafting', label: 'Crafting', icon: 'hammer', phase: 5, group: 'workshop' },
  { path: '/gm/party', label: 'Party', icon: 'users-round', phase: 5, group: 'table' },
  { path: '/gm/encounter', label: 'Encounter', icon: 'swords', phase: 5, group: 'table' },
  { path: '/gm/shop', label: 'Shop', icon: 'coins', phase: 5, group: 'table' },
  { path: '/gm/log', label: 'Log', icon: 'scroll-text', phase: 5, group: 'table' },
  { path: '/gm/notes', label: 'Notes', icon: 'notebook-pen', phase: 5, group: 'table' },

  // Pulled forward into phase 3 (MYDND-5) with only its campaign section: the
  // three rules a campaign plays by are state, and a setting with no way to
  // change it is an abstraction. Everything else `the-vault`'s SettingsPage
  // carries — the GM surfaces, the player roster — stays in phase 5.
  { path: '/settings', label: 'Settings', icon: 'settings', phase: 3, group: 'vault' },
]

export const NON_SRD_PATHS: ReadonlySet<string> = new Set(['/harvesting', '/crafting'])

export const DESTINATIONS: Destination[] = ALL_DESTINATIONS.filter(d => !NON_SRD_PATHS.has(d.path))

/**
 * The order of the one-line nav on a wide pane and in the web build's bar
 * (MYDND-122): Characters first, as the page most opened at the table, then the
 * rest as listed. Whatever does not fit goes under More from the end.
 */
export const ROW_ORDER: Destination[] = [
  ...DESTINATIONS.filter(d => d.path === '/characters'),
  ...DESTINATIONS.filter(d => d.path !== '/characters'),
]

export const destinationFor = (pathname: string): Destination | undefined =>
  DESTINATIONS.find(d => d.path === pathname)

/**
 * The parameterised routes. They live here rather than in their pages so the
 * tab title below can read them without importing a React component into a
 * file the `logic` project tests.
 *
 * `/characters/new` creates; `/characters/edit/<encoded note path>` edits; any
 * other `/characters/<encoded note path>` is a sheet. The builder's two share
 * the sheet's prefix, so they are always matched first.
 */
export const CHARACTER_SHEET_PREFIX = '/characters/'
export const BUILDER_NEW_PATH = '/characters/new'
export const BUILDER_EDIT_PREFIX = '/characters/edit/'

/**
 * `/characters/convert/<ddb id>` reviews a D&D Beyond import before it is
 * written as a Vault character; `/characters/convert/<ddb id>/<encoded note
 * path>` converts that note in place (MYDND-105). Matched before the sheet.
 */
export const CONVERT_PREFIX = '/characters/convert/'

export const sheetPath = (notePath: string): string => CHARACTER_SHEET_PREFIX + encodeURIComponent(notePath)
export const builderEditPath = (notePath: string): string => BUILDER_EDIT_PREFIX + encodeURIComponent(notePath)

/**
 * The builder's Edit, opened on its Spells step — where the level-up panel
 * sends a level that brings new spells to choose (MYDND-127). A hash, so the
 * pathname the pages dispatch on is the plain edit path.
 */
export const SPELLS_STEP_HASH = '#spells'
export const builderSpellsPath = (notePath: string): string => builderEditPath(notePath) + SPELLS_STEP_HASH
export const convertPath = (ddbId: string, notePath?: string | null): string =>
  CONVERT_PREFIX + encodeURIComponent(ddbId) + (notePath ? `/${encodeURIComponent(notePath)}` : '')

/**
 * The nav group a route belongs to. A sheet, the builder and a conversion are
 * Heroes pages, though no destination names them. `undefined` is a path nothing
 * claims, which lights no tab.
 */
export function groupFor(pathname: string): NavGroup | undefined {
  return destinationFor(pathname)?.group ?? (pathname.startsWith(CHARACTER_SHEET_PREFIX) ? 'heroes' : undefined)
}

/** The D&D Beyond id and note a convert route names, or null for any other route. */
export function parseConvertPath(pathname: string): { ddbId: string; notePath: string | null } | null {
  if (!pathname.startsWith(CONVERT_PREFIX)) return null
  const [id, note] = pathname.slice(CONVERT_PREFIX.length).split('/')
  try {
    const ddbId = decodeURIComponent(id ?? '')
    return ddbId ? { ddbId, notePath: note ? decodeURIComponent(note) : null } : null
  } catch {
    return null
  }
}

/** The tab's title when nothing better is known — what the one pane was called. */
export const PLUGIN_TITLE = 'Fifth Edition Vault'

/** A note path's file name, which is the character's name as the roster shows it. */
const noteName = (encoded: string): string => {
  let path: string
  try {
    path = decodeURIComponent(encoded)
  } catch {
    // A malformed escape is a path someone typed, not one the app built.
    path = encoded
  }
  return (path.split('/').pop() ?? path).replace(/\.md$/i, '')
}

/**
 * What an Obsidian tab showing `pathname` is called, and its icon (MYDND-61).
 *
 * Once a section can be its own tab — pinned beside three others — "My D&D
 * Vault" on every one of them stops saying which is which. A sheet is named for
 * the character, read off the note path rather than the note, so the title is
 * there before the roster has loaded and costs no vault read.
 */
export function tabFor(path: string): { title: string; icon: string } {
  // A tab opened on `builderSpellsPath` holds the hash until its router reports the pathname.
  const pathname = path.split('#')[0]
  const destination = destinationFor(pathname)
  if (destination) return { title: destination.label, icon: destination.icon }
  if (pathname === BUILDER_NEW_PATH) return { title: 'New character', icon: 'user-plus' }
  if (pathname.startsWith(CONVERT_PREFIX)) return { title: 'Import from D&D Beyond', icon: 'download' }
  if (pathname.startsWith(BUILDER_EDIT_PREFIX)) {
    return { title: `Edit ${noteName(pathname.slice(BUILDER_EDIT_PREFIX.length))}`, icon: 'pencil' }
  }
  if (pathname.startsWith(CHARACTER_SHEET_PREFIX) && pathname.length > CHARACTER_SHEET_PREFIX.length) {
    return { title: noteName(pathname.slice(CHARACTER_SHEET_PREFIX.length)), icon: 'user' }
  }
  return { title: PLUGIN_TITLE, icon: 'dice-6' }
}

/** Routes that have gone, and where a tab saved on one opens instead. */
const RETIRED_PATHS: Readonly<Record<string, string>> = { '/inventory': '/characters' }

/**
 * The route a tab's saved state names, or Home.
 *
 * `workspace.json` is a file on disk that outlives every version of this
 * plugin, so what comes back is not trusted to be a path at all — a layout
 * saved before MYDND-61 has no `path`, and one hand-edited may have anything.
 * Anything that is not an absolute route opens on Home rather than on the
 * not-found page, and a route since removed opens on what replaced it.
 */
export function restoredPath(state: unknown): string {
  const path = (state as { path?: unknown } | null | undefined)?.path
  if (typeof path !== 'string' || !path.startsWith('/')) return '/'
  return RETIRED_PATHS[path] ?? path
}

/** Where a navigation should open, when not in the pane it was made from. */
export type PaneTarget = 'tab' | 'split' | 'window'

/**
 * Whether a navigation leaves this pane, and for where (MYDND-61).
 *
 * - `mod` is what Obsidian's `Keymap.isModEvent` said about the click: a
 *   modifier asks for a new tab, a split or a window, exactly as it does on a
 *   link in a note. `true` is its "new leaf, any kind" and means a tab.
 * - A **pinned** pane does not change what it shows — that is what pinning a
 *   tab means in Obsidian, where a link clicked in a pinned note opens in
 *   another tab. So a plain navigation from one opens a new tab instead.
 * - Navigating to where the pane already is stays put even when pinned, so the
 *   nav button for the current section does not stamp out a duplicate tab.
 *
 * `null` means navigate here, as before.
 */
export function paneTarget(mod: PaneTarget | boolean, pinned: boolean, samePath: boolean): PaneTarget | null {
  if (mod) return mod === true ? 'tab' : mod
  if (samePath) return null
  return pinned ? 'tab' : null
}
