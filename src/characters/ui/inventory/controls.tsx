import { useState } from 'react'
import { legalSlots, SLOT_LABELS } from '@vault/derive/loadout.js'

import { chargesChip } from '../../../compendium'
import { Icon } from '../../../platform/host'
import type { HydratedRow } from '../../../characterModel'

import { LINK } from './shared'

// A row's controls: its charges, and where it is equipped.
// One file of the sheet's inventory (MYDND-197); CharacterInventory.tsx says what it is.

/**
 * Up to ten charges draw as pips — click a lit pip to spend down to it, or a
 * spent one to regain up to it, as `MagicItemLens` did (MYDND-76, MYDND-164).
 * Larger pools (20-charge Staff of Power, 50-charge Staff of the Magi) draw an
 * amount stepper like `Resources.tsx`'s `PointsRow`, so a 320px pane is never
 * flooded with fifty buttons.
 */
const MAX_CHARGE_PIPS = 10

export function ChargeControl({
  label,
  max,
  used,
  recharge,
  busy,
  onSetUsed,
}: {
  label: string
  max: number
  used: number
  recharge: string | null
  busy: boolean
  onSetUsed: (used: number) => void
}) {
  const [amount, setAmount] = useState('')
  const clampedUsed = Math.min(max, Math.max(0, used))
  const left = max - clampedUsed
  const chip = chargesChip(max, clampedUsed)
  const groupLabel = `${label}: ${left} of ${max} ${max === 1 ? 'charge' : 'charges'} left`

  if (max <= MAX_CHARGE_PIPS) {
    return (
      <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-1">
        <span role="group" aria-label={groupLabel} className="flex flex-wrap items-center">
          {Array.from({ length: max }, (_, i) => {
            const lit = i < left
            const action = lit ? `Spend to ${i} left` : `Regain to ${i + 1} left`
            return (
              <button
                key={i}
                type="button"
                disabled={busy}
                aria-label={action}
                title={action}
                className={lit ? 'pip' : 'pip-spent'}
                onClick={() => onSetUsed(lit ? max - i : max - (i + 1))}
              />
            )
          })}
        </span>
        <span className={`font-mono text-smallest tabular-nums ${chip.tone === 'over' ? 'text-warning' : 'text-muted'}`}>
          {chip.text}
        </span>
        {recharge ? <span className="text-smallest text-faint">{recharge}</span> : null}
      </div>
    )
  }

  const parsed = amount.trim() === '' ? 1 : Math.floor(Number(amount))
  const canSpend = parsed >= 1 && parsed <= left
  const canRegain = parsed >= 1 && parsed <= clampedUsed
  const spend = (): void => {
    if (!canSpend) return
    onSetUsed(clampedUsed + parsed)
    setAmount('')
  }
  const regain = (): void => {
    if (!canRegain) return
    onSetUsed(clampedUsed - parsed)
    setAmount('')
  }

  return (
    <div role="group" aria-label={groupLabel} className="flex w-full flex-wrap items-center gap-x-2 gap-y-1">
      <input
        type="number"
        min={1}
        max={Math.max(left, clampedUsed, 1)}
        value={amount}
        placeholder="1"
        aria-label={`${label} charge amount`}
        className="w-16"
        disabled={busy}
        onChange={e => setAmount(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') spend()
        }}
      />
      <button type="button" disabled={busy || !canSpend} onClick={spend}>
        Spend
      </button>
      <button type="button" disabled={busy || !canRegain} onClick={regain}>
        Regain
      </button>
      {clampedUsed > 0 ? (
        <button
          type="button"
          className="clickable-icon"
          aria-label={`Refill ${label}`}
          title={`Refill ${label}`}
          disabled={busy}
          onClick={() => {
            onSetUsed(0)
            setAmount('')
          }}
        >
          <Icon name="rotate-ccw" />
        </button>
      ) : null}
      <span className={`font-mono text-smallest tabular-nums ${chip.tone === 'over' ? 'text-warning' : 'text-muted'}`}>
        {chip.text}
      </span>
      {recharge ? <span className="text-smallest text-faint">{recharge}</span> : null}
    </div>
  )
}

/**
 * Equipping, in whichever system the campaign plays: a slot under the loadout
 * system, a plain on/off otherwise — the web `EquipmentPanel`'s switch.
 */
export function EquipControl({
  label,
  row,
  worn,
  loadout,
  busy,
  onEquipSlot,
  onToggle,
}: {
  label: string
  row: HydratedRow
  worn: boolean
  loadout: boolean
  busy: boolean
  onEquipSlot: (slot: string) => void
  onToggle: (on: boolean) => void
}) {
  if (worn) {
    return (
      <button type="button" className={LINK} disabled={busy} onClick={() => onToggle(false)}>
        Unequip
      </button>
    )
  }
  if (!loadout) {
    return (
      <button type="button" className={LINK} disabled={busy} onClick={() => onToggle(true)}>
        Equip
      </button>
    )
  }
  const legal = legalSlots(row)
  if (legal.length === 0) return null
  return (
    <select
      className="dropdown"
      aria-label={`Equip ${label} into a slot`}
      disabled={busy}
      value=""
      onChange={e => {
        if (e.target.value) onEquipSlot(e.target.value)
      }}
    >
      <option value="">Equip…</option>
      {legal.map(s => (
        <option key={s} value={s}>
          {SLOT_LABELS[s as keyof typeof SLOT_LABELS] ?? s}
        </option>
      ))}
    </select>
  )
}
