import { useMemo, useState, type ReactNode } from 'react'
import { Notice } from 'obsidian'
import { ATTUNEMENT_LIMIT, attunedCount, attunementBlockedReason, requiresAttunement } from '@vault/derive/attunement.js'
import {
  bearingCost,
  bearingMax as calculateBearingMax,
  bearingUsed,
  blockedSlots,
  isCursed,
  isWorn,
  legalSlots,
  SLOT_LABELS,
  SLOTS,
} from '@vault/derive/loadout.js'

import { chargeCount, chargesChip, rechargeLine } from '../../catalog/itemShelves'
import { rarityColorVar } from '../../catalog/labels'
import { useContent } from '../../ContentContext'
import type { RosterEntry } from '../../content/index'
import type { ItemRow, MagicItemRow } from '../../content/items'
import { nameKey } from '../../content/names'
import type { SheetItem } from '../../ddb/sheet'
import { useActiveCampaign } from '../../hooks/useCampaigns'
import { useInventory } from '../../hooks/useInventory'
import { useCatalogRows, useVaultGeneration } from '../../hooks/useVaultGeneration'
import { isEssence, pouchGp, rowLabel, sortDdbItems, splitBag, type BagTab } from '../../inventory/bag'
import { openNote, useObsidian } from '../../ObsidianContext'
import { hydrateRow, type HydratedRow, type InventoryCatalogs, type InventoryItem } from '../../state/inventory'
import { itemDataSource } from '../../sheet/equipment'
import { useStateHost } from '../../StateContext'
import { Icon } from '../Icon'
import { AddItemForm, CoinsForm, TransferForm } from './forms'
/**
 * A character's inventory — the-vault's sheet tabs, in a pane (MYDND-37).
 *
 * The web sheet carried two tabs for this: **Inventory** (a coin strip over
 * three sub-tabs, `EquipmentPanel` / `ItemsPanel` / `ComponentsPanel`) and,
 * under the loadout system, **Loadout** (the paper doll and Bearing). Here they
 * are one panel with four sub-tabs, because the plugin's sheet is one column
 * and a second top-level tab would be a second scroll position to lose.
 *
 * ## Two sources, never merged
 *
 * - **` ```vault-inventory `** — what the character holds *in the Vault*: every
 *   row here can be equipped, attuned, given away, removed. Its writes go through
 *   `state.inventory`, which enforces the rules (Bearing, slots, curses, the
 *   three-item attunement limit) — this panel only asks.
 * - **`sheet.ddb_items`** — what D&D Beyond says the character carries,
 *   read-only and replaced on every re-sync, exactly as the web Items tab read
 *   the payload. Merging it into the fence would make a re-sync either duplicate
 *   it or decide what the player meant to keep.
 *
 * The sheet's Inventory tab is the only place a bag is shown (MYDND-159).
 */

type Tab = BagTab | 'loadout'
type Form = { kind: 'add' } | { kind: 'coins' } | { kind: 'transfer'; item: InventoryItem; label: string } | null

const SECTION_TITLE = 'text-smallest font-semibold uppercase tracking-wide text-faint'
const ROW = 'flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-background-modifier-border px-3 py-1.5 last:border-b-0'
// A real basis, not `flex-1`: `flex-wrap` wraps on what an item asks for, and
// `flex-1` asks for nothing, so a narrow row kept its controls and left the name
// a few characters. Asking for 15rem takes the name a line of its own instead.
const NAME_CELL = 'flex min-w-0 flex-[1_1_15rem] flex-wrap items-center gap-x-1.5 gap-y-1'
const PLAIN = 'h-auto border-none bg-transparent p-0 shadow-none'
const LINK = 'btn-ui-link'

export interface CharacterInventoryProps {
  entry: RosterEntry
  roster: readonly RosterEntry[]
}

export function CharacterInventory({ entry, roster }: CharacterInventoryProps) {
  const content = useContent()
  const generation = useVaultGeneration()
  const campaign = useActiveCampaign()
  const loadout = campaign?.loadoutSystem === true
  const { inventory, loading } = useInventory(entry.path, generation)

  const [tab, setTab] = useState<Tab>('equipment')
  const [form, setForm] = useState<Form>(null)

  // Catalog lookups go through `useCatalogRows` and a map — never `byId` in a
  // render, which walks every note in the folder (content-layer rule 1).
  const items = useCatalogRows(() => content.items.list())
  const magicItems = useCatalogRows(() => content.magicItems.list())
  // `source` reads an item's fence when a write needs its dice or AC (MYDND-57).
  const catalogs = useMemo(
    () => ({ ...lookup(items, magicItems), source: itemDataSource(content) }),
    [items, magicItems, content],
  )

  const rows = useMemo(() => inventory.items.map(it => hydrateRow(it, catalogs)), [inventory.items, catalogs])
  const rowById = useMemo(() => new Map(rows.map(r => [r.id, r])), [rows])

  const bag = splitBag(inventory.items)
  const ddbItems = useMemo(() => sortDdbItems(entry.sheet?.ddb_items ?? []), [entry.sheet])

  // Under the loadout system the slot is what equips; otherwise there are no
  // slots, and the Loadout tab would be a paper doll nothing can be put on.
  const activeTab: Tab = tab === 'loadout' && !loadout ? 'equipment' : tab
  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: 'equipment', label: 'Equipment', count: bag.equipment.length },
    { id: 'items', label: 'Items', count: bag.items.length + ddbItems.length },
    { id: 'components', label: 'Components', count: bag.components.length },
    ...(loadout ? [{ id: 'loadout' as const, label: 'Loadout', count: rows.filter(r => r.loadout_slot).length }] : []),
  ]

  const ddbPurse = entry.sheet?.ddb_currency
  const purseShown = ddbPurse && Object.values(ddbPurse).some(v => v > 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={SECTION_TITLE}>Inventory</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" className="btn-ui-primary" onClick={() => setForm({ kind: 'coins' })}>
            Coins
          </button>
          <button type="button" className="mod-cta" onClick={() => setForm({ kind: 'add' })}>
            + Add item
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" aria-label="Coin pouch">
        {(['pp', 'gp', 'sp', 'cp'] as const).map(k => (
          <span key={k} className="chip-compact">
            <span className="text-smallest uppercase text-faint">{k}</span>
            <span className="font-semibold tabular-nums text-normal">{(inventory.currency[k] || 0).toLocaleString()}</span>
          </span>
        ))}
        <span className="chip-compact">
          <span className="text-smallest uppercase text-faint">total</span>
          <span className="font-semibold tabular-nums text-normal">{pouchGp(inventory.currency).toLocaleString()} gp</span>
        </span>
      </div>
      {purseShown ? (
        <p className="text-smallest text-muted">
          On D&amp;D Beyond:{' '}
          {(['pp', 'gp', 'ep', 'sp', 'cp'] as const)
            .filter(k => ddbPurse[k] > 0)
            .map(k => `${ddbPurse[k].toLocaleString()} ${k}`)
            .join(', ')}{' '}
          — not in the pouch above; move it across with Coins if the Vault should spend it.
        </p>
      ) : null}

      {form?.kind === 'add' ? (
        <AddItemForm
          characterPath={entry.path}
          characterName={entry.name}
          items={items}
          magicItems={magicItems}
          onDone={() => setForm(null)}
        />
      ) : form?.kind === 'coins' ? (
        <CoinsForm characterPath={entry.path} characterName={entry.name} onDone={() => setForm(null)} />
      ) : form?.kind === 'transfer' ? (
        <TransferForm
          item={form.item}
          label={form.label}
          fromPath={entry.path}
          fromName={entry.name}
          roster={roster}
          content={catalogs}
          onDone={() => setForm(null)}
        />
      ) : null}

      <div className="flex flex-wrap gap-1" role="group" aria-label="Inventory sections">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            aria-current={activeTab === t.id ? 'true' : undefined}
            className={activeTab === t.id ? 'chip-filter-selected' : 'chip-filter'}
            onClick={() => setTab(t.id)}
          >
            {t.label} <span className="tabular-nums">{t.count}</span>
          </button>
        ))}
      </div>

      {loading && inventory.items.length === 0 ? (
        <p className="text-smaller text-muted">Reading the inventory…</p>
      ) : activeTab === 'loadout' ? (
        <Loadout entry={entry} rows={rows} catalogs={catalogs} />
      ) : (
        <Rows
          tab={activeTab}
          entry={entry}
          bag={bag[activeTab]}
          allRows={rows}
          rowById={rowById}
          catalogs={catalogs}
          loadout={loadout}
          onTransfer={(item, label) => setForm({ kind: 'transfer', item, label })}
          ddbItems={activeTab === 'items' ? ddbItems : []}
          magicItems={magicItems}
          isLocal={entry.ddbId.startsWith('local:')}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// The three lists
// ---------------------------------------------------------------------------

function Rows({
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
  onTransfer(item: InventoryItem, label: string): void
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

function BagRow({
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
  onTransfer(item: InventoryItem, label: string): void
}) {
  const app = useObsidian()
  const { state } = useStateHost()
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
    run('Could not change the quantity', () => state.inventory.updateItem(entry.path, item.id, { quantity: n }).then(() => undefined))

  const setChargesUsed = (used: number) => {
    const clamped = Math.max(0, Math.min(maxCharges ?? 0, Math.floor(used)))
    setPendingUsed({ of: item, used: clamped })
    void state.inventory.updateItem(entry.path, item.id, { charges_used: clamped }).catch(err => {
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
            {item.loadout_slot ? SLOT_LABELS[item.loadout_slot as keyof typeof SLOT_LABELS] ?? item.loadout_slot : 'equipped'}
          </span>
        ) : null}
        {item.attuned ? <span className="badge">attuned</span> : null}
        {cursed ? <span className="badge text-error">cursed</span> : null}
        {item.quirks?.length ? (
          // A toggle, not a count (MYDND-52): what each quirk does is below.
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
                state.inventory.equipItem({ characterPath: entry.path, itemId: item.id, slot, content: catalogs }),
              )
            }
            onToggle={on =>
              void run(on ? 'Cannot equip' : 'Cannot unequip', () =>
                loadout && !on
                  ? state.inventory.unequipItem({ characterPath: entry.path, itemId: item.id, content: catalogs })
                  : state.inventory.setEquipped({ characterPath: entry.path, itemId: item.id, on, content: catalogs }),
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
                state.inventory.setAttuned({ characterPath: entry.path, itemId: item.id, on: !item.attuned, content: catalogs }),
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
          onClick={() => void run('Could not remove it', () => state.inventory.removeItem(entry.path, item.id))}
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
      {null}
    </div>
  )
}

/**
 * Up to ten charges draw as pips — click a lit pip to spend down to it, or a
 * spent one to regain up to it, as `MagicItemLens` did (MYDND-76, MYDND-164).
 * Larger pools (20-charge Staff of Power, 50-charge Staff of the Magi) draw an
 * amount stepper like `Resources.tsx`'s `PointsRow`, so a 320px pane is never
 * flooded with fifty buttons.
 */
const MAX_CHARGE_PIPS = 10

function ChargeControl({
  label,
  max,
  used,
  recharge,
  busy,
  onSetUsed,
}: {
  label: string
  max: number
  used: number
  recharge: string | null
  busy: boolean
  onSetUsed(used: number): void
}) {
  const [amount, setAmount] = useState('')
  const clampedUsed = Math.min(max, Math.max(0, used))
  const left = max - clampedUsed
  const chip = chargesChip(max, clampedUsed)
  const groupLabel = `${label}: ${left} of ${max} ${max === 1 ? 'charge' : 'charges'} left`

  if (max <= MAX_CHARGE_PIPS) {
    return (
      <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-1">
        <span role="group" aria-label={groupLabel} className="flex flex-wrap items-center">
          {Array.from({ length: max }, (_, i) => {
            const lit = i < left
            const action = lit ? `Spend to ${i} left` : `Regain to ${i + 1} left`
            return (
              <button
                key={i}
                type="button"
                disabled={busy}
                aria-label={action}
                title={action}
                className={lit ? 'pip' : 'pip-spent'}
                onClick={() => onSetUsed(lit ? max - i : max - (i + 1))}
              />
            )
          })}
        </span>
        <span className={`font-mono text-smallest tabular-nums ${chip.tone === 'over' ? 'text-warning' : 'text-muted'}`}>
          {chip.text}
        </span>
        {recharge ? <span className="text-smallest text-faint">{recharge}</span> : null}
      </div>
    )
  }

  const parsed = amount.trim() === '' ? 1 : Math.floor(Number(amount))
  const canSpend = parsed >= 1 && parsed <= left
  const canRegain = parsed >= 1 && parsed <= clampedUsed
  const spend = (): void => {
    if (!canSpend) return
    onSetUsed(clampedUsed + parsed)
    setAmount('')
  }
  const regain = (): void => {
    if (!canRegain) return
    onSetUsed(clampedUsed - parsed)
    setAmount('')
  }

  return (
    <div role="group" aria-label={groupLabel} className="flex w-full flex-wrap items-center gap-x-2 gap-y-1">
      <input
        type="number"
        min={1}
        max={Math.max(left, clampedUsed, 1)}
        value={amount}
        placeholder="1"
        aria-label={`${label} charge amount`}
        className="w-16"
        disabled={busy}
        onChange={e => setAmount(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') spend()
        }}
      />
      <button type="button" disabled={busy || !canSpend} onClick={spend}>
        Spend
      </button>
      <button type="button" disabled={busy || !canRegain} onClick={regain}>
        Regain
      </button>
      {clampedUsed > 0 ? (
        <button
          type="button"
          className="clickable-icon"
          aria-label={`Refill ${label}`}
          title={`Refill ${label}`}
          disabled={busy}
          onClick={() => {
            onSetUsed(0)
            setAmount('')
          }}
        >
          <Icon name="rotate-ccw" />
        </button>
      ) : null}
      <span className={`font-mono text-smallest tabular-nums ${chip.tone === 'over' ? 'text-warning' : 'text-muted'}`}>
        {chip.text}
      </span>
      {recharge ? <span className="text-smallest text-faint">{recharge}</span> : null}
    </div>
  )
}

/**
 * Equipping, in whichever system the campaign plays: a slot under the loadout
 * system, a plain on/off otherwise — the web `EquipmentPanel`'s switch.
 */
function EquipControl({
  label,
  row,
  worn,
  loadout,
  busy,
  onEquipSlot,
  onToggle,
}: {
  label: string
  row: HydratedRow
  worn: boolean
  loadout: boolean
  busy: boolean
  onEquipSlot(slot: string): void
  onToggle(on: boolean): void
}) {
  if (worn) {
    return (
      <button type="button" className={LINK} disabled={busy} onClick={() => onToggle(false)}>
        Unequip
      </button>
    )
  }
  if (!loadout) {
    return (
      <button type="button" className={LINK} disabled={busy} onClick={() => onToggle(true)}>
        Equip
      </button>
    )
  }
  const legal = legalSlots(row) as string[]
  if (legal.length === 0) return null
  return (
    <select
      className="dropdown"
      aria-label={`Equip ${label} into a slot`}
      disabled={busy}
      value=""
      onChange={e => {
        if (e.target.value) onEquipSlot(e.target.value)
      }}
    >
      <option value="">Equip…</option>
      {legal.map(s => (
        <option key={s} value={s}>
          {SLOT_LABELS[s as keyof typeof SLOT_LABELS] ?? s}
        </option>
      ))}
    </select>
  )
}

/** D&D Beyond's list: read-only, and linked to a magic item's note when one exists. */
function DdbItems({ items, magicItems }: { items: SheetItem[]; magicItems: readonly MagicItemRow[] }) {
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

/** The paper doll and Bearing — what `/inventory` showed, moved here. */
function Loadout({ entry, rows, catalogs }: { entry: RosterEntry; rows: HydratedRow[]; catalogs: InventoryCatalogs }) {
  const { state } = useStateHost()
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
          const label = SLOT_LABELS[slot as keyof typeof SLOT_LABELS] ?? slot
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
                      void state.inventory
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

function Slot({ label, dim, children }: { label: string; dim: boolean; children: ReactNode }) {
  return (
    <div className={`${ROW} ${dim ? 'opacity-60' : ''}`}>
      <span className="w-24 shrink-0 text-smallest uppercase text-faint">{label}</span>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------

/**
 * The catalogs as `hydrateRow` wants them, from rows already in hand. Exact id
 * first, then name — the old free-text form stored names as ids, and those
 * rows must keep hydrating. `paths` maps `i:`/`m:` + id to the note, for links.
 */
function lookup(items: readonly ItemRow[], magicItems: readonly MagicItemRow[]) {
  const itemById = new Map(items.map(i => [i.id, i]))
  const itemByName = new Map(items.map(i => [nameKey(i.name), i]))
  const magicById = new Map(magicItems.map(m => [m.id, m]))
  const magicByName = new Map(magicItems.map(m => [nameKey(m.name), m]))
  const paths = new Map<string, string>()
  for (const i of items) {
    paths.set(`i:${i.id}`, i.path)
    paths.set(`i:${i.name.toLowerCase()}`, i.path)
  }
  for (const m of magicItems) {
    paths.set(`m:${m.id}`, m.path)
    paths.set(`m:${m.name.toLowerCase()}`, m.path)
  }
  return {
    items: {
      byId: (id: string) => itemById.get(id),
      byName: (name: string) => itemByName.get(nameKey(name)),
    },
    magicItems: {
      byId: (id: string) => magicById.get(id),
      byName: (name: string) => magicByName.get(nameKey(name)),
    },
    paths,
  }
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
