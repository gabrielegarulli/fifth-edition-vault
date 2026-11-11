import { useState } from 'react'

import { schoolLabel } from '../catalog/labels'
import { stripPreamble } from '../catalog/preamble'
import {
  cantripLadder,
  diceLabel,
  parseComponents,
  shortDuration,
  shortRange,
  shortTime,
  upcastLadder,
  type LadderStep,
} from '../catalog/spellShelves'
import { useContent } from '../ContentContext'
import type { Detail } from '../content/index'
import type { SpellFence, SpellRow } from '../content/spells'
import { useDetail } from '../hooks/useDetail'
import { useRoster } from '../hooks/useRoster'
import { useVaultCharacterJson } from '../hooks/useVaultCharacterJson'
import { useVaultGeneration } from '../hooks/useVaultGeneration'
import { openNote, useObsidian } from '../ObsidianContext'
import { addSpell, castingClasses, characterSpells } from '../spells/characterSpells'
import { isLocalId } from '../state/characters'
import { useOptionalStateHost, useStateHost } from '../StateContext'
import { Markdown } from './Markdown'
import { SchoolIcon } from './SpellCards'

/**
 * One spell, opened from a shelf — design A's right-hand panel (MYDND-66).
 *
 * Header: the school's icon, the name, `Level 3 evocation · XPHB`; what it
 * rolls and who casts it as chips; Cast / Range / Duration tiles; the V S M
 * pips and what the M is. Body: the note's prose, its preamble stripped, then
 * what it rolls at each higher slot (or, for a cantrip, at each tier). Footer:
 * add it to a Vault character, or open the note.
 *
 * Drawn in the canvas's palette with the Bestiary's `.bst-*` classes, so it must
 * sit inside the page's `.bst` root. The sheet's spell hover and spell window
 * keep `SpellDetail`, which is drawn in Obsidian's theme like the sheet around
 * them.
 */
export function SpellCatalogDetail({ spell, onClose }: { spell: SpellRow; onClose(): void }) {
  const app = useObsidian()
  const content = useContent()
  const host = useOptionalStateHost()
  const { detail, loading } = useDetail(content.spells, spell.id)
  const [adding, setAdding] = useState(false)

  const school = schoolLabel(spell.school)
  const kind = spell.level === 0 ? `${school} cantrip` : spell.level > 0 ? `Level ${spell.level} ${school.toLowerCase()}` : school

  return (
    <>
      <div className="bst-detail-head">
        <div className="bst-detail-id">
          <SchoolIcon school={spell.school} size="lg" />
          <div className="bst-detail-names">
            <h3 className="bst-detail-name">{spell.name}</h3>
            <span className="bst-detail-sub">{[kind, spell.source].filter(Boolean).join(' · ')}</span>
          </div>
          <button type="button" aria-label="Close" className="bst-plain bst-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <SpellFacts spell={spell} />
      </div>

      <div className="my-dnd-vault__scroll bst-detail-scroll">
        <SpellText spell={spell} detail={detail} loading={loading} />
      </div>

      <div className="bst-detail-foot">
        {adding && host ? <AddToCharacter spell={spell} onCancel={() => setAdding(false)} /> : null}
        <div className="bst-foot-row">
          {host && !adding ? (
            <button type="button" className="bst-plain bst-btn-primary" onClick={() => setAdding(true)}>
              Add to a character…
            </button>
          ) : null}
          <button
            type="button"
            className={host && !adding ? 'bst-plain bst-btn-secondary' : 'bst-plain bst-btn-secondary bst-grow'}
            onClick={() => openNote(app, spell.path)}
          >
            Open note
          </button>
        </div>
      </div>
    </>
  )
}

/**
 * What a spell rolls, who casts it, its three tiles and its components. Apart
 * from the panel, like `SpellText`, so the builder can show them (MYDND-155).
 */
export function SpellFacts({ spell }: { spell: SpellRow }) {
  const dice = diceLabel(spell)
  const time = shortTime(spell.castingTime)
  const comps = parseComponents(spell.components)
  return (
    <>
      <ul aria-label="At a glance" className="bst-chips">
        {dice && <li className="bst-chip bst-chip--accent">{dice}</li>}
        {spell.concentration && <li className="bst-chip">Concentration</li>}
        {spell.ritual && <li className="bst-chip">Ritual</li>}
        {spell.classes.map(c => (
          <li key={c} className="bst-chip">
            {c}
          </li>
        ))}
      </ul>

      <div className="bst-vitals">
        {/* As drawn: "1 action" on the tile, where the card's corner says "Action". */}
        <Tile label="CAST" value={time === 'Action' ? '1 action' : time} />
        <Tile label="RANGE" value={shortRange(spell.range)} />
        <Tile label="DURATION" value={shortDuration(spell.duration)} />
      </div>

      {(comps.verbal || comps.somatic || comps.material) && (
        <div className="bst-components">
          <span role="img" aria-label={`Components: ${componentWords(comps)}`} className="bst-pips">
            {(['V', 'S', 'M'] as const).map(l => {
              const on = l === 'V' ? comps.verbal : l === 'S' ? comps.somatic : comps.material
              return (
                <span key={l} aria-hidden="true" className={on ? 'bst-comp bst-comp--on' : 'bst-comp'}>
                  {l}
                </span>
              )
            })}
          </span>
          {comps.materialText && <span className="bst-components-text">{comps.materialText}</span>}
        </div>
      )}
    </>
  )
}

/** The note's prose, then what the spell rolls at each higher slot or tier. */
export function SpellText({
  spell,
  detail,
  loading,
}: {
  spell: SpellRow
  detail: Detail<SpellFence> | null
  loading: boolean
}) {
  const prose = detail ? stripPreamble(detail.prose) : ''
  const upcast = upcastLadder(spell)
  const tiers = upcast ? null : cantripLadder(spell)
  return (
    <>
      {loading ? (
        <p className="bst-prose">Reading the note…</p>
      ) : prose ? (
        <Markdown markdown={prose} sourcePath={spell.path} className="bst-prose bst-entry-desc bst-spell-prose" />
      ) : null}

      {upcast && <Ladder title="Higher-level slot" steps={upcast.steps} note={upcast.note} />}
      {tiers && <Ladder title="Character level" steps={tiers} note="Grows at character levels 5, 11 and 17" />}
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

function Ladder({ title, steps, note }: { title: string; steps: LadderStep[]; note: string }) {
  return (
    <section aria-label={title}>
      <h4 className="bst-section-title bst-ladder-title">{title}</h4>
      <div className="bst-ladder" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map(s => (
          <div key={s.label} className={s.base ? 'bst-rung bst-rung--base' : 'bst-rung'}>
            <span className="bst-rung-label">{s.label}</span>
            <span className="bst-rung-dice">{s.dice}</span>
          </div>
        ))}
      </div>
      <p className="bst-ladder-note">{note}</p>
    </section>
  )
}

const componentWords = (c: { verbal: boolean; somatic: boolean; material: boolean }): string =>
  [c.verbal ? 'verbal' : null, c.somatic ? 'somatic' : null, c.material ? 'material' : null].filter(Boolean).join(', ')

/**
 * "Add to a character…" — the sheet's own add (MYDND-36), started from the
 * catalog instead of the sheet: a cantrip joins the cantrips, anything else the
 * known spells (a Wizard's spellbook, unprepared).
 *
 * **Vault characters only.** A D&D Beyond character's spells are D&D Beyond's:
 * a re-sync replaces them, so an add here would be silently undone. A spell off
 * the character's class lists is allowed and said so — the sheet's picker
 * offers only the lists, but a GM handing out a scroll's spell is a ruling.
 */
function AddToCharacter({ spell, onCancel }: { spell: SpellRow; onCancel(): void }) {
  const { saveVaultCharacter } = useStateHost()
  const { entries, loading: rosterLoading } = useRoster()
  const generation = useVaultGeneration()
  const characters = entries.filter(e => isLocalId(e.ddbId)).sort((a, b) => a.name.localeCompare(b.name))
  const [path, setPath] = useState('')
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState<string | null>(null)

  const entry = characters.find(e => e.path === path) ?? null
  const json = useVaultCharacterJson(path, !!path, generation)
  const spells = json ? characterSpells(json) : null
  const has = !!spells && [...spells.cantrips, ...spells.known].some(s => s.id === spell.id)
  const lists = json
    ? [...castingClasses(json).map(c => c.name ?? ''), ...(entry?.sheet?.spell_list_classes ?? [])]
        .map(n => n.trim().toLowerCase())
        .filter(Boolean)
    : []
  const offList = !!json && lists.length > 0 && !spell.classes.some(c => lists.includes(c.trim().toLowerCase()))
  const ready = !!json && !has && spell.level >= 0

  async function add(): Promise<void> {
    if (!json || !entry) return
    setBusy(true)
    try {
      const saved = await saveVaultCharacter(
        addSpell(json, { id: spell.id, name: spell.name, source: spell.source, level: spell.level }),
        path,
      )
      if (saved) setAdded(entry.name)
    } finally {
      setBusy(false)
    }
  }

  if (added) {
    return (
      <div className="bst-foot-row bst-foot-row--center">
        <span className="bst-grow">
          Added {spell.name} to {added}.
        </span>
        <button type="button" className="bst-plain bst-btn-secondary" onClick={onCancel}>
          Done
        </button>
      </div>
    )
  }

  return (
    <section aria-label={`Add ${spell.name} to a character`} className="bst-add">
      {!rosterLoading && characters.length === 0 ? (
        <p className="bst-note">
          No Vault characters to add it to. A D&amp;D Beyond character&rsquo;s spells come from D&amp;D Beyond.
        </p>
      ) : (
        <label className="bst-field">
          Character
          <select className="bst-select" aria-label="Character" value={path} onChange={e => setPath(e.target.value)}>
            <option value="">{rosterLoading ? 'Reading the party…' : '— Choose a character'}</option>
            {characters.map(e => (
              <option key={e.path} value={e.path}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {has ? (
        <p className="bst-note">
          {entry?.name} already knows {spell.name}.
        </p>
      ) : offList ? (
        <p className="bst-note">
          {spell.name} is not on {entry?.name}&rsquo;s class lists. It can be added anyway.
        </p>
      ) : null}

      <div className="bst-foot-row">
        <button type="button" className="bst-plain bst-btn-secondary" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="bst-plain bst-btn-primary" disabled={busy || !ready} onClick={() => void add()}>
          {busy ? 'Saving…' : entry ? `Add to ${entry.name}` : 'Add'}
        </button>
      </div>
    </section>
  )
}
