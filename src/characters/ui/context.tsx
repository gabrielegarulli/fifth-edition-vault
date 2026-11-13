import { createContext, useContext, useMemo, type ComponentType, type ReactNode } from 'react'

import type { Roster, RosterEntry, Quirk, VaultCharacterJson } from '../../characterModel'
import type { CharacterStore } from '../store/characters'
import type { InventoryStore } from '../store/inventory'
import type { VitalsStore } from '../store/vitals'

/**
 * The characters domain: the roster, the three stores that write a character
 * note, and the actions that need the host (MYDND-199).
 *
 * The actions are **injected as plain functions**, as `StateProvider`'s were:
 * the real ones need the `Plugin` (for `data.json`) and the host `App` (for the
 * portrait write and the notices), and taking either here would stop every
 * page under this provider from mounting in the test harness.
 *
 * `importCharacter` is a slot the app fills. The D&D Beyond import is the
 * private `ddbImport` domain, above this one, so the type is declared here and
 * the function comes from `app`'s host providers — the roster and the sheet offer
 * a re-sync without importing anything of the importer's.
 */
export interface CharactersHost {
  /** Every character note, with its sheet read. Read through `useRoster`. */
  roster: Roster
  characters: CharacterStore
  inventory: InventoryStore
  vitals: VitalsStore
  /**
   * Import or re-sync a character from D&D Beyond (MYDND-7). `targetPath`
   * forces the note written, for re-syncing one in place. Resolves to `true`
   * when the character was written.
   */
  importCharacter(ddbId: string, targetPath?: string | null): Promise<boolean>
  /**
   * Bake, project and write a new Vault character from its choices (MYDND-23).
   * Resolves to the note's path, or `null` when the write was refused (the
   * reason is already on screen).
   *
   * `targetPath` saves over an existing Vault character — the builder's edit
   * mode (MYDND-24) — keeping its `local:` id and its note name.
   */
  saveVaultCharacter(json: VaultCharacterJson, targetPath?: string | null): Promise<string | null>
  /** Re-project a Vault character's charsheet from its own choices. */
  rebuildVaultCharacter(path: string): Promise<boolean>
  /**
   * The roster's D&D Beyond half, from the private ddbImport domain
   * (MYDND-196). `null` where D&D Beyond cannot be reached — the SRD edition,
   * the web build, the harness by default.
   */
  ddb: DdbRosterSlot | null
  /**
   * The inventory's quirk list, from the private crafting domain (MYDND-52,
   * MYDND-200). `null` where there is no crafting — the SRD edition, the
   * harness by default — and then a row's quirks are not offered at all.
   */
  QuirkList: ComponentType<{ quirks: readonly Quirk[] }> | null
}

/**
 * What the roster draws where D&D Beyond can be reached (MYDND-196). It was a
 * branch on `import.meta.env.SRD_ONLY` in `CharactersPage` and `CharacterCard`;
 * as a slot, those files read the same in this repository and the public one,
 * and the pieces live in `ddbImport/ui/rosterSlot`, which the SRD edition drops.
 *
 * With none, the roster offers no import, no convert and no bulk re-sync, and a
 * card's re-sync says why rather than calling `importCharacter`.
 */
export interface DdbRosterSlot {
  /** The inline import box: a URL or id, then the conversion review (MYDND-105). */
  ImportButton: ComponentType
  /** Re-sync every D&D Beyond character in turn. */
  ResyncAllButton: ComponentType<{ entries: RosterEntry[] }>
  /** What the empty roster says about getting a character. */
  emptyNote: string
  /** What the roster's add card says about getting a character. */
  addNote: string
}

const CharactersContext = createContext<CharactersHost | null>(null)

export function CharactersProvider({
  roster,
  characters,
  inventory,
  vitals,
  importCharacter,
  saveVaultCharacter,
  rebuildVaultCharacter,
  ddb,
  QuirkList,
  children,
}: Pick<CharactersHost, 'roster' | 'characters' | 'inventory' | 'vitals'> & {
  /**
   * Optional so the harness can mount pages without one; the default refuses
   * rather than pretending to succeed, so a test that exercises the button
   * sees a failure rather than a false pass. Absent too where D&D Beyond
   * cannot be reached — the SRD edition.
   */
  importCharacter?: CharactersHost['importCharacter']
  /** Optional, and refusing by default, for the same reason. */
  saveVaultCharacter?: CharactersHost['saveVaultCharacter']
  rebuildVaultCharacter?: CharactersHost['rebuildVaultCharacter']
  /** The two slots `app` fills from the private domains; absent is `null`. */
  ddb?: NonNullable<CharactersHost['ddb']>
  QuirkList?: NonNullable<CharactersHost['QuirkList']>
  children: ReactNode
}) {
  const host = useMemo<CharactersHost>(
    () => ({
      roster,
      characters,
      inventory,
      vitals,
      importCharacter: importCharacter ?? (() => Promise.resolve(false)),
      saveVaultCharacter: saveVaultCharacter ?? (() => Promise.resolve(null)),
      rebuildVaultCharacter: rebuildVaultCharacter ?? (() => Promise.resolve(false)),
      ddb: ddb ?? null,
      QuirkList: QuirkList ?? null,
    }),
    [roster, characters, inventory, vitals, importCharacter, saveVaultCharacter, rebuildVaultCharacter, ddb, QuirkList],
  )
  return <CharactersContext.Provider value={host}>{children}</CharactersContext.Provider>
}

/** Deliberately not defaulted to a stub — a missing provider is a wiring bug. */
export function useCharacters(): CharactersHost {
  const host = useContext(CharactersContext)
  if (!host) throw new Error('useCharacters must be used inside a CharactersProvider')
  return host
}

/**
 * The host, or `null` with no provider — for a catalog detail pane that offers
 * "add to a character" in the pane and is read-only in a spell window, which
 * mounts the compendium alone (`SpellView`).
 */
export function useOptionalCharacters(): CharactersHost | null {
  return useContext(CharactersContext)
}
