import { TFolder, type App } from 'obsidian'

import { homebrewFolder, isUnderFolder, type NoteFoldersSettings } from '../../platform'
import { ObsidianStateVault, openNote } from '../../platform/host'
import { createHomebrewNote } from '../store/create'
import { createImportedNotes, type ImportedNoteRequest, type ImportedNotesInput, type ImportedOutcome } from '../store/imported'
import { replaceHomebrewNote } from '../store/replace'
import { builderDefaults, type BuilderDefaults, type BuilderKind, type BuilderSettings } from '../model/kinds'
import type { HomebrewHost } from '../ui/context'

/** The slice of the plugin the builders read and write. */
export interface HomebrewPlugin {
  app: App
  noteFolders(): NoteFoldersSettings
  settings: { homebrewBuilders: BuilderSettings }
  setBuilderDefaults(kind: BuilderKind, defaults: BuilderDefaults): Promise<void>
}

/**
 * A conversion's missing notes, written on its save (MYDND-273): into the
 * homebrew folder from the settings, as each kind's remembered source.
 */
export function obsidianImportedNotes(plugin: HomebrewPlugin) {
  const vault = new ObsidianStateVault(plugin.app)
  return (requests: readonly ImportedNoteRequest[], rows: ImportedNotesInput['rows']): Promise<ImportedOutcome[]> =>
    createImportedNotes(vault, {
      homebrewFolder: homebrewFolder(plugin.noteFolders()),
      source: kind => builderDefaults(plugin.settings.homebrewBuilders, kind).source,
      rows,
    }, requests)
}

/**
 * The note builders' host in Obsidian (MYDND-233): the homebrew folder and the
 * remembered defaults from the plugin's settings, the write through a
 * `StateVault` (`createHomebrewNote`), and the folder suggestions.
 *
 * The suggestions walk the homebrew folder's own `children`, never the vault
 * from its root (ADR 0013): `getFolderByPath` and down, as
 * `ObsidianVaultSource.notesUnder` does.
 */
export function obsidianHomebrewHost(plugin: HomebrewPlugin): HomebrewHost {
  const { app } = plugin
  const vault = new ObsidianStateVault(app)
  const root = () => homebrewFolder(plugin.noteFolders())
  return {
    homebrewFolder: root,
    defaults: kind => builderDefaults(plugin.settings.homebrewBuilders, kind),
    remember: (kind, defaults) => plugin.setBuilderDefaults(kind, defaults),
    exists: async path => app.vault.getAbstractFileByPath(path) !== null,
    create: (path, text) => createHomebrewNote(vault, path, text),
    read: path => vault.read(path),
    replace: async (path, loaded, text) => {
      // ADR 0014 condition 3: a builder replaces a note under the homebrew
      // folder and nowhere else, whatever route asked.
      if (!isUnderFolder(root(), path)) throw new Error(`${path} is not under your homebrew folder, so its builder does not write to it.`)
      await replaceHomebrewNote(vault, path, loaded, text)
    },
    openNote: path => openNote(app, path),
    subfolders: () => {
      const top = root()
      const folder = top ? app.vault.getFolderByPath(top) : null
      if (!folder) return []
      const out: string[] = []
      const walk = (f: TFolder) => {
        for (const child of f.children) {
          if (!(child instanceof TFolder)) continue
          out.push(child.path.slice(top.length + 1))
          walk(child)
        }
      }
      walk(folder)
      return out.sort()
    },
  }
}
