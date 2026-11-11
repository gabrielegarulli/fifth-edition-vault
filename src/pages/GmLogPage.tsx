import { useMemo, useState } from 'react'

import { useActivityLog } from '../hooks/useGm'
import { useElementWidth } from '../hooks/useElementWidth'
import { useVaultGeneration } from '../hooks/useVaultGeneration'
import { openNote, useObsidian } from '../ObsidianContext'
import { ACTIVITY_KINDS, LOG_FOLDER, dayKey, type ActivityEntry, type ActivityKind } from '../state/index'
import { useStateHost } from '../StateContext'
import { logTone } from '../ui/logTone'
import { NoCampaign } from '../ui/NoCampaign'

/**
 * The activity log, at `/gm/log` — the "Log · days and a timeline" board of the
 * all-sections canvas, as drawn (MYDND-92).
 *
 * `the-vault`'s `activity_log` is an append-only table of machine-written
 * events. Here each day is a note under `log/<campaign>/`, which means the log
 * is searchable, linkable and in the same graph as the lore — and the GM can
 * open the day and write in it, which a table row could not offer.
 *
 * The board: the days on the left, each named for the session note written
 * that day when there is one; the composer and the kinds over a timeline of
 * the chosen day, newest first; and beside it the day in numbers — entries per
 * kind, entries per character (a filter), and the day's note.
 *
 * **The filter is a closed vocabulary**, read from `ACTIVITY_KINDS` rather than
 * from the entries themselves. Deriving the chips from what happens to be in
 * the log would make them appear and disappear between sessions, and a filter
 * that is sometimes absent is worse than one that sometimes matches nothing.
 * The counts beside them are the day's, and say nothing when it is zero.
 *
 * The hook reads the last fourteen days. An older day is still listed, and
 * opening it opens its note.
 */

/** Below this the days become a select and the day's numbers go (the narrow board). */
const WIDE_WIDTH = 900
const READ_DAYS = 14

const toneOf = logTone

export default function GmLogPage() {
  const app = useObsidian()
  const { state, activeCampaignId } = useStateHost()
  const generation = useVaultGeneration()
  const { entries, days, today, loading, append } = useActivityLog(READ_DAYS)
  const [kinds, setKinds] = useState<Set<ActivityKind>>(new Set())
  const [who, setWho] = useState<Set<string>>(new Set())
  const [text, setText] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [paneRef, width] = useElementWidth<HTMLDivElement>()
  const narrow = width > 0 && width < WIDE_WIDTH

  // Session notes name their day. A walk of the campaign's notes, so once per generation.
  const sessions = useMemo(
    () => (activeCampaignId ? state.activity.sessions(activeCampaignId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `generation` is the cache key
    [state, activeCampaignId, generation],
  )

  const byDay = useMemo(() => {
    const map = new Map<string, ActivityEntry[]>()
    for (const e of entries) {
      const key = dayKey(new Date(e.at))
      map.set(key, [...(map.get(key) ?? []), e])
    }
    for (const list of map.values()) list.sort((a, b) => b.at.localeCompare(a.at))
    return map
  }, [entries])

  if (!activeCampaignId) return <NoCampaign what="the activity log" />

  const allDays = [...new Set([...byDay.keys(), ...days])].sort((a, b) => b.localeCompare(a))
  const day = picked && allDays.includes(picked) ? picked : (allDays[0] ?? today)
  const dayEntries = byDay.get(day) ?? []
  const q = query.trim().toLowerCase()
  const shown = dayEntries.filter(
    e =>
      (kinds.size === 0 || kinds.has(e.kind)) &&
      (who.size === 0 || who.has(e.character ?? '')) &&
      (q === '' || `${e.text} ${e.character ?? ''}`.toLowerCase().includes(q)),
  )
  const titleOf = (d: string) => sessions.find(s => s.date === d)?.title ?? null
  const countOf = (kind: ActivityKind) => dayEntries.filter(e => e.kind === kind).length
  const people = [...new Set(dayEntries.map(e => e.character).filter((c): c is string => !!c))].sort()
  const dayPath = `${LOG_FOLDER}/${activeCampaignId}/${day}.md`
  const outOfRange = !byDay.has(day) && days.includes(day)

  const toggleKind = (kind: ActivityKind): void =>
    setKinds(current => {
      const next = new Set(current)
      if (!next.delete(kind)) next.add(kind)
      return next
    })

  const write = (): void => {
    const line = text.trim()
    if (line === '') return
    append({ kind: 'note', text: line })
    setText('')
  }

  return (
    <div ref={paneRef} className="bst">
      <header className={narrow ? 'bst-header bst-header--narrow' : 'bst-header'}>
        <div className="bst-titles">
          <h2 className="bst-title">Log</h2>
          <span className="bst-count">
            {activeCampaignId} · {allDays.length} {allDays.length === 1 ? 'day' : 'days'}
          </span>
        </div>
        {!narrow && <span className="bst-spacer" />}
        {narrow && allDays.length > 0 ? (
          <select aria-label="Day" className="bst-select" value={day} onChange={e => setPicked(e.target.value)}>
            {allDays.map(d => (
              <option key={d} value={d}>
                {longDay(d)}
              </option>
            ))}
          </select>
        ) : null}
        <input
          type="search"
          aria-label="Search the day"
          placeholder="Search the day"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className={narrow ? 'bst-search' : 'bst-search bst-search--roster'}
        />
      </header>

      <div className="bst-body">
        {!narrow && (
          <nav aria-label="Days" className="my-dnd-vault__scroll bst-rail bst-log-days">
            <h3 className="bst-label">Days</h3>
            {allDays.length === 0 && <p className="bst-note">Nothing logged yet.</p>}
            {allDays.map(d => {
              const n = byDay.get(d)?.length ?? null
              return (
                <button key={d} type="button" aria-current={d === day ? 'date' : undefined} className="bst-plain bst-log-day" onClick={() => setPicked(d)}>
                  <span className="bst-log-date">
                    <span className="bst-log-dnum">{Number(d.slice(8, 10))}</span>
                    <span className="bst-log-dow">{weekday(d)}</span>
                  </span>
                  <span className="bst-log-dnames">
                    <span className="bst-log-dtitle">{titleOf(d) ?? monthDay(d)}</span>
                    <span className="bst-log-dcount">{n === null ? 'older — opens the note' : `${n} ${n === 1 ? 'entry' : 'entries'}`}</span>
                  </span>
                </button>
              )
            })}
          </nav>
        )}

        <main className="my-dnd-vault__scroll bst-log-main">
          <div className="bst-log-compose">
            <input
              type="text"
              value={text}
              placeholder="Note something that happened…"
              aria-label="Log entry"
              className="bst-input"
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') write()
              }}
            />
            <button type="button" className="bst-plain bst-btn-primary bst-btn-sm" disabled={text.trim() === ''} onClick={write}>
              Log it
            </button>
          </div>

          <div role="group" aria-label="Kinds" className="bst-log-kinds">
            {ACTIVITY_KINDS.map(kind => {
              const n = countOf(kind)
              return (
                <button key={kind} type="button" aria-pressed={kinds.has(kind)} className={n > 0 ? 'bst-plain bst-log-kind' : 'bst-plain bst-log-kind bst-log-kind--none'} onClick={() => toggleKind(kind)}>
                  <span aria-hidden="true" className={`bst-dot bst-dot--sm bst-dot--r-${toneOf(kind)}`} />
                  {kind}
                  {n > 0 && (
                    <span aria-hidden="true" className="bst-log-kind-n">
                      {n}
                    </span>
                  )}
                </button>
              )
            })}
            {kinds.size > 0 ? (
              <button type="button" className="bst-plain bst-link" onClick={() => setKinds(new Set())}>
                Clear
              </button>
            ) : null}
          </div>

          <div className="bst-log-dayhead">
            <h3 className="bst-shelf-title">{longDay(day)}</h3>
            {titleOf(day) && <span className="bst-shelf-when">{titleOf(day)}</span>}
            <span className="bst-spacer" />
            <button type="button" className="bst-plain bst-link" onClick={() => openNote(app, dayPath)}>
              {day === today ? 'Open today' : 'Open the day’s note'} ↗
            </button>
          </div>

          {loading ? (
            <p className="bst-note">Reading the log…</p>
          ) : entries.length === 0 && days.length === 0 ? (
            <p className="bst-empty">
              <strong>Nothing logged yet</strong>
              Entries land in <code>{`${LOG_FOLDER}/${activeCampaignId}/`}</code>, one note per day.
            </p>
          ) : outOfRange ? (
            <p className="bst-note">
              This day is older than the {READ_DAYS} days the log reads. Its note has every entry.
            </p>
          ) : shown.length === 0 ? (
            <p className="bst-note">
              {dayEntries.length === 0 ? 'Nothing logged this day.' : 'Nothing this day matches the filters.'}
            </p>
          ) : (
            <ol aria-label="Entries" className="bst-log-list">
              {shown.map((e, i) => (
                <li key={`${e.at}-${i}`} className="bst-log-entry">
                  <span className="bst-log-time">{clock(e.at)}</span>
                  <span aria-hidden="true" className={`bst-dot bst-dot--r-${toneOf(e.kind)} bst-log-dot`} />
                  <span className="bst-log-text">
                    <span>{e.text}</span>
                    {detailLine(e) && <span className="bst-log-detail">{detailLine(e)}</span>}
                  </span>
                  <span className={`bst-log-chip bst-chip--${toneOf(e.kind)}`}>{e.kind}</span>
                </li>
              ))}
            </ol>
          )}
        </main>

        {!narrow && (
          <aside aria-label="This day" className="my-dnd-vault__scroll bst-party-aside bst-log-aside">
            <div className="bst-budget">
              <section aria-label="Kinds this day" className="bst-col">
                <h3 className="bst-label">This day</h3>
                <dl className="bst-log-totals">
                  <Total label="ENTRIES" value={dayEntries.length} />
                  {ACTIVITY_KINDS.filter(k => countOf(k) > 0)
                    .slice(0, 5)
                    .map(k => (
                      <Total key={k} label={k.toUpperCase()} value={countOf(k)} tone={toneOf(k)} />
                    ))}
                </dl>
              </section>
              {people.length > 0 && (
                <section aria-label="Who" className="bst-col">
                  <h3 className="bst-label">Who</h3>
                  {people.map(p => (
                    <label key={p} className="bst-check">
                      <input
                        type="checkbox"
                        className="bst-checkbox"
                        checked={who.size === 0 || who.has(p)}
                        onChange={() =>
                          setWho(current => {
                            const base = current.size === 0 ? new Set(people) : new Set(current)
                            if (!base.delete(p)) base.add(p)
                            return base.size === people.length ? new Set() : base
                          })
                        }
                      />
                      <span className="bst-spacer">{p}</span>
                      <span className="bst-tier-count">{dayEntries.filter(e => e.character === p).length}</span>
                    </label>
                  ))}
                </section>
              )}
              <section className="bst-col">
                <span className="bst-note">
                  Each day is a note under {LOG_FOLDER}/{activeCampaignId}/ — searchable, linkable, yours to write in.
                </span>
                <button type="button" className="bst-plain bst-btn-secondary" onClick={() => openNote(app, dayPath)}>
                  Open {day}.md
                </button>
              </section>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

function Total({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="bst-ctile bst-log-total">
      <dt>{label}</dt>
      <dd className={tone ? `bst-log-total-v bst-log-total-v--${tone}` : 'bst-log-total-v'}>{value}</dd>
    </div>
  )
}

/** `1d20+6 · normal` for a roll; otherwise the character it happened to. */
function detailLine(e: ActivityEntry): string | null {
  const d = e.detail ?? {}
  const formula = typeof d.formula === 'string' ? d.formula : null
  const mode = typeof d.mode === 'string' && d.mode !== 'normal' ? d.mode : null
  const parts = [formula, mode, d.simulated === true ? 'rolled here, not in Atlas' : null, e.character && e.kind !== 'roll' ? e.character : null]
  const line = parts.filter(Boolean).join(' · ')
  return line || null
}

const DATE = (d: string) => new Date(`${d}T12:00:00`)
const weekday = (d: string) => DATE(d).toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()
const monthDay = (d: string) => DATE(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const longDay = (d: string) => DATE(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
