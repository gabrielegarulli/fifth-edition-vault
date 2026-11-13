import {
  abilityPips,
  coverage,
  prerequisiteLine,
  raisesShort,
  type Coverage,
} from '../model/featShelves'
import type { FeatRow } from '../../compendium'

/**
 * The feats catalog's two list shapes (MYDND-62): a card on a shelf when the
 * pane is wide (design A), a row in a group when it is narrow (design C).
 *
 * Both are `<button>`s, so a feat is reachable by keyboard and announced as
 * something to open. Since MYDND-65 they are drawn in the canvas's own palette,
 * the Bestiary's `.bst-*` classes: a lit pip and a filled meter segment are the
 * canvas's violet, a selected card its violet border on the selected fill.
 */

export function FeatCard({ feat, selected, onOpen }: { feat: FeatRow; selected: boolean; onOpen(): void }) {
  const c = coverage(feat)
  return (
    <button type="button" onClick={onOpen} aria-pressed={selected} className="bst-plain bst-card">
      <span className="bst-card-name">{feat.name}</span>
      <span className="bst-feat-prereq">{prerequisiteLine(feat.prerequisite)}</span>
      <span className="bst-feat-foot">
        <AbilityPips abilities={feat.abilities} />
        {c && <CoverageLine coverage={c} />}
      </span>
    </button>
  )
}

export function FeatListRow({ feat, selected, onOpen }: { feat: FeatRow; selected: boolean; onOpen(): void }) {
  const raises = raisesShort(feat.abilities)
  return (
    <button type="button" onClick={onOpen} aria-pressed={selected} className="bst-plain bst-row">
      <span className="bst-row-main">
        <span className="bst-row-name">{feat.name}</span>
        <span className="bst-row-kind">{prerequisiteLine(feat.prerequisite)}</span>
      </span>
      {raises && (
        <span className="bst-feat-raises" title={`Raises ${raises}`}>
          {raises}
        </span>
      )}
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
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  )
}

/**
 * STR → CHA, lit where the feat can raise the score. Labelled as one image —
 * six "STR, on" announcements say less than "Raises Strength".
 */
export function AbilityPips({ abilities }: { abilities: readonly string[] }) {
  const pips = abilityPips(abilities)
  const lit = pips.filter(p => p.on).map(p => p.label)
  return (
    <span role="img" aria-label={lit.length === 0 ? 'Raises no ability' : `Raises ${lit.join(' or ')}`} className="bst-pips">
      {pips.map(p => (
        <span key={p.key} aria-hidden="true" className={p.on ? 'bst-feat-pip bst-feat-pip--on' : 'bst-feat-pip'}>
          {p.short}
        </span>
      ))}
    </span>
  )
}

/** One segment per benefit, filled where the sheet applies it, then the words. */
export function CoverageMeter({ coverage: c, wide = false }: { coverage: Coverage; wide?: boolean }) {
  return (
    <span aria-hidden="true" className="bst-meter">
      {Array.from({ length: c.benefits }, (_, i) => (
        <span
          key={i}
          className={`bst-meter-seg${wide ? ' bst-meter-seg--wide' : ''}${i < c.applied ? ' bst-meter-seg--on' : ''}`}
        />
      ))}
    </span>
  )
}

function CoverageLine({ coverage: c }: { coverage: Coverage }) {
  return (
    <span className="bst-coverage">
      <CoverageMeter coverage={c} />
      {c.label}
    </span>
  )
}
