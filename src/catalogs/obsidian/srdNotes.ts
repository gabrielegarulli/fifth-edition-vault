import { Notice, Setting, type App, type Plugin } from 'obsidian'

import type { NoteFoldersSettings } from '../../platform'
import { ObsidianStateVault } from '../../platform/host'
import {
  SRD_PAYLOAD,
  describeSeedReport,
  inflateSrdArchive,
  seedSrdNotes,
  type SeedReport,
} from '../../compendium'

/**
 * The SRD edition's notes, installed from the bundle (MYDND-185): the command,
 * the settings section and the action Home's setup card calls.
 *
 * **One class, built in one place, as `Online` is.** `main.ts` builds it as
 * `import.meta.env.SRD_ONLY ? new SrdNotes(this) : null`, so the full build
 * drops the class and the seeder with it; a plugin method would have stayed
 * (a bundler keeps every method of a class it keeps). The archive itself is
 * `null` outside `--mode srd` either way (`src/compendium/store/srd/payload.ts`).
 *
 * Writes go through `ObsidianStateVault`, one `Vault.process` or `create` per
 * file, and never over a note the user edited: see `src/compendium/store/srd/seed.ts`.
 */

/**
 * The slice of the plugin this uses. `main`'s plugin satisfies it as it is;
 * naming that class instead would import `app` from below it (MYDND-200).
 */
export interface SrdNotesPlugin {
  app: App
  settings: { folders: NoteFoldersSettings }
  addCommand: Plugin['addCommand']
}

export class SrdNotes {
  /** How many notes the bundle carries, for the button's label. */
  readonly notes = SRD_PAYLOAD?.notes ?? 0
  private running: Promise<SeedReport | null> | null = null

  constructor(private readonly plugin: SrdNotesPlugin) {}

  register(): void {
    this.plugin.addCommand({
      id: 'install-srd-notes',
      name: 'Install or update SRD 5.2.1 rules notes',
      callback: () => {
        void this.install()
      },
    })
  }

  /**
   * Write the bundle's notes into the folders the settings name. One run at a
   * time: a second call while one is running gets the same result. Resolves to
   * the report, or `null` when it failed; either way a Notice has said so.
   */
  install(onProgress?: (done: number, total: number) => void): Promise<SeedReport | null> {
    this.running ??= this.run(onProgress).finally(() => {
      this.running = null
    })
    return this.running
  }

  private async run(onProgress?: (done: number, total: number) => void): Promise<SeedReport | null> {
    if (!SRD_PAYLOAD) {
      new Notice('This build carries no SRD notes.')
      return null
    }
    const notice = new Notice('Installing the SRD 5.2.1 rules notes…', 0)
    try {
      const archive = await inflateSrdArchive(SRD_PAYLOAD.data)
      const report = await seedSrdNotes(new ObsidianStateVault(this.plugin.app), archive, this.plugin.settings.folders, (done, total) => {
        if (done % 50 === 0 || done === total) notice.setMessage(`Installing the SRD 5.2.1 rules notes… ${done} of ${total}`)
        onProgress?.(done, total)
      })
      notice.hide()
      new Notice(describeSeedReport(report), 10_000)
      return report
    } catch (e) {
      notice.hide()
      new Notice(`The SRD notes could not be installed: ${e instanceof Error ? e.message : String(e)}`, 0)
      return null
    }
  }

  /** The settings tab's section: what the button does, and the last run's counts. */
  displaySettings(containerEl: HTMLElement): void {
    new Setting(containerEl).setName('SRD 5.2.1 rules notes').setHeading()
    const setting = new Setting(containerEl)
      .setName('Install or update the notes')
      .setDesc(
        `Writes the ${this.notes.toLocaleString()} SRD 5.2.1 notes and their 12 bases into the note folders ` +
          'above. A note you have edited, or one of your own at the same path, is left as it is. ' +
          'Nothing is deleted, and nothing is downloaded: the notes are inside the plugin.',
      )
    setting.addButton(b =>
      b
        .setButtonText('Install / Update notes')
        .setCta()
        .onClick(async () => {
          b.setDisabled(true)
          const report = await this.install((done, total) => b.setButtonText(`${done} of ${total}`))
          b.setDisabled(false).setButtonText('Install / Update notes')
          if (report) setting.setDesc(describeSeedReport(report))
        }),
    )
  }
}
