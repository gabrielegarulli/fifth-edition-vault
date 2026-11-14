import { useState, type ReactNode } from 'react'

import { spellsComplete, type Caster } from '../../choices'
import type { BuilderDraft, SpellPick } from '../../choices'
import type { SpellRow } from '../../compendium'
import { Section, type SetDraft, ReadButton, SpellPreview } from '../../choices/host'

/**
 * Spells (MYDND-29) — the web builder's `SpellStep`: cantrips and leveled
 * spells from each casting class's list, up to the caps its class table gives
 * (`builderSpellCaps.getCasterCaps`), plus the prepared subset for a spellbook
 * caster.
 *
 * **Every rank the class can cast, not only the first** (MYDND-124). Until then
 * it offered level 1 whatever the level, as the web builder does, so a Wizard
 * made at 20 was asked for a 44-spell book of first-level spells. The ranks are
 * the slot tables the sheet's own panel already reads (`choices.maxSpellRank`),
 * so it is no new rule, and each pick stores its `level` — what the projection
 * files it under, as a spell added on the sheet does (MYDND-36).
 *
 * Optional, as in the web app: an empty pick is saved, never refused.
 *
 * Each row can be read in place (MYDND-155). A full caster's list runs to
 * hundreds, so a note is read when its row is opened and never before.
 */

export type { Caster }

const capText = (n: number | null) => (n === null || !Number.isFinite(n) ? '∞' : String(n))

export function SpellsStep({
  draft,
  setDraft,
  casters,
  spellsFor,
}: {
  draft: BuilderDraft
  setDraft: SetDraft
  casters: Caster[]
  spellsFor: (className: string) => SpellRow[]
}) {
  const [tab, setTab] = useState(0)
  const [filter, setFilter] = useState('')
  const caster = casters[Math.min(tab, casters.length - 1)]
  if (!caster) return <p className="bst-note">No class here casts spells.</p>

  const { caps } = caster
  // Its own list, then any a feature opens (Magical Secrets), each spell once.
  const list = [caster.list, ...caster.extraLists]
    .flatMap(l => spellsFor(l))
    .filter((s, i, all) => all.findIndex(o => o.id === s.id) === i)
  const spells = draft.spells
  const prepared = spells.prepared ?? []
  const leveledCap = caps.isSpellbook ? caps.spellbookCap : caps.spellsCap
  const match = (s: SpellRow) => !filter.trim() || s.name.toLowerCase().includes(filter.trim().toLowerCase())
  const pick = (s: SpellRow): SpellPick => ({ id: s.id, name: s.name, source: s.source, level: s.level })

  const toggle = (field: 'cantrips' | 'known', s: SpellRow, cap: number | null) =>
    setDraft(d => {
      const current = d.spells[field]
      if (current.some(p => p.id === s.id)) {
        const next = current.filter(p => p.id !== s.id)
        const keep = field === 'known' ? (d.spells.prepared ?? []).filter(id => id !== s.id) : d.spells.prepared
        return { ...d, spells: { ...d.spells, [field]: next, ...(keep ? { prepared: keep } : {}) } }
      }
      if (cap !== null && Number.isFinite(cap) && current.length >= cap) return d
      return { ...d, spells: { ...d.spells, [field]: [...current, pick(s)] } }
    })

  const togglePrepared = (id: string) =>
    setDraft(d => {
      const now = d.spells.prepared ?? []
      if (now.includes(id)) return { ...d, spells: { ...d.spells, prepared: now.filter(x => x !== id) } }
      if (Number.isFinite(caps.spellsCap) && now.length >= caps.spellsCap) return d
      return { ...d, spells: { ...d.spells, prepared: [...now, id] } }
    })

  // Known spells by rank, each under its own heading — at 20 a full caster's
  // list runs to hundreds, and the rank is what a player looks for.
  const ranks = Array.from({ length: caster.maxRank }, (_, i) => i + 1)
  const rankHeading = (rank: number, rows: SpellRow[]) => {
    const picked = spells.known.filter(p => rows.some(s => s.id === p.id)).length
    return `Level ${rank}${picked > 0 ? ` · ${picked} picked` : ''}`
  }

  const group = (title: string, field: 'cantrips' | 'known', rows: SpellRow[], cap: number | null) => (
    <Section
      title={`${title} — ${spells[field].length} / ${capText(cap)}`}
      open={cap !== null && Number.isFinite(cap) && spells[field].length < cap}
    >
      {rows.length === 0 ? <p className="bst-note">No spell note lists {caster.list}.</p> : null}
      {field === 'known' ? (
        ranks.map(rank => {
          const at = rows.filter(s => s.level === rank)
          const shown = at.filter(match)
          return shown.length === 0 ? null : (
            <div key={rank} className="bst-col">
              <span className="bst-note bst-note--faint">{rankHeading(rank, at)}</span>
              {checks(field, shown, cap)}
            </div>
          )
        })
      ) : (
        <div className="bst-col">{checks(field, rows.filter(match), cap)}</div>
      )}
    </Section>
  )

  function checks(field: 'cantrips' | 'known', rows: SpellRow[], cap: number | null) {
    return rows.map(s => {
      const on = spells[field].some(p => p.id === s.id)
      return (
        <SpellCheck key={s.id} spell={s} on={on} onToggle={() => toggle(field, s, cap)}>
          {field === 'known' && caps.isSpellbook && on ? (
            <button
              type="button"
              aria-pressed={prepared.includes(s.id)}
              className="bst-plain bst-pill bst-pill--lg"
              onClick={() => togglePrepared(s.id)}
            >
              Prepared
            </button>
          ) : null}
        </SpellCheck>
      )
    })
  }

  return (
    <>
      {casters.length > 1 ? (
        <div role="group" aria-label="Casting classes" className="bst-wrap-row">
          {casters.map((c, i) => (
            <button
              key={c.index}
              type="button"
              aria-pressed={c === caster}
              className="bst-plain bst-pill bst-pill--lg"
              onClick={() => setTab(i)}
            >
              {c.name}
            </button>
          ))}
        </div>
      ) : null}
      <p className="bst-note bst-note--faint">
        Optional — spells can be prepared or swapped on the sheet.
        {caps.isSpellbook ? ` Prepared: ${prepared.length} / ${capText(caps.spellsCap)}.` : ''}
        {spellsComplete(draft, caps) ? ' All picked.' : ''}
      </p>
      <input
        type="text"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Filter spells…"
        aria-label="Filter spells"
        className="bst-input"
      />
      {caps.cantripCap > 0 ? group('Cantrips', 'cantrips', list.filter(s => s.level === 0), caps.cantripCap) : null}
      {group(
        caps.isSpellbook ? 'Spellbook' : caster.maxRank > 1 ? `Spells, levels 1–${caster.maxRank}` : 'Level 1 spells',
        'known',
        list.filter(s => s.level >= 1 && s.level <= caster.maxRank),
        leveledCap,
      )}
    </>
  )
}

/**
 * One spell's checkbox, and its note under it once asked for — outside the
 * `<label>`, or a click anywhere in the text would tick the box.
 */
function SpellCheck({
  spell,
  on,
  onToggle,
  children,
}: {
  spell: SpellRow
  on: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const [reading, setReading] = useState(false)
  return (
    <div className="bst-col">
      <div className="bst-bread-row">
        <label className="bst-check bst-bread-main">
          <input type="checkbox" className="bst-checkbox" checked={on} onChange={onToggle} aria-label={spell.name} />
          <span className="bst-spacer">{spell.name}</span>
          {children}
        </label>
        <ReadButton name={spell.name} open={reading} onToggle={() => setReading(r => !r)} />
      </div>
      {reading ? <SpellPreview spell={spell} /> : null}
    </div>
  )
}
