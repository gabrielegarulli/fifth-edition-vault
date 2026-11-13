import type { ReactNode } from 'react'

import { slotTable } from '../../../characterModel'

import type { SpellPanelProps } from './types'

// What every list uses: the row styles, a rank's card, slots left, grouping.
// One file of the sheet's spell panel (MYDND-197); index.ts says what the panel is.

// `last:rounded-b-obs-m`: the level card does not clip (MYDND-55), so the
// concentration wash on a last row rounds its own corners.
export const ROW =
  'flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-background-modifier-border px-2.5 py-1.5 last:rounded-b-obs-m last:border-b-0'

export const PLAIN_BUTTON = 'h-auto border-none bg-transparent p-0 shadow-none'

export const ORDINAL = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']

/** "3 of 4 left" — what a level card says about its own slots. */
export function slotsLeft(props: SpellPanelProps, rank: number): string {
  const max = slotTable(props.sheet)?.max?.[rank - 1] ?? 0
  if (max === 0) return 'no slots'
  const used = Math.min(props.vitals.spellSlotsUsed[String(rank)] ?? 0, max)
  return `${max - used} of ${max} left`
}

/**
 * One level of spells as a card (MYDND-53): the title and how many slots are
 * left in the card's own header, then a row per spell. `action` is the header's
 * right-hand end — a Vault character's + Add.
 */
export function LevelCard({
  title,
  sub,
  action,
  children,
}: {
  title: string
  sub?: string
  action?: ReactNode
  children: ReactNode
}) {
  // The frame of `.panel-container` without its `overflow-hidden` (MYDND-55):
  // a row's ▾ cast menu opens downward out of the card, and a clipping card cut
  // it off at its bottom edge. The rows round their own last corners instead.
  return (
    <section
      className="rounded-obs-m border border-background-modifier-border bg-background-secondary"
      aria-label={title}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-background-modifier-border px-2.5 py-2">
        <h4 className="m-0 text-smaller font-bold text-normal">{title}</h4>
        {sub ? <span className="font-mono text-smaller text-muted">{sub}</span> : null}
        <span className="flex-1" />
        {action}
      </div>
      {children}
    </section>
  )
}

/** A line inside a level card that is not a spell — "None known.", a warning. */
export function CardNote({ children }: { children: ReactNode }) {
  return <div className="px-2.5 py-1.5 text-smaller italic text-faint">{children}</div>
}

// ---------------------------------------------------------------------------
// A spell row
// ---------------------------------------------------------------------------

/** Group rows by a label, keeping first-seen order. */
export function groupBy<T>(rows: readonly T[], label: (row: T) => string): [string, T[]][] {
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    const key = label(row)
    groups.set(key, [...(groups.get(key) ?? []), row])
  }
  return [...groups.entries()]
}
