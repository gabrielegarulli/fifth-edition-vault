// The GM's Shop page, at /gm/shop: stock a shop, buy and sell for a
// character, and make change in coins.

import { useEffect, useMemo, useState } from 'react'
import { Notice } from 'obsidian'

import { copperLabel, kindLabel, shelfOf } from '../../compendium'
import { useCompendium } from '../../compendium/host'
import type { MagicItemRow } from '../../compendium'
import {
  useCampaignValuePercent,
  useElementWidth,
  useCatalogRows,
  useVaultGeneration,
  usePlatform,
} from '../../platform/host'
import { useRoster, useCharacters } from '../../characters/host'
import type { CharacterInventory, InventoryCurrency, InventoryItem } from '../../characterModel'
import type { ShopItem } from '../store/shop'
import { hydrateRow } from '../../characterModel'
import { useGmStores } from './context'

/**
 * The shop, at `/gm/shop` — `buy_item` and `sell_item` without a server.
 *
 * ## It is the first surface where currency and value meet
 *
 * MYDND-5 gave `magic_item_value_percent` its first reader by fixing the blank
 * Value column; MYDND-6 built inventory and currency. This is the first page
 * that *moves* both at once.
 *
 * Every price comes from `@vault/derive` — `magicItemBuyCp` out,
 * `inventoryValueCp` in, `canBeBought`/`unbuyableReason` for the refusals.
 * Nothing here computes one, and the spread is a single sentence: **the world
 * sells at twice what it pays.**
 *
 * ## The shelf is the whole catalog, and that is deliberate
 *
 * `the-vault` has a `campaign_shop_stock` table, so a campaign could stock a
 * subset. There is no equivalent here and none is invented: a GM running their
 * own table decides what is for sale by saying so, and a stock list in a plugin
 * would be a second place to maintain the same decision. The search is the
 * shelf.
 *
 * ## It refuses rather than guessing
 *
 * An artifact has no price, essence is harvested rather than sold, and an item
 * whose rarity is `varies` cannot be banded — all three say so in a phrase
 * rather than being silently absent from the list, because "not on the shelf"
 * and "cannot be priced" are different answers to a GM looking for something.
 *
 * ## The board, and the till (MYDND-96)
 *
 * The "Shop · shelf, pack, till" board of the all-sections canvas: the shelf
 * and the character's pack side by side, the purse in the header, and a till
 * along the bottom. **A click no longer trades; it puts the line in the till.**
 * Settle then runs the till through the same `state.shop.sell` and
 * `state.shop.buy` as before — sells first, so their coin is there for the
 * buys — and writes one log line for the lot. Each trade is still its own
 * write; a buy the purse cannot cover stops the settle there and says so, and
 * what already went through stays done, which the till then shows.
 */
export default function GmShopPage() {
  const compendium = useCompendium()
  const { inventory: inventoryStore } = useCharacters()
  const { shop: shopStore } = useGmStores()
  const { activity, activeCampaignId } = usePlatform()
  const percent = useCampaignValuePercent()
  const { entries } = useRoster()
  const generation = useVaultGeneration()
  const magicItems = useCatalogRows(() => compendium.magicItems.list())
  const [paneRef, width] = useElementWidth<HTMLDivElement>()
  const narrow = width > 0 && width < WIDE_WIDTH

  const [characterPath, setCharacterPath] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [till, setTill] = useState<TillLine[]>([])
  const [inventory, setInventory] = useState<{ key: string; value: CharacterInventory } | null>(null)

  // The first character, until the GM picks one. A shop with nobody at the
  // counter is a page that cannot do anything.
  const active = characterPath ?? entries[0]?.path ?? null
  const key = `${active ?? ''}:${generation}`
  const who = entries.find(e => e.path === active) ?? null

  useEffect(() => {
    if (!active) return
    const path = active
    let cancelled = false
    async function run() {
      const value = await inventoryStore.getInventory(path)
      if (!cancelled) setInventory({ key, value })
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [active, key, inventoryStore])

  const purse = inventory?.key === key ? inventory.value : null

  const catalogs = useMemo(
    () => ({
      items: { byId: (id: string) => toLookup(compendium.items.byId(id)) },
      magicItems: { byId: (id: string) => toLookup(compendium.magicItems.byId(id)) },
    }),
    [compendium],
  )

  const q = query.trim().toLowerCase()
  const shelf = q.length < 2 ? [] : magicItems.filter(i => i.name.toLowerCase().includes(q)).slice(0, 25)

  const asShopItem = (row: MagicItemRow): ShopItem => ({
    id: row.id,
    name: row.name,
    rarity: row.rarity,
    // The shape `magicItemValue.js` reads, spelled exactly as `MagicItemsPage`
    // spells it — one mapping, so a price quoted on the shelf is the price
    // charged at the till.
    row: { rarity_id: row.rarity, value_cp: row.valueCp, component_type: null, item_type: row.itemType },
  })

  // --- the till -------------------------------------------------------------

  const inTill = (k: string) => till.find(l => l.key === k)?.quantity ?? 0
  const addToTill = (line: Omit<TillLine, 'quantity'>, max = Infinity): void =>
    setTill(prev => {
      const at = prev.findIndex(l => l.key === line.key)
      if (at === -1) return [...prev, { ...line, quantity: 1 }]
      if (prev[at].quantity >= max) return prev
      return prev.map((l, i) => (i === at ? { ...l, quantity: l.quantity + 1 } : l))
    })
  const dropFromTill = (k: string) => setTill(prev => prev.filter(l => l.key !== k))

  const net = till.reduce((sum, l) => sum + (l.kind === 'sell' ? 1 : -1) * l.unitCp * l.quantity, 0)
  const before = purse ? purseCp(purse.currency) : null
  const after = before === null ? null : before + net
  const short = after !== null && after < 0

  // Change the character, change the counter: a till belongs to whoever is at it.
  const changeCharacter = (path: string | null): void => {
    setCharacterPath(path)
    setTill([])
  }

  const settle = (): void => {
    if (!active || busy || till.length === 0) return
    const lines = [...till.filter(l => l.kind === 'sell'), ...till.filter(l => l.kind === 'buy')]
    setBusy(true)
    void (async () => {
      const done: string[] = []
      let moved = 0
      try {
        for (const line of lines) {
          if (line.kind === 'sell') {
            const outcome = await shopStore.sell({
              characterPath: active,
              itemId: line.itemId!,
              quantity: line.quantity,
              percent,
              content: catalogs,
            })
            if (!outcome.ok) throw new Error(outcome.error ?? `Could not sell ${line.name}.`)
            moved += outcome.priceCp ?? 0
            done.push(line.key)
          } else {
            for (let n = 0; n < line.quantity; n += 1) {
              const outcome = await shopStore.buy({ characterPath: active, item: line.item!, percent })
              if (!outcome.ok) throw new Error(outcome.error ?? `Could not buy ${line.name}.`)
              moved -= outcome.priceCp ?? 0
            }
            done.push(line.key)
          }
        }
        new Notice(`Settled — ${moved >= 0 ? 'received' : 'paid'} ${copperLabel(Math.abs(moved)) ?? '—'}.`)
      } catch (error) {
        new Notice((error as Error).message)
      } finally {
        // What went through leaves the till; what did not stays to be looked at.
        setTill(prev => prev.filter(l => !done.includes(l.key)))
        if (activeCampaignId && done.length > 0) {
          const said = lines.filter(l => done.includes(l.key)).map(l => tillPhrase(l))
          await activity
            .append(activeCampaignId, {
              kind: lines.some(l => done.includes(l.key) && l.kind === 'buy') ? 'buy' : 'sell',
              text: `${who?.name ?? 'Someone'} at the shop: ${said.join(' · ')}`,
              character: who?.name ?? null,
            })
            .catch(() => undefined)
        }
        setBusy(false)
      }
    })()
  }

  // --- the pieces -----------------------------------------------------------

  const shelfList =
    q.length < 2 ? (
      <p className="bst-empty">
        <strong>Search the shelf</strong>
        {`Type at least two letters. ${magicItems.length.toLocaleString()} magic items on the shelf.`}
      </p>
    ) : shelf.length === 0 ? (
      <p className="bst-empty">{`Nothing matching “${query.trim()}”.`}</p>
    ) : (
      <div className="bst-sh-list">
        {shelf.map(row => {
          const item = asShopItem(row)
          const price = shopStore.buyPrice(item, percent)
          const refusal = shopStore.refusal(item)
          const k = `buy:${row.id}`
          const n = inTill(k)
          return (
            <div key={row.id} className={refusal ? 'bst-sh-row bst-sh-row--refused' : n > 0 ? 'bst-sh-row bst-sh-row--till' : 'bst-sh-row'}>
              <span aria-hidden="true" className={`bst-dot bst-dot--r-${shelfOf(row.rarity).tone}`} />
              <span className="bst-sh-names">
                <span className="bst-sh-name">{row.name}</span>
                <span className="bst-sh-sub">{`${shelfOf(row.rarity).label} · ${kindLabel(row).toLowerCase()}`}</span>
              </span>
              {refusal ? (
                // Shown with the reason rather than hidden: "not on the
                // shelf" and "cannot be priced" are different answers.
                <span className="bst-sh-why">{refusal}</span>
              ) : (
                <>
                  <span className="bst-mono bst-sh-price">{copperLabel(price)}</span>
                  <button
                    type="button"
                    className={n > 0 ? 'bst-plain bst-sh-btn bst-sh-btn--till' : 'bst-plain bst-sh-btn bst-sh-btn--buy'}
                    aria-label={n > 0 ? `Add another ${row.name} — ${n} in the till` : `Buy ${row.name}`}
                    disabled={busy || !active || price === null}
                    onClick={() =>
                      addToTill({ key: k, kind: 'buy', name: row.name, unitCp: price ?? 0, item })
                    }
                  >
                    {n > 0 ? `In till ×${n}` : 'Buy'}
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
    )

  const packList = !purse ? (
    <p className="bst-empty">Reading the inventory…</p>
  ) : purse.items.length === 0 ? (
    <p className="bst-empty">Nothing in this character&apos;s inventory.</p>
  ) : (
    <div className="bst-sh-list">
      {purse.items.map(item => {
        const unit = shopStore.sellPrice(item, percent, catalogs)
        const locked = item.equipped || Boolean(item.loadout_slot)
        const name = item.custom_name || item.name || item.content_item_id || item.magic_item_id || 'Item'
        const row = item.magic_item_id ? magicItems.find(m => m.id === item.magic_item_id) : undefined
        const k = `sell:${item.id}`
        const n = inTill(k)
        return (
          <div key={item.id} className={n > 0 ? 'bst-sh-row bst-sh-row--till' : 'bst-sh-row'}>
            <span aria-hidden="true" className={`bst-dot bst-dot--r-${row ? shelfOf(row.rarity).tone : 'none'}`} />
            <span className="bst-sh-names">
              <span className="bst-sh-name">{name}</span>
              <span className="bst-sh-sub">{packSub(item, row, locked)}</span>
            </span>
            {locked ? null : unit === null ? (
              <span className="bst-sh-why">no recorded value</span>
            ) : (
              <>
                <span className="bst-mono bst-sh-price">{`${copperLabel(unit)}${item.quantity > 1 ? ' ea' : ''}`}</span>
                <button
                  type="button"
                  className={n > 0 ? 'bst-plain bst-sh-btn bst-sh-btn--till' : 'bst-plain bst-sh-btn'}
                  aria-label={n > 0 ? `Sell another ${name} — ${n} in the till` : `Sell ${name}`}
                  disabled={busy || !active || n >= item.quantity}
                  onClick={() =>
                    addToTill({ key: k, kind: 'sell', name, unitCp: unit, itemId: item.id }, item.quantity)
                  }
                >
                  {n > 0 ? `In till${item.quantity > 1 ? ` ×${n}` : ''}` : 'Sell'}
                </button>
              </>
            )}
          </div>
        )
      })}
    </div>
  )

  const purseTiles = purse ? (
    <dl aria-label="Purse" className="bst-sh-purse">
      {(['pp', 'gp', 'sp', 'cp'] as const).map(c => (
        <div key={c} className="bst-sh-coin">
          <dt className="bst-sh-coin-key">
            <span aria-hidden="true" className={`bst-sh-coin-dot bst-sh-coin-dot--${c}`} />
            {c.toUpperCase()}
          </dt>
          <dd className="bst-mono bst-sh-coin-v">{purse.currency[c]}</dd>
        </div>
      ))}
    </dl>
  ) : null

  const characterSelect = (
    <span className="bst-sh-who">
      <span aria-hidden="true" className="bst-avatar bst-avatar--1">
        {(who?.name ?? '?').slice(0, 1).toUpperCase()}
      </span>
      <select
        className="bst-select bst-select--compact"
        aria-label="Character"
        value={active ?? ''}
        onChange={e => changeCharacter(e.target.value || null)}
      >
        {entries.map(e => (
          <option key={e.path} value={e.path}>
            {e.name}
          </option>
        ))}
      </select>
    </span>
  )

  const settleLabel = `Settle${after !== null && till.length > 0 && !short ? ` → ${coins(after)}` : ''}`

  const tillBar = (
    <footer aria-label="The till" className={narrow ? 'bst-bfoot bst-sh-till bst-sh-till--narrow' : 'bst-sh-till'}>
      <span className="bst-sh-till-lines">
        <span className="bst-sh-key">THE TILL</span>
        {till.length === 0 ? (
          <span className="bst-note">Empty — Buy and Sell put lines here; nothing changes hands until you settle.</span>
        ) : (
          <span className="bst-sh-chips">
            {till.map(l => (
              <span key={l.key} className={`bst-sh-chip bst-sh-chip--${l.kind}`}>
                {`${l.kind === 'sell' ? 'Sell' : 'Buy'} ${l.quantity > 1 ? `${l.quantity} × ` : ''}${l.name} `}
                <span className="bst-mono">{`${l.kind === 'sell' ? '+' : '−'}${copperLabel(l.unitCp * l.quantity)}`}</span>
                <button
                  type="button"
                  className="bst-plain bst-sh-chip-x"
                  aria-label={`Take ${l.name} out of the till`}
                  onClick={() => dropFromTill(l.key)}
                >
                  ✕
                </button>
              </span>
            ))}
          </span>
        )}
      </span>
      {!narrow && <span className="bst-spacer" />}
      {till.length > 0 && before !== null && after !== null ? (
        <span className="bst-sh-till-sum">
          <span className="bst-mono">{`${coins(before)} → ${short ? 'short' : coins(after)}`}</span>
          <span className={short ? 'bst-note bst-note--warn' : 'bst-note'}>
            {short
              ? `${copperLabel(-after)} more than the purse holds — take something out.`
              : `net ${net >= 0 ? '+' : '−'}${copperLabel(Math.abs(net)) ?? '0'} · sells first, then buys · one log line`}
          </span>
        </span>
      ) : null}
      <span className="bst-sh-till-acts">
        {!narrow && (
          <button type="button" className="bst-plain bst-btn-secondary" disabled={busy || till.length === 0} onClick={() => setTill([])}>
            Clear
          </button>
        )}
        <button
          type="button"
          className="bst-plain bst-btn-primary bst-btn-primary--orange"
          disabled={busy || till.length === 0 || short || !active}
          onClick={settle}
        >
          {settleLabel}
        </button>
      </span>
    </footer>
  )

  const percentChip = (
    // Said out loud, because a campaign at 50% quietly halves every price on
    // the page and a GM who forgot would read the numbers as book prices.
    <span className="bst-sh-percent">{narrow ? `magic ${percent}%` : `Magic at ${percent}% · sells at twice what it pays`}</span>
  )

  const search = (
    <input
      type="search"
      value={query}
      placeholder="Search the shelf…"
      aria-label="Shop search"
      className="bst-input"
      onChange={e => setQuery(e.target.value)}
    />
  )

  const nobody =
    entries.length === 0 ? (
      <p className="bst-note bst-note--warn">No characters in this vault — there is nobody to buy or sell anything.</p>
    ) : null

  if (narrow) {
    return (
      <div ref={paneRef} className="bst">
        <header className="bst-header bst-header--narrow">
          <div className="bst-titles">
            <h2 className="bst-title">Shop</h2>
            {percentChip}
            <span className="bst-spacer" />
            {characterSelect}
          </div>
          {purseTiles}
          <div role="group" aria-label="Side" className="bst-sh-sides">
            {(['buy', 'sell'] as const).map(s => (
              <button
                key={s}
                type="button"
                aria-current={side === s ? 'true' : undefined}
                className="bst-plain bst-sh-side"
                onClick={() => setSide(s)}
              >
                {s === 'buy' ? 'Buy' : 'Sell from pack'}
              </button>
            ))}
          </div>
          {side === 'buy' ? search : null}
        </header>
        <div className="my-dnd-vault__scroll bst-sh-narrow">
          {nobody}
          {side === 'buy' ? shelfList : packList}
        </div>
        {tillBar}
      </div>
    )
  }

  return (
    <div ref={paneRef} className="bst">
      <header className="bst-header">
        <h2 className="bst-title">Shop</h2>
        {percentChip}
        <span className="bst-spacer" />
        {characterSelect}
        {purseTiles}
      </header>
      <div className="bst-sh-board">
        <section aria-label="The shelf" className="bst-sh-col">
          <div className="bst-sh-head">
            <h3 className="bst-sh-h">The shelf</h3>
            <span className="bst-note">the whole catalog — search is the stock</span>
          </div>
          {search}
          <div className="my-dnd-vault__scroll bst-sh-scroll">
            {nobody}
            {shelfList}
          </div>
        </section>
        <section aria-label={`${who?.name ?? 'The'} pack`} className="bst-sh-col">
          <div className="bst-sh-head">
            <h3 className="bst-sh-h">{who ? `${who.name}’s pack` : 'The pack'}</h3>
            <span className="bst-note">sells at half the shelf price, quirks included</span>
          </div>
          <div className="my-dnd-vault__scroll bst-sh-scroll">{packList}</div>
        </section>
      </div>
      {tillBar}
    </div>
  )
}

/** Below this the two columns become a Buy / Sell switch (the narrow board). */
const WIDE_WIDTH = 760

interface TillLine {
  key: string
  kind: 'buy' | 'sell'
  name: string
  /** Per unit, as quoted — the trade itself re-prices through the state layer. */
  unitCp: number
  quantity: number
  item?: ShopItem
  itemId?: string
}

/** `copperLabel`, except an empty purse is "0 gp" rather than a dash. */
const coins = (cp: number): string => (cp === 0 ? '0 gp' : (copperLabel(cp) ?? '—'))

const purseCp = (c: InventoryCurrency): number => c.pp * 1000 + c.gp * 100 + c.sp * 10 + c.cp

const tillPhrase = (l: TillLine): string =>
  `${l.kind === 'sell' ? 'sold' : 'bought'} ${l.quantity > 1 ? `${l.quantity} × ` : ''}${l.name}`

function packSub(item: InventoryItem, row: MagicItemRow | undefined, locked: boolean): string {
  return [
    item.quantity > 1 ? `×${item.quantity}` : null,
    row ? shelfOf(row.rarity).label.toLowerCase() : null,
    item.quirks && item.quirks.length > 0 ? `${item.quirks.length} quirk${item.quirks.length === 1 ? '' : 's'}` : null,
    // Under the loadout system the slot *is* what puts an item on the sheet,
    // so selling an equipped one is an AC change nobody asked for.
    locked ? 'equipped — unequip to sell' : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** A catalog row in the shape `hydrateRow` wants. */
function toLookup(row: { id: string; name: string; itemType?: string | null } | undefined) {
  if (!row) return null
  const full = row as MagicItemRow & { costCp?: number | null; weaponCategory?: string | null }
  return {
    id: full.id,
    name: full.name,
    itemType: full.itemType ?? null,
    weaponCategory: full.weaponCategory ?? null,
    costCp: full.costCp ?? null,
    rarity: full.rarity ?? null,
    bearingCost: full.bearingCost ?? null,
    bearingBonus: full.bearingBonus ?? null,
    cursed: full.cursed ?? false,
    loadoutSlot: full.loadoutSlot ?? null,
    setName: full.setName ?? null,
  }
}

// `hydrateRow` is re-exported from the state layer and used by `sellPrice`; this
// page only needs the lookup shape above. Named here so the dependency is
// visible rather than implied.
void hydrateRow
