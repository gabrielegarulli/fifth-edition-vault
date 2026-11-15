// The plugin's tab in Obsidian's settings: its rows as settings-search
// definitions, and the walker that draws them on Obsidian before 1.13.
import { type App, Notice, PluginSettingTab, requireApiVersion, SettingGroup, type TextComponent } from 'obsidian'

import {
  DEFAULT_NOTE_FOLDERS,
  normaliseFolder,
  resolveRuleFolder,
  RULE_FOLDER_KEYS,
  type RuleFolderKey,
} from '../../platform'
import type { SettingRow, SettingsGroup } from '../../platform/host'

import type MyDndVaultPlugin from '../../main'
import { VAULT_SHEET_TEMPLATE_ID } from '../../characters'

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
 *
 * ## One list, drawn two ways (MYDND-210)
 *
 * Obsidian 1.13 draws a tab from `getSettingDefinitions()`, and only what is
 * declared there is found by its settings search. The plugin still supports
 * 1.11.4, which never calls it and calls `display()`. So the tab is one list
 * of groups of rows, and:
 *
 * - **1.13 and later** draws and indexes it, and does not call `display()`
 *   while the list is non-empty — it never is. No version check is needed:
 *   each Obsidian calls the method it knows.
 * - **Before 1.13**, `display()` walks the same list into a `SettingGroup`
 *   each (1.11.0), so the two cannot drift.
 *
 * Each row is a `render` that adds its controls to a `Setting` already named
 * and described, which keeps the setters and their side effects as they were.
 * Obsidian's built-in `control` rows (its folder picker among them) would
 * need those moved into `setControlValue`; not done.
 */
export class MyDndVaultSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: MyDndVaultPlugin,
  ) {
    super(app, plugin)
  }

  getSettingDefinitions(): SettingsGroup[] {
    // The network half — portraits, the relay and its test, the web sign-in —
    // is `Online`'s, and the SRD edition has none (MYDND-133).
    const online = this.plugin.online?.settingDefinitions(this.refresh)
    return [
      {
        type: 'group',
        heading: online ? 'D&D Beyond import' : 'Characters',
        items: [...this.characterRows(online !== undefined), ...(online?.importRows ?? [])],
      },
      ...(online ? [online.webSync] : []),
      ...this.noteFolderGroups(),
      // The SRD edition's own notes, written into the folders just above (MYDND-185).
      ...(this.plugin.srdNotes ? [this.plugin.srdNotes.settingsGroup()] : []),
      // Its update check and What's new (MYDND-215); the full plugin has neither.
      ...(this.plugin.updates ? [this.plugin.updates.settingsGroup()] : []),
      { type: 'group', heading: 'Appearance', items: this.appearanceRows() },
    ]
  }

  /** Obsidian before 1.13 only; see the class comment. */
  display(): void {
    this.draw()
  }

  private draw(): void {
    const { containerEl } = this
    containerEl.empty()
    drawSettingGroups(containerEl, this.getSettingDefinitions())
  }

  /**
   * Redraws the tab after a change to the rows themselves: a sign-in or out,
   * the template written. `update()` is 1.13's, and asks for the definitions
   * again; before it the tab is ours to draw. `requireApiVersion` is the guard
   * obsidianmd's `no-unsupported-api` documents (MYDND-218): the directory's
   * scanner did not accept the `typeof this.update` test this replaced.
   */
  private readonly refresh = (): void => {
    if (requireApiVersion('1.13.0')) this.update()
    else this.draw()
  }

  private characterRows(online: boolean): SettingRow[] {
    const { plugin } = this
    return [
      {
        name: 'Character folder',
        desc: online
          ? 'Where a newly imported character note is written. A character already in the vault is ' +
            're-synced where it sits — it is identified by its D&D Beyond id, not by its folder.'
          : 'Where a new character note is written.',
        render: s => {
          s.addText(t =>
            t.setValue(plugin.settings.ddb.folder).onChange(async v => {
              await plugin.setDdbSettings({ folder: v.trim() || 'characters' })
            }),
          )
        },
      },
      {
        name: 'Make characters linkable from Atlas VTT',
        desc:
          'Writes "statblock: true" into each character note. This is what lets an Atlas token ' +
          'link to the sheet and take its name and hit points. If you use Fantasy Statblocks, ' +
          "it also puts the character in that plugin's bestiary. Turning it off breaks token linking.",
        aliases: ['statblock', 'token'],
        render: s => {
          s.addToggle(t =>
            t.setValue(plugin.settings.ddb.exposeToAtlas).onChange(async v => {
              await plugin.setDdbSettings({ exposeToAtlas: v })
            }),
          )
        },
      },
      {
        name: 'Atlas statblock template',
        desc:
          'The id of an Atlas template to draw character cards with. "Use this plugin\'s sheet" ' +
          `writes our own template (${VAULT_SHEET_TEMPLATE_ID}) into atlas-vtt/statblock-templates ` +
          "and chooses it: the card then draws this plugin's sheet, and hit points, slots and uses " +
          'spent there are kept. Any other template, such as the "5e (2024) Character Sheet" (its id ' +
          'is the "id" line of the .atlastemplate file), gets a copy of the sheet in its fields, and ' +
          'a counter clicked on that card is reset by the next change here. Leave empty for the ' +
          'plain link.',
        aliases: ['character sheet', 'card'],
        render: s => {
          s.addText(t =>
            t
              .setPlaceholder('5e-2024-character-sheet-…')
              .setValue(plugin.settings.ddb.atlasTemplateId)
              .onChange(async v => {
                await plugin.setDdbSettings({ atlasTemplateId: v.trim() })
              }),
          ).addButton(b =>
            b.setButtonText("Use this plugin's sheet").onClick(async () => {
              b.setDisabled(true)
              try {
                const outcome = await plugin.useVaultSheetTemplate()
                new Notice(
                  `${outcome === 'created' ? 'Template written' : outcome === 'updated' ? 'Template updated' : 'Template already current'}. ` +
                    'Press Apply below to bring every character in step now.',
                )
                this.refresh()
              } catch (err) {
                new Notice(`Could not write the template: ${err instanceof Error ? err.message : String(err)}`, 20000)
                b.setDisabled(false)
              }
            }),
          )
        },
      },
      {
        name: 'Apply to every character now',
        desc:
          'Notes follow the two settings above the next time they are imported or saved. This brings ' +
          'every character note in step at once: the template on or off, and the statblock flag.',
        aliases: ['Atlas', 'statblock'],
        render: s => {
          s.addButton(b =>
            b.setButtonText('Apply').onClick(async () => {
              b.setDisabled(true)
              try {
                const changed = await plugin.applyAtlasSettings()
                new Notice(changed === 1 ? '1 character note updated.' : `${changed} character notes updated.`)
              } catch (err) {
                new Notice(`Could not update every character: ${err instanceof Error ? err.message : String(err)}`, 20000)
              } finally {
                b.setDisabled(false)
              }
            }),
          )
        },
      },
    ]
  }

  /**
   * Where the plugin looks for each kind of note (MYDND-184).
   *
   * Every field saves as it is typed and the open panes re-read at once. A
   * catalog's placeholder is where it is read from while its field is blank, so
   * it is redrawn in place when the rules folder changes — never by redrawing
   * the tab, which would take the focus out of the field being typed in. The
   * fields register themselves as they are drawn, so the map holds the ones on
   * screen.
   */
  private noteFolderGroups(): SettingsGroup[] {
    const { plugin } = this
    const folders = () => plugin.settings.folders
    const overrideInputs = new Map<RuleFolderKey, TextComponent>()
    const defaultFor = (key: RuleFolderKey) => resolveRuleFolder(key, { ...folders(), overrides: {} })
    const showDefaults = () => {
      for (const [key, input] of overrideInputs) input.setPlaceholder(defaultFor(key))
    }

    return [
      {
        type: 'group',
        heading: 'Note folders',
        items: [
          {
            name: '',
            desc:
              'Where the plugin reads and creates its notes, as paths from the top of the vault. ' +
              'Changing a folder here does not move any note: move the notes yourself, in Obsidian.',
            searchable: false,
          },
          {
            name: 'Rules folder',
            desc:
              'The folder that holds the rules: spells, bestiary, classes and the rest, one folder each. ' +
              (DEFAULT_NOTE_FOLDERS.rulesRoot
                ? `Leave blank for "${DEFAULT_NOTE_FOLDERS.rulesRoot}". `
                : 'Leave blank if they are at the top of the vault. ') +
              'A rules folder that is not found here is looked for at the top of the vault.',
            aliases: ['note folders', 'compendium'],
            render: s => {
              s.addText(t =>
                t
                  .setPlaceholder(DEFAULT_NOTE_FOLDERS.rulesRoot || 'Top of the vault')
                  .setValue(folders().rulesRoot === DEFAULT_NOTE_FOLDERS.rulesRoot ? '' : folders().rulesRoot)
                  .onChange(async v => {
                    await plugin.setNoteFolders({ rulesRoot: normaliseFolder(v) || DEFAULT_NOTE_FOLDERS.rulesRoot })
                    showDefaults()
                  }),
              )
            },
          },
          {
            name: 'Campaigns folder',
            desc: 'Where campaign notes are read from, and where a new campaign is created.',
            aliases: ['note folders'],
            render: s => {
              s.addText(t =>
                t
                  .setPlaceholder(DEFAULT_NOTE_FOLDERS.campaigns)
                  .setValue(folders().campaigns)
                  .onChange(async v => {
                    await plugin.setNoteFolders({ campaigns: v })
                  }),
              )
            },
          },
          {
            name: 'Sessions folder',
            desc: 'Where session notes are read from, and where a new one is created.',
            aliases: ['note folders'],
            render: s => {
              s.addText(t =>
                t
                  .setPlaceholder(DEFAULT_NOTE_FOLDERS.sessions)
                  .setValue(folders().sessions)
                  .onChange(async v => {
                    await plugin.setNoteFolders({ sessions: v })
                  }),
              )
            },
          },
        ],
      },
      {
        type: 'group',
        heading: 'One folder at a time',
        items: [
          {
            name: '',
            desc:
              'Give a folder its own path when it is not inside the rules folder. Blank uses the path shown. ' +
              'A folder set here is the only place that kind of note is read from.',
            searchable: false,
          },
          ...RULE_FOLDER_KEYS.map(
            (key): SettingRow => ({
              name: RULE_FOLDER_LABELS[key],
              aliases: ['note folders'],
              render: s => {
                s.addText(t => {
                  overrideInputs.set(key, t)
                  t.setPlaceholder(defaultFor(key))
                    .setValue(folders().overrides[key] ?? '')
                    .onChange(async v => {
                      await plugin.setNoteFolders({ overrides: { ...folders().overrides, [key]: v } })
                    })
                })
              },
            }),
          ),
        ],
      },
    ]
  }

  private appearanceRows(): SettingRow[] {
    const { plugin } = this
    return [
      {
        name: 'The Vault look',
        desc:
          'Draws the pane the way the Vault web app does: a coloured frame with the page as a sheet ' +
          "inset in it, in the web app's blue. Off, the pane keeps the plugin's own palette.",
        aliases: ['theme', 'colour', 'color'],
        render: s => {
          s.addToggle(t =>
            t.setValue(plugin.settings.vaultLook).onChange(async v => {
              await plugin.setVaultLook(v)
            }),
          )
        },
      },
      {
        name: 'Fire background',
        desc: 'Draws embers rising behind every page. The Vault look hides them while it is on.',
        aliases: ['embers', 'animation'],
        render: s => {
          s.addToggle(t =>
            t.setValue(plugin.settings.embers).onChange(async v => {
              await plugin.setEmbers(v)
            }),
          )
        },
      },
    ]
  }
}

/**
 * Draws the tab's definitions as Obsidian before 1.13 must: a `SettingGroup`
 * per group, a `Setting` per row, named and described before its `render`
 * adds the controls — what 1.13 does with the same list. Exported for its test.
 */
export function drawSettingGroups(containerEl: HTMLElement, groups: SettingsGroup[]): void {
  for (const group of groups) {
    if (!shown(group.visible)) continue
    const settingGroup = new SettingGroup(containerEl)
    if (group.heading) settingGroup.setHeading(group.heading)
    if (group.cls) settingGroup.addClass(group.cls)
    for (const row of group.items) {
      if (!shown(row.visible)) continue
      settingGroup.addSetting(setting => {
        setting.setName(row.name)
        if (row.desc) setting.setDesc(row.desc)
        row.render?.(setting, settingGroup)
      })
    }
  }
}

function shown(visible: boolean | (() => boolean) | undefined): boolean {
  return typeof visible === 'function' ? visible() : visible !== false
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
