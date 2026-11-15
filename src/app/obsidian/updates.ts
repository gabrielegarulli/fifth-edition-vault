import { Notice, requireApiVersion, setIcon, type App, type Plugin, type PluginManifest } from 'obsidian'

import type { RequestUrlFn } from '../../platform'
import type { SettingsGroup } from '../../platform/host'
import { changelogOnStart, unseenVersions } from '../model/changelog'
import { releases } from '../model/releaseNotes'
import {
  CHECK_EVERY_MS,
  FIRST_CHECK_MS,
  PUBLISHED_MANIFEST_URL,
  isNewer,
  pluginPageUrl,
  readPublishedVersion,
  releasePageUrl,
  versionToAnnounce,
} from '../model/updates'
import { WhatsNewModal } from './whatsNewModal'

/**
 * Fifth Edition Vault's update notice and What's new (MYDND-215): the timer,
 * the notice, the modal on start, the command and the settings group.
 *
 * **One class, built in one place, as `SrdNotes` is.** `main.ts` builds it as
 * `import.meta.env.SRD_ONLY ? new Updates(this) : null`, so the full plugin,
 * which is installed by `install:plugin` and has nothing to be told about,
 * carries neither the request nor the notes.
 *
 * **It is the edition's one request**, and it is made only while **Check for
 * updates** is on and the machine is online: `main`'s `manifest.json` on
 * GitHub, an hour apart. The README's "What it reads and writes" says so. The
 * decision of what to announce is `app/model/updates.ts`; the notes and when
 * they open are `app/model/changelog.ts`.
 *
 * **Nothing here is in `data.json`.** The switches and the versions acted on
 * are this device's, in `app.saveLocalStorage` (per vault, per device): two
 * machines syncing one vault should each be told, once.
 */

/** The slice of the plugin this uses. `main`'s plugin satisfies it as it is. */
export interface UpdatesPlugin {
  app: App
  manifest: PluginManifest
  requestUrl: RequestUrlFn
  addCommand: Plugin['addCommand']
  register: Plugin['register']
  registerInterval: Plugin['registerInterval']
}

/** What this device remembers, in one local-storage key. */
export interface UpdatePrefs {
  /** **Check for updates**. On by default: off, nobody would ever be told. */
  check: boolean
  /** **Show changelog after updates**. */
  showAfterUpdate: boolean
  /** **Feature updates only**. Off: on 0.0.x every release is a patch. */
  featureOnly: boolean
  /** The newest release whose notice was acted on, so it is never shown twice. */
  actedOn: string | null
  /** The newest version What's new has accounted for: shown, or skipped on purpose. */
  acknowledged: string | null
}

export const DEFAULT_UPDATE_PREFS: UpdatePrefs = {
  check: true,
  showAfterUpdate: true,
  featureOnly: false,
  actedOn: null,
  acknowledged: null,
}

/** A stored value back to prefs, field by field, so a damaged or older entry gains defaults rather than throwing. */
export function readUpdatePrefs(stored: unknown): UpdatePrefs {
  const s = stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {}
  const flag = (k: 'check' | 'showAfterUpdate' | 'featureOnly') => (typeof s[k] === 'boolean' ? s[k] : DEFAULT_UPDATE_PREFS[k])
  const version = (k: 'actedOn' | 'acknowledged') => (typeof s[k] === 'string' ? s[k] : null)
  return {
    check: flag('check'),
    showAfterUpdate: flag('showAfterUpdate'),
    featureOnly: flag('featureOnly'),
    actedOn: version('actedOn'),
    acknowledged: version('acknowledged'),
  }
}

export class Updates {
  /** The release a notice is up for, so the hourly check does not stack a second. */
  private noticeFor: string | null = null

  constructor(private readonly plugin: UpdatesPlugin) {}

  private get key(): string {
    return `${this.plugin.manifest.id}:updates`
  }

  private get installed(): string {
    return this.plugin.manifest.version
  }

  prefs(): UpdatePrefs {
    return readUpdatePrefs(this.plugin.app.loadLocalStorage(this.key))
  }

  private save(patch: Partial<UpdatePrefs>): void {
    this.plugin.app.saveLocalStorage(this.key, { ...this.prefs(), ...patch })
  }

  register(): void {
    this.plugin.addCommand({
      id: 'show-whats-new',
      name: "Show what's new",
      callback: () => {
        this.openWhatsNew(new Set())
      },
    })
    this.plugin.app.workspace.onLayoutReady(() => {
      this.onStart()
      const first = window.setTimeout(() => void this.check(), FIRST_CHECK_MS)
      this.plugin.register(() => window.clearTimeout(first))
      this.plugin.registerInterval(window.setInterval(() => void this.check(), CHECK_EVERY_MS))
    })
  }

  /** What's new, once, after an update (`changelogOnStart`). */
  private onStart(): void {
    const prefs = this.prefs()
    const decision = changelogOnStart(prefs.acknowledged, this.installed, prefs, releases())
    if (!decision.open) {
      if (decision.acknowledge) this.save({ acknowledged: decision.acknowledge })
      return
    }
    const unseen = unseenVersions(releases(), prefs.acknowledged, this.installed)
    // Recorded only once it is actually shown: in a popout, it waits for the
    // main window, and a restart before that shows it then.
    this.whenMainWindow(() => {
      this.save({ acknowledged: this.installed })
      this.openWhatsNew(unseen)
    })
  }

  /**
   * Runs `fn` now if the main window is the active one, or the first time it is
   * focused. A modal opens in `activeWindow`, and What's new belongs in the main
   * one, not on a popout that happened to be in front at start.
   */
  private whenMainWindow(fn: () => void): void {
    if (activeWindow === window) return fn()
    const onFocus = () => {
      window.removeEventListener('focus', onFocus)
      // Let Obsidian move `activeWindow` before `Modal.open` reads it.
      window.setTimeout(fn, 0)
    }
    window.addEventListener('focus', onFocus)
    this.plugin.register(() => window.removeEventListener('focus', onFocus))
  }

  openWhatsNew(unseen: ReadonlySet<string>): void {
    const shown = releases().filter(r => !isNewer(r.version, this.installed))
    new WhatsNewModal(this.plugin.app, {
      installed: this.installed,
      releases: shown,
      unseen,
      prefs: this.prefs(),
      setPrefs: patch => this.save(patch),
    }).open()
  }

  /** One check: skipped when switched off, offline, or while a notice is already up. */
  async check(): Promise<void> {
    const prefs = this.prefs()
    if (!prefs.check || !navigator.onLine || this.noticeFor) return
    const published = await readPublishedVersion(this.plugin.requestUrl, {
      id: this.plugin.manifest.id,
      apiSupports: requireApiVersion,
    })
    const version = versionToAnnounce(published, this.installed, this.prefs().actedOn)
    if (version && !this.noticeFor) this.showNotice(version)
  }

  /**
   * The notice, which stays until it is clicked. Obsidian hides a notice on any
   * click on it, so any click counts as acting on it: Update, What's new, ✕ or
   * the text. A restart before that shows it again, once.
   */
  private showNotice(version: string): void {
    this.noticeFor = version
    const name = this.plugin.manifest.name
    const fragment = createFragment(f => {
      const root = f.createDiv({ cls: 'my-dnd-vault mdv-update-notice' })
      const icon = root.createSpan({ cls: 'mdv-update-notice__icon', attr: { 'aria-hidden': 'true' } })
      setIcon(icon, 'dice-6')
      const body = root.createDiv({ cls: 'mdv-update-notice__body' })
      body.createDiv({ cls: 'mdv-update-notice__title', text: 'Update available' })
      body.createDiv({ cls: 'mdv-update-notice__text', text: `${name} ${version} is ready to install.` })
      const actions = body.createDiv({ cls: 'mdv-update-notice__actions' })
      const update = actions.createEl('button', { cls: 'mod-cta', text: 'Update' })
      update.addEventListener('click', () => window.open(pluginPageUrl(this.plugin.manifest.id)))
      const notes = actions.createEl('button', { text: "What's new" })
      notes.addEventListener('click', () => window.open(releasePageUrl(version)))
      const close = root.createEl('button', {
        cls: 'mdv-update-notice__close clickable-icon',
        attr: { 'aria-label': 'Dismiss', type: 'button' },
      })
      setIcon(close, 'x')
    })
    const notice = new Notice(fragment, 0)
    notice.containerEl.addEventListener(
      'click',
      () => {
        this.save({ actedOn: version })
        this.noticeFor = null
        notice.hide()
      },
      { once: true },
    )
  }

  /** The settings tab's **Updates** group. */
  settingsGroup(): SettingsGroup {
    const host = PUBLISHED_MANIFEST_URL.replace(/^https:\/\/([^/]+)\/.*$/, '$1')
    return {
      type: 'group',
      heading: 'Updates',
      items: [
        {
          name: 'Check for updates',
          desc:
            `Once an hour, reads the published manifest.json on GitHub (${host}) to see whether a newer ` +
            'release is out, and says so with a notice. It is the only request the plugin makes, and it ' +
            'sends nothing about you or your vault. Off, nothing is fetched.',
          aliases: ['update', 'notice', 'network', 'version'],
          render: setting => {
            setting.addToggle(t =>
              t.setValue(this.prefs().check).onChange(v => {
                this.save({ check: v })
              }),
            )
          },
        },
        {
          name: 'Show changelog after updates',
          desc: "Opens What's new once after the plugin updates. The notes are inside the plugin.",
          aliases: ['changelog', "what's new", 'release notes'],
          render: setting => {
            setting.addToggle(t =>
              t.setValue(this.prefs().showAfterUpdate).onChange(v => {
                this.save({ showAfterUpdate: v })
              }),
            )
          },
        },
        {
          name: 'Feature updates only',
          desc: "Skips What's new after an update that only fixes things (a patch release, such as 1.2.0 to 1.2.1).",
          aliases: ['changelog', 'patch'],
          render: setting => {
            setting.addToggle(t =>
              t.setValue(this.prefs().featureOnly).onChange(v => {
                this.save({ featureOnly: v })
              }),
            )
          },
        },
        {
          name: "What's new",
          desc: 'The notes for every release, newest first.',
          aliases: ['changelog', 'release notes'],
          render: setting => {
            setting.addButton(b =>
              b.setButtonText("Show what's new").onClick(() => {
                this.openWhatsNew(new Set())
              }),
            )
          },
        },
      ],
    }
  }
}
