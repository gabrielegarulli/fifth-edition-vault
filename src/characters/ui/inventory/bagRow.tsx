import { useState } from 'react'
import { Notice } from 'obsidian'
import { attunementBlockedReason, requiresAttunement } from '@vault/derive/attunement.js'
import { bearingCost, isCursed, isWorn, SLOT_LABELS } from '@vault/derive/loadout.js'

import { chargeCount, rechargeLine, rarityColorVar, type MagicItemRow } from '../../../compendium'
import {
  type RosterEntry,
  isEssence,
  rowLabel,
  type BagTab,
  type HydratedRow,
  type InventoryCatalogs,
  type InventoryItem,
} from '../../../characterModel'
import { openNote, useObsidian } from '../../../platform/host'
import { useCharacters } from '../context'

import { ROW, NAME_CELL, PLAIN, LINK } from './shared'
import { ChargeControl, EquipControl } from './controls'

// One item in the bag, with its controls.
// One file of the sheet's inventory (MYDND-197); CharacterInventory.tsx says what it is.

export function BagRow({
  item,
  row,
  allRows,
  entry,
  catalogs,
  loadout,
  tab,
  onTransfer,
}: {
  item: InventoryItem
  row: HydratedRow
  allRows: HydratedRow[]
  entry: RosterEntry
  catalogs: InventoryCatalogs & { paths: Map<string, string> }
  loadout: boolean
  tab: BagTab
  onTransfer: (item: InventoryItem, label: string) => void
}) {
  const app = useObsidian()
  const { inventory: inventoryStore, QuirkList } = useCharacters()
  const [busy, setBusy] = useState(false)
  const [showQuirks, setShowQuirks] = useState(false)
  // A spend or regain shows at once, before the write comes back round as a new
  // read of the inventory — which then replaces it, keyed on the row object.
  const [pendingUsed, setPendingUsed] = useState<{ of: InventoryItem; used: number } | null>(null)
  const label = labelOf(item, new Map([[row.id, row]]))
  const notePath = catalogs.paths.get(item.magic_item_id ? `m:${item.magic_item_id}` : `i:${item.content_item_id ?? ''}`)
  // `isWorn` means slotted; without the loadout system `equipped` is all there is.
  const worn = isWorn(row) || Boolean(item.equipped)
  const cursed = isCursed(row)
  const cost = bearingCost(row)
  const needsAttunement = requiresAttunement(row)
  const attuneBlocked = needsAttunement ? attunementBlockedReason(row, allRows) : null
  const rarity = row.magic_item?.rarity_id ?? null
  const magicItem = magicItemOf(item, catalogs.magicItems)
  const maxCharges = magicItem ? chargeCount(magicItem) : null
  const chargesUsed = pendingUsed?.of === item ? pendingUsed.used : (item.charges_used ?? 0)

  async function run(what: string, op: () => Promise<{ error?: string | null } | void>) {
    setBusy(true)
    try {
      const res = await op()
      if (res && res.error) new Notice(`${what}: ${res.error}`)
    } catch (err) {
      new Notice(`${what}: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  const setQty = (n: number) =>
    run('Could not change the quantity', () => inventoryStore.updateItem(entry.path, item.id, { quantity: n }).then(() => undefined))

  const setChargesUsed = (used: number) => {
    const clamped = Math.max(0, Math.min(maxCharges ?? 0, Math.floor(used)))
    setPendingUsed({ of: item, used: clamped })
    void inventoryStore.updateItem(entry.path, item.id, { charges_used: clamped }).catch(err => {
      setPendingUsed(null)
      new Notice(`Could not update charges: ${err instanceof Error ? err.message : String(err)}`)
    })
  }

  return (
    <div className={ROW}>
      <span className={NAME_CELL}>
        {notePath ? (
          <button
            type="button"
            className={`${PLAIN} truncate text-left text-normal hover:underline`}
            style={rarity && tab === 'items' ? { color: `var(${rarityColorVar(rarity)})` } : undefined}
            onClick={() => openNote(app, notePath)}
            title="Open note"
          >
            {label}
          </button>
        ) : (
          <span className="truncate text-normal">{label}</span>
        )}
        {tab === 'components' && isEssence(item) ? <span className="badge text-obs-purple">essence</span> : null}
        {worn ? (
          <span className="badge text-normal">
            {item.loadout_slot ? SLOT_LABELS[item.loadout_slot] ?? item.loadout_slot : 'equipped'}
          </span>
        ) : null}
        {item.attuned ? <span className="badge">attuned</span> : null}
        {cursed ? <span className="badge text-error">cursed</span> : null}
        {QuirkList && item.quirks?.length ? (
          // A toggle, not a count (MYDND-52): what each quirk does is below.
          // Offered only where the list can be drawn, so the SRD edition, which
          // has no crafting, shows no toggle that opens nothing (MYDND-200).
          <button
            type="button"
            className={`${PLAIN} badge`}
            aria-expanded={showQuirks}
            onClick={() => setShowQuirks(s => !s)}
          >
            {item.quirks.length} quirk{item.quirks.length === 1 ? '' : 's'} {showQuirks ? '▴' : '▾'}
          </button>
        ) : null}
        {loadout && cost > 0 ? <span className="text-smallest text-faint">{cost} b</span> : null}
      </span>

      <span className="flex items-center gap-1">
        <button
          type="button"
          className="clickable-icon"
          aria-label={`One fewer ${label}`}
          disabled={busy || item.quantity <= 1}
          onClick={() => void setQty(item.quantity - 1)}
        >
          −
        </button>
        <span className="min-w-6 text-center tabular-nums text-normal">{item.quantity}</span>
        <button
          type="button"
          className="clickable-icon"
          aria-label={`One more ${label}`}
          disabled={busy}
          onClick={() => void setQty(item.quantity + 1)}
        >
          +
        </button>
      </span>

      <span className="flex flex-wrap items-center gap-2">
        {tab !== 'components' ? (
          <EquipControl
            label={label}
            row={row}
            worn={worn}
            loadout={loadout}
            busy={busy}
            onEquipSlot={slot =>
              void run('Cannot equip', () =>
                inventoryStore.equipItem({ characterPath: entry.path, itemId: item.id, slot, content: catalogs }),
              )
            }
            onToggle={on =>
              void run(on ? 'Cannot equip' : 'Cannot unequip', () =>
                loadout && !on
                  ? inventoryStore.unequipItem({ characterPath: entry.path, itemId: item.id, content: catalogs })
                  : inventoryStore.setEquipped({ characterPath: entry.path, itemId: item.id, on, content: catalogs }),
              )
            }
          />
        ) : null}
        {needsAttunement ? (
          <button
            type="button"
            className={LINK}
            disabled={busy || attuneBlocked != null}
            title={attuneBlocked ?? undefined}
            onClick={() =>
              void run(item.attuned ? 'Cannot break attunement' : 'Cannot attune', () =>
                inventoryStore.setAttuned({ characterPath: entry.path, itemId: item.id, on: !item.attuned, content: catalogs }),
              )
            }
          >
            {item.attuned ? 'Unattune' : 'Attune'}
          </button>
        ) : null}
        <button type="button" className={LINK} disabled={busy} onClick={() => onTransfer(item, label)}>
          Give
        </button>
        <button
          type="button"
          className={`${LINK} text-error`}
          disabled={busy || (worn && cursed)}
          title={worn && cursed ? 'A cursed item cannot be put down.' : undefined}
          onClick={() => void run('Could not remove it', () => inventoryStore.removeItem(entry.path, item.id))}
        >
          Remove
        </button>
      </span>
      {maxCharges !== null && magicItem ? (
        <ChargeControl
          label={label}
          max={maxCharges}
          used={chargesUsed}
          recharge={rechargeLine(magicItem)}
          busy={busy}
          onSetUsed={setChargesUsed}
        />
      ) : null}
      {QuirkList && showQuirks && item.quirks?.length ? <QuirkList quirks={item.quirks} /> : null}
    </div>
  )
}

function labelOf(item: InventoryItem, rowById: Map<string, HydratedRow>): string {
  const row = rowById.get(item.id)
  return rowLabel(item, row?.magic_item?.name ?? row?.content_item?.name ?? null)
}

function magicItemOf(
  item: InventoryItem,
  magicItems: InventoryCatalogs['magicItems'],
): MagicItemRow | null {
  if (!item.magic_item_id || !magicItems) return null
  const found =
    magicItems.byId(item.magic_item_id) ??
    magicItems.byName?.(item.magic_item_id) ??
    (item.name ? magicItems.byName?.(item.name) : undefined) ??
    null
  return (found as MagicItemRow | null) ?? null
}
