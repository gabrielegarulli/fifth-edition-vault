import { useState, type ReactNode } from 'react'

import type { ProjectedVitals } from '../../characterModel'
import type { RollContext } from '../../dice/host'
import { useRoll, Rollable } from '../../dice/host'
import { Icon } from '../../platform/host'

/**
 * Hit points, death saves and the two rest buttons — and, separately, the hit
 * dice.
 *
 * Ported in *intent* from `the-vault`'s `components/HpPanel.jsx` rather than in
 * shape: that one is an MUI card beside a three-column sheet, and this is a
 * strip in a pane that is sometimes 380px wide.
 *
 * ## It lives in the pinned strip (MYDND-44)
 *
 * So it has no frame of its own — the strip is the frame — and it is as short
 * as it can be: the number and the bar, then one row of verbs. The hit dice
 * moved to the Combat tab's Resources with the other things you spend, which
 * is why they are `HitDiceRows` below rather than part of this panel.
 *
 * ## Damage and healing are one field with two buttons
 *
 * Not two fields. The number a player has in their head after an attack is "7",
 * and which direction it goes is the next thing they say — so one input and two
 * verbs is fewer keystrokes than choosing a field first. Enter applies damage,
 * because taking damage is what happens more often.
 *
 * ## The rests are not symmetrical, and the buttons say so
 *
 * **A short rest heals nothing.** It clears temporary hit points and
 * activations, and it is an *opportunity* to spend hit dice — one click per die,
 * because each one is a roll the player wants to see before the next.
 * A long rest is the one that fills everything in, so it confirms first: it
 * throws away the state of a whole fight and there is no undo in a vault
 * nothing backs up.
 */

export interface HpPanelActions {
  damage(amount: number): void
  heal(amount: number): void
  setTemp(amount: number): void
  shortRest(): void
  longRest(): void
  /** `rolled` is what the die came to, Constitution included. */
  spendHitDie(label: string, rolled: number): void
  deathSave(kind: 'success' | 'failure'): void
  clearDeathSaves(): void
}

const LABEL = 'text-smallest font-semibold uppercase tracking-wide text-faint'

export function HpPanel({
  vitals,
  actions,
  character,
  busy,
  aside,
}: {
  vitals: ProjectedVitals
  actions: HpPanelActions
  character?: RollContext | null
  busy?: boolean
  /** Drawn at the right of the hit-point line: the ⋮ menu on an Atlas card (MYDND-191). */
  aside?: ReactNode
}) {
  const [amount, setAmount] = useState('')
  const [confirmLong, setConfirmLong] = useState(false)
  const n = Math.max(0, Math.floor(Number(amount) || 0))

  const apply = (fn: (value: number) => void): void => {
    if (n <= 0) return
    fn(n)
    setAmount('')
  }

  const { current, max, temp } = vitals.hp
  const fraction = max && max > 0 ? Math.max(0, Math.min(1, current / max)) : 0
  // Temporary hit points sit on the end of the bar in their own colour, so a
  // full bar with a buffer reads differently from a full bar without one.
  const tempFraction = max && max > 0 ? Math.min(1 - fraction, temp / max) : 0
  // Three bands, not a gradient: a bar you have to measure is not a status.
  const tone = fraction === 0 ? 'bg-obs-red' : fraction <= 0.5 ? 'bg-obs-orange' : 'bg-obs-green'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className={LABEL}>Hit Points</span>
        <span className="font-mono text-ui-larger font-bold tabular-nums text-normal">
          {current}
          {max === null ? '' : ` / ${max}`}
        </span>
        {temp > 0 ? (
          <span className="rounded-full bg-obs-blue/15 px-2 py-0.5 font-mono font-semibold tabular-nums text-obs-blue">
            +{temp} temp
          </span>
        ) : null}
        {vitals.dead ? (
          <span className="badge text-obs-red">Dead</span>
        ) : vitals.stable ? (
          <span className="badge text-obs-green">Stable</span>
        ) : vitals.down ? (
          <span className="badge text-obs-red">Down</span>
        ) : null}
        {aside ? <span className="ml-auto self-center">{aside}</span> : null}
      </div>

      {max === null ? null : (
        <div
          className="flex h-2 w-full overflow-hidden rounded-full bg-background-modifier-border"
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label="Hit points"
        >
          <div className={`h-full ${tone}`} style={{ width: `${fraction * 100}%` }} />
          {tempFraction > 0 ? <div className="h-full bg-obs-blue" style={{ width: `${tempFraction * 100}%` }} /> : null}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <input
          type="number"
          min={0}
          value={amount}
          disabled={busy}
          placeholder="0"
          aria-label="Amount"
          className="w-16"
          onChange={e => setAmount(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') apply(actions.damage)
          }}
        />
        <button type="button" disabled={busy || n <= 0} onClick={() => apply(actions.damage)}>
          Damage
        </button>
        <button type="button" disabled={busy || n <= 0} onClick={() => apply(actions.heal)}>
          Heal
        </button>
        <button type="button" disabled={busy || n <= 0} onClick={() => apply(actions.setTemp)}>
          Temp
        </button>
        <span className="flex-1" />
        <button
          type="button"
          disabled={busy}
          onClick={actions.shortRest}
          title="Clears temp HP and activations, and refills a pact caster's slots — it does not heal"
        >
          <Icon name="moon" /> Short rest
        </button>
        {confirmLong ? null : (
          <button type="button" disabled={busy} onClick={() => setConfirmLong(true)}>
            <Icon name="sunrise" /> Long rest
          </button>
        )}
      </div>

      {confirmLong ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-smallest text-warning">Full HP, every spell slot, all hit dice back. No undo.</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setConfirmLong(false)
              actions.longRest()
            }}
          >
            Confirm
          </button>
          <button type="button" className="btn-ui-link" onClick={() => setConfirmLong(false)}>
            Cancel
          </button>
        </div>
      ) : null}

      {vitals.down && !vitals.dead ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={LABEL}>Death Saves</span>
          <Rollable value="1d20" label="Death saving throw" character={character} />
          <span className="flex items-center gap-1">
            <span className="text-smallest text-muted">Successes</span>
            <span className="tabular-nums text-obs-green">
              {'●'.repeat(vitals.deathSaves.successes)}
              {'○'.repeat(3 - vitals.deathSaves.successes)}
            </span>
          </span>
          <span className="flex items-center gap-1">
            <span className="text-smallest text-muted">Failures</span>
            <span className="tabular-nums text-obs-red">
              {'●'.repeat(vitals.deathSaves.failures)}
              {'○'.repeat(3 - vitals.deathSaves.failures)}
            </span>
          </span>
          <button type="button" disabled={busy} onClick={() => actions.deathSave('success')}>
            +Success
          </button>
          <button type="button" disabled={busy} onClick={() => actions.deathSave('failure')}>
            +Failure
          </button>
          {vitals.deathSaves.successes > 0 || vitals.deathSaves.failures > 0 ? (
            <button type="button" className="btn-ui-link" disabled={busy} onClick={actions.clearDeathSaves}>
              Clear
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/**
 * One row per hit-die pool: what is left, and one control that spends a die.
 *
 * **One click rolls, heals and spends** (MYDND-155). Rolling and spending were
 * two controls, so the number that landed had to be typed into Heal by hand and
 * a die could be thrown without being spent. See `HitDieButton`.
 *
 * **The roll is the die plus Constitution** (MYDND-75) — what a spent hit die
 * heals. It rolled a bare `1d8`, which under-healed every character by their
 * CON modifier and put a number on the table nobody heals by.
 */
export function HitDiceRows({
  vitals,
  actions,
  character,
  busy,
  conMod = 0,
}: {
  vitals: ProjectedVitals
  actions: Pick<HpPanelActions, 'spendHitDie'>
  character?: RollContext | null
  busy?: boolean
  /** Added to every hit die rolled — the heal is the die plus Constitution. */
  conMod?: number
}) {
  const bonus = conMod === 0 ? '' : conMod > 0 ? `+${conMod}` : `${conMod}`
  return (
    <>
      {vitals.hitDice.map(line => (
        <div
          key={line.label}
          className="flex flex-wrap items-center gap-2 border-b border-background-modifier-border px-2.5 py-1.5 last:border-b-0"
        >
          <span className="min-w-0 flex-1 text-normal">
            Hit dice <span className="text-smallest text-faint">· {line.label}</span>
          </span>
          <span className="font-mono tabular-nums text-muted">
            {line.remaining}/{line.total}d{line.sides || '?'}
          </span>
          {line.remaining > 0 && line.sides > 0 ? (
            <HitDieButton
              label={line.label}
              formula={`1d${line.sides}${bonus}`}
              character={character}
              busy={busy}
              onRolled={rolled => actions.spendHitDie(line.label, rolled)}
            />
          ) : null}
        </div>
      ))}
    </>
  )
}

/**
 * Roll one hit die through the engine, then hand the total to the write that
 * heals by it and spends the die.
 *
 * The roll comes first because the write needs its number, so **a refused roll
 * (`null`) spends nothing and heals nothing**. It holds itself disabled while
 * the dice land: the wait is ~400ms, longer across an intervention prompt, and
 * a second click would throw a second die.
 */
function HitDieButton({
  label,
  formula,
  character,
  busy,
  onRolled,
}: {
  label: string
  formula: string
  character?: RollContext | null
  busy?: boolean
  onRolled(rolled: number): void
}) {
  const roll = useRoll()
  const [rolling, setRolling] = useState(false)

  const spend = async (): Promise<void> => {
    setRolling(true)
    try {
      const outcome = await roll(formula, `${label} hit die`, character)
      if (outcome) onRolled(outcome.total)
    } finally {
      setRolling(false)
    }
  }

  return (
    <button
      type="button"
      className="roll-chip"
      aria-label={`Spend a ${label} hit die`}
      title={`Roll ${formula}, heal that much and spend the die`}
      disabled={busy || rolling}
      onClick={() => void spend()}
    >
      Spend {formula}
    </button>
  )
}
