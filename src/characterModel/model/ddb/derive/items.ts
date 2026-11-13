import { getCurrency } from '@vault/derive/ddbDerive.js'

import type { DdbPayload } from '../payload'
import type { SheetCurrency, SheetItem } from '../../sheet/sheet'

// Items and currency, as D&D Beyond lists them.
// One file of the D&D Beyond derivation (MYDND-197); index.ts says what it is and why it is kept.

/**
 * The inventory D&D Beyond reports, as the read-only list `Sheet.ddb_items`
 * carries (MYDND-37). The-vault's `ItemsPanel` `deriveItems`, minus the
 * character name and the link — one character per sheet, and nothing here
 * links out to D&D Beyond.
 *
 * Two departures, both measured on a real payload rather than guessed:
 *
 * - **A quantity of 0 is dropped.** D&D Beyond keeps a drunk potion as a
 *   zero-quantity row until someone deletes it; the web app showed it as
 *   `0 ×`, which reads as a bug rather than as "used".
 * - **`rarity` is null on mundane gear.** D&D Beyond says `Common` on a
 *   backpack, and a Common badge on every rope and bedroll buries the one
 *   common *magic* item among them. `magic` is the honest signal.
 */
export function buildDdbItems(payload: DdbPayload): SheetItem[] {
  const out: SheetItem[] = []
  for (const item of Array.isArray(payload?.inventory) ? payload.inventory : []) {
    const def = item?.definition
    const name = typeof def?.name === 'string' ? def.name.trim() : ''
    if (!name) continue
    const quantity = typeof item?.quantity === 'number' ? item.quantity : 1
    if (quantity <= 0) continue
    const magic = def?.magic === true
    out.push({
      name,
      quantity,
      type: def?.type || def?.filterType || null,
      rarity: magic && def?.rarity ? def.rarity.toLowerCase() : null,
      magic,
      equipped: item?.equipped === true,
      attuned: item?.isAttuned === true,
    })
  }
  return out
}

/** The D&D Beyond purse, every denomination floored at 0: `ddbDerive`'s `getCurrency` since MYDND-140. */
export function buildDdbCurrency(payload: DdbPayload): SheetCurrency {
  return getCurrency(payload)
}
