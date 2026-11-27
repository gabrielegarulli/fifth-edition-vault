import { useSpellIndex } from '../../../compendium/host'
import { grantCasting, type SheetGrantedSpell } from '../../../characterModel'

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
          sub={subOf(rows, props)}
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
                {...castFor(props, r.name, row, level, true, true, grantCasting(props.sheet, r.ability))}
                concentrating={props.vitals.concentration === r.name}
              >
                {r.detail ? <span className="text-smaller text-muted">{r.detail}</span> : null}
              </SpellLine>
            )
          })}
        </LevelCard>
      ))}
    </>
  )
}

/**
 * The group's subtitle, and its own DC and attack when its feat chose the
 * ability (MYDND-274): a Fighter's Magic Initiate has no class line to read.
 * One per group, since a feat's grants share their ability.
 */
function subOf(rows: readonly SheetGrantedSpell[], props: SpellPanelProps): string {
  const counted = rows.every(r => r.mode === 'cantrip') ? 'always available, not counted' : 'always prepared, not counted'
  const casting = grantCasting(props.sheet, rows.find(r => r.ability)?.ability)
  if (!casting) return counted
  const attack = casting.attack >= 0 ? `+${casting.attack}` : String(casting.attack)
  return `${counted} · ${casting.ability} · DC ${casting.dc} · ${attack} to hit`
}
