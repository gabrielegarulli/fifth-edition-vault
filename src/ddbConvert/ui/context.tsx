import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import type { DdbPayload } from '../../characterModel'
import type { ConvertInput } from '../../characters/host'
import type { ConversionCatalog } from '../../choices'
import type { DdbFile } from '../model/file'
import type { NewNote, NoteOutcome } from '../model/missing'

/**
 * Converting a D&D Beyond character into a Vault character (MYDND-105), from
 * a fetch or from a file the player saved (MYDND-257). **Public:** the file
 * needs no network, so the SRD edition has this domain and not `ddbImport`.
 *
 * The fetch and the write are injected, like the characters domain's actions,
 * because the real ones need the plugin's settings and the host `App`.
 */
export interface DdbConvertHost {
  /**
   * Fetch a D&D Beyond payload for the review. `null` where the host cannot
   * reach D&D Beyond: the SRD edition, the web build. Throws on a failed
   * fetch, with the reason.
   */
  fetchDdbPayload: ((ddbId: string) => Promise<DdbPayload>) | null
  /**
   * Write a reviewed conversion as a Vault character. Resolves to the note's
   * path, or `null` when the write was refused (the reason is on screen).
   * `null` itself where nothing can be written: the web build.
   */
  convertDdbCharacter: ((input: Omit<ConvertInput, 'savePortrait'>) => Promise<string | null>) | null
  /**
   * Write the notes a conversion found none for, before the character
   * (MYDND-273): into the homebrew folder's `Imported from D&D Beyond`, each
   * checked as a builder checks it. One outcome per note, in order; `catalog`
   * is what the name check looks in. `null` where there are no note builders:
   * the web build (ADR 0014), and the harness by default.
   */
  createNotes: ((notes: readonly NewNote[], catalog: ConversionCatalog) => Promise<NoteOutcome[]>) | null
  /**
   * The file last picked, held above the router so the review survives a trip
   * to a note builder and back. One at a time: a second pick replaces it.
   */
  file: DdbFile | null
  holdFile: (file: DdbFile) => void
}

const DdbConvertContext = createContext<DdbConvertHost | null>(null)

export function DdbConvertProvider({
  fetchDdbPayload,
  convertDdbCharacter,
  createNotes,
  children,
}: {
  /** Absent where D&D Beyond cannot be reached; see `DdbConvertHost.fetchDdbPayload`. */
  fetchDdbPayload?: (ddbId: string) => Promise<DdbPayload>
  /** Absent where nothing can be written: the web build, and the harness by default. */
  convertDdbCharacter?: NonNullable<DdbConvertHost['convertDdbCharacter']>
  /** Absent where there are no note builders; see `DdbConvertHost.createNotes`. */
  createNotes?: NonNullable<DdbConvertHost['createNotes']>
  children: ReactNode
}) {
  const [file, setFile] = useState<DdbFile | null>(null)
  const holdFile = useCallback((f: DdbFile) => setFile(f), [])
  const host = useMemo<DdbConvertHost>(
    () => ({
      fetchDdbPayload: fetchDdbPayload ?? null,
      convertDdbCharacter: convertDdbCharacter ?? null,
      createNotes: createNotes ?? null,
      file,
      holdFile,
    }),
    [fetchDdbPayload, convertDdbCharacter, createNotes, file, holdFile],
  )
  return <DdbConvertContext.Provider value={host}>{children}</DdbConvertContext.Provider>
}

/** Deliberately not defaulted to a stub — a missing provider is a wiring bug. */
export function useDdbConvert(): DdbConvertHost {
  const host = useContext(DdbConvertContext)
  if (!host) throw new Error('useDdbConvert must be used inside a DdbConvertProvider')
  return host
}
