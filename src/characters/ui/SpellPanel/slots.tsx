import { LEVEL_LABEL } from '@vault/derive/spellUtils.js'

import { slotTable } from '../../../characterModel'
import { Block, LABEL } from '../CharacterSheet'

import type { SpellPanelProps } from './types'
import { ORDINAL } from './shared'

// Spell slots: the pips, and a tile per rank.
// One file of the sheet's spell panel (MYDND-197); index.ts says what the panel is.

/**
 * One pip per slot: filled is available, hollow is spent. Clicking a filled pip
 * spends one, a hollow one gives one back — the web panel's `SlotPip` rule, and
 * why refunding is never disabled: it corrects a click.
 *
 * Drawn in the text colour, not the accent (MYDND-44): the accent is for rolls,
 * and a pip is a control with a hover and a pointer, which the old ● glyphs in
 * the accent never said. Exported for the class resources (MYDND-47), which
 * spend the same way.
 */
export function Pips({
  max,
  used,
  label,
  busy,
  onSpend,
  onRefund,
  showCount = true,
}: {
  max: number
  used: number
  label: string
  busy: boolean
  onSpend(): void
  onRefund(): void
  /** The `3/4` after the pips. A slot tile leaves it to the level card. */
  showCount?: boolean
}) {
  const spent = Math.min(used, max)
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="flex flex-wrap items-center">
        {Array.from({ length: max }, (_, i) => {
          // Available ones first, so the row empties from the right as it is spent.
          const isSpent = i >= max - spent
          return (
            <button
              key={i}
              type="button"
              disabled={busy}
              aria-label={isSpent ? `Recover a ${label}` : `Spend a ${label}`}
              title={isSpent ? `Recover a ${label}` : `Spend a ${label}`}
              aria-pressed={isSpent}
              className={isSpent ? 'pip-spent' : 'pip'}
              onClick={isSpent ? onRefund : onSpend}
            />
          )
        })}
      </span>
      {showCount ? (
        <span className="font-mono text-smallest tabular-nums text-muted">
          {max - spent}/{max}
        </span>
      ) : null}
    </span>
  )
}

/**
 * Every slot the character has, one tile per rank, above the spell list
 * (MYDND-53). The pips used to sit in each rank's heading, which spread the one
 * thing read before casting across the whole tab; here they are one glance, and
 * each level card says how many of its own are left.
 */
export function SlotTiles(props: SpellPanelProps) {
  const max = slotTable(props.sheet)?.max ?? []
  const ranks = max.map((m, i) => ({ rank: i + 1, max: m })).filter(r => r.max > 0)
  if (ranks.length === 0) return null
  return (
    <Block title="Slots" hint="filled = available">
      <div className="flex flex-wrap gap-1.5">
        {ranks.map(({ rank, max: m }) => (
          <div
            key={rank}
            className="flex flex-col gap-1.5 rounded-obs-m border border-background-modifier-border bg-background-secondary px-2.5 py-1.5"
          >
            <span className={`${LABEL} font-mono`}>{ORDINAL[rank]}</span>
            <Pips
              max={m}
              used={props.vitals.spellSlotsUsed[String(rank)] ?? 0}
              label={`${LEVEL_LABEL(rank) as string} slot`}
              busy={props.busy}
              onSpend={() => props.actions.spendSlot(rank, m)}
              onRefund={() => props.actions.refundSlot(rank)}
              showCount={false}
            />
          </div>
        ))}
      </div>
    </Block>
  )
}
