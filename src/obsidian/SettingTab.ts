import { type App, PluginSettingTab, Setting, type TextComponent } from 'obsidian'

import {
  DEFAULT_NOTE_FOLDERS,
  normaliseFolder,
  resolveRuleFolder,
  RULE_FOLDER_KEYS,
  type RuleFolderKey,
} from '../content/folders'

import type MyDndVaultPlugin from '../main'

/**
 * The plugin's settings tab — the D&D Beyond import, absorbed with the plugin
 * that owned it (MYDND-7).
 *
 * ## Why these are here and the campaign rules are not
 *
 * The plugin has two kinds of setting and they live in two places, on one line:
 *
 * - **`data.json` config** — the import folders, the relay, the Atlas toggle.
 *   Facts about *this install*, not about the campaign. Obsidian's own settings
 *   tab is where a user looks for them, so that is where they are.
 * - **Campaign rules** — the loadout system, quirk costs, the magic economy.
 *   Facts about the *campaign*, stored in its own note, edited on the React
 *   `/settings` page inside the pane (MYDND-5, ADR 0003).
 *
 * Putting the first group on the React page would hide them from the place
 * plugin settings belong; putting the second group here would put vault data
 * behind a per-install UI. The line is which file the value ends up in.
 */
export class MyDndVaultSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: MyDndVaultPlugin,
  ) {
    super(app, plugin)
  }

  display(): void {
    const { containerEl } = this
    containerEl.empty()

    // The network half — portraits, the relay and its test, the web sign-in —
    // is `Online`'s, and the SRD edition has none (MYDND-133).
    const { online } = this.plugin
    new Setting(containerEl).setName(online ? 'D&D Beyond import' : 'Characters').setHeading()

    new Setting(containerEl)
      .setName('Character folder')
      .setDesc(
        online
          ? 'Where a newly imported character note is written. A character already in the vault is ' +
              're-synced where it sits — it is identified by its D&D Beyond id, not by its folder.'
          : 'Where a new character note is written.',
      )
      .addText(t =>
        t.setValue(this.plugin.settings.ddb.folder).onChange(async v => {
          await this.plugin.setDdbSettings({ folder: v.trim() || 'characters' })
        }),
      )

    new Setting(containerEl)
      .setName('Make characters linkable from Atlas VTT')
      .setDesc(
        'Writes "statblock: true" into each character note. This is what lets an Atlas token ' +
          'link to the sheet and take its name and hit points. If you use Fantasy Statblocks, ' +
          "it also puts the character in that plugin's bestiary. Turning it off breaks token linking.",
      )
      .addToggle(t =>
        t.setValue(this.plugin.settings.ddb.exposeToAtlas).onChange(async v => {
          await this.plugin.setDdbSettings({ exposeToAtlas: v })
        }),
      )

    online?.displaySettings(containerEl, () => this.display())

    this.displayNoteFolders(containerEl)

    // The SRD edition's own notes, written into the folders just above (MYDND-185).
    this.plugin.srdNotes?.displaySettings(containerEl)

    new Setting(containerEl).setName('Appearance').setHeading()

    new Setting(containerEl)
      .setName('The Vault look')
      .setDesc(
        "Draws the pane the way the Vault web app does: a coloured frame with the page as a sheet " +
          'inset in it, in the web app\'s blue. Off, the pane keeps the plugin\'s own palette.',
      )
      .addToggle(t =>
        t.setValue(this.plugin.settings.vaultLook).onChange(async v => {
          await this.plugin.setVaultLook(v)
        }),
      )

    new Setting(containerEl)
      .setName('Fire background')
      .setDesc('Draws embers rising behind every page. The Vault look hides them while it is on.')
      .addToggle(t =>
        t.setValue(this.plugin.settings.embers).onChange(async v => {
          await this.plugin.setEmbers(v)
        }),
      )
  }

  /**
   * Where the plugin looks for each kind of note (MYDND-184).
   *
   * Every field saves as it is typed and the open panes re-read at once. A
   * catalog's placeholder is where it is read from while its field is blank, so
   * it is redrawn in place when the rules folder changes — never by calling
   * `display()`, which would rebuild the tab and take the focus out of the field
   * being typed in.
   */
  private displayNoteFolders(containerEl: HTMLElement): void {
    const { plugin } = this
    const folders = () => plugin.settings.folders
    const overrideInputs = new Map<RuleFolderKey, TextComponent>()
    const showDefaults = () => {
      for (const [key, input] of overrideInputs) {
        input.setPlaceholder(resolveRuleFolder(key, { ...folders(), overrides: {} }))
      }
    }

    new Setting(containerEl).setName('Note folders').setHeading()
    new Setting(containerEl).setDesc(
      'Where the plugin reads and creates its notes, as paths from the top of the vault. ' +
        'Changing a folder here does not move any note: move the notes yourself, in Obsidian.',
    )

    new Setting(containerEl)
      .setName('Rules folder')
      .setDesc(
        'The folder that holds the rules: spells, bestiary, classes and the rest, one folder each. ' +
          (DEFAULT_NOTE_FOLDERS.rulesRoot
            ? `Leave blank for "${DEFAULT_NOTE_FOLDERS.rulesRoot}". `
            : 'Leave blank if they are at the top of the vault. ') +
          'A rules folder that is not found here is looked for at the top of the vault.',
      )
      .addText(t =>
        t
          .setPlaceholder(DEFAULT_NOTE_FOLDERS.rulesRoot || 'Top of the vault')
          .setValue(folders().rulesRoot === DEFAULT_NOTE_FOLDERS.rulesRoot ? '' : folders().rulesRoot)
          .onChange(async v => {
            await plugin.setNoteFolders({ rulesRoot: normaliseFolder(v) || DEFAULT_NOTE_FOLDERS.rulesRoot })
            showDefaults()
          }),
      )

    new Setting(containerEl)
      .setName('Campaigns folder')
      .setDesc('Where campaign notes are read from, and where a new campaign is created.')
      .addText(t =>
        t
          .setPlaceholder(DEFAULT_NOTE_FOLDERS.campaigns)
          .setValue(folders().campaigns)
          .onChange(async v => {
            await plugin.setNoteFolders({ campaigns: v })
          }),
      )

    new Setting(containerEl)
      .setName('Sessions folder')
      .setDesc('Where session notes are read from, and where a new one is created.')
      .addText(t =>
        t
          .setPlaceholder(DEFAULT_NOTE_FOLDERS.sessions)
          .setValue(folders().sessions)
          .onChange(async v => {
            await plugin.setNoteFolders({ sessions: v })
          }),
      )

    new Setting(containerEl)
      .setName('One folder at a time')
      .setDesc(
        'Give a folder its own path when it is not inside the rules folder. Blank uses the path shown. ' +
          'A folder set here is the only place that kind of note is read from.',
      )
      .setHeading()

    for (const key of RULE_FOLDER_KEYS) {
      new Setting(containerEl).setName(RULE_FOLDER_LABELS[key]).addText(t => {
        overrideInputs.set(key, t)
        t.setValue(folders().overrides[key] ?? '').onChange(async v => {
          await plugin.setNoteFolders({ overrides: { ...folders().overrides, [key]: v } })
        })
      })
    }
    showDefaults()
  }
}

/** What each rules folder is called in the settings tab. */
const RULE_FOLDER_LABELS: Record<RuleFolderKey, string> = {
  spells: 'Spells folder',
  bestiary: 'Bestiary folder',
  classes: 'Classes folder',
  subclasses: 'Subclasses folder',
  species: 'Species folder',
  backgrounds: 'Backgrounds folder',
  feats: 'Feats folder',
  items: 'Items folder',
  'magic-items': 'Magic items folder',
  conditions: 'Conditions folder',
  diseases: 'Diseases folder',
  'variant-rules': 'Variant rules folder',
}
