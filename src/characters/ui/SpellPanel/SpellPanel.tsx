import { Notice } from 'obsidian'
import { useCallback, useMemo } from 'react'

import {
  type CastCost,
  type Sheet,
  afterFreeCasting,
  freeCastingRank,
  highestRank,
  slotTable,
  isLocalId,
  SPELL_RECALL,
} from '../../../characterModel'
import { useRoll } from '../../../dice/host'

import type { SpellPanelProps } from './types'
import { SlotTiles } from './slots'
import { SheetSpells } from './sheetSpells'
import { VaultSpells } from './vaultSpells'
import { GrantedSpells } from './grantedSpells'
import { FreeCasts } from './freeCasts'

// The panel: slots, then each list the character has.
// One file of the sheet's spell panel (MYDND-197); index.ts says what the panel is.

/**
 * Whether a character has anything for this panel to show. A character with
 * nothing to cast and no way to cast it has no Spells tab, the way the web
 * sheet hides its Spells tab from a Fighter.
 */
export function hasSpellPanel(sheet: Sheet): boolean {
  const listed = (sheet.spells ?? []).some(g => (g.spells ?? []).length > 0)
  const slots = slotTable(sheet)
  const hasSlots = !!slots && highestRank(slots.max) > 0
  return (
    !!sheet.spellcasting ||
    listed ||
    hasSlots ||
    (sheet.granted_spells ?? []).length > 0 ||
    (sheet.free_cast_spells ?? []).length > 0
  )
}

/**
 * Boon of Spell Recall's Free Casting (MYDND-274): a cast from a level 1–4
 * slot rolls 1d4 first, through the engine like every roll, and on the slot's
 * level the cast is paid without it. **Rolled before the write, not after**:
 * the cast and a refund would be two writes, and `useVitals` refuses the
 * second while the first is busy, so the refund would be lost exactly when it
 * was earned.
 */
function useFreeCasting(props: SpellPanelProps): SpellPanelProps {
  const roll = useRoll()
  const { sheet, notePath, actions } = props
  const cast = useCallback(
    (cost: CastCost): void => {
      const rank = freeCastingRank(sheet, cost)
      if (rank === null) {
        actions.cast(cost)
        return
      }
      void roll('1d4', `${SPELL_RECALL}: Free Casting`, { name: sheet.name, notePath }).then(outcome => {
        const paid = afterFreeCasting(cost, outcome?.total ?? null)
        if (paid !== cost) new Notice(`Free Casting: a ${rank} — the level ${rank} slot is not expended.`)
        actions.cast(paid)
      })
    },
    [roll, sheet, notePath, actions],
  )
  return useMemo(() => ({ ...props, actions: { ...actions, cast } }), [props, actions, cast])
}

export function SpellPanel(raw: SpellPanelProps) {
  const props = useFreeCasting(raw)
  const { sheet } = props
  const isVault = isLocalId(sheet.ddb_id)
  // A Savant's free book spells (MYDND-183) are listed in the Vault editor's
  // spellbook, preparable; everywhere else they are a granted group.
  const granted = (sheet.granted_spells ?? []).filter(g => !isVault || g.mode !== 'spellbook')
  const free = sheet.free_cast_spells ?? []

  if (!hasSpellPanel(sheet)) return null

  // The DC and spell attack are in the play strip on this tab, so the panel
  // opens on the slots rather than repeating them (MYDND-53).
  return (
    <div className="flex flex-col gap-4">
      <SlotTiles {...props} />
      {isVault ? <VaultSpells {...props} /> : <SheetSpells {...props} />}

      <GrantedSpells granted={granted} props={props} />
      <FreeCasts free={free} {...props} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------
