import { createContext, useContext, type ReactNode } from 'react'

import type { BuilderDefaults, BuilderKind } from '../model/kinds'

/**
 * What a note builder needs from its host (MYDND-233): the plugin, and only
 * the plugin (ADR 0014). `homebrew/obsidian/host.ts` builds it over the
 * vault, `data.json` and the workspace; a test passes its own.
 */
export interface HomebrewHost {
  /** The homebrew folder from the top of the vault, live from the settings. */
  homebrewFolder(): string
  /** Where this kind last saved, and as which source. */
  defaults(kind: BuilderKind): BuilderDefaults
  /** Remember them for the next note of this kind. */
  remember(kind: BuilderKind, defaults: BuilderDefaults): Promise<void>
  /** Whether anything is at `path`: the Save step says so before the write refuses. */
  exists(path: string): Promise<boolean>
  /** Write a new note; throws, with the sentence to show, when anything is there. */
  create(path: string, text: string): Promise<void>
  /** A note's text, or null when there is none: what Edit opens (MYDND-272). */
  read(path: string): Promise<string | null>
  /**
   * Save an edited homebrew note over itself, only while it is still `loaded`;
   * throws, with the sentence to show, when it changed, is gone, or is not under
   * the homebrew folder (ADR 0014).
   */
  replace(path: string, loaded: string, text: string): Promise<void>
  /** Open a note in a new tab. */
  openNote(path: string): void
  /** The folders already under the homebrew folder, relative to it, for the folder field to suggest. */
  subfolders(): string[]
}

const HomebrewContext = createContext<HomebrewHost | null>(null)

export function HomebrewProvider({ host, children }: { host: HomebrewHost; children: ReactNode }) {
  return <HomebrewContext.Provider value={host}>{children}</HomebrewContext.Provider>
}

/** Deliberately not defaulted: a builder with no host would write nowhere and say it had. */
export function useHomebrew(): HomebrewHost {
  const host = useContext(HomebrewContext)
  if (!host) throw new Error('useHomebrew must be used inside a HomebrewProvider')
  return host
}
