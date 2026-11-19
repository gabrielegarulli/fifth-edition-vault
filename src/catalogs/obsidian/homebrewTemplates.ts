import { Modal, Notice, Setting, type App, type Plugin } from 'obsidian'

import type { NoteFoldersSettings } from '../../platform'
import { ObsidianStateVault } from '../../platform/host'
import {
  DEFAULT_TEMPLATES_FOLDER,
  describeTemplatesReport,
  templateFolderProblem,
  writeHomebrewTemplates,
} from '../../compendium'

/**
 * "Add homebrew templates" (MYDND-236), in both editions: a dialog asks for a
 * folder, then the twenty-one templates are written into it for Obsidian's core
 * Templates plugin. What is written and what is refused is
 * `compendium/model/homebrewTemplates.ts`; the write is
 * `compendium/store/templates.ts`, which never writes over a file.
 */

/** The slice of the plugin this uses, as `SrdNotes` takes one. */
export interface HomebrewTemplatesPlugin {
  app: App
  settings: { folders: NoteFoldersSettings }
  addCommand: Plugin['addCommand']
}

export class HomebrewTemplates {
  constructor(private readonly plugin: HomebrewTemplatesPlugin) {}

  register(): void {
    this.plugin.addCommand({
      id: 'add-homebrew-templates',
      name: 'Add homebrew templates',
      callback: () => {
        void this.open()
      },
    })
  }

  /** The dialog, prefilled with core Templates' own folder when it has one. */
  async open(): Promise<void> {
    const folder = (await coreTemplatesFolder(this.plugin.app)) || DEFAULT_TEMPLATES_FOLDER
    new TemplatesFolderModal(this.plugin.app, folder, this.plugin.settings.folders, target => this.write(target)).open()
  }

  private async write(folder: string): Promise<void> {
    try {
      const report = await writeHomebrewTemplates(new ObsidianStateVault(this.plugin.app), folder, this.plugin.settings.folders)
      new Notice(describeTemplatesReport(report), 10_000)
    } catch (e) {
      new Notice(`The homebrew templates could not be added: ${e instanceof Error ? e.message : String(e)}`, 0)
    }
  }
}

/**
 * Core Templates' folder, from `<configDir>/templates.json`, or `''` when the
 * plugin was never set up. Its file, not its instance: the instance is
 * undocumented API, and only exists while the plugin is on.
 */
async function coreTemplatesFolder(app: App): Promise<string> {
  try {
    const raw = await app.vault.adapter.read(`${app.vault.configDir}/templates.json`)
    const folder = (JSON.parse(raw) as { folder?: unknown } | null)?.folder
    return typeof folder === 'string' ? folder : ''
  } catch {
    return ''
  }
}

class TemplatesFolderModal extends Modal {
  private value: string

  constructor(
    app: App,
    initial: string,
    private readonly folders: NoteFoldersSettings,
    private readonly onSubmit: (folder: string) => Promise<void>,
  ) {
    super(app)
    this.value = initial
  }

  onOpen(): void {
    this.setTitle('Add homebrew templates')

    this.contentEl.createEl('p', {
      cls: 'setting-item-description',
      text:
        'Writes a minimal and a full template for each kind of rules note, and a subclass that casts, twenty-one in all, with the name as {{title}} for ' +
        "Obsidian's Templates plugin. A file already at a template's name is left as it is. Keep the folder outside " +
        'your homebrew and rules folders, or every catalog would list the templates.',
    })

    // Said as text, and read out when it changes: never colour alone.
    const problem = createEl('p', { cls: 'setting-item-description mod-warning', attr: { role: 'alert' } })
    const check = () => {
      const why = templateFolderProblem(this.value, this.folders)
      problem.setText(why ?? '')
      return why === null
    }

    new Setting(this.contentEl).setName('Templates folder').addText(text => {
      text.setValue(this.value).onChange(v => {
        this.value = v
        check()
      })
      text.inputEl.setAttr('aria-label', 'Templates folder')
      text.inputEl.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
          event.preventDefault()
          this.submit(check)
        }
      })
      window.setTimeout(() => text.inputEl.focus(), 0)
      return text
    })
    this.contentEl.append(problem)
    check()

    new Setting(this.contentEl)
      .addButton(b =>
        b
          .setButtonText('Add templates')
          .setCta()
          .onClick(() => this.submit(check)),
      )
      .addButton(b => b.setButtonText('Cancel').onClick(() => this.close()))
  }

  private submit(check: () => boolean): void {
    if (!check()) return
    this.close()
    void this.onSubmit(this.value)
  }

  onClose(): void {
    this.contentEl.empty()
  }
}
