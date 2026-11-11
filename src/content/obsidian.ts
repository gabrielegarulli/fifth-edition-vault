import type { App } from 'obsidian'

import { createContent, type Content } from './index'
import { DEFAULT_NOTE_FOLDERS, type NoteFoldersSettings } from './folders'
import { rulesSource } from './rulesFolder'
import { ObsidianVaultSource, obsidianParseYaml } from './source'

/**
 * The Obsidian-flavoured entry point to the content layer.
 *
 * Separated from `./index` on purpose. The `obsidian` npm package has **no
 * runtime entry** — it is `obsidian.d.ts` and nothing else, because the app
 * injects the real module — so any file importing a *value* from it cannot be
 * loaded outside Obsidian, and neither can anything importing that file.
 *
 * Keeping the wrapper here means `./index` and every catalog stay loadable in
 * plain Node, which is what lets the whole reader contract be tested against a
 * fixture vault with no stubs. Import this only from plugin code that already
 * has an `App`.
 */
export function createVaultContent(
  app: App,
  // The plugin's live settings, read on every `notesIn` (MYDND-184). The
  // default is for a host with no `data.json` — the web build — and is the
  // SRD edition's `SRD 5.2.1/` or the lore vault's top level (MYDND-180).
  folders: () => NoteFoldersSettings = () => DEFAULT_NOTE_FOLDERS,
): Content {
  return createContent(rulesSource(new ObsidianVaultSource(app), folders), obsidianParseYaml)
}

export { ObsidianVaultSource, obsidianParseYaml } from './source'
