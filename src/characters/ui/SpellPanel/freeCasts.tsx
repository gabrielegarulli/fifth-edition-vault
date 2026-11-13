import { useSpellIndex } from '../../../compendium/host'
import { type SheetFreeCast, spellRoll } from '../../../characterModel'
import { CastButton, type CastOption } from '../../../spellEffects/host'

import type { SpellPanelProps } from './types'
import { LevelCard, groupBy } from './shared'
import { Pips } from './slots'
import { SpellLine } from './spellLine'

// Casts a feature gives without a slot, and when they come back.
// One file of the sheet's spell panel (MYDND-197); index.ts says what the panel is.

const RESET_LABEL: Record<string, string> = {
  long_rest: 'back on a long rest',
  short_rest: 'back on a short or long rest',
}

/** Spells a feature casts without a slot — Mystic Arcanum, Spell Mastery. */
export function FreeCasts({ free, vitals, actions, busy, sheet, notePath }: { free: readonly SheetFreeCast[] } & SpellPanelProps) {
  const index = useSpellIndex()
  if (free.length === 0) return null
  return (
    <>
      {groupBy(free, f => f.label).map(([label, rows]) => (
        <LevelCard
          key={label}
          title={label}
          sub={
            rows[0].uses === null
              ? 'at will, no slot'
              : `${rows[0].uses} free cast${rows[0].uses === 1 ? '' : 's'} each, ${RESET_LABEL[rows[0].resets ?? ''] ?? 'no slot'}`
          }
        >
          {rows.map(f => {
            const row = index?.find(f.name, f.id) ?? null
            const left = f.uses === null ? Infinity : f.uses - (vitals.featureUsesUsed[f.key] ?? 0)
            // A free cast spends its own use, never a slot, and is cast at the
            // spell's own level (Mystic Arcanum does not upcast).
            const option: CastOption = {
              label: f.uses === null ? 'Cast' : 'Cast free',
              detail: f.uses === null ? 'at will' : `${left} left`,
              cost: {
                ...(f.uses === null ? {} : { use: { key: f.key, max: f.uses } }),
                concentration: row?.concentration ? f.name : null,
              },
              rank: f.level,
              roll: row
                ? spellRoll(
                    { ...row, level: f.level },
                    { rank: f.level, characterLevel: sheet.level ?? 1, spellMod: sheet.spellcasting?.mod ?? 0 },
                  )
                : null,
            }
            return (
              <SpellLine
                key={f.key}
                name={f.name}
                row={row}
                cast={
                  <CastButton
                    name={f.name}
                    options={left > 0 ? [option] : []}
                    busy={busy}
                    onCast={actions.cast}
                    character={{ name: sheet.name, notePath }}
                    range={row?.range}
                    attack={sheet.spellcasting ? { bonus: sheet.spellcasting.attack, characterLevel: sheet.level ?? 1 } : null}
                    noneLeft={`No free casts of ${f.name} left`}
                  />
                }
                concentrating={vitals.concentration === f.name}
              >
                {f.uses !== null ? (
                  <Pips
                    max={f.uses}
                    used={vitals.featureUsesUsed[f.key] ?? 0}
                    label={`free cast of ${f.name}`}
                    busy={busy}
                    onSpend={() => actions.spendUse(f.key, f.uses ?? 0)}
                    onRefund={() => actions.refundUse(f.key)}
                  />
                ) : null}
              </SpellLine>
            )
          })}
        </LevelCard>
      ))}
    </>
  )
}
