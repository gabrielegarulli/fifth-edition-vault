import { LEVEL_LABEL } from '@vault/derive/spellUtils.js'

import { useSpellIndex, type SpellIndex } from '../../../compendium/host'
import { highestRank, MAX_RANK, slotTable } from '../../../characterModel'

import type { SpellPanelProps } from './types'
import { slotsLeft, LevelCard } from './shared'
import { SpellLine, castFor } from './spellLine'

// A D&D Beyond character's spells, as its sheet lists them.
// One file of the sheet's spell panel (MYDND-197); index.ts says what the panel is.

/**
 * The spell list as the charsheet fence states it, under slot pips.
 *
 * Also what a Vault character shows for the moment its own note is being read,
 * so the panel does not blink empty on every write.
 */
export function SheetSpells(props: SpellPanelProps) {
  const { sheet } = props
  const index = useSpellIndex()
  const slots = slotTable(sheet)
  const max = slots?.max ?? Array.from({ length: MAX_RANK }, () => 0)
  const groups = new Map((sheet.spells ?? []).map(g => [g.level, g.spells ?? []]))
  const top = Math.max(highestRank(max), ...[...groups.keys()].filter(l => l > 0))

  // A level with no spells gets no card: its slots are in the tiles above, and
  // they are spent by upcasting from a lower card.
  return (
    <>
      <SpellGroup level={0} names={groups.get(0) ?? []} index={index} props={props} />
      {Array.from({ length: top }, (_, i) => i + 1).map(rank => (
        <SpellGroup key={rank} level={rank} names={groups.get(rank) ?? []} index={index} props={props} />
      ))}
    </>
  )
}

function SpellGroup({
  level,
  names,
  index,
  props,
}: {
  level: number
  names: string[]
  index: SpellIndex | null
  props: SpellPanelProps
}) {
  if (names.length === 0) return null
  return (
    <LevelCard
      title={level === 0 ? 'Cantrips' : (LEVEL_LABEL(level) as string)}
      sub={level === 0 ? 'at will' : slotsLeft(props, level)}
    >
      {names.map(name => {
        const row = index?.find(name) ?? null
        return (
          <SpellLine
            key={name}
            name={name}
            row={row}
            {...castFor(props, name, row, level)}
            concentrating={props.vitals.concentration === name}
          />
        )
      })}
    </LevelCard>
  )
}

// ---------------------------------------------------------------------------
// Vault characters: the json's list, caps, editing
// ---------------------------------------------------------------------------
