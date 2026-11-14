import { isLevelUpReady, xpForLevel, xpProgressForLevel, xpToNextLevel } from '@vault/derive/xpTable.js'
import { useState } from 'react'

/**
 * Experience, and how far it is to the next level.
 *
 * **Every number comes from `@vault/derive/xpTable.js`** — the thresholds and
 * all four derivations were already there, so nothing about levelling is
 * decided here. This draws them and offers two awards.
 *
 * ## It is absent, not zero, when the table does not use XP
 *
 * `xp === null` renders a single "start tracking" button rather than a bar at
 * 0%. Plenty of tables level by fiat, and a progress bar insisting a level-3
 * character has 0 XP is both wrong and nagging. That is the same `null`-versus-0
 * distinction the vitals fence stores.
 *
 * ## Levelling is not performed *here*
 *
 * It says *ready*, and stops. Levelling is `LevelUpPanel`'s (MYDND-25), and
 * only for a Vault character: its level lives in its own ` ```vault-character `
 * fence and the sheet is re-projected from it. A D&D Beyond character's level
 * lives in a charsheet a re-sync replaces, so for those the panel says to level
 * on D&D Beyond. Readiness is a signal, not a gate — a table levelling by
 * milestone has no XP at all.
 */

export function XpProgressBar({
  xp,
  level,
  onAward,
  onStart,
  busy,
  showAward = true,
}: {
  xp: number | null
  level: number
  onAward: (delta: number) => void
  onStart: () => void
  busy?: boolean
  /**
   * Draw the award row. **Off on the sheet page** (MYDND-44), where awarding is
   * a GM action once a session and lives behind the strip's ⋮ menu; the bar
   * itself sits in the Features tab as progress, not as a control.
   */
  showAward?: boolean
}) {
  if (xp === null) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-smallest uppercase text-faint">Experience</span>
        <span className="text-smaller text-muted">Not tracked.</span>
        <button type="button" className="btn-ui-link" disabled={busy} onClick={onStart}>
          Start tracking XP
        </button>
      </div>
    )
  }

  const capped = level >= 20
  const progress = xpProgressForLevel(xp, level)
  const toNext = xpToNextLevel(xp, level)
  const ready = isLevelUpReady(xp, level)
  const next = capped ? null : (xpForLevel(level + 1))

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-smallest uppercase text-faint">Experience</span>
        <span className="text-smaller font-medium tabular-nums text-normal">{xp.toLocaleString()}</span>
        {capped ? (
          <span className="text-smallest text-faint">level 20 — the table is done</span>
        ) : ready ? (
          // Said, not done. Levelling writes to the charsheet fence, which a
          // re-sync replaces.
          <span className="badge text-obs-green">Level {level + 1} ready</span>
        ) : (
          <span className="text-smallest text-faint">
            {toNext.toLocaleString()} to level {level + 1}
            {next === null ? '' : ` (${next.toLocaleString()})`}
          </span>
        )}
      </div>

      <div
        className="h-1.5 w-full overflow-hidden rounded-obs-s bg-background-modifier-border"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Experience to next level"
      >
        {/* Blue, not the accent: the accent is for rolls (MYDND-44). */}
        <div
          className={ready || capped ? 'h-full bg-obs-green' : 'h-full bg-obs-blue'}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {showAward ? <XpAward onAward={onAward} busy={busy} /> : null}
    </div>
  )
}

/** Three quick steps and a typed amount. Negative corrects a mistake. */
export function XpAward({ onAward, busy }: { onAward: (delta: number) => void; busy?: boolean }) {
  const [custom, setCustom] = useState('')
  const n = Math.floor(Number(custom) || 0)

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {[100, 500, 1000].map(step => (
        <button key={step} type="button" disabled={busy} onClick={() => onAward(step)}>
          +{step}
        </button>
      ))}
      <input
        type="number"
        value={custom}
        disabled={busy}
        placeholder="XP"
        aria-label="Experience to award"
        className="w-20"
        onChange={e => setCustom(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && n !== 0) {
            onAward(n)
            setCustom('')
          }
        }}
      />
      <button
        type="button"
        disabled={busy || n === 0}
        onClick={() => {
          onAward(n)
          setCustom('')
        }}
      >
        Award
      </button>
    </div>
  )
}
