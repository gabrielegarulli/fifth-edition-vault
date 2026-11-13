import { useMemo, useState } from 'react'

import { useCompendium } from '../../../compendium/host'
import { type RosterEntry, pouchGp, sortDdbItems, splitBag, hydrateRow, itemDataSource } from '../../../characterModel'
import type { ItemRow, MagicItemRow } from '../../../compendium'
import { nameKey } from '../../../platform'
import { useActiveCampaign, useCatalogRows, useVaultGeneration } from '../../../platform/host'
import { useInventory } from '../hooks/useInventory'
import { AddItemForm, CoinsForm, TransferForm } from './forms'

import { type Tab, type Form, SECTION_TITLE } from './shared'
import { Rows } from './rows'
import { Loadout } from './loadout'

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
 *
 * Since MYDND-197 its pieces are files beside it in `inventory/`: the bag's
 * rows (`rows`, `bagRow`), a row's controls (`controls`), a D&D Beyond
 * character's items (`ddbItems`), the loadout (`loadout`), and what they share.
 */

export interface CharacterInventoryProps {
  entry: RosterEntry
  roster: readonly RosterEntry[]
}

export function CharacterInventory({ entry, roster }: CharacterInventoryProps) {
  const compendium = useCompendium()
  const generation = useVaultGeneration()
  const campaign = useActiveCampaign()
  const loadout = campaign?.loadoutSystem === true
  const { inventory, loading } = useInventory(entry.path, generation)

  const [tab, setTab] = useState<Tab>('equipment')
  const [form, setForm] = useState<Form>(null)

  // Catalog lookups go through `useCatalogRows` and a map — never `byId` in a
  // render, which walks every note in the folder (content-layer rule 1).
  const items = useCatalogRows(() => compendium.items.list())
  const magicItems = useCatalogRows(() => compendium.magicItems.list())
  // `source` reads an item's fence when a write needs its dice or AC (MYDND-57).
  const catalogs = useMemo(
    () => ({ ...lookup(items, magicItems), source: itemDataSource(compendium) }),
    [items, magicItems, compendium],
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
