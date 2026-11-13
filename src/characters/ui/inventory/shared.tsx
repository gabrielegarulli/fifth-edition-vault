import type { ReactNode } from 'react'

import type { BagTab, InventoryItem } from '../../../characterModel'

// What the inventory's pieces share: the row styles, the tab and form a row reads, a slot.
// One file of the sheet's inventory (MYDND-197); CharacterInventory.tsx says what it is.

export type Tab = BagTab | 'loadout'

export type Form = { kind: 'add' } | { kind: 'coins' } | { kind: 'transfer'; item: InventoryItem; label: string } | null

export const SECTION_TITLE = 'text-smallest font-semibold uppercase tracking-wide text-faint'

export const ROW = 'flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-background-modifier-border px-3 py-1.5 last:border-b-0'

// A real basis, not `flex-1`: `flex-wrap` wraps on what an item asks for, and
// `flex-1` asks for nothing, so a narrow row kept its controls and left the name
// a few characters. Asking for 15rem takes the name a line of its own instead.
export const NAME_CELL = 'flex min-w-0 flex-[1_1_15rem] flex-wrap items-center gap-x-1.5 gap-y-1'

export const PLAIN = 'h-auto border-none bg-transparent p-0 shadow-none'

export const LINK = 'btn-ui-link'

export function Slot({ label, dim, children }: { label: string; dim: boolean; children: ReactNode }) {
  return (
    <div className={`${ROW} ${dim ? 'opacity-60' : ''}`}>
      <span className="w-24 shrink-0 text-smallest uppercase text-faint">{label}</span>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
