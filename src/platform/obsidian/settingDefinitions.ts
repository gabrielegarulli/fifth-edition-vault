import type { SettingDefinitionEmpty, SettingDefinitionGroup, SettingDefinitionRender } from 'obsidian'

/**
 * The slice of Obsidian's declarative settings API (1.13) the settings tab
 * uses (MYDND-210).
 *
 * `getSettingDefinitions()` may return pages, lists, built-in `control`s and
 * actions too. The tab returns only groups of rows that draw themselves,
 * because its `display()` fallback — every Obsidian before 1.13 — walks the
 * same array into `Setting`s, and these two shapes are all that walker knows.
 * A type this narrow is what makes a definition the fallback cannot draw a
 * compile error rather than a missing row on 1.11.
 *
 * - **A row** is `render`, which gets the `Setting` with its name and
 *   description already set and adds the controls, or **empty**, a line of
 *   text. Its `name`, `desc` and `aliases` are what settings search matches.
 * - **A group** is a heading and its rows: no header search, no extra
 *   buttons, which the fallback would have to draw too.
 */
export type SettingRow = SettingDefinitionRender | SettingDefinitionEmpty

export interface SettingsGroup extends Pick<SettingDefinitionGroup, 'heading' | 'cls' | 'visible'> {
  type: 'group'
  items: SettingRow[]
}

/**
 * The network half of the tab, which only the full build has (MYDND-133):
 * rows that join the import group, and the web sign-in's own group.
 */
export interface OnlineSettings {
  importRows: SettingRow[]
  webSync: SettingsGroup
}
