import type { Sheet } from './sheet/sheet'
import { hitDicePool, maxHpOf, type Vitals } from './vitals'

/**
 * Composing a character's mutable vitals onto the sheet the fence states.
 *
 * The counterpart of `projectSheetWithInventory`, and deliberately the same
 * shape: the charsheet fence is what D&D Beyond said, the `vault-vitals` fence
 * is what play has done to it, and the thing drawn on screen is the two
 * composed. Neither file is rewritten to agree with the other.
 *
 * **`hp.current` is derived here and nowhere else.** The vitals fence stores
 * damage taken, for the reason set out in `./vitals.ts` — a stored absolute
 * would silently lose headroom the next time a level-up raised the maximum.
 */

export interface ProjectedVitals {
  /** Hit points as they should be displayed, clamped to the sheet's maximum. */
  hp: { current: number; max: number | null; temp: number }
  /** True at exactly zero, which is what puts death saves on screen. */
  down: boolean
  /** Three failures. The sheet says so rather than deciding anything. */
  dead: boolean
  /** Three successes: stable, no longer dying, still at 0. */
  stable: boolean
  hitDice: ReturnType<typeof hitDicePool>
  deathSaves: Vitals['deathSaves']
  xp: number | null
  conditions: string[]
}

/**
 * What to draw, from a sheet and its vitals.
 *
 * Pure, and returns a projection rather than mutating the sheet —
 * `projectSheetWithInventory` mutates in place because it is replacing the
 * sheet's own `ac` and `attacks`, whereas none of this exists on a `Sheet` at
 * all. Inventing six fields on a published format to carry a view's state would
 * put them in the next note written.
 */
export function projectVitals(sheet: Sheet | null | undefined, vitals: Vitals): ProjectedVitals {
  const max = maxHpOf(sheet)
  // Clamped on read, not corrected in the file: a GM who lowers a maximum
  // temporarily and raises it back should not have lost the damage underneath.
  const damage = max === null ? vitals.damage : Math.min(vitals.damage, max)

  // **The handover.** Until a vitals fence exists, D&D Beyond's own current HP
  // is the truth: projecting `max - damage` over an absent fence reports a
  // character at full health who walked out of a fight on 94 of 101.
  // `seedFromSheet` closes the gap on the first write; this keeps it honest
  // before then. See the `present` note in `./vitals.ts`.
  const sheetCurrent = sheet?.hp?.current
  const current =
    !vitals.present && max !== null && typeof sheetCurrent === 'number' && Number.isFinite(sheetCurrent)
      ? Math.max(0, Math.min(max, Math.floor(sheetCurrent)))
      : max === null
        ? Math.max(0, -damage)
        : Math.max(0, max - damage)

  const sheetTemp = sheet?.hp?.temp
  const temp =
    !vitals.present && typeof sheetTemp === 'number' && Number.isFinite(sheetTemp) && sheetTemp > 0
      ? Math.floor(sheetTemp)
      : vitals.temp

  return {
    hp: { current, max, temp },
    down: max !== null && current === 0,
    dead: vitals.deathSaves.failures >= 3,
    stable: vitals.deathSaves.successes >= 3,
    hitDice: hitDicePool(sheet, vitals),
    deathSaves: vitals.deathSaves,
    xp: vitals.xp,
    conditions: vitals.conditions,
  }
}

/**
 * The sheet with its hit points brought up to date, for anything that reads
 * `sheet.hp` rather than the projection — the Atlas token link, and the `hp`
 * frontmatter key.
 *
 * Mutates and returns, matching `projectSheetWithInventory`, because here it
 * genuinely is the sheet's own field being corrected.
 *
 * **A character with no vitals fence is left completely alone.** The projection
 * would give back what the sheet already says, so writing it would be a no-op —
 * but an explicit early return is what guarantees that, rather than a
 * coincidence of two branches agreeing.
 */
export function applyVitalsToSheet(sheet: Sheet, vitals: Vitals): Sheet {
  if (!vitals.present) return sheet
  const projected = projectVitals(sheet, vitals)
  if (projected.hp.max !== null) {
    sheet.hp = {
      current: projected.hp.current,
      max: projected.hp.max,
      temp: projected.hp.temp,
    }
  }
  return sheet
}
