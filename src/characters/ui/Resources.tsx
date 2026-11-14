import { useState } from 'react'

import { nameKey } from '../../platform'
import type { Sheet, SheetResource } from '../../characterModel'
import type { RollContext } from '../../dice/host'
import { isRollable } from '../../dice'
import { useRoll, Rollable } from '../../dice/host'
import type { SpellSlotActions } from './hooks/useVitals'
import { isLocalId } from '../../characterModel'
import { Icon } from '../../platform/host'
import { Pips } from './SpellPanel'

/**
 * Class resources on the Combat tab (MYDND-47) — the web sheet's
 * `ClassResourcesPanel`, in a pane.
 *
 * Only free spell casts were tracked before this; Bardic Inspiration showed its
 * die and not its five uses. Each row is a pip per use (or, for a pool spent
 * several at a time, an amount and a Spend button), the die it hands out as a
 * roll, and the rest that brings it back. Spending writes `feature_uses_used`
 * in `vault-vitals`, the counter the rests already clear.
 */

const RESET_LABEL: Record<string, string> = {
  short_rest: 'short rest',
  long_rest: 'long rest',
}

const ROW =
  'flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-background-modifier-border px-2.5 py-1.5 last:border-b-0'

type Actions = Pick<SpellSlotActions, 'spendUse' | 'refundUse' | 'spendPoints' | 'restoreUses'>

export function ResourceRows({
  resources,
  used,
  actions,
  character,
  busy,
}: {
  resources: readonly SheetResource[]
  used: Readonly<Record<string, number>>
  actions: Actions
  character: RollContext
  busy: boolean
}) {
  return (
    <>
      {resources.map(r =>
        r.points ? (
          <PointsRow key={r.key} resource={r} used={used[r.key] ?? 0} actions={actions} busy={busy} />
        ) : (
          <div key={r.key} className={ROW}>
            <span className="min-w-40 flex-1 text-normal">
              {r.name}
              {r.detail ? <span className="block text-smallest text-faint">{r.detail}</span> : null}
            </span>
            {r.roll ? <Rollable value={r.roll} label={r.name} character={character} /> : null}
            <Pips
              max={r.uses}
              used={used[r.key] ?? 0}
              label={`${r.name} use`}
              busy={busy}
              onSpend={() => actions.spendUse(r.key, r.uses)}
              onRefund={() => actions.refundUse(r.key)}
            />
            <ResetLabel resource={r} />
          </div>
        ),
      )}
    </>
  )
}

function ResetLabel({ resource: r }: { resource: SheetResource }) {
  const label = r.resets ? RESET_LABEL[r.resets] : null
  if (!label) return null
  return (
    <span className="text-smallest text-faint">
      {label}
      {r.short_rest_regain ? ` · ${r.short_rest_regain} back on a short` : ''}
    </span>
  )
}

/** A pool spent by amount — Lay on Hands' hit points. */
function PointsRow({
  resource: r,
  used,
  actions,
  busy,
}: {
  resource: SheetResource
  used: number
  actions: Actions
  busy: boolean
}) {
  const [amount, setAmount] = useState('')
  const left = r.uses - used
  const n = Math.floor(Number(amount) || 0)
  const valid = n > 0 && n <= left
  const spend = (): void => {
    if (!valid) return
    actions.spendPoints(r.key, n, r.uses)
    setAmount('')
  }

  return (
    <div className={ROW}>
      <span className="min-w-40 flex-1 text-normal">
        {r.name}
        {r.detail ? <span className="block text-smallest text-faint">{r.detail}</span> : null}
      </span>
      <input
        type="number"
        min={1}
        max={left}
        value={amount}
        placeholder="0"
        aria-label={`${r.name} amount`}
        className="w-16"
        disabled={busy}
        onChange={e => setAmount(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') spend()
        }}
      />
      <button type="button" disabled={busy || !valid} onClick={spend}>
        Spend
      </button>
      <span className="font-mono tabular-nums text-muted">
        {left}/{r.uses}
        {r.unit ? ` ${r.unit}` : ''}
      </span>
      {used > 0 ? (
        <button
          type="button"
          className="clickable-icon"
          aria-label={`Refill ${r.name}`}
          title={`Refill ${r.name}`}
          disabled={busy}
          onClick={() => actions.restoreUses(r.key)}
        >
          <Icon name="rotate-ccw" />
        </button>
      ) : null}
      <ResetLabel resource={r} />
    </div>
  )
}

/**
 * The resource an action spends, by name: the Bardic Inspiration *action* uses
 * the Bardic Inspiration *pool*. A name match and nothing cleverer — a wrong
 * Use button would spend a pool on something that never cost it.
 */
export function resourceFor(resources: readonly SheetResource[], actionName: string): SheetResource | null {
  const key = nameKey(actionName)
  return resources.find(r => !r.points && nameKey(r.name) === key) ?? null
}

/**
 * Use: spend one and roll its die in one click (MYDND-47). Spent first, so a
 * pool with nothing left refuses before anything is rolled; the roll is the
 * row's own formula, with the row's `rollType`, so a scoped effect still sees it.
 *
 * **A flat formula spends and rolls nothing** (MYDND-155): an attack's damage
 * can be a bare `"3"`, which `toFormula` would turn into `1d20+3`.
 */
export function UseButton({
  resource,
  used,
  formula,
  label,
  character,
  busy,
  onSpend,
  rollType,
  damageType,
}: {
  resource: SheetResource
  used: number
  formula: string | null
  label: string
  character: RollContext
  busy: boolean
  onSpend: () => void
  rollType?: string | null
  damageType?: string | null
}) {
  const roll = useRoll()
  const left = resource.uses - used
  const dice = formula !== null && isRollable(formula) ? formula : null
  return (
    <button
      type="button"
      disabled={busy || left <= 0}
      title={
        left > 0
          ? `Spend one ${resource.name} (${left} left)${dice ? ` and roll ${dice}` : ''}`
          : `No ${resource.name} left`
      }
      onClick={event => {
        onSpend()
        if (dice) void roll(dice, label, character, { shiftKey: event.shiftKey, altKey: event.altKey }, rollType, damageType)
      }}
    >
      Use
    </button>
  )
}

/** Whether to say the sheet predates resources, and what fixes it. */
export function resourcesMissing(sheet: Sheet): 'resync' | 'rebuild' | null {
  if (Array.isArray(sheet.class_resources)) return null
  return isLocalId(sheet.ddb_id) ? 'rebuild' : 'resync'
}
