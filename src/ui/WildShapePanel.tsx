import { useState } from 'react'

import { formatCrCap, wildShapeCrCap, wildShapeTempHp } from '@vault/derive/wildShape.js'

import { useContent } from '../ContentContext'
import type { Sheet } from '../ddb/sheet'
import { useCatalogRows } from '../hooks/useVaultGeneration'
import { openNote, useObsidian } from '../ObsidianContext'
import { beastForms, druidLevel, formFromStatblock } from '../sheet/wildShape'
import type { Vitals, WildShapeForm } from '../state/vitals'
import { Block } from './CharacterSheet'

/**
 * Wild Shape (MYDND-51) — the web sheet's `WildShapePanel`, in the Features tab
 * where the web app mounts it.
 *
 * A Druid of level 2 or more picks a beast at or under the CR cap
 * (`wildShapeCrCap`: ¼, then ½ at 4, then 1 at 8) and takes it in one write:
 * the form, Druid-level temporary hit points, and a use of Wild Shape when the
 * sheet counts them. While it lasts the strip shows the form's AC and walking
 * speed in place of the character's, the web sheet's `applyWildShape` rule.
 * Everything else — the form's attacks, its senses — is its note, a click away.
 */

const LIMIT = 30

export function WildShapePanel({
  sheet,
  vitals,
  busy,
  onShape,
  onRevert,
}: {
  sheet: Sheet
  vitals: Vitals
  busy: boolean
  onShape(form: WildShapeForm, tempHp: number, uses: number | null): void
  onRevert(): void
}) {
  const content = useContent()
  const app = useObsidian()
  const level = druidLevel(sheet)
  const cap = wildShapeCrCap(level) as number | null
  const rows = useCatalogRows(() => (cap === null ? [] : content.monsters.upToCr(cap)))
  const [query, setQuery] = useState('')
  const [reading, setReading] = useState(false)

  if (cap === null) return null

  const tempHp = wildShapeTempHp(level) as number
  const pool = (sheet.class_resources ?? []).find(r => r.key === 'wild_shape') ?? null
  const used = vitals.featureUsesUsed.wild_shape ?? 0
  const left = pool ? pool.uses - used : null
  const q = query.trim().toLowerCase()
  const forms = beastForms(rows, cap).filter(m => !q || m.name.toLowerCase().includes(q))
  const active = vitals.wildShape
  const activePath = active ? rows.find(r => r.id === active.id)?.path : undefined

  const shape = (id: string): void => {
    const row = rows.find(r => r.id === id)
    if (!row || busy || reading) return
    setReading(true)
    void (async () => {
      try {
        // The two numbers a form replaces are on its statblock fence.
        const fence = (await content.monsters.detail(row.id))?.fence ?? null
        onShape(formFromStatblock(row, fence), tempHp, pool ? pool.uses : null)
      } finally {
        setReading(false)
      }
    })()
  }

  return (
    <Block
      title="Wild Shape"
      hint={`beasts up to CR ${formatCrCap(cap) as string} · ${tempHp} temp HP${left === null ? '' : ` · ${left} left`}`}
    >
      {active ? (
        <div className="flex flex-wrap items-center gap-2 rounded-obs-m border border-obs-green/40 bg-obs-green/10 px-2.5 py-2">
          <span className="text-normal">
            In the form of{' '}
            {activePath ? (
              <button type="button" className="note-link font-semibold" onClick={() => openNote(app, activePath)}>
                {active.name}
              </button>
            ) : (
              <b>{active.name}</b>
            )}
          </span>
          <span className="text-smallest text-muted">
            {[
              active.ac !== null ? `AC ${active.ac}` : null,
              active.walkSpeed !== null ? `${active.walkSpeed} ft` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
          <span className="flex-1" />
          <button type="button" disabled={busy} onClick={onRevert}>
            Revert
          </button>
        </div>
      ) : null}

      <input
        type="search"
        value={query}
        placeholder="Search beasts…"
        aria-label="Search beast forms"
        onChange={e => setQuery(e.target.value)}
      />
      {forms.length === 0 ? (
        <span className="text-smaller text-faint">
          {rows.length === 0 ? 'No bestiary notes — run npm run export:lore.' : 'No beast matches.'}
        </span>
      ) : (
        <div className="panel-container bg-background-secondary">
          {forms.slice(0, LIMIT).map(m => (
            <div
              key={m.id}
              className="flex items-center gap-2 border-b border-background-modifier-border px-2.5 py-1.5 last:border-b-0"
            >
              <button type="button" className="note-link min-w-0 flex-1 truncate" onClick={() => openNote(app, m.path)}>
                {m.name}
              </button>
              <span className="text-smallest text-faint">CR {formatCrCap(m.cr) as string}</span>
              <button
                type="button"
                disabled={busy || reading || (left !== null && left <= 0)}
                aria-label={`Shape into ${m.name}`}
                onClick={() => shape(m.id)}
              >
                Shape
              </button>
            </div>
          ))}
        </div>
      )}
      {forms.length > LIMIT ? (
        <span className="text-smallest text-faint">{forms.length - LIMIT} more — narrow the search.</span>
      ) : null}
    </Block>
  )
}
