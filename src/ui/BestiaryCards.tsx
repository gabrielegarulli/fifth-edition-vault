import { useState } from 'react'

import { crGlyph, flagsOf, formatXp, kindLine, movePips, statLine } from '../catalog/bestiary'
import type { MonsterRow } from '../content/monsters'
import { resourceUrl, useObsidian } from '../ObsidianContext'

/**
 * The Bestiary's list shapes (MYDND-64): a card on a shelf when the pane is
 * wide (design A), a row in a group when it is narrow (design C). Both are
 * `<button>`s, announced as something to open, and both are drawn in the
 * canvas's own palette — `.bst-*` in `styles/index.css` — not Obsidian's.
 */

/**
 * The note's token art in a circle, or its initial where there is none, at the
 * same size either way so every card keeps the same left edge. An image that
 * fails to load falls back to the initial rather than a broken-image icon.
 */
export function MonsterToken({ monster, size }: { monster: Pick<MonsterRow, 'name' | 'image'>; size?: 'sm' | 'lg' }) {
  const app = useObsidian()
  const url = resourceUrl(app, monster.image)
  const [failed, setFailed] = useState<string | null>(null)
  const showImage = url !== null && failed !== url
  return (
    <span aria-hidden="true" className={size ? `bst-token bst-token--${size}` : 'bst-token'}>
      {showImage ? <img src={url} alt="" onError={() => setFailed(url)} /> : monster.name.charAt(0)}
    </span>
  )
}

export function MonsterCard({ monster, selected, onOpen }: { monster: MonsterRow; selected: boolean; onOpen(): void }) {
  const stats = statLine(monster)
  const pips = movePips(monster.moves)
  const lit = pips.filter(p => p.on).map(p => p.mode)
  return (
    <button type="button" onClick={onOpen} aria-pressed={selected} className="bst-plain bst-card">
      <span className="bst-card-top">
        <MonsterToken monster={monster} />
        <span className="bst-card-names">
          <span className="bst-card-name">{monster.name}</span>
          <span className="bst-card-kind">{kindLine(monster)}</span>
        </span>
        <span className="bst-card-cr">
          <span className="bst-cr">CR {crGlyph(monster.cr)}</span>
          {monster.xp !== null && <span className="bst-xp">{formatXp(monster.xp)} XP</span>}
        </span>
      </span>
      {stats && <span className="bst-card-stats">{stats}</span>}
      <span className="bst-card-foot">
        {/* One image for the four pips: "Moves by fly or climb" says more than
            four "FLY, off" announcements. */}
        <span
          role="img"
          aria-label={lit.length ? `Moves by ${lit.join(' or ')}` : 'Walks only'}
          className="bst-pips"
        >
          {pips.map(p => (
            <span key={p.mode} aria-hidden="true" className={p.on ? 'bst-pip bst-pip--on' : 'bst-pip'}>
              {p.label}
            </span>
          ))}
        </span>
        <span className="bst-spacer" />
        {flagsOf(monster).map(f => (
          <span key={f} className="bst-flag">
            {f}
          </span>
        ))}
      </span>
    </button>
  )
}

/** Design C's row: token, name, `Large monstrosity · AC 13 · HP 59`, CR and how it moves. */
export function MonsterListRow({ monster, selected, onOpen }: { monster: MonsterRow; selected: boolean; onOpen(): void }) {
  const second = [kindLine(monster), monster.ac !== null ? `AC ${monster.ac}` : null, monster.hp !== null ? `HP ${monster.hp}` : null]
    .filter(Boolean)
    .join(' · ')
  return (
    <button type="button" onClick={onOpen} aria-pressed={selected} className="bst-plain bst-row">
      <MonsterToken monster={monster} size="sm" />
      <span className="bst-row-main">
        <span className="bst-row-name">{monster.name}</span>
        <span className="bst-row-kind">{second}</span>
      </span>
      <span className="bst-row-cr">
        <span className="bst-row-crv">CR {crGlyph(monster.cr)}</span>
        {monster.moves.length > 0 && <span className="bst-row-moves">{monster.moves.join(' ').toUpperCase()}</span>}
      </span>
      <Chevron />
    </button>
  )
}

export function Chevron({ down = false }: { down?: boolean }) {
  return (
    <svg
      className="bst-chevron"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={down ? 'M6 9l6 6 6-6' : 'M9 6l6 6-6 6'} />
    </svg>
  )
}
