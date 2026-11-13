import { createContext, useContext, type ReactNode } from 'react'

import type { RollContext } from '../obsidian/atlas'
import { isRollable } from '../model/groups'
import { useRoll } from './useRoll'
import { describeRollMode, type RollTarget } from '../model/rollModes'
import { Icon } from '../../platform/host'
import { useRollMode } from './RollModeContext'

const RollsOff = createContext(false)

/**
 * Inside this a `Rollable` is its plain value (MYDND-155), for a sheet that
 * belongs to no character yet: the builder's Review. A roll from there would
 * reach Atlas and the session log under a character nobody has saved. The accent
 * means "this rolls", so a number that will not is drawn as a value.
 */
/** Whether this sheet is one nothing may be done from yet: its controls hide with its rolls. */
export const useRollsOff = (): boolean => useContext(RollsOff)

export function NoRolls({ children }: { children: ReactNode }) {
  return <RollsOff.Provider value={true}>{children}</RollsOff.Provider>
}

/**
 * A clickable number that rolls itself in the open Atlas scene.
 *
 * Ported from `rollable()` in `obsidian-vault-characters` (MYDND-7), where it
 * was a `<span>` carrying `data-formula` and `data-label` for a delegated
 * listener to read. As a component it carries the same information as props,
 * and the dataset attributes are gone — nothing read them but the listener.
 *
 * **It is a `<button>`, not a span with `role="button"`.** The original had to
 * add `role`, `tabindex` and a keydown handler by hand to make a span operable;
 * a real button is all three for free. Its focus ring is the plugin's own
 * (MYDND-165): `.roll-chip`'s `shadow-none` deletes Obsidian's. Since MYDND-44 it
 * is drawn as a small tinted chip with a die mark — the one thing on the sheet
 * in the accent colour.
 *
 * **`rollType` is not decoration** (MYDND-10). It is what an effect's `scope`
 * is matched against, and `scopeAdmits` *refuses* a scoped effect when the roll
 * type is unknown — the safe direction, because waving it through would put
 * Great Weapon Fighting on an Intelligence check. So a damage number that
 * forgets to say `rollType="damage"` silently offers no interventions, which
 * looks exactly like a character who has none.
 */
export function Rollable({
  value,
  formula,
  label,
  character,
  rollType,
  damageType,
  target,
  what,
  className = 'roll-chip',
}: {
  /** What is shown. Usually `+7` or `1d8+5`. */
  value: string
  /** What is rolled. Defaults to `value`, which is the common case. */
  formula?: string | number
  /** Names the roll in Atlas' log and in the advantage notice. */
  label?: string
  character?: RollContext | null
  /**
   * `'attack'`, `'damage'`, `'check'`, `'save'`. Matched against an effect's
   * `scope`; omitting it means no scoped effect can ever fire on this roll.
   */
  rollType?: string | null
  /** Narrows a `damageType` predicate — Piercer's "an attack that deals Piercing". */
  damageType?: string | null
  /**
   * Which d20 roll this is, so the sheet can say it is advantaged (MYDND-45).
   * With a mode in play the chip carries an arrow naming its source, and a
   * plain click rolls in that mode; Shift or Alt still choose explicitly.
   */
  target?: RollTarget | null
  /** What the marker calls this roll — `Dexterity checks`, `attack rolls`. */
  what?: string
  /**
   * The chip's look. `roll-chip` everywhere but the Bestiary, which draws its
   * rolls in the canvas's own palette (MYDND-64) — the behaviour is the same.
   */
  className?: string
}) {
  const roll = useRoll()
  const info = useRollMode(target)
  const off = useContext(RollsOff)
  if (off) return <span className="font-mono tabular-nums">{value}</span>
  const marker = info ? describeRollMode(info, what ?? label ?? 'this roll') : null

  const button = (
    <button
      type="button"
      // `.roll-chip` — the sheet's one accent, so anything in that colour rolls
      // (MYDND-44). A coloured fill on a `<button>` is the deliberate exception
      // to "Obsidian owns how a control looks": a roll has to look like a roll
      // in every theme, and it is still the theme's own accent.
      className={className}
      aria-label={`Roll ${label || value}`}
      title={marker ?? undefined}
      // `void`: `roll` resolves to the outcome since MYDND-16, and a clickable
      // number is the one caller with no use for it. Returning the promise from
      // an event handler is what `no-misused-promises` is for.
      onClick={event => {
        // An explicit key wins; otherwise the sheet's mode is the default —
        // the web sheet's pre-selected `A` in its roll menu, without a menu.
        const explicit = event.shiftKey || event.altKey
        const modifiers = explicit
          ? { shiftKey: event.shiftKey, altKey: event.altKey }
          : { shiftKey: info?.mode === 'advantage', altKey: info?.mode === 'disadvantage' }
        void roll(formula ?? value, label, character, modifiers, rollType, damageType)
      }}
    >
      {value}
    </button>
  )

  if (!marker) return button
  const up = info?.mode === 'advantage'
  const down = info?.mode === 'disadvantage'
  return (
    <span className="inline-flex items-center gap-0.5">
      <span
        role="img"
        aria-label={marker}
        title={marker}
        className={`inline-flex ${up ? 'text-obs-green' : down ? 'text-obs-red' : 'text-faint'}`}
      >
        <Icon name={up ? 'arrow-up' : down ? 'arrow-down' : 'arrow-up-down'} />
      </span>
      {button}
    </span>
  )
}

/**
 * A weapon's damage, rollable when it is dice and text when it is not.
 *
 * **Shared by `/items` and `/magic-items` so the two cannot drift** — the same
 * weapon appears in both catalogs, and a `1d8` that is clickable in one and
 * plain in the other reads as a bug in whichever one the user saw second.
 *
 * Measured against `C:\DnD\lore\items` (MYDND-16): 99 of 460 notes carry a
 * `damage` key, 99 of them spelled `NdN` — and **one** is the string `"1"`.
 * That one is why this asks `isRollable` rather than assuming a `damage` field
 * holds dice: a button reading `1` that rolls nothing is worse than the text.
 *
 * **The sheet's attacks use it too** (MYDND-155). An unarmed strike's damage is
 * a flat `"3"`, and a bare number is what `toFormula` reads as a modifier, so
 * the chip rolled `1d20+3` for damage. `character` is theirs: a catalog has none.
 */
export function DamageValue({
  damage,
  damageType,
  label,
  character,
}: {
  damage: string | null | undefined
  damageType?: string | null
  label: string
  character?: RollContext | null
}) {
  const formula = (damage ?? '').trim()
  if (formula === '') return null

  const text = [formula, damageType].filter(Boolean).join(' ')
  if (!isRollable(formula)) return <>{text}</>

  return (
    <span className="flex flex-wrap items-center gap-1">
      <Rollable value={formula} label={`${label} damage`} character={character} rollType="damage" damageType={damageType} />
      {damageType && <span className="text-smallest text-faint">{damageType}</span>}
    </span>
  )
}
