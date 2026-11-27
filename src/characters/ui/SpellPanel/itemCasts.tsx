import { Notice } from 'obsidian'

import { useSpellIndex } from '../../../compendium/host'
import { castSpell, type CastCost, type SheetItemCast, spellRoll } from '../../../characterModel'
import { Rollable } from '../../../dice/host'
import { CastButton, type CastOption } from '../../../spellEffects/host'
import { useCharacters } from '../context'

import type { SpellPanelProps } from './types'
import { LevelCard, groupBy } from './shared'
import { SpellLine } from './spellLine'

// The spells a worn magic item casts, and the charges each takes.
// One file of the sheet's spell panel (MYDND-197); index.ts says what the panel is.

/**
 * A Wand of Fireballs' Fireball, a Staff of Healing's Cure Wounds (MYDND-278).
 *
 * The overlay lists them (`sheet.item_casts`) for the items whose benefits
 * apply. A cast that costs charges spends them from the item's row and starts
 * concentration in **one write** (`spendItem`), the way a slot and its
 * concentration go together (`castSpell`); one the charges cannot pay for is
 * refused rather than cast. One with no charge cost ("at will", "1/day") rolls
 * and starts concentration only: a once-a-day use is the table's to track.
 *
 * Cast at the spell's own level with the caster's attack and DC: an item that
 * fixes its own DC (a Wand of Fireballs' 15) says so in its note, which is a
 * click away.
 */
export function ItemCasts({ casts, vitals, actions, busy, sheet, notePath }: { casts: readonly SheetItemCast[] } & SpellPanelProps) {
  const index = useSpellIndex()
  const { vitals: store } = useCharacters()
  if (casts.length === 0) return null
  return (
    <>
      {groupBy(casts, c => c.itemId).map(([itemId, rows]) => {
        const first = rows[0]
        const left = first.maxCharges === null ? null : Math.max(0, first.maxCharges - first.used)
        return (
          <LevelCard
            key={itemId}
            title={first.item}
            sub={left === null ? 'cast from the item' : `${left} of ${first.maxCharges} charges left`}
          >
            {rows.map(c => {
              const row = index?.find(c.name) ?? null
              const level = row?.level ?? 0
              const affordable = c.charges === null || (left !== null && c.charges <= left)
              const base = row
                ? spellRoll({ ...row, level }, { rank: level, characterLevel: sheet.level ?? 1, spellMod: sheet.spellcasting?.mod ?? 0 })
                : null
              const option: CastOption = {
                label: 'Cast',
                detail: c.charges !== null ? `${c.charges} charge${c.charges === 1 ? '' : 's'}` : (c.cost ?? 'from the item'),
                cost: { concentration: row?.concentration ? c.name : null },
                rank: level,
                roll: base,
              }
              const cast = (cost: CastCost): void => {
                if (c.charges === null || c.maxCharges === null) {
                  if (cost.concentration) actions.cast(cost)
                  return
                }
                void store
                  .spendItem(notePath, c.itemId, { charges: c.charges, max: c.maxCharges }, v => castSpell(v, cost))
                  .then(paid => {
                    if (!paid) new Notice(`${c.item} has not enough charges left for ${c.name}.`)
                  })
                  .catch(err => new Notice(`Could not cast ${c.name}: ${err instanceof Error ? err.message : String(err)}`))
              }
              return (
                <SpellLine
                  key={c.key}
                  name={c.name}
                  row={row}
                  cast={
                    <CastButton
                      name={c.name}
                      options={affordable ? [option] : []}
                      busy={busy}
                      onCast={cast}
                      character={{ name: sheet.name, notePath }}
                      range={row?.range}
                      attack={sheet.spellcasting ? { bonus: sheet.spellcasting.attack, characterLevel: sheet.level ?? 1 } : null}
                      noneLeft={`${c.item} has not enough charges left`}
                    />
                  }
                  dice={
                    base ? (
                      <Rollable
                        value={base.formula}
                        label={`${c.name} ${base.kind === 'heal' ? 'healing' : 'damage'}`}
                        character={{ name: sheet.name, notePath }}
                        rollType={base.kind === 'damage' ? 'damage' : null}
                        damageType={base.damageType}
                      />
                    ) : null
                  }
                  concentrating={vitals.concentration === c.name}
                >
                  {c.cost ? <span className="text-smallest text-muted">{c.cost}</span> : null}
                </SpellLine>
              )
            })}
          </LevelCard>
        )
      })}
    </>
  )
}
