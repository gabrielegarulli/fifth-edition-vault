import { describeOffer } from '../dice/interventions'
import { useRollHost } from '../dice/RollContext'
import type { LoggedDie, RollLogEntry } from '../dice/rollLog'

/**
 * The roll log, and the intervention prompt that sits on top of it.
 *
 * ## The two kinds of changed die look different, on purpose
 *
 * This is where `rollEngine.js`'s `dropped`/`replaced` distinction becomes
 * something you can see, so getting it wrong here is how the log comes to lie:
 *
 * - **dropped** — thrown, then set aside. The advantage discard. Struck through
 *   and dimmed, because it is not part of the result.
 * - **replaced** — its face *changed*, from an intervention the player chose.
 *   Both values stay at full contrast, old → new. That is view 4e's honesty
 *   rule: an app that quietly improved a number must still show the number it
 *   improved.
 *
 * ## This panel is in-session; the record is `/gm/log`
 *
 * The panel itself persists nothing. The plan's single-player decision does not
 * port `dice_roll_log` — the realtime channels existed so a table could watch one
 * person's dice, and with one seat there is nobody to broadcast to. Since
 * MYDND-27 each settled roll is also written to the day's `/gm/log` note by
 * `RollProvider`; this panel is the scrollback, that note is the record.
 */

function Die({ die }: { die: LoggedDie }) {
  if (die.dropped) {
    return (
      <span className="text-smaller tabular-nums text-faint line-through" title={`d${die.sides}, dropped`}>
        {die.face}
      </span>
    )
  }
  if (die.from !== undefined) {
    return (
      <span className="text-smaller tabular-nums text-normal" title={`d${die.sides}, was ${die.from}`}>
        <span className="text-faint">{die.from}</span>
        <span className="text-faint">→</span>
        <span className="font-semibold text-obs-green">{die.face}</span>
      </span>
    )
  }
  return (
    <span className="text-smaller tabular-nums text-normal" title={`d${die.sides}`}>
      {die.face}
    </span>
  )
}

function Entry({ entry }: { entry: RollLogEntry }) {
  return (
    <div className="panel-row">
      <span className="cell-title">{entry.label}</span>
      <span className="flex items-center gap-1">
        {entry.dice.map((die, i) => (
          <Die key={i} die={die} />
        ))}
      </span>
      {entry.modifier === 0 ? null : (
        <span className="text-smallest tabular-nums text-faint">
          {entry.modifier > 0 ? '+' : '−'}
          {Math.abs(entry.modifier)}
        </span>
      )}
      <span className="text-smaller font-semibold tabular-nums text-normal">= {entry.total}</span>
      {entry.mode === 'normal' ? null : (
        <span className="badge">{entry.mode === 'advantage' ? 'adv' : 'dis'}</span>
      )}
      {entry.intervention ? (
        <span className="badge text-obs-green" title={`${entry.intervention.from} → ${entry.intervention.to}`}>
          {entry.intervention.source ?? entry.intervention.mode}
        </span>
      ) : null}
      {/* Said per entry, not once in the header: a session can mix rolls that
          landed on the table with rolls made after the scene was closed, and
          which is which matters when somebody queries a number. */}
      {entry.simulated ? (
        <span className="badge text-obs-orange" title="No Atlas scene was open — rolled locally">
          local
        </span>
      ) : null}
    </div>
  )
}

/** The prompt. At most one, and it only ever offers — never applies. */
export function InterventionPrompt() {
  const { pending } = useRollHost()
  if (!pending) return null

  const { offer } = pending
  return (
    <div className="panel-container flex flex-col gap-2 border-obs-green p-3">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="badge text-obs-green">{offer.source ?? 'Feat'}</span>
        <span className="text-smaller font-medium text-normal">{describeOffer(offer)}</span>
      </div>
      {offer.frequency ? (
        // Printed, never counted. The app does not know whose turn it is and is
        // not going to — "once per turn" is a reminder to the table.
        <span className="text-smallest text-faint">{offer.frequency}</span>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className="btn-ui-primary" onClick={pending.accept}>
          {offer.nextTotal === null ? 'Use it' : `Use it — ${offer.total} → ${offer.nextTotal}`}
        </button>
        <button type="button" className="btn-ui-link" onClick={pending.decline}>
          Keep the roll
        </button>
      </div>
    </div>
  )
}

export function RollLog() {
  const { log, clearLog } = useRollHost()

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <span className="text-smallest uppercase text-faint">Rolls this session</span>
        {log.length > 0 ? (
          <button type="button" className="btn-ui-link ml-auto" onClick={clearLog}>
            Clear
          </button>
        ) : null}
      </div>
      {log.length === 0 ? (
        <p className="text-smaller text-faint">
          Nothing rolled yet. Click any number on the sheet — Shift for advantage, Alt for
          disadvantage.
        </p>
      ) : (
        <div className="panel-container">
          {log.map(entry => (
            <Entry key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}
