// A magic item's detail pane in the catalog, with Add to a character.

import { useState } from 'react'

import {
  copperLabel,
  bonusLine,
  categoryOf,
  chargeCount,
  chargeLadder,
  kindLabel,
  parseCast,
  rechargeTile,
  restrictionText,
  saveDcOf,
  shelfOf,
  weightLabel,
  itemValueCp,
  type ChargeStep,
  diceAtRank,
} from '../../compendium'
import { stripPreamble } from '../../platform'
import { useCompendium, openSpellWindow, useSpellIndex } from '../../compendium/host'
import type { MagicItemRow } from '../../compendium'
import {
  useCampaignValuePercent,
  useDetail,
  openNote,
  resourceUrl,
  useObsidian,
  Markdown,
} from '../../platform/host'
import { useRoster, useCharacters, useOptionalCharacters } from '../../characters/host'
import { ItemTile } from './MagicItemCards'

/**
 * One magic item, opened from a shelf — design A's right-hand panel (MYDND-76).
 *
 * Header: the item's tile, its name, `Wand · XDMG`; its rarity, attunement and
 * the save DC its text states as chips; Charges / At dawn / Weight tiles (Value
 * / Weight / Bonus for an item with no charges), and its charges as pips. Body:
 * the note's art and prose, the charges each cast costs where the prose says,
 * and the spells it casts, each opening in the spell window. Footer: give it
 * to a character, or open the note.
 *
 * Drawn in the canvas's palette with the Bestiary's `.bst-*` classes, so it
 * must sit inside the page's `.bst` root.
 */
export function MagicItemCatalogDetail({ item, onClose }: { item: MagicItemRow; onClose: () => void }) {
  const app = useObsidian()
  const compendium = useCompendium()
  const host = useOptionalCharacters()
  const percent = useCampaignValuePercent()
  const spells = useSpellIndex()
  const { detail, loading } = useDetail(compendium.magicItems, item.id)
  const [giving, setGiving] = useState(false)

  const shelf = shelfOf(item.rarity)
  const prose = detail ? stripPreamble(detail.prose) : ''
  const dc = saveDcOf(prose)
  const bonus = bonusLine(item)
  const restriction = restrictionText(item.attunementRestriction)
  const value = copperLabel(itemValueCp(item, percent))
  const charges = chargeCount(item)
  const recharge = rechargeTile(item)
  const art = resourceUrl(app, item.image)

  const casts = item.casts.map(parseCast).map(c => ({ ...c, row: spells?.find(c.name) ?? null }))
  const chargeCast = casts.filter(c => c.charges !== null)
  const only = chargeCast.length === 1 ? chargeCast[0] : null
  const ladder = only
    ? chargeLadder(prose, only, level => {
        const r = only.row
        const base = r?.damageDice ?? r?.healDice
        if (!r || !base) return null
        return diceAtRank(base, r.upcastDice, r.level, level)
      })
    : null

  return (
    <>
      <div className="bst-detail-head">
        <div className="bst-detail-id">
          <ItemTile item={item} size="lg" />
          <div className="bst-detail-names">
            <h3 className="bst-detail-name">{item.name}</h3>
            <span className="bst-detail-sub">
              {[kindLabel(item), item.source, charges !== null ? value : null].filter(Boolean).join(' · ')}
            </span>
          </div>
          <button type="button" aria-label="Close" className="bst-plain bst-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <ul aria-label="At a glance" className="bst-chips">
          <li className={`bst-chip bst-chip--rarity bst-chip--${shelf.tone}`}>
            <span aria-hidden="true" className={`bst-dot bst-dot--sm bst-dot--r-${shelf.tone}`} />
            {item.rarity ? sentence(item.rarity) : 'Unknown rarity'}
          </li>
          {item.requiresAttunement && (
            <li className="bst-chip bst-chip--accent">{restriction ? `Attunement · ${restriction}` : 'Attunement'}</li>
          )}
          {bonus && <li className="bst-chip">{bonus}</li>}
          {dc && <li className="bst-chip">{dc}</li>}
          {item.cursed && <li className="bst-chip bst-chip--curse">Cursed</li>}
          {item.sentient && <li className="bst-chip">Sentient</li>}
        </ul>

        <div className="bst-vitals">
          {item.charges !== null ? (
            <>
              <Tile label="CHARGES" value={String(item.charges)} />
              <Tile label={recharge.label} value={recharge.value} />
            </>
          ) : (
            <>
              <Tile label="VALUE" value={value} />
              <Tile label="TYPE" value={categoryOf(item)} />
            </>
          )}
          <Tile label="WEIGHT" value={weightLabel(item.weight)} />
        </div>

        {charges !== null && charges <= 50 && (
          <div role="img" aria-label={`${charges} charges, all full`} className="bst-charges">
            <span className="bst-charge-pips">
              {Array.from({ length: charges }, (_, i) => (
                <span key={i} className={`bst-charge bst-charge--on bst-charge--${shelf.tone}`} />
              ))}
            </span>
            <span className="bst-charges-note">full · tracks per character</span>
          </div>
        )}
      </div>

      <div className="my-dnd-vault__scroll bst-detail-scroll">
        {art && (
          <div className="bst-item-art">
            <img src={art} alt="" decoding="async" />
          </div>
        )}
        {loading ? (
          <p className="bst-prose">Reading the note…</p>
        ) : prose ? (
          <Markdown markdown={prose} sourcePath={item.path} className="bst-prose bst-entry-desc bst-spell-prose" />
        ) : null}

        {ladder && <Ladder steps={ladder} />}

        {casts.length > 0 && (
          <section aria-label="Casts">
            <h4 className="bst-section-title bst-ladder-title">Casts</h4>
            <div className="bst-casts">
              {casts.map(c =>
                c.row ? (
                  <button
                    key={c.name}
                    type="button"
                    className="bst-plain bst-cast"
                    title={`Open ${c.row.name} in a window`}
                    onClick={() => openSpellWindow(app, { id: c.row!.id, name: c.row!.name })}
                  >
                    <CastBody name={c.row.name} sub={castSub(c.row.level, c.row.school, c.cost)} />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="bst-chevron">
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </button>
                ) : (
                  <div key={c.name} className="bst-cast bst-cast--plain" title={`No note in ${compendium.ruleFolder('spells')}/ is titled "${c.name}"`}>
                    <CastBody name={c.name} sub={c.cost ?? 'no spell note'} />
                  </div>
                ),
              )}
            </div>
          </section>
        )}

        {(item.loadoutSlot || item.bearingCost != null) && (
          <section aria-label="Loadout">
            <h4 className="bst-section-title bst-ladder-title">Loadout</h4>
            <p className="bst-ladder-note bst-ladder-note--top">
              {[item.loadoutSlot ? `Slot: ${sentence(item.loadoutSlot)}` : null, item.bearingCost != null ? `Bearing cost ${item.bearingCost}` : null, item.bearingBonus != null ? `bonus ${item.bearingBonus}` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </section>
        )}
      </div>

      <div className="bst-detail-foot">
        {giving && host ? <GiveToCharacter item={item} onCancel={() => setGiving(false)} /> : null}
        <div className="bst-foot-row">
          {host && !giving ? (
            <button type="button" className="bst-plain bst-btn-primary" onClick={() => setGiving(true)}>
              Give to a character…
            </button>
          ) : null}
          <button
            type="button"
            className={host && !giving ? 'bst-plain bst-btn-secondary' : 'bst-plain bst-btn-secondary bst-grow'}
            onClick={() => openNote(app, item.path)}
          >
            Open note
          </button>
        </div>
      </div>
    </>
  )
}

const sentence = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

function castSub(level: number, school: string | null, cost: string | null): string {
  const lvl = level === 0 ? 'Cantrip' : level > 0 ? `Level ${level}` : null
  return [lvl && school ? `${lvl} ${school.toLowerCase()}` : lvl, cost].filter(Boolean).join(' · ')
}

function CastBody({ name, sub }: { name: string; sub: string }) {
  return (
    <>
      <span aria-hidden="true" className="bst-cast-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22c4 0 7-2.7 7-7 0-4-3-6.5-4-10-1.5 2-2 3.5-2 5-1.5-1-2.5-2.5-2.5-4.5C7 8 5 11 5 15c0 4.3 3 7 7 7z" />
        </svg>
      </span>
      <span className="bst-cast-names">
        <span className="bst-cast-name">{name}</span>
        <span className="bst-cast-sub">{sub}</span>
      </span>
    </>
  )
}

function Tile({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bst-vital">
      <span className="bst-vital-label">{label}</span>
      <span className="bst-vital-value bst-vital-value--spell">{value ?? '—'}</span>
    </div>
  )
}

function Ladder({ steps }: { steps: ChargeStep[] }) {
  return (
    <section aria-label="Charges per cast">
      <h4 className="bst-section-title bst-ladder-title">Charges per cast</h4>
      <div className="bst-ladder bst-ladder--charges" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map(s => (
          <div key={s.label} className={s.base ? 'bst-rung bst-rung--base bst-rung--item' : 'bst-rung bst-rung--item'}>
            <span className="bst-rung-label">{s.label}</span>
            <span className="bst-rung-dice">{s.dice}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * "Give to a character…" — the inventory's own add (ADR 0005), started from the
 * catalog: one of the item, by its note's slug, so the row hydrates against the
 * catalog (rarity, attunement, charges). Any character with a note can take it;
 * an inventory is the plugin's fence, D&D Beyond does not own it.
 */
function GiveToCharacter({ item, onCancel }: { item: MagicItemRow; onCancel: () => void }) {
  const { inventory } = useCharacters()
  const { entries, loading } = useRoster()
  const characters = [...entries].sort((a, b) => a.name.localeCompare(b.name))
  const [path, setPath] = useState('')
  const [busy, setBusy] = useState(false)
  const [given, setGiven] = useState<string | null>(null)
  const entry = characters.find(e => e.path === path) ?? null

  async function give(): Promise<void> {
    if (!entry) return
    setBusy(true)
    try {
      await inventory.addToInventory(entry.path, { magic_item_id: item.id, name: item.name, quantity: 1 })
      setGiven(entry.name)
    } finally {
      setBusy(false)
    }
  }

  if (given) {
    return (
      <div className="bst-foot-row bst-foot-row--center">
        <span className="bst-grow">
          Gave {item.name} to {given}.
        </span>
        <button type="button" className="bst-plain bst-btn-secondary" onClick={onCancel}>
          Done
        </button>
      </div>
    )
  }

  return (
    <section aria-label={`Give ${item.name} to a character`} className="bst-add">
      {!loading && characters.length === 0 ? (
        <p className="bst-note">No characters to give it to. Import or build one first.</p>
      ) : (
        <label className="bst-field">
          Character
          <select className="bst-select" aria-label="Character" value={path} onChange={e => setPath(e.target.value)}>
            <option value="">{loading ? 'Reading the party…' : '— Choose a character'}</option>
            {characters.map(e => (
              <option key={e.path} value={e.path}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="bst-foot-row">
        <button type="button" className="bst-plain bst-btn-secondary" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="bst-plain bst-btn-primary" disabled={busy || !entry} onClick={() => void give()}>
          {busy ? 'Saving…' : entry ? `Give to ${entry.name}` : 'Give'}
        </button>
      </div>
    </section>
  )
}
