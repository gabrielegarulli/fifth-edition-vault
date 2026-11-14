import { Notice } from 'obsidian'
import { bearingCost, bearingMax as calculateBearingMax, bearingUsed, blockedSlots, SLOT_LABELS, SLOTS } from '@vault/derive/loadout.js'

import type { RosterEntry, HydratedRow, InventoryCatalogs } from '../../../characterModel'
import { useCharacters } from '../context'

import { LINK, Slot } from './shared'

// The loadout: what is in each equipment slot.
// One file of the sheet's inventory (MYDND-197); CharacterInventory.tsx says what it is.

/** The paper doll and Bearing — what `/inventory` showed, moved here. */
export function Loadout({ entry, rows, catalogs }: { entry: RosterEntry; rows: HydratedRow[]; catalogs: InventoryCatalogs }) {
  const { inventory } = useCharacters()
  const max = calculateBearingMax(entry.sheet ?? null, rows)
  const used = bearingUsed(rows)
  const blocked = blockedSlots(rows) as Record<string, { reason: string }>
  const over = used > max

  return (
    <div className="flex flex-col gap-2">
      <span className={over ? 'text-smaller font-semibold text-error' : 'text-smaller font-semibold text-normal'}>
        Bearing {used} / {max}
        {over ? ' — overbearing: speed −10 ft, disadvantage on physical checks' : ''}
      </span>
      <div className="panel-container">
        {SLOTS.map((slot: string) => {
          const label = SLOT_LABELS[slot] ?? slot
          const held = rows.find(r => r.loadout_slot === slot)
          const why = blocked[slot]
          return (
            <Slot key={slot} label={label} dim={!held && !!why}>
              {held ? (
                <>
                  <span className="cell-title">{held.magic_item?.name ?? held.content_item?.name ?? 'Item'}</span>
                  {bearingCost(held) > 0 ? <span className="text-smallest text-faint">{bearingCost(held)} b</span> : null}
                  <button
                    type="button"
                    className={LINK}
                    onClick={() =>
                      void inventory
                        .unequipItem({ characterPath: entry.path, itemId: held.id, content: catalogs })
                        .then(res => {
                          if (res.error) new Notice(`Cannot unequip: ${res.error}`)
                        })
                    }
                  >
                    Unequip
                  </button>
                </>
              ) : (
                <span className="cell-title italic text-faint">{why ? why.reason : 'Empty'}</span>
              )}
            </Slot>
          )
        })}
      </div>
    </div>
  )
}
