import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RequestUrlOptions, RequestUrlResult } from '../../platform'
import { Modal, Notice } from '../../test-support/obsidian.stub.test'
import { releases } from '../model/releaseNotes'
import { DEFAULT_UPDATE_PREFS, readUpdatePrefs, Updates, type UpdatesPlugin } from './updates'
import { WhatsNewModal } from './whatsNewModal'

/**
 * The update notice and What's new on start, over a fake plugin (MYDND-215):
 * local storage is a Map, the request a recording fake, the layout ready at
 * once. The model's own suites cover the decisions; this covers the wiring.
 */
const ID = 'fifth-edition-vault'
const KEY = `${ID}:updates`

function setup(installed = '0.0.5', published: RequestUrlResult = { status: 200, text: JSON.stringify({ id: ID, version: '0.0.6', minAppVersion: '1.11.4' }) }) {
  const storage = new Map<string, unknown>()
  const calls: RequestUrlOptions[] = []
  const commands: { id: string; callback?: () => unknown }[] = []
  const plugin: UpdatesPlugin = {
    app: {
      loadLocalStorage: (k: string) => storage.get(k) ?? null,
      saveLocalStorage: (k: string, v: unknown) => void storage.set(k, v),
      workspace: { onLayoutReady: (cb: () => void) => cb() },
    } as unknown as UpdatesPlugin['app'],
    manifest: { id: ID, name: 'Fifth Edition Vault', version: installed } as UpdatesPlugin['manifest'],
    requestUrl: async options => {
      calls.push(options)
      return published
    },
    addCommand: (c => (commands.push(c), c)) as UpdatesPlugin['addCommand'],
    register: () => {},
    registerInterval: (id => id) as UpdatesPlugin['registerInterval'],
  }
  return { updates: new Updates(plugin), plugin, storage, calls, commands }
}

const button = (root: HTMLElement, name: string) =>
  [...root.querySelectorAll('button')].find(b => b.textContent === name || b.getAttribute('aria-label') === name)!

beforeEach(() => {
  vi.stubGlobal('activeWindow', window)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('readUpdatePrefs', () => {
  it('fills defaults for nothing stored, or garbage', () => {
    expect(readUpdatePrefs(null)).toEqual(DEFAULT_UPDATE_PREFS)
    expect(readUpdatePrefs({ check: 'yes', actedOn: 6 })).toEqual(DEFAULT_UPDATE_PREFS)
    expect(DEFAULT_UPDATE_PREFS.check).toBe(true)
  })
})

describe('the update check', () => {
  it('shows one notice for a newer release, and Update opens the plugin page', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const { updates, storage, calls } = setup()
    await updates.check()
    expect(calls).toHaveLength(1)
    expect(Notice.shown).toEqual(['Update availableFifth Edition Vault 0.0.6 is ready to install.UpdateWhat\'s new'])

    const notice = Notice.made[0]
    // A second check while it is up does not stack another.
    await updates.check()
    expect(Notice.made).toHaveLength(1)

    button(notice.containerEl, 'Update').click()
    expect(open).toHaveBeenCalledWith('obsidian://show-plugin?id=fifth-edition-vault')
    expect(notice.hidden).toBe(true)
    expect(storage.get(KEY)).toMatchObject({ actedOn: '0.0.6' })

    // Acted on: never again for this release.
    await updates.check()
    expect(Notice.made).toHaveLength(1)
  })

  it("What's new opens the release on GitHub, and ✕ only dismisses", async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const first = setup()
    await first.updates.check()
    button(Notice.made[0].containerEl, "What's new").click()
    expect(open).toHaveBeenCalledWith('https://github.com/gabrielegarulli/fifth-edition-vault/releases/tag/0.0.6')

    const second = setup()
    await second.updates.check()
    const close = button(Notice.made[1].containerEl, 'Dismiss')
    expect(close.getAttribute('type')).toBe('button')
    close.click()
    expect(open).toHaveBeenCalledTimes(1)
    expect(second.storage.get(KEY)).toMatchObject({ actedOn: '0.0.6' })
  })

  it('makes no request when switched off, or offline', async () => {
    const off = setup()
    off.storage.set(KEY, { ...DEFAULT_UPDATE_PREFS, check: false })
    await off.updates.check()
    expect(off.calls).toHaveLength(0)

    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const offline = setup()
    await offline.updates.check()
    expect(offline.calls).toHaveLength(0)
    expect(Notice.made).toHaveLength(0)
  })

  it('says nothing when the installed version is the newest', async () => {
    const { updates } = setup('0.0.6')
    await updates.check()
    expect(Notice.made).toHaveLength(0)
  })

  it('offers the four settings rows', () => {
    const group = setup().updates.settingsGroup()
    expect(group.heading).toBe('Updates')
    expect(group.items.map(i => i.name)).toEqual(['Check for updates', 'Show changelog after updates', 'Feature updates only', "What's new"])
    expect(group.items[0].desc).toContain('raw.githubusercontent.com')
  })
})

describe("What's new on start", () => {
  const newest = releases()[0].version
  const previous = releases()[1].version

  it('records a fresh install and opens nothing', () => {
    const { updates, storage } = setup(newest)
    updates.register()
    expect(Modal.opened).toHaveLength(0)
    expect(storage.get(KEY)).toMatchObject({ acknowledged: newest })
  })

  it('opens once after an update, with that release marked New', () => {
    const { updates, plugin, storage } = setup(newest)
    storage.set(KEY, { ...DEFAULT_UPDATE_PREFS, acknowledged: previous })
    updates.register()
    expect(Modal.opened).toHaveLength(1)
    expect(Modal.opened[0]).toBeInstanceOf(WhatsNewModal)
    const entries = [...Modal.opened[0].contentEl.querySelectorAll('details')]
    expect(entries[0].querySelector('.mdv-release__new')?.textContent).toBe('New')
    expect(entries[0].open).toBe(true)
    expect(entries.slice(1).every(e => !e.open && !e.querySelector('.mdv-release__new'))).toBe(true)
    expect(storage.get(KEY)).toMatchObject({ acknowledged: newest })

    // The next start, on the same device, has nothing to say.
    Modal.opened = []
    new Updates(plugin).register()
    expect(Modal.opened).toHaveLength(0)
  })

  it('waits for the main window when a popout is in front', () => {
    vi.stubGlobal('activeWindow', {})
    vi.useFakeTimers()
    try {
      const { updates, storage } = setup(newest)
      storage.set(KEY, { ...DEFAULT_UPDATE_PREFS, acknowledged: previous })
      updates.register()
      expect(Modal.opened).toHaveLength(0)
      // Not shown yet, so not recorded yet.
      expect(storage.get(KEY)).toMatchObject({ acknowledged: previous })
      window.dispatchEvent(new Event('focus'))
      vi.runOnlyPendingTimers()
      expect(Modal.opened).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('opens from the command at any time, newest open, nothing marked New', () => {
    const { updates, commands } = setup(newest)
    updates.register()
    commands.find(c => c.id === 'show-whats-new')!.callback!()
    const entries = [...Modal.opened[0].contentEl.querySelectorAll('details')]
    expect(entries.map(e => e.open)).toEqual(entries.map((_, i) => i === 0))
    expect(Modal.opened[0].contentEl.querySelector('.mdv-release__new')).toBeNull()
  })

  it('never lists a drafted release newer than the one installed', () => {
    const { updates } = setup(previous)
    updates.openWhatsNew(new Set())
    const versions = [...Modal.opened[0].contentEl.querySelectorAll('.mdv-release__version')].map(e => e.textContent)
    expect(versions).not.toContain(newest)
    expect(versions[0]).toBe(previous)
  })
})
