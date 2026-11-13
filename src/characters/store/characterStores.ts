import { mirroringVault } from './atlasMirror'
import { createCharacterStore } from './characters'
import { createInventory } from './inventory'
import { fromYaml } from '../../platform'
import type { StateVault } from '../../platform'
import { createVitals } from './vitals'
import { readSheetFromNote } from '../../characterModel'

/**
 * The three stores that write a character note: the sheet, the inventory and
 * the vitals (MYDND-199).
 *
 * Split out of `createState` so the characters domain can build its own stores
 * — `vaultCharacterActions`, the D&D Beyond import — without reaching up to
 * the app's composition for the whole state layer. `createState` builds these
 * here too, so there is one wiring of them, not two.
 *
 * Every store goes through the mirror, so the Atlas template's keys follow the
 * sheet, the vitals and the inventory in the same write as whatever changed
 * them (MYDND-190, `atlasMirror.ts`).
 */
export function createCharacterStores(vault: StateVault) {
  const characterVault = mirroringVault(vault)
  return {
    characters: createCharacterStore(characterVault),
    inventory: createInventory(characterVault),
    // The sheet reader is injected rather than imported inside `vitals.ts`,
    // which keeps that module's only YAML dependency the `yaml` package — the
    // state layer parses and serialises with one library in both directions.
    vitals: createVitals(characterVault, markdown => readSheetFromNote(markdown, fromYaml)),
  }
}

export type CharacterStores = ReturnType<typeof createCharacterStores>
