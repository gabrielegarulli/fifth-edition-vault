import {
  cantripLadder,
  diceLabel,
  parseComponents,
  shortDuration,
  shortRange,
  shortTime,
  upcastLadder,
  type LadderStep,
} from '../model/spellShelves'
import type { SpellFence, SpellRow } from '../model/spells'
import type { Detail } from '../../platform'
import { stripPreamble } from '../../platform'
import { Markdown } from '../../platform/host'

/**
 * What a spell rolls, who casts it, its three tiles and its components. Apart
 * from the panel (`catalogs/ui/SpellCatalogDetail.tsx`), like `SpellText`, so the
 * builder can show them (MYDND-155). Here because the builder sits below the
 * catalogs, and this half reads nothing of a character's (MYDND-200).
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
