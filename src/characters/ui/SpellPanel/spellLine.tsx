import type { ReactNode } from 'react'
import { LEVEL_LABEL } from '@vault/derive/spellUtils.js'

import { SpellLink } from '../../../compendium/host'
import type { SpellRow } from '../../../compendium'
import { MAX_RANK, slotTable, spellDamageBonus, spellPushFeet, spellRoll } from '../../../characterModel'
import { CastButton, castOptions } from '../../../spellEffects/host'
import { Rollable } from '../../../dice/host'

import type { SpellPanelProps } from './types'
import { ROW } from './shared'

// One spell's line, and the cast button and dice it gets.
// One file of the sheet's spell panel (MYDND-197); index.ts says what the panel is.

/**
 * `1 reaction` → `reaction`, `1 bonus` → `bonus action`, `60 feet` → `60 ft`:
 * the row's right-hand end is read at a glance, so it says the short thing
 * (MYDND-53). The exporter writes a bonus action as `1 bonus` on 120 notes.
 */
export function shortCastingTime(t: string | null): string | null {
  if (!t) return null
  const s = t.trim()
  if (/^1 reaction\b/i.test(s)) return 'reaction'
  if (/^1 bonus\b/i.test(s)) return 'bonus action'
  return s
}

export function shortRange(r: string | null): string | null {
  return r ? r.trim().replace(/\b(\d+)\s*feet\b/i, '$1 ft').replace(/\b(\d+)\s*miles?\b/i, '$1 mi') : null
}

/** Concentration, ritual, and how it is cast — off the note's frontmatter, so free. */
function SpellMeta({ row }: { row: SpellRow | null }) {
  if (!row) return null
  const bits = [shortCastingTime(row.castingTime), shortRange(row.range)].filter(Boolean).join(' · ')
  return (
    <>
      {row.concentration ? (
        <span className="badge" title="Concentration">
          C
        </span>
      ) : null}
      {row.ritual ? (
        <span className="badge" title="Ritual">
          R
        </span>
      ) : null}
      {bits ? <span className="font-mono text-smaller text-muted">{bits}</span> : null}
    </>
  )
}

export function SpellLine({
  name,
  row,
  dim = false,
  cast,
  dice,
  concentrating = false,
  children,
}: {
  name: string
  row: SpellRow | null
  /** An unprepared spell in a book: listed, but not ready to cast. */
  dim?: boolean
  /** The row's Cast control, first on the row — the verb (MYDND-46). */
  cast?: ReactNode
  /** What it rolls at its own rank, as a roll — Fireball's 8d6 (MYDND-49). */
  dice?: ReactNode
  /** This is the spell being concentrated on now. */
  concentrating?: boolean
  children?: ReactNode
}) {
  // Cast and the name on the left; everything read about the spell on the
  // right (MYDND-53). The concentration row is washed in amber from the left.
  return (
    <div
      className={`${ROW} ${dim ? 'opacity-60' : ''} ${concentrating ? 'bg-linear-to-r from-obs-yellow/15 to-transparent' : ''}`}
    >
      {cast}
      <SpellLink name={name} row={row} />
      <span className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {concentrating ? <span className="text-smallest text-obs-yellow">concentrating</span> : null}
        <SpellMeta row={row} />
        {dice}
        {children}
      </span>
    </div>
  )
}

/**
 * The Cast control for one row, wired to this character's slots (MYDND-46).
 * `level` is the spell's own level — the rank heading it sits under for a D&D
 * Beyond list, the pick's or the note's for a Vault one.
 */
export function castFor(
  props: SpellPanelProps,
  name: string,
  row: SpellRow | null,
  level: number,
  prepared = true,
  ritualAllowed = true,
): { cast: ReactNode; dice: ReactNode } {
  const { sheet } = props
  const max = slotTable(sheet)?.max ?? Array.from({ length: MAX_RANK }, () => 0)
  const characterLevel = sheet.level ?? 1
  const spellMod = sheet.spellcasting?.mod ?? 0
  const damageBonus = spellDamageBonus(sheet.spell_damage_bonuses, name, row?.id)
  const options = castOptions({
    name,
    level,
    concentration: !!row?.concentration,
    ritual: !!row?.ritual && ritualAllowed,
    prepared,
    max,
    used: props.vitals.spellSlotsUsed,
    row,
    characterLevel,
    spellMod,
    damageBonus,
  })
  const character = { name: sheet.name, notePath: props.notePath }
  // The roll at the spell's own rank, shown on the row whether or not a slot is
  // left: it is what the spell does, and rolling it without casting is allowed.
  const base = row ? spellRoll({ ...row, level }, { rank: level, characterLevel, spellMod, damageBonus }) : null
  return {
    cast: (
      <CastButton
        name={name}
        options={options}
        busy={props.busy}
        onCast={props.actions.cast}
        character={character}
        range={row?.range}
        pushFeet={spellPushFeet(sheet.spell_pushes, name, row?.id)}
        attack={sheet.spellcasting ? { bonus: sheet.spellcasting.attack, characterLevel } : null}
        noneLeft={`No ${LEVEL_LABEL(level)} slot or higher left`}
      />
    ),
    dice: base ? (
      <Rollable
        value={base.formula}
        label={`${name} ${base.kind === 'heal' ? 'healing' : 'damage'}`}
        character={character}
        rollType={base.kind === 'damage' ? 'damage' : null}
        damageType={base.damageType}
      />
    ) : null,
  }
}

// ---------------------------------------------------------------------------
// D&D Beyond: the sheet's list, slots, links
// ---------------------------------------------------------------------------
