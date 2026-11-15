// The settings tab's one list of definitions, drawn two ways (MYDND-210):
// Obsidian 1.13+ reads `getSettingDefinitions()`, and before it `display()`
// walks the same list. A `ui` suite because the tab imports `obsidian`'s
// values; `obsidian` is the harness, with the three classes the tab draws
// with swapped for ones that record what they were asked to draw.
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_NOTE_FOLDERS } from '../../platform'
import type { OnlineSettings, SettingsGroup } from '../../platform/host'
import type MyDndVaultPlugin from '../../main'

/** Whatever a control's builder calls on it, it gets the control back. */
function control(): unknown {
  const self: unknown = new Proxy(() => self, {
    get: (_, key) => (key === 'inputEl' ? { style: {} } : () => self),
  })
  return self
}

/** What the fallback drew: a heading per group, a name per row. */
let drawn: string[] = []

/** The Obsidian a test pretends to be. 1.13 has `update()`; before it, the tab draws itself. */
let obsidianVersion = '1.13.1'
const atLeast = (version: string): boolean => {
  const [a, b] = [version, obsidianVersion].map(v => v.split('.').map(Number))
  const i = a.findIndex((n, k) => n !== b[k])
  return i === -1 || b[i] > a[i]
}

vi.mock('obsidian', async importOriginal => {
  class Setting {
    setName(name: string) {
      drawn.push(`row: ${name}`)
      return this
    }
    setDesc() {
      return this
    }
    addText(cb: (c: unknown) => unknown) {
      cb(control())
      return this
    }
    addToggle(cb: (c: unknown) => unknown) {
      cb(control())
      return this
    }
    addButton(cb: (c: unknown) => unknown) {
      cb(control())
      return this
    }
  }
  class SettingGroup {
    constructor(readonly containerEl: HTMLElement) {}
    setHeading(text: string) {
      drawn.push(`group: ${text}`)
      return this
    }
    addClass() {
      return this
    }
    addSetting(cb: (s: Setting) => void) {
      cb(new Setting())
      return this
    }
  }
  class PluginSettingTab {
    containerEl = Object.assign(document.createElement('div'), { empty: vi.fn() })
    constructor(readonly app: unknown) {}
  }
  return {
    ...(await importOriginal<object>()),
    Setting,
    SettingGroup,
    PluginSettingTab,
    requireApiVersion: (version: string) => atLeast(version),
  }
})

const { MyDndVaultSettingTab, drawSettingGroups } = await import('./SettingTab')

function pluginWith(edition: { online?: OnlineSettings; srdNotes?: SettingsGroup; updates?: SettingsGroup }) {
  const refreshes: (() => void)[] = []
  const plugin = {
    settings: {
      ddb: {
        folder: 'characters',
        exposeToAtlas: true,
        atlasTemplateId: '',
        tokenFolder: 'characters/portraits',
        downloadAvatar: true,
        relayUrl: '',
      },
      folders: DEFAULT_NOTE_FOLDERS,
      vaultLook: false,
      embers: false,
    },
    online: edition.online && {
      settingDefinitions: (refresh: () => void) => {
        refreshes.push(refresh)
        return edition.online
      },
    },
    srdNotes: edition.srdNotes && { settingsGroup: () => edition.srdNotes },
    updates: edition.updates && { settingsGroup: () => edition.updates },
  } as unknown as MyDndVaultPlugin
  return { tab: new MyDndVaultSettingTab({} as never, plugin), refreshes }
}

const ONLINE: OnlineSettings = {
  importRows: [{ name: 'Portrait folder', desc: 'Where portraits go.', render: () => {} }],
  webSync: { type: 'group', heading: 'Web sync', items: [{ name: 'Email', desc: 'Your email.', render: () => {} }] },
}
const SRD: SettingsGroup = {
  type: 'group',
  heading: 'SRD 5.2.1 rules notes',
  items: [{ name: 'Install or update the notes', desc: 'Writes the notes.', render: () => {} }],
}

const UPDATES: SettingsGroup = {
  type: 'group',
  heading: 'Updates',
  items: [{ name: 'Check for updates', desc: 'Once an hour.', render: () => {} }],
}

const headings = (groups: SettingsGroup[]) => groups.map(g => g.heading)

beforeEach(() => {
  drawn = []
  obsidianVersion = '1.13.1'
})

describe('getSettingDefinitions', () => {
  it('gives the full build the import, its online rows and the web sign-in', () => {
    const groups = pluginWith({ online: ONLINE }).tab.getSettingDefinitions()
    expect(headings(groups)).toEqual(['D&D Beyond import', 'Web sync', 'Note folders', 'One folder at a time', 'Appearance'])
    expect(groups[0].items.map(r => r.name)).toEqual([
      'Character folder',
      'Make characters linkable from Atlas VTT',
      'Atlas statblock template',
      'Apply to every character now',
      'Portrait folder',
    ])
  })

  it('gives the SRD edition no network rows, its notes and its update check', () => {
    const groups = pluginWith({ srdNotes: SRD, updates: UPDATES }).tab.getSettingDefinitions()
    expect(headings(groups)).toEqual(['Characters', 'Note folders', 'One folder at a time', 'SRD 5.2.1 rules notes', 'Updates', 'Appearance'])
  })

  it('names every row search can find, and draws every other one', () => {
    const groups = pluginWith({ online: ONLINE, srdNotes: SRD }).tab.getSettingDefinitions()
    for (const row of groups.flatMap(g => g.items)) {
      if (row.searchable === false) expect(row.desc, 'an unsearchable row is a line of text').toBeTruthy()
      else expect(row.name, JSON.stringify(row.desc)).not.toBe('')
    }
    // The twelve rules folders are the rows a search for "folder" is for.
    expect(groups[3].items.filter(r => r.name.endsWith(' folder'))).toHaveLength(12)
  })
})

describe('display(), before Obsidian 1.13', () => {
  it('draws exactly the definitions, in order', () => {
    const { tab } = pluginWith({ online: ONLINE, srdNotes: SRD })
    const expected = tab
      .getSettingDefinitions()
      .flatMap(g => [`group: ${g.heading}`, ...g.items.map(r => `row: ${r.name}`)])

    tab.display()

    expect(drawn).toEqual(expected)
    // Six groups; 4 + 1 import rows, 1 web, 4 note folders, 1 + 12 one at a
    // time, 1 SRD, 2 appearance.
    expect(drawn).toHaveLength(6 + 5 + 1 + 4 + 13 + 1 + 2)
  })

  it('leaves out what is not visible', () => {
    drawSettingGroups(document.createElement('div'), [
      { type: 'group', heading: 'Hidden', visible: () => false, items: [{ name: 'A', render: () => {} }] },
      { type: 'group', heading: 'Shown', items: [{ name: 'B', visible: false }, { name: 'C' }] },
    ])
    expect(drawn).toEqual(['group: Shown', 'row: C'])
  })
})

describe('refreshing after a sign-in or out', () => {
  it('asks Obsidian 1.13+ for the definitions again', () => {
    const { tab, refreshes } = pluginWith({ online: ONLINE })
    const update = vi.fn()
    Object.assign(tab, { update })
    tab.getSettingDefinitions()

    refreshes[0]()

    expect(update).toHaveBeenCalledOnce()
    expect(drawn).toEqual([])
  })

  it('redraws the tab itself before 1.13, which has no update()', () => {
    obsidianVersion = '1.12.7'
    const { tab, refreshes } = pluginWith({ online: ONLINE })
    tab.getSettingDefinitions()

    refreshes[0]()

    expect(vi.mocked(tab.containerEl.empty)).toHaveBeenCalledOnce()
    expect(drawn[0]).toBe('group: D&D Beyond import')
  })
})
