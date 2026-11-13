import type { App } from 'obsidian'

import { createContent, type Content } from '../model/content'
import { DEFAULT_NOTE_FOLDERS, type NoteFoldersSettings, rulesSource } from '../../platform'
import { ObsidianVaultSource, obsidianParseYaml, ObsidianStateVault } from '../../platform/host'
import { createState, type State } from '../model/state'

/**
 * The whole content and state layers over a host `App` — the app's wiring
 * (MYDND-199).
 *
 * These were `content/obsidian.ts`'s and `state/obsidian.ts`'s, which put the
 * composition of every domain in `platform`, below all of them. They are the
 * app's now: only a composition root builds everything — the view, the
 * ` ```vault-sheet ` fence, the web build — and hands each domain's part to its
 * own provider through `DomainProviders`. A domain that needs its own stores
 * builds just those (`createVaultCompendium`, `createCharacterStores`).
 *
 * Both are stateless; building them per mount costs nothing worth caching.
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

/** The Obsidian-flavoured entry point to the state layer. */
export function createVaultState(app: App, folders?: () => NoteFoldersSettings): State {
  return createState(new ObsidianStateVault(app), folders)
}
