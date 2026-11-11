import { useEffect, useState } from 'react'

import { useElementWidth } from '../hooks/useElementWidth'
import { useSessions } from '../hooks/useGm'
import { useVaultGeneration } from '../hooks/useVaultGeneration'
import { openNote, useObsidian } from '../ObsidianContext'
import type { SessionNoteRow } from '../state/index'
import { useStateHost } from '../StateContext'
import { Markdown } from '../ui/Markdown'
import { NoCampaign } from '../ui/NoCampaign'

/**
 * Session notes, at `/gm/notes`.
 *
 * ## What single-player deletes
 *
 * `campaign_note` carried two kinds — GM notes and **player-facing
 * broadcasts** — and Realtime was enabled on the table so a broadcast could
 * appear on a player's screen mid-session. With one seat there is nobody to
 * broadcast to, so the `kind` column collapses and the banner has no analogue.
 * What survives is the half that was always just writing things down.
 *
 * ## It creates notes and then gets out of the way
 *
 * **There is no editor here, and that is the decision.** Obsidian is the
 * editor — it has the GM's snippets, their templates, their hotkeys and their
 * backlinks, and a textarea in a pane would be a worse one with none of that.
 * So this page lists, creates with a skeleton, and opens. Writing a second
 * markdown editor inside a markdown editor is the kind of thing worth noticing
 * before doing.
 *
 * That is also why a session note's prose is in the **body** and not in a
 * fence: it has to be readable and editable in the note itself.
 *
 * ## The board (MYDND-93)
 *
 * The "Notes · sessions and a preview" board of the all-sections canvas: the
 * notes as cards by month — date, title, the first lines the GM wrote, its
 * links — and beside them the chosen note rendered by Obsidian, with its links
 * and "Open in Obsidian". A click previews, a double click opens. The bodies
 * are read for the newest notes only, one read each.
 */
export default function GmNotesPage() {
  const app = useObsidian()
  const { state, activeCampaignId } = useStateHost()
  const generation = useVaultGeneration()
  const { sessions, create } = useSessions()
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const [bodies, setBodies] = useState<{ key: string; byPath: Record<string, string | null> } | null>(null)
  const [paneRef, width] = useElementWidth<HTMLDivElement>()
  const narrow = width > 0 && width < WIDE_WIDTH

  // The newest notes' bodies, for their first lines and the preview: one read
  // each, at most `READ_NOTES` — the same trade `/gm/party` makes for vitals.
  const read = sessions.slice(0, READ_NOTES)
  const key = `${read.map(s => s.path).join('|')}:${generation}`
  useEffect(() => {
    if (read.length === 0) return
    let cancelled = false
    async function run() {
      const byPath: Record<string, string | null> = {}
      for (const s of read) byPath[s.path] = await state.activity.readSession(s.path)
      if (!cancelled) setBodies({ key, byPath })
    }
    void run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` covers `read`
  }, [key, state])

  if (!activeCampaignId) return <NoCampaign what="session notes" />

  // The next number, from what is already there — so a GM who numbers their
  // sessions does not have to remember where they got to, and one who does not
  // never sees the field.
  const highest = sessions.reduce((max, s) => Math.max(max, s.session ?? 0), 0)
  const body = (path: string): string | null => (bodies?.key === key ? (bodies.byPath[path] ?? null) : null)
  const selected = sessions.find(s => s.id === picked) ?? sessions[0] ?? null

  const add = (): void => {
    if (busy) return
    setBusy(true)
    void create(title.trim() || undefined, highest > 0 ? highest + 1 : null)
      .then(path => {
        setTitle('')
        if (path) openNote(app, path)
      })
      .finally(() => setBusy(false))
  }

  const months = groupByMonth(sessions)

  const form = (
    <div className={narrow ? 'bst-log-compose' : 'bst-log-compose bst-notes-form'}>
      <input
        type="text"
        value={title}
        placeholder={`Session ${highest + 1}${narrow ? '' : ' — title it now or later'}`}
        aria-label="Session title"
        className="bst-input"
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') add()
        }}
      />
      <button type="button" className="bst-plain bst-btn-primary bst-btn-sm" disabled={busy} onClick={add}>
        New session note
      </button>
    </div>
  )

  return (
    <div ref={paneRef} className="bst">
      <header className={narrow ? 'bst-header bst-header--narrow' : 'bst-header'}>
        <div className="bst-titles">
          <h2 className="bst-title">Session notes</h2>
          <span className="bst-count">
            {sessions.length} {sessions.length === 1 ? 'note' : 'notes'}
          </span>
        </div>
        {!narrow && <span className="bst-spacer" />}
        {form}
      </header>

      <div className="bst-body">
        <main className={narrow ? 'my-dnd-vault__scroll' : 'my-dnd-vault__scroll bst-notes-main'}>
          {sessions.length === 0 ? (
            <p className="bst-empty">
              <strong>No session notes yet</strong>
              They live in <code>{state.activity.sessionsFolder()}/</code>, as ordinary notes — so your templates, backlinks and the graph
              all work on them.
            </p>
          ) : narrow ? (
            sessions.map(s => (
              <button key={s.id} type="button" className="bst-plain bst-nrow-note" onClick={() => openNote(app, s.path)}>
                <DateTile date={s.date} />
                <span className="bst-row-main">
                  <span className="bst-row-name">{s.title}</span>
                  <span className="bst-row-kind">{excerptOf(body(s.path)) ?? meta(s)}</span>
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="bst-chevron">
                  <path d="M7 17L17 7 M8 7h9v9" />
                </svg>
              </button>
            ))
          ) : (
            months.map(m => (
              <section key={m.label} aria-label={m.label} className="bst-col bst-col--gap">
                <h3 className="bst-label">{m.label}</h3>
                <div className="bst-notes-grid">
                  {m.rows.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={selected?.id === s.id}
                      className="bst-plain bst-notecard"
                      onClick={() => setPicked(s.id)}
                      onDoubleClick={() => openNote(app, s.path)}
                    >
                      <DateTile date={s.date} />
                      <span className="bst-notecard-body">
                        <strong className="bst-notecard-title">{s.title}</strong>
                        {excerptOf(body(s.path)) && <span className="bst-notecard-excerpt">{excerptOf(body(s.path))}</span>}
                        <span className="bst-notecard-meta">{meta(s, body(s.path))}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))
          )}
        </main>

        {!narrow && selected && (
          <aside aria-label={`${selected.title} preview`} className="bst-detail bst-notes-aside">
            <div className="bst-detail-head">
              <span className="bst-mono bst-notes-path">{selected.path}</span>
              <h3 className="bst-detail-name">{selected.title}</h3>
              <span className="bst-detail-sub">
                {[selected.date ? longDate(selected.date) : 'Undated', selected.session !== null ? `session ${selected.session}` : null, selected.campaignId === null ? 'no campaign' : null]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
            <div className="my-dnd-vault__scroll bst-detail-scroll">
              {body(selected.path) === null ? (
                <p className="bst-prose">{bodies?.key === key ? 'This note is outside the newest the page reads — open it.' : 'Reading the note…'}</p>
              ) : (
                <Markdown markdown={body(selected.path) ?? ''} sourcePath={selected.path} className="bst-prose bst-entry-desc bst-spell-prose" />
              )}
              {linksOf(body(selected.path)).length > 0 && (
                <section aria-label="Links in this note">
                  <h4 className="bst-section-title">Links in this note</h4>
                  <div className="bst-notes-links">
                    {linksOf(body(selected.path)).map(l => (
                      <button key={l} type="button" className="bst-plain bst-pill" onClick={() => void app.workspace.openLinkText(l, selected.path)}>
                        {l}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
            <div className="bst-detail-foot">
              <span className="bst-note">Obsidian is the editor — your templates, hotkeys and backlinks.</span>
              <div className="bst-foot-row">
                <button type="button" className="bst-plain bst-btn-primary" onClick={() => openNote(app, selected.path)}>
                  Open in Obsidian
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
      {narrow && <footer className="bst-bfoot bst-note">Opens in Obsidian — this pane lists and creates, it doesn’t edit.</footer>}
    </div>
  )
}

/** Below this the cards become rows and the preview goes (the narrow board). */
const WIDE_WIDTH = 900
/** The newest notes whose bodies are read for a card's first lines. */
const READ_NOTES = 24

function DateTile({ date }: { date: string | null }) {
  if (!date) {
    return (
      <span aria-hidden="true" className="bst-datetile">
        <span className="bst-datetile-n">—</span>
      </span>
    )
  }
  const d = new Date(`${date}T12:00:00`)
  return (
    <span aria-hidden="true" className="bst-datetile">
      <span className="bst-datetile-n">{d.getDate()}</span>
      <span className="bst-datetile-m">{d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}</span>
    </span>
  )
}

const longDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

/** `October 2026` per month, newest first; undated notes last. A note with no campaign is shown everywhere. */
function groupByMonth(rows: SessionNoteRow[]): Array<{ label: string; rows: SessionNoteRow[] }> {
  const out = new Map<string, SessionNoteRow[]>()
  for (const r of rows) {
    const label = r.date ? new Date(`${r.date}T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : 'Undated'
    out.set(label, [...(out.get(label) ?? []), r])
  }
  return [...out].map(([label, list]) => ({ label, rows: list }))
}

/** The first lines a GM wrote: past the heading, the skeleton's own headings and blank lines. */
export function excerptOf(body: string | null): string | null {
  if (!body) return null
  for (const line of body.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#') || t.startsWith('---')) continue
    const plain = t
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/[*_`>]/g, '')
      .replace(/^[-+] /, '')
      .trim()
    if (plain) return plain.length > 140 ? `${plain.slice(0, 139)}…` : plain
  }
  return null
}

/** Every distinct `[[link]]` in the body, by target, in order. */
export function linksOf(body: string | null): string[] {
  if (!body) return []
  const out: string[] = []
  for (const m of body.matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)) {
    const target = m[1].trim()
    if (target && !out.includes(target)) out.push(target)
  }
  return out
}

function meta(s: SessionNoteRow, body: string | null = null): string {
  const links = linksOf(body).length
  return [
    s.session !== null ? `#${s.session}` : null,
    links > 0 ? `${links} ${links === 1 ? 'link' : 'links'}` : null,
    // A note with no campaign is shown under every campaign rather than nowhere —
    // far likelier to be written before a campaign was chosen than for another table.
    s.campaignId === null ? 'no campaign' : null,
    s.date ? null : 'undated',
  ]
    .filter(Boolean)
    .join(' · ')
}
