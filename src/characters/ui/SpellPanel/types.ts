import type { Sheet, Vitals, VaultCharacterJson } from '../../../characterModel'
import type { SpellSlotActions } from '../hooks/useVitals'

// The panel's props, and the shapes its lists share.
// One file of the sheet's spell panel (MYDND-197); index.ts says what the panel is.

export interface SpellPanelProps {
  sheet: Sheet
  notePath: string
  vitals: Vitals
  actions: SpellSlotActions
  busy: boolean
  /** The vault generation, so a Vault character's list is re-read after a write. */
  generation: number
}

export type Loaded = { key: string; json: VaultCharacterJson | null; error: string | null }

/** Which add-picker is open: a rank, or 0 for cantrips. */
export type Picking = number | null

/** A spell in the book: written by a level, or free from a feature (`freeFrom`, MYDND-183). */
export interface BookSpell {
  id: string
  name: string
  level?: number
  freeFrom: string | null
}
