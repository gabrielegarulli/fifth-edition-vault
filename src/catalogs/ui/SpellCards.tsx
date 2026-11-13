import {
  cardLine,
  componentPips,
  diceLabel,
  spellFlagsOf,
  kindLine,
  shortDuration,
  shortRange,
  shortTime,
  schoolLabel,
} from '../../compendium'
import type { SpellRow } from '../../compendium'
import { Chevron } from './BestiaryCards'
import { SCHOOL_ART, SCHOOL_CLIP, SCHOOL_SPLATTER, type SchoolIconName } from '../../platform/host'

/**
 * The spell catalog's list shapes (MYDND-66): a card on a shelf when the pane is
 * wide (design A), a row in a group when it is narrow (design C). Both are
 * `<button>`s, announced as something to open, and both are drawn in the
 * canvas's own palette — `.bst-*` in `styles/index.css` — inside the page's
 * `.bst` root, as the Bestiary and Feats are.
 */

const uris = new Map<SchoolIconName, string>()

/**
 * A school's icon as an `<img>` source: the shared splatter in the school's
 * colour, its white glyph on top. Built once per school and kept, so a list of a
 * thousand rows hands the browser nine distinct images, not a thousand SVGs.
 * A `data:` URI, not a file: a release ships `main.js`, `styles.css` and
 * `manifest.json` and nothing else.
 */
function iconUri(name: SchoolIconName): string {
  const known = uris.get(name)
  if (known) return known
  const { color, glyph } = SCHOOL_ART[name]
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 340 340">' +
    `<g fill="${color}" clip-path="url(#c)">${SCHOOL_SPLATTER}</g>` +
    `<path fill="#F9FAFA" d="${glyph}"/>` +
    `<defs><clipPath id="c"><path fill="#fff" d="${SCHOOL_CLIP}"/></clipPath></defs></svg>`
  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  uris.set(name, uri)
  return uri
}

/** `Evocation` → `evocation`, when there is an icon for it. A stray code has none. */
export function schoolIconName(school: string | null): SchoolIconName | null {
  const key = schoolLabel(school).toLowerCase()
  return key in SCHOOL_ART ? (key as SchoolIconName) : null
}

/**
 * The school's icon — or, for a school with no icon (a stray code like `EN`),
 * the canvas's own drawing: its first two letters in a circle.
 */
export function SchoolIcon({ school, size }: { school: string | null; size?: 'xs' | 'sm' | 'lg' }) {
  const name = schoolIconName(school)
  const sized = size ? ` bst-school--${size}` : ''
  if (name) {
    return (
      <span aria-hidden="true" className={`bst-school${sized}`}>
        <img src={iconUri(name)} alt="" />
      </span>
    )
  }
  const code = schoolLabel(school).replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || '—'
  return (
    <span aria-hidden="true" className={`bst-token bst-token--code${size ? ` bst-token--${size}` : ''}`}>
      {code}
    </span>
  )
}

export function SpellCard({ spell, selected, onOpen }: { spell: SpellRow; selected: boolean; onOpen(): void }) {
  const school = schoolLabel(spell.school)
  const line = cardLine(spell)
  const pips = componentPips(spell.components)
  const lit = pips.filter(p => p.on).map(p => p.label)
  const cast = [shortTime(spell.castingTime), shortRange(spell.range)].filter(Boolean).join(' · ')
  return (
    <button type="button" onClick={onOpen} aria-pressed={selected} className="bst-plain bst-card bst-card--spell">
      {/* The header: icon, then the name over the school and classes, ruled off
          from the rest of the card (MYDND-69). */}
      <span className="bst-card-top bst-card-head">
        <SchoolIcon school={spell.school} />
        <span className="bst-card-names">
          <span className="bst-card-name">{spell.name}</span>
          <span className="bst-card-kind">{kindLine(spell, school)}</span>
        </span>
      </span>
      {cast && <span className="bst-card-cast">{cast}</span>}
      {line && <span className="bst-card-stats">{line}</span>}
      <span className="bst-card-foot">
        <span role="img" aria-label={lit.length ? `Components: ${lit.join(', ')}` : 'No components'} className="bst-pips">
          {pips.map(p => (
            <span key={p.label} aria-hidden="true" className={p.on ? 'bst-pip bst-pip--comp bst-pip--on' : 'bst-pip bst-pip--comp'}>
              {p.label}
            </span>
          ))}
        </span>
        <span className="bst-spacer" />
        {spellFlagsOf(spell).map(f => (
          <span key={f.text} className={`bst-flag bst-flag--${f.tone}`}>
            {f.text}
          </span>
        ))}
      </span>
    </button>
  )
}

/**
 * Design C's row: icon, name, `Evocation · 120 ft · 1d10 fire` (the duration
 * when it rolls nothing), the casting time and `CONC RIT`.
 */
export function SpellListRow({ spell, selected, onOpen }: { spell: SpellRow; selected: boolean; onOpen(): void }) {
  const second = [schoolLabel(spell.school), shortRange(spell.range), diceLabel(spell) ?? shortDuration(spell.duration)]
    .filter(Boolean)
    .join(' · ')
  const flags = [spell.concentration ? 'CONC' : null, spell.ritual ? 'RIT' : null].filter(Boolean).join(' ')
  return (
    <button type="button" onClick={onOpen} aria-pressed={selected} className="bst-plain bst-row">
      <SchoolIcon school={spell.school} size="sm" />
      <span className="bst-row-main">
        <span className="bst-row-name">{spell.name}</span>
        <span className="bst-row-kind">{second}</span>
      </span>
      <span className="bst-row-cr">
        <span className="bst-row-crv">{shortTime(spell.castingTime) ?? '—'}</span>
        {flags && <span className="bst-row-moves">{flags}</span>}
      </span>
      <Chevron />
    </button>
  )
}
