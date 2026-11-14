import { ATTUNEMENT_LIMIT, attunedCount, requiresAttunement } from '@vault/derive/attunement.js'

import type {
  RosterEntry,
  SheetItem,
  BagTab,
  HydratedRow,
  InventoryCatalogs,
  InventoryItem,
} from '../../../characterModel'
import type { MagicItemRow } from '../../../compendium'

import { BagRow } from './bagRow'
import { DdbItems } from './ddbItems'

// The bag's rows for one tab, or what to say when it is empty.
// One file of the sheet's inventory (MYDND-197); CharacterInventory.tsx says what it is.

export function Rows({
  tab,
  entry,
  bag,
  allRows,
  rowById,
  catalogs,
  loadout,
  onTransfer,
  ddbItems,
  magicItems,
  isLocal,
}: {
  tab: BagTab
  entry: RosterEntry
  bag: InventoryItem[]
  allRows: HydratedRow[]
  rowById: Map<string, HydratedRow>
  catalogs: InventoryCatalogs & { paths: Map<string, string> }
  loadout: boolean
  onTransfer: (item: InventoryItem, label: string) => void
  ddbItems: SheetItem[]
  magicItems: readonly MagicItemRow[]
  isLocal: boolean
}) {
  const attuned = attunedCount(allRows)

  return (
    <div className="flex flex-col gap-3">
      {tab === 'items' && allRows.some(r => requiresAttunement(r)) ? (
        <span className="text-smallest text-muted">
          Attuned {attuned} / {ATTUNEMENT_LIMIT}
        </span>
      ) : null}

      {bag.length > 0 ? (
        <div className="panel-container">
          {bag.map(item => (
            <BagRow
              key={item.id}
              item={item}
              row={rowById.get(item.id)!}
              allRows={allRows}
              entry={entry}
              catalogs={catalogs}
              loadout={loadout}
              tab={tab}
              onTransfer={onTransfer}
            />
          ))}
        </div>
      ) : ddbItems.length === 0 ? (
        <p className="text-smaller text-muted">{emptyText(tab)}</p>
      ) : null}

      {ddbItems.length > 0 ? (
        <DdbItems items={ddbItems} magicItems={magicItems} />
      ) : tab === 'items' && !isLocal && !entry.sheet?.ddb_items ? (
        // A note imported before MYDND-37 has no `ddb_items` key at all, which
        // is different from carrying nothing — say how to fill it.
        <p className="text-smallest text-faint">Re-sync to bring in what this character carries on D&amp;D Beyond.</p>
      ) : null}
    </div>
  )
}

function emptyText(tab: BagTab): string {
  if (tab === 'equipment') return 'No equipment yet — + Add item to pick some from the catalog.'
  if (tab === 'items') return 'No magic items.'
  return 'No components — harvesting puts them here.'
}
