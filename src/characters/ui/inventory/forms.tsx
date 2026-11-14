// The inventory's forms: add an item, adjust coins, transfer to another
// character.

import { useMemo, useState, type ReactNode, type SubmitEvent } from 'react'
import { Notice } from 'obsidian'

import type {
  RosterEntry,
  InventoryCatalogs,
  InventoryCurrency,
  InventoryItem,
} from '../../../characterModel'
import { addInputFor, pickerMatches, type PickerOption } from '../../../characterModel'
import { useCharacters } from '../context'
import type { ItemRow, MagicItemRow } from '../../../compendium'

/**
 * The three forms the inventory opens — add, coins, transfer (MYDND-37).
 *
 * **Inline cards, not overlays.** They used to be `fixed inset-0` modals on
 * `/inventory`, which is invariant 4 broken: the pane is the viewport, and a
 * `fixed` box positions against Obsidian's window, covering the sidebars when
 * the pane is a split. A card in the flow, under the toolbar that opened it,
 * needs no positioning at all and reads the same at 380px.
 */

const CARD = 'flex flex-col gap-2 rounded-obs-m border border-background-modifier-border-focus bg-background-secondary p-3'
const LABEL = 'flex flex-col gap-1 text-smaller text-muted'

function Card({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className={CARD}>
      <div>
        <div className="text-ui-small font-semibold text-normal">{title}</div>
        {subtitle ? <div className="text-smaller text-muted">{subtitle}</div> : null}
      </div>
      {children}
    </div>
  )
}

function Actions({ busy, submit, disabled, onCancel }: { busy: boolean; submit: string; disabled?: boolean; onCancel: () => void }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <button type="button" disabled={busy} onClick={onCancel}>
        Cancel
      </button>
      <button type="submit" className="mod-cta" disabled={busy || disabled}>
        {busy ? 'Saving…' : submit}
      </button>
    </div>
  )
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err))

// ---------------------------------------------------------------------------

/**
 * Add an item from the catalog — or, failing that, by name.
 *
 * The-vault's `MundaneItemDialog` and its magic-item browser, folded into one
 * search because a pane has no room for two dialogs. A pick stores the note's
 * slug, so the row hydrates against the catalog (bearing, slot, attunement);
 * "Add as typed" is the escape hatch for the homebrew thing no note describes.
 */
export function AddItemForm({
  characterPath,
  characterName,
  items,
  magicItems,
  onDone,
}: {
  characterPath: string
  characterName: string
  items: readonly ItemRow[]
  magicItems: readonly MagicItemRow[]
  onDone: () => void
}) {
  const { inventory: inventoryStore } = useCharacters()
  const [query, setQuery] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [busy, setBusy] = useState(false)
  const matches = useMemo(() => pickerMatches(query, items, magicItems), [query, items, magicItems])

  async function add(option: PickerOption | null) {
    const typed = query.trim()
    if (!option && !typed) return
    setBusy(true)
    try {
      await inventoryStore.addToInventory(
        characterPath,
        option ? addInputFor(option, quantity) : { name: typed, quantity: Math.max(1, quantity) },
      )
      new Notice(`Added ${option?.name ?? typed} to ${characterName}`)
      onDone()
    } catch (err) {
      new Notice(`Could not add the item: ${message(err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        void add(matches[0] ?? null)
      }}
    >
      <Card title="Add item" subtitle={`To ${characterName}’s inventory`}>
        <div className="flex flex-wrap items-end gap-2">
          <label className={`${LABEL} min-w-0 flex-1`}>
            <span>Search items and magic items</span>
            <input
              type="text"
              autoFocus
              disabled={busy}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Longsword, Bag of Holding…"
            />
          </label>
          <label className={`${LABEL} w-20`}>
            <span>Qty</span>
            <input
              type="number"
              min={1}
              disabled={busy}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
            />
          </label>
        </div>

        {matches.length > 0 ? (
          <div className="panel-container max-h-64 overflow-y-auto" role="listbox" aria-label="Matching items">
            {matches.map(option => (
              <button
                key={`${option.kind}:${option.id}`}
                type="button"
                role="option"
                aria-selected={false}
                disabled={busy}
                className="list-row"
                onClick={() => void add(option)}
              >
                <span className="cell-title">{option.name}</span>
                <span className="shrink-0 text-smallest text-muted">{option.detail}</span>
                {option.kind === 'magic' ? <span className="badge">magic</span> : null}
              </button>
            ))}
          </div>
        ) : query.trim().length >= 2 ? (
          <p className="text-smaller text-muted">Nothing in the catalogs is called that.</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button type="button" disabled={busy} onClick={onDone}>
            Cancel
          </button>
          <button type="button" disabled={busy || !query.trim()} onClick={() => void add(null)}>
            Add “{query.trim() || '…'}” as typed
          </button>
        </div>
      </Card>
    </form>
  )
}

// ---------------------------------------------------------------------------

/**
 * Add or take away coins, per denomination.
 *
 * Deltas, as the web panel's popover takes them (`+5`, `-2`), rather than
 * absolute totals: "the party pays 30 gp" is how coins move at the table, and a
 * total typed over a stale number would silently undo a write made meanwhile.
 * **No rollup between denominations** — each floors at 0 on its own, the rule
 * `vault_state.currency` has always had.
 */
export function CoinsForm({
  characterPath,
  characterName,
  onDone,
}: {
  characterPath: string
  characterName: string
  onDone: () => void
}) {
  const { inventory } = useCharacters()
  const [inputs, setInputs] = useState<Record<keyof InventoryCurrency, string>>({ pp: '', gp: '', sp: '', cp: '' })
  const [busy, setBusy] = useState(false)
  const any = Object.values(inputs).some(v => v.trim() !== '')

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    if (!any) return onDone()
    setBusy(true)
    try {
      const n = (v: string) => parseInt(v.replace('−', '-'), 10) || 0
      await inventory.updateCurrency(characterPath, {
        pp: n(inputs.pp),
        gp: n(inputs.gp),
        sp: n(inputs.sp),
        cp: n(inputs.cp),
      })
      new Notice(`Updated ${characterName}’s coins`)
      onDone()
    } catch (err) {
      new Notice(`Could not update the coins: ${message(err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={e => void submit(e)}>
      <Card title="Coins" subtitle="Add or subtract — +5 or -2">
        <div className="grid grid-cols-4 gap-2">
          {(['pp', 'gp', 'sp', 'cp'] as const).map(k => (
            <label key={k} className={LABEL}>
              <span className="uppercase">{k}</span>
              <input
                type="text"
                inputMode="numeric"
                aria-label={`${k.toUpperCase()} change`}
                disabled={busy}
                value={inputs[k]}
                placeholder="±0"
                onChange={e => setInputs(prev => ({ ...prev, [k]: e.target.value }))}
              />
            </label>
          ))}
        </div>
        <Actions busy={busy} submit="Apply" disabled={!any} onCancel={onDone} />
      </Card>
    </form>
  )
}

// ---------------------------------------------------------------------------

/**
 * Hand an item to another character. Receiver first, sender second — the
 * duplication-over-destruction order ADR 0005 records; this form only asks.
 */
export function TransferForm({
  item,
  label,
  fromPath,
  fromName,
  roster,
  content,
  onDone,
}: {
  item: InventoryItem
  label: string
  fromPath: string
  fromName: string
  roster: readonly RosterEntry[]
  content: InventoryCatalogs
  onDone: () => void
}) {
  const { inventory } = useCharacters()
  const recipients = roster.filter(r => r.path !== fromPath)
  const [toPath, setToPath] = useState(recipients[0]?.path ?? '')
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)
  const max = item.quantity || 1

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    if (!toPath) return
    setBusy(true)
    try {
      await inventory.transferInventory({
        fromCharacterPath: fromPath,
        toCharacterPath: toPath,
        itemId: item.id,
        quantity: Math.max(1, Math.min(max, qty)),
        content,
      })
      new Notice(`Gave ${label} to ${recipients.find(r => r.path === toPath)?.name ?? 'them'}`)
      onDone()
    } catch (err) {
      new Notice(`Transfer failed: ${message(err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={e => void submit(e)}>
      <Card title={`Give ${label}`} subtitle={`From ${fromName}`}>
        {recipients.length === 0 ? (
          <p className="text-smaller text-muted">There is nobody else in the party to give it to.</p>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <label className={`${LABEL} min-w-0 flex-1`}>
              <span>To</span>
              <select className="dropdown" disabled={busy} value={toPath} onChange={e => setToPath(e.target.value)}>
                {recipients.map(r => (
                  <option key={r.path} value={r.path}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            {max > 1 ? (
              <label className={`${LABEL} w-24`}>
                <span>Qty (of {max})</span>
                <input
                  type="number"
                  min={1}
                  max={max}
                  disabled={busy}
                  value={qty}
                  onChange={e => setQty(parseInt(e.target.value, 10) || 1)}
                />
              </label>
            ) : null}
          </div>
        )}
        <Actions busy={busy} submit="Give" disabled={!toPath} onCancel={onDone} />
      </Card>
    </form>
  )
}
