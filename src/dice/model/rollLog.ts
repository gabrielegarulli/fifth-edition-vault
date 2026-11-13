import { describeDice, type DiceTerm } from './groups'

/**
 * The roll log — what was thrown, what counted, and what stopped counting.
 *
 * **No `obsidian` import**, so it is `logic`-project testable.
 *
 * ## In memory here, durable in `/gm/log`
 *
 * `the-vault` has a `dice_roll_log` table. The plan's single-player decision
 * does not port it: the five realtime channels existed so a *table* could watch
 * one person's dice, and with one seat there is nobody to broadcast to. So this
 * is a ring buffer in memory — the pane's scrollback.
 *
 * *Amended 2026-10-08 (MYDND-27):* the durable record is the activity log, not a
 * table. `rollActivity` turns a settled entry into one `roll` line in the day's
 * `vault-log` fence, and `RollProvider` writes it **once per roll, after any
 * intervention is answered** — so an accepted reroll is one line carrying
 * `from`, never a thrown line followed by a corrected one.
 *
 * ## `dropped` and `replaced` are two different things
 *
 * This is `rollEngine.js`'s own distinction and the log is where it becomes
 * visible, so getting it wrong here is how the log comes to lie:
 *
 * - **`dropped`** — a die that *stopped counting*. The advantage discard. Shown
 *   struck through, because it was thrown and then set aside.
 * - **`replaced`** — a die whose *face changed*, from an intervention. Both
 *   values stay legible at full contrast, because the player chose to change it
 *   and the record should say what it was.
 *
 * One key for both would make a Great Weapon Fighting floor look like a
 * discarded die.
 */

export interface LoggedDie {
  /** The face as it counts now. */
  face: number
  sides: number
  /** It was thrown and set aside — an advantage discard. Struck through. */
  dropped?: boolean
  /** Its face was changed by an intervention. `from` stays legible. */
  from?: number
}

export interface RollLogEntry {
  id: string
  /** `Stealth`, `Longsword damage`. Never a formula when a label exists. */
  label: string
  /** `1d20+7`, for when the label does not say what was thrown. */
  formula: string
  mode: 'normal' | 'advantage' | 'disadvantage'
  dice: LoggedDie[]
  modifier: number
  total: number
  /** Who rolled it. `null` for a roll with no character behind it. */
  character: string | null
  /** True when the faces came from `rngRoller` because no scene was open. */
  simulated: boolean
  /** The intervention applied, if the player accepted one. */
  intervention: { mode: string; source: string | null; from: number; to: number } | null
  at: number
}

/** How many rolls are kept. A session's worth to scroll, not a transcript. */
export const ROLL_LOG_LIMIT = 50

export interface EngineDieGroup extends DiceTerm {
  results: number[]
  dropped?: number[]
  replaced?: { index: number; from: number; to: number }[]
}

/**
 * One log entry from a resolved roll.
 *
 * `simulated` is passed in rather than inferred: the engine falls back to
 * `rngRoller` silently and by design, so the only place that knows which roller
 * answered is the caller that offered one.
 */
export function logEntry(input: {
  id: string
  label: string
  dice: EngineDieGroup[]
  modifier: number
  total: number
  mode: RollLogEntry['mode']
  character?: string | null
  simulated?: boolean
  intervention?: RollLogEntry['intervention']
  at?: number
}): RollLogEntry {
  const dice: LoggedDie[] = []

  for (const group of input.dice) {
    const replacedAt = new Map((group.replaced ?? []).map(r => [r.index, r.from]))
    group.results.forEach((face, index) => {
      const die: LoggedDie = { face, sides: group.sides }
      const from = replacedAt.get(index)
      if (from !== undefined) die.from = from
      dice.push(die)
    })
    // A dropped die has no index in `results` — it is gone from them, which is
    // what being dropped means — so it is appended rather than positioned.
    for (const face of group.dropped ?? []) {
      dice.push({ face, sides: group.sides, dropped: true })
    }
  }

  return {
    id: input.id,
    label: input.label,
    formula: describeDice(
      input.dice.map(d => ({ count: d.count, sides: d.sides })),
      input.modifier,
    ),
    mode: input.mode,
    dice,
    modifier: input.modifier,
    total: input.total,
    character: input.character ?? null,
    simulated: input.simulated === true,
    intervention: input.intervention ?? null,
    at: input.at ?? Date.now(),
  }
}

/** Newest first, capped. Returns a new array — the log is never mutated. */
export function appendRoll(log: readonly RollLogEntry[], entry: RollLogEntry): RollLogEntry[] {
  return [entry, ...log].slice(0, ROLL_LOG_LIMIT)
}

/** `18 ̶4̶ + 7 = 25`, as text — for a Notice, and for a test to assert on. */
export function describeRoll(entry: RollLogEntry): string {
  const faces = entry.dice
    .map(d => (d.dropped ? `(${d.face})` : d.from !== undefined ? `${d.from}→${d.face}` : String(d.face)))
    .join(' ')
  const mod = entry.modifier === 0 ? '' : ` ${entry.modifier > 0 ? '+' : '-'} ${Math.abs(entry.modifier)}`
  const tail = entry.mode === 'normal' ? '' : ` (${entry.mode})`
  return `${entry.label}: ${faces}${mod} = ${entry.total}${tail}`
}

/**
 * A settled roll as one `/gm/log` line (MYDND-27).
 *
 * The shape is `ActivityEntry` minus `at`, spelled out rather than imported so
 * this file keeps no dependency on the state layer. The time comes from the
 * entry, not from the write: a roll that waited on an intervention prompt
 * happened when the dice landed, not when the player answered.
 *
 * **`dropped` and `replaced` stay two keys in the file**, for the reason this
 * module's header gives. A die carries `dropped: true` *or* `from: n`, never a
 * shared "changed" flag — the day's note is read back by a person, and a Great
 * Weapon Fighting floor must not read as an advantage discard there either.
 */
export function rollActivity(entry: RollLogEntry): {
  kind: 'roll'
  text: string
  character: string | null
  at: string
  detail: Record<string, unknown>
} {
  const detail: Record<string, unknown> = {
    formula: entry.formula,
    mode: entry.mode,
    modifier: entry.modifier,
    total: entry.total,
    dice: entry.dice.map(d => {
      const die: Record<string, unknown> = { face: d.face, sides: d.sides }
      if (d.dropped) die.dropped = true
      if (d.from !== undefined) die.from = d.from
      return die
    }),
  }
  // Written only when true: the common case is a real throw, and a `false` on
  // every line is noise in a note a person reads.
  if (entry.simulated) detail.simulated = true
  if (entry.intervention) detail.intervention = { ...entry.intervention }

  return {
    kind: 'roll',
    text: describeRoll(entry),
    character: entry.character,
    at: new Date(entry.at).toISOString(),
    detail,
  }
}

export function newRollId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}
