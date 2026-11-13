import type { Sheet } from '../../characterModel'
import { extractVitalsFromNote, seedFromSheet, writeVitalsToNote, type Vitals } from '../../characterModel'
import type { StateVault } from '../../platform'

/**
 * The ` ```vault-vitals ` store: the one `Vault.process` write over a
 * character's vitals (MYDND-10).
 *
 * Everything it writes is decided by the pure half,
 * `characterModel/model/vitals.ts` (MYDND-200): the fence's shape, parsing and
 * serialising, and every transform a mutation applies. This file is only the
 * read-modify-write around them, so it stays in the state layer, whose rules
 * (ADR 0003) apply to it and to nothing below it.
 */

export interface VitalsStore {
  /** Read one character's vitals. */
  read(characterPath: string): Promise<Vitals>
  /**
   * Apply a pure transform and write the result — one `vault.write`, which is
   * one file write.
   *
   * Every mutation below goes through this, so "one mutation is one file write"
   * is structural here too and not a convention per method.
   */
  mutate(characterPath: string, transform: (vitals: Vitals, sheet: Sheet | null) => Vitals): Promise<Vitals>
}

/**
 * The sheet a transform is handed, read out of the same note.
 *
 * Passed in as a reader rather than imported, because `readSheetFromNote` needs
 * a YAML parser and this module's own is the `yaml` package — the state layer
 * parses and serialises with one library in both directions (ADR 0003, rule 3).
 */
export type SheetReader = (markdown: string) => Sheet | null

export function createVitals(
  vault: StateVault,
  readSheet: SheetReader,
  now: () => Date = () => new Date(),
): VitalsStore {
  const read = async (characterPath: string): Promise<Vitals> => {
    const markdown = await vault.read(characterPath)
    return extractVitalsFromNote(markdown ?? '')
  }

  const mutate = async (
    characterPath: string,
    transform: (vitals: Vitals, sheet: Sheet | null) => Vitals,
  ): Promise<Vitals> => {
    // The timestamp is taken here, once, and closed over — never inside the
    // transform. `Vault.process` re-runs the transform if the file changed
    // underneath, and a `new Date()` in there would write a different value on
    // the retry than the one this call reports back.
    const updatedAt = now().toISOString()
    let result: Vitals | null = null

    await vault.write(characterPath, markdown => {
      const sheet = readSheet(markdown)
      // Seeded unconditionally and idempotently, so the *first* mutation starts
      // the overlay where the import left off rather than at full health. See
      // the `present` note at the top of `characterModel/model/vitals.ts`.
      const vitals = seedFromSheet(extractVitalsFromNote(markdown), sheet)
      const next = transform(vitals, sheet)
      result = next
      return writeVitalsToNote(markdown, next, updatedAt)
    })

    // `null` only if the vault never called the transform, which no
    // implementation does — but refusing to invent a value is cheaper than
    // explaining a zeroed sheet.
    if (result === null) throw new Error(`Nothing was written to ${characterPath}`)
    return { ...(result as Vitals), updatedAt }
  }

  return { read, mutate }
}
