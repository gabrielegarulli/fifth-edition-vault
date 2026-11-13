import { useMemo } from 'react'

import { rarityColorVar, type MagicItemRow } from '../../../compendium'
import type { SheetItem } from '../../../characterModel'
import { openNote, useObsidian } from '../../../platform/host'

import { SECTION_TITLE, ROW, NAME_CELL, PLAIN } from './shared'

// A D&D Beyond character's items, as its sheet lists them.
// One file of the sheet's inventory (MYDND-197); CharacterInventory.tsx says what it is.

/** D&D Beyond's list: read-only, and linked to a magic item's note when one exists. */
export function DdbItems({ items, magicItems }: { items: SheetItem[]; magicItems: readonly MagicItemRow[] }) {
  const app = useObsidian()
  const byName = useMemo(() => new Map(magicItems.map(m => [m.name.toLowerCase(), m.path])), [magicItems])
  return (
    <div className="flex flex-col gap-1">
      <span className={SECTION_TITLE}>On D&amp;D Beyond</span>
      <div className="panel-container">
        {items.map((item, i) => {
          const path = item.magic ? byName.get(item.name.toLowerCase()) : undefined
          const style = item.rarity ? { color: `var(${rarityColorVar(item.rarity)})` } : undefined
          return (
            <div key={`${item.name}-${i}`} className={ROW}>
              <span className={NAME_CELL}>
                {path ? (
                  <button
                    type="button"
                    className={`${PLAIN} truncate text-left hover:underline`}
                    style={style}
                    onClick={() => openNote(app, path)}
                    title="Open note"
                  >
                    {item.name}
                  </button>
                ) : (
                  <span className="truncate text-normal" style={style}>
                    {item.name}
                  </span>
                )}
                {item.equipped ? <span className="badge text-normal">equipped</span> : null}
                {item.attuned ? <span className="badge">attuned</span> : null}
              </span>
              {item.type ? <span className="text-smallest text-faint">{item.type}</span> : null}
              <span className="min-w-6 text-right tabular-nums text-muted">×{item.quantity}</span>
            </div>
          )
        })}
      </div>
      <span className="text-smallest text-faint">Read-only — D&amp;D Beyond owns this list, and a re-sync replaces it.</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loadout
// ---------------------------------------------------------------------------
