import { describe, expect, it } from 'vitest'

import {
  BUILDER_NEW_PATH,
  builderEditPath,
  convertPath,
  DESTINATIONS,
  destinationFor,
  groupFor,
  paneTarget,
  restoredPath,
  sheetPath,
  tabFor,
} from './routes'
import { PLUGIN_TITLE } from './edition'

describe('routes', () => {
  it('has no duplicate paths', () => {
    // The dispatch in App.tsx resolves by first match, so a duplicate makes the
    // second destination permanently unreachable — and silently, since both
    // entries still render in the nav.
    const paths = DESTINATIONS.map(d => d.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('has a home destination at the router entry point', () => {
    // A new tab, and any tab restored from a layout with no saved route, opens on
    // '/' (`restoredPath`), so a missing '/' opens it on the not-found state.
    expect(destinationFor('/')).toBeDefined()
  })

  it('carries no /login route', () => {
    // There is no auth. If this ever fails, someone has reintroduced a sign-in
    // surface into a single-player local-first plugin — see ADR 0001.
    expect(DESTINATIONS.find(d => d.path === '/login')).toBeUndefined()
  })

  it('returns undefined for an unknown path rather than throwing', () => {
    expect(destinationFor('/nope')).toBeUndefined()
  })
})

describe('a section as its own tab (MYDND-61)', () => {
  it('titles a tab after its section, and a sheet after its character', () => {
    expect(tabFor('/monsters')).toEqual({ title: 'Bestiary', icon: 'paw-print' })
    expect(tabFor(sheetPath('party/Thorin Oakenshield.md')).title).toBe('Thorin Oakenshield')
    expect(tabFor(builderEditPath('characters/Brakka.md')).title).toBe('Edit Brakka')
    expect(tabFor(BUILDER_NEW_PATH).title).toBe('New character')
  })

  it('falls back to the plugin name for a route nobody claims, rather than throwing', () => {
    expect(tabFor('/map').title).toBe(PLUGIN_TITLE)
    // A malformed escape is someone typing, not the app — still a title.
    expect(tabFor('/characters/%E0%A4%A').title).toBe('%E0%A4%A')
  })

  it('restores a saved route, and opens Home for anything that is not one', () => {
    expect(restoredPath({ path: '/spells' })).toBe('/spells')
    // A layout saved before MYDND-61 has no `path` at all.
    expect(restoredPath({})).toBe('/')
    expect(restoredPath(null)).toBe('/')
    expect(restoredPath({ path: 42 })).toBe('/')
    expect(restoredPath({ path: 'spells' })).toBe('/')
  })

  it('has no /inventory, and opens a tab saved there on the roster (MYDND-159)', () => {
    expect(destinationFor('/inventory')).toBeUndefined()
    expect(restoredPath({ path: '/inventory' })).toBe('/characters')
  })

  it('decides where a navigation goes', () => {
    // [modifier, pinned, already there] → target
    expect(paneTarget(false, false, false)).toBeNull()
    expect(paneTarget(false, true, false)).toBe('tab')
    expect(paneTarget(false, true, true)).toBeNull()
    expect(paneTarget(true, false, false)).toBe('tab')
    expect(paneTarget('split', false, false)).toBe('split')
    expect(paneTarget('window', true, true)).toBe('window')
  })
})

describe('the narrow nav’s groups (MYDND-122)', () => {
  it('puts every destination in a group, and only Home in Home', () => {
    expect(DESTINATIONS.filter(d => d.group === 'home').map(d => d.path)).toEqual(['/'])
    for (const d of DESTINATIONS) expect(groupFor(d.path)).toBe(d.group)
  })

  it('counts a sheet, the builder and a conversion as Heroes', () => {
    expect(groupFor(sheetPath('party/Gibbs.md'))).toBe('heroes')
    expect(groupFor(BUILDER_NEW_PATH)).toBe('heroes')
    expect(groupFor(convertPath('123'))).toBe('heroes')
  })

  it('lights no tab for a path nobody claims', () => {
    expect(groupFor('/map')).toBeUndefined()
  })
})
