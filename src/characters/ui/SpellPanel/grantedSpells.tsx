import { useSpellIndex } from '../../../compendium/host'
import type { SheetGrantedSpell } from '../../../characterModel'

import type { SpellPanelProps } from './types'
import { LevelCard, groupBy } from './shared'
import { SpellLine, castFor } from './spellLine'

// Spells a feature grants, outside the class's list.
// One file of the sheet's spell panel (MYDND-197); index.ts says what the panel is.

/**
 * Spells a feature hands over — Bard Words of Creation, a Paladin's Smite. No
 * remove button: the player did not choose these, so there is nothing to
 * unchoose.
 */
export function GrantedSpells({ granted, props }: { granted: readonly SheetGrantedSpell[]; props: SpellPanelProps }) {
  const index = useSpellIndex()
  if (granted.length === 0) return null
  return (
    <>
      {groupBy(granted, g => g.source ?? 'Always prepared').map(([label, rows]) => (
        <LevelCard
          key={label}
          title={label}
          sub={rows.every(r => r.mode === 'cantrip') ? 'always available, not counted' : 'always prepared, not counted'}
        >
          {rows.map(r => {
            const row = index?.find(r.name, r.id) ?? null
            // A granted spell is cast like any other — with a slot of its level.
            const level = r.mode === 'cantrip' ? 0 : Math.max(1, row?.level ?? 1)
            return (
              <SpellLine
                key={`${r.mode}-${r.name}`}
                name={r.name}
                row={row}
                {...castFor(props, r.name, row, level)}
                concentrating={props.vitals.concentration === r.name}
              />
            )
          })}
        </LevelCard>
      ))}
    </>
  )
}
