import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'

import { useGo, useRouteLink, Icon, containTab, focusFirstButton, useFocusReturn } from '../../platform/host'
import { DESTINATIONS, groupFor, NAV_GROUP_LABELS, type NavGroup } from '../../platform'

/**
 * At this width and under, the nav is a tab bar along the bottom instead of a
 * row of seventeen buttons along the top (MYDND-122). Measured on the pane,
 * never the screen: an Obsidian pane is narrow on a wide monitor. 760px takes
 * in a tablet held upright, where the row still wrapped onto two lines.
 */
export const NARROW_NAV_WIDTH = 760

interface Tab {
  label: string
  icon: string
  /** The group the tab opens; More opens the sheet instead. */
  group: NavGroup | null
}

const TABS: Tab[] = [
  { label: 'Home', icon: 'home', group: 'home' },
  { label: 'Library', icon: 'book-open', group: 'library' },
  { label: 'Heroes', icon: 'users', group: 'heroes' },
  { label: 'Table', icon: 'swords', group: 'table' },
  { label: 'More', icon: 'layout-grid', group: null },
]

/** The groups the sheet lists, in the order it lists them. */
const SHEET_GROUPS: NavGroup[] = ['library', 'heroes', 'table', 'workshop', 'vault']

const inGroup = (group: NavGroup) => DESTINATIONS.filter(d => d.group === group)

/** Which tab a group lights. Workshop and Vault have none of their own, so More. */
const tabOf = (group: NavGroup | undefined): Tab | undefined =>
  group && (TABS.find(t => t.group === group) ?? TABS.at(-1))

/**
 * A group's own pages, as one line of chips under the header. It scrolls
 * sideways rather than wrapping, so the page below starts at the same height
 * whatever the group holds. A group of one (Home, Heroes, Vault) has no strip.
 */
export function GroupStrip({ pathname }: { pathname: string }) {
  const link = useRouteLink()
  const group = groupFor(pathname)
  const pages = group ? inGroup(group) : []
  if (!group || pages.length < 2) return null

  return (
    <nav
      aria-label={NAV_GROUP_LABELS[group]}
      // `my-dnd-vault__group-chips` is a hook for the Vault look (MYDND-143), which
      // puts this strip on the chrome and has to recolour it there.
      className="my-dnd-vault__group-chips flex shrink-0 gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] border-b border-background-modifier-border px-3 py-2"
    >
      {pages.map(d => (
        <button
          key={d.path}
          type="button"
          {...link(d.path)}
          aria-current={pathname === d.path ? 'page' : undefined}
          className={`shrink-0 ${pathname === d.path ? 'chip-filter-selected' : 'chip-filter'}`}
        >
          {d.label}
        </button>
      ))}
    </nav>
  )
}

/**
 * Five tabs along the bottom of the pane, and the More sheet over the page.
 *
 * A group's tab goes back to the page last open in that group, so leaving the
 * Bestiary for Home and coming back finds the Bestiary, not Spells. The memory
 * is a ref written after each route change and read only in the click handler.
 *
 * The scrim and the sheet are `absolute`, positioned against `.my-dnd-vault`,
 * which is `relative` — never against the window. So the sheet is not a native
 * `<dialog>`: `showModal()` would lift it out of the pane and make all of
 * Obsidian inert. It holds Tab itself, and hands focus back to More on closing.
 */
export function TabBar({ pathname }: { pathname: string }) {
  const go = useGo()
  const link = useRouteLink()
  const [sheetOpen, setSheetOpen] = useState(false)
  const lastIn = useRef<Partial<Record<NavGroup, string>>>({})
  const moreRef = useRef<HTMLButtonElement | null>(null)
  const current = groupFor(pathname)

  useEffect(() => {
    if (current) lastIn.current[current] = pathname
  }, [current, pathname])

  useFocusReturn(sheetOpen, moreRef)

  const openTab = (tab: Tab, evt: MouseEvent) => {
    if (!tab.group) {
      setSheetOpen(open => !open)
      return
    }
    setSheetOpen(false)
    go(lastIn.current[tab.group] ?? inGroup(tab.group)[0].path, evt)
  }

  const onSheetKey = (evt: KeyboardEvent<HTMLElement>) => {
    if (evt.key === 'Escape') setSheetOpen(false)
    containTab(evt)
  }

  const active = sheetOpen ? TABS.at(-1) : tabOf(current)

  return (
    <>
      {sheetOpen && <div aria-hidden="true" className="nav-scrim" onClick={() => setSheetOpen(false)} />}
      {sheetOpen && (
        <div
          ref={focusFirstButton}
          role="dialog"
          aria-modal="true"
          aria-label="All sections"
          // A press on the sheet's background lands here rather than on
          // `<body>`, so Escape and Tab still reach `onSheetKey`.
          tabIndex={-1}
          onKeyDown={onSheetKey}
          className="absolute inset-x-0 bottom-16 z-30 flex max-h-[calc(100%-5rem)] flex-col gap-4 overflow-y-auto rounded-t-obs-l border border-b-0 border-background-modifier-border bg-background-secondary px-4 pt-3 pb-4"
        >
          {SHEET_GROUPS.map(group => (
            <section key={group} className="flex flex-col gap-1">
              <h3 className="m-0 text-smallest font-semibold uppercase tracking-wide text-faint">
                {NAV_GROUP_LABELS[group]}
              </h3>
              <div className="grid grid-cols-2 gap-x-2">
                {inGroup(group).map(d => {
                  const { onClick, ...rest } = link(d.path)
                  return (
                    <button
                      key={d.path}
                      type="button"
                      {...rest}
                      onClick={evt => {
                        setSheetOpen(false)
                        onClick(evt)
                      }}
                      aria-current={pathname === d.path ? 'page' : undefined}
                      className={`menu-item ${pathname === d.path ? 'font-semibold' : ''}`}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
      <nav
        aria-label="Sections"
        className="relative z-30 grid h-16 shrink-0 grid-cols-5 border-t border-background-modifier-border bg-background-secondary"
      >
        {TABS.map(tab => {
          const on = tab === active
          return (
            <button
              key={tab.label}
              ref={tab.group ? undefined : moreRef}
              type="button"
              onClick={evt => openTab(tab, evt)}
              aria-current={on && tab.group ? 'page' : undefined}
              aria-haspopup={tab.group ? undefined : 'dialog'}
              aria-expanded={tab.group ? undefined : sheetOpen}
              className={on ? 'nav-tab-active' : 'nav-tab'}
            >
              <span
                className={`flex h-7 w-13 items-center justify-center rounded-full ${on ? 'bg-interactive-accent text-on-accent' : ''}`}
              >
                <Icon name={tab.icon} className="flex" />
              </span>
              {tab.label}
            </button>
          )
        })}
      </nav>
    </>
  )
}
