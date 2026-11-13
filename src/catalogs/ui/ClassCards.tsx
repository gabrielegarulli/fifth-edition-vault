import type { SubclassRow } from '../../compendium'

/**
 * The classes page's small shapes (MYDND-86): the class tile — the canvas's
 * open book in violet on its tint — and a subclass card on the shelf.
 */

const BOOK = 'M4 19.5V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z M8 7h7 M8 11h5'

export function ClassTile({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const px = size === 'lg' ? 30 : size === 'sm' ? 18 : 22
  return (
    <span aria-hidden="true" className={`bst-itile bst-itile--${size} bst-itile--veryrare`}>
      <svg width={px} height={px} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={BOOK} />
      </svg>
    </span>
  )
}

export function SubclassCard({
  sub,
  line,
  selected,
  onOpen,
}: {
  sub: SubclassRow
  /** Its first features, when they have been read; else nothing. */
  line: string | null
  selected: boolean
  onOpen(): void
}) {
  return (
    <button type="button" aria-pressed={selected} onClick={onOpen} className="bst-plain bst-subcard">
      <span className="bst-subcard-top">
        <span className="bst-subcard-name">{sub.name}</span>
        <span className="bst-subcard-src">{sub.source}</span>
      </span>
      {line && <span className="bst-subcard-line">{line}</span>}
    </button>
  )
}
