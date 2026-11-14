// The GM's Party page, at /gm/party: every character's vitals at a glance.

import { useEffect, useState } from 'react'
import { Notice } from 'obsidian'
import { xpForLevel, xpProgressForLevel } from '@vault/derive/xpTable.js'

import { budgets, encounterGroups, partyLabel, spentXp, type Difficulty } from '../../catalogs'
import { useCompendium } from '../../compendium/host'
import type { RosterEntry } from '../../characterModel'
import {
  projectVitals,
  type ProjectedVitals,
  fmtMod,
  shortRestPlan,
  addXp,
  heal,
  longRest,
  setTemp,
  shortRest,
  takeDamage,
  type Vitals,
} from '../../characterModel'
import {
  useElementWidth,
  useCatalogRows,
  useVaultGeneration,
  openNote,
  useObsidian,
  useRouteLink,
} from '../../platform/host'
import { useEncounter } from './hooks/useGm'
import { useRoster, useCharacters, PartyInitiativeButton } from '../../characters/host'
import { sheetPath } from '../../platform'
import { Rollable, RollLog } from '../../dice/host'

/**
 * The party at a glance, at `/gm/party` — the "Party · vitals board" of the
 * all-sections canvas, as drawn (MYDND-90).
 *
 * `useParty()` is the web app's "single answer to who is at the table", and the
 * equivalent here is `useRoster()` — every note carrying `vc_ddb_id`, because a
 * character is identified by frontmatter and not by a folder.
 *
 * **It reads every character's vitals, which the roster does not.** The roster
 * composes them onto `sheet.hp` for display; this page needs the hit dice, the
 * death saves, the conditions and the XP as well, so it reads the fences
 * itself — one read per character, which is affordable because a party is five
 * notes. **And it writes them**, since MYDND-90: damage, healing, temporary hit
 * points, the party's rests and an XP award go through the same `characters/store/vitals`
 * transforms the sheet's buttons do, one `mutate` (one file write) per
 * character, and the page shows what each write returned.
 *
 * Beside the rows, the encounter budget: the party's Low / Moderate / High from
 * `@vault/derive/encounterBudget.js` (VAULT-255), and what the encounter note
 * holds against it.
 *
 * **There are no secrets here.** `publicCombatant()` exists in
 * `@vault/derive/combatant.js` to strip a monster's hit points before players
 * see them; with one seat there is nobody to hide anything from, so the GM view
 * is the only view. That is the single-player decision, not an oversight.
 */

/** Below this the rows stack and the budget moves under them (the narrow board). */
const WIDE_WIDTH = 900
const DIFFICULTY_LABEL: Record<Difficulty, string> = { low: 'Low', moderate: 'Moderate', high: 'High' }

export default function GmPartyPage() {
  const link = useRouteLink()
  const { vitals: vitalsStore } = useCharacters()
  const { entries, loading } = useRoster()
  const generation = useVaultGeneration()
  const [vitals, setVitals] = useState<{ key: string; byPath: Record<string, Vitals> } | null>(null)
  const [busy, setBusy] = useState(false)
  const [paneRef, width] = useElementWidth<HTMLDivElement>()
  const narrow = width > 0 && width < WIDE_WIDTH

  const paths = entries.map(e => e.path).join('|')
  const key = `${paths}:${generation}`

  useEffect(() => {
    if (entries.length === 0) return
    let cancelled = false
    async function run() {
      const byPath: Record<string, Vitals> = {}
      for (const entry of entries) {
        byPath[entry.path] = await vitalsStore.read(entry.path)
      }
      if (!cancelled) setVitals({ key, byPath })
    }
    void run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` covers `entries`
  }, [key, vitalsStore])

  const ready = entries.length === 0 || vitals?.key === key
  const players = entries.filter(e => e.sheet)
  const levels = players.map(e => e.sheet!.level).filter((l): l is number => typeof l === 'number' && l > 0)

  /** One transform, one write per character, in turn; the page shows what came back. */
  async function apply(targets: RosterEntry[], transform: (v: Vitals, s: RosterEntry['sheet']) => Vitals, done?: string) {
    if (busy || targets.length === 0) return
    setBusy(true)
    try {
      for (const entry of targets) {
        const next = await vitalsStore.mutate(entry.path, (v, s) => transform(v, s ?? entry.sheet))
        setVitals(prev => (prev ? { key: prev.key, byPath: { ...prev.byPath, [entry.path]: next } } : prev))
      }
      if (done) new Notice(done)
    } catch (error) {
      // Surfaced, never swallowed — `parseNote` refuses frontmatter it would overwrite.
      new Notice(`Could not update the party: ${(error as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const rows = players.map(entry => ({
    entry,
    projected: vitals?.byPath[entry.path] ? projectVitals(entry.sheet, vitals.byPath[entry.path]) : null,
  }))
  const unreadable = entries.filter(e => !e.sheet)

  return (
    <div ref={paneRef} className="bst">
      <header className={narrow ? 'bst-header bst-header--narrow' : 'bst-header'}>
        <div className="bst-titles">
          <h2 className="bst-title">Party</h2>
          <span className="bst-count">{entries.length === 0 ? 'No characters' : partyLabel(levels)}</span>
        </div>
        {!narrow && <span className="bst-spacer" />}
        {players.length > 0 && (
          <div className={narrow ? 'bst-party-actions bst-party-actions--narrow' : 'bst-party-actions'}>
            <button
              type="button"
              className="bst-plain bst-btn-secondary"
              disabled={busy}
              onClick={() => void apply(players, (v, s) => shortRest(v, shortRestPlan(s)), 'Short rest taken by the party.')}
            >
              Short rest
            </button>
            <ConfirmButton
              label="Long rest"
              confirm="Long rest everyone?"
              disabled={busy}
              onConfirm={() => void apply(players, v => longRest(v), 'Long rest taken by the party.')}
            />
            <XpAwardButton disabled={busy} onAward={xp => void apply(players, v => addXp(v, xp), `Awarded ${xp.toLocaleString('en-US')} XP each.`)} />
            <PartyInitiativeButton entries={entries} />
          </div>
        )}
        {!narrow && (
          <button type="button" className="bst-plain bst-link" {...link('/gm/encounter')}>
            Encounter →
          </button>
        )}
      </header>

      <div className="bst-body bst-party-body">
        <main className={narrow ? 'my-dnd-vault__scroll' : 'my-dnd-vault__scroll bst-party-main'}>
          {loading && entries.length === 0 ? (
            <p className="bst-empty">Reading the vault…</p>
          ) : entries.length === 0 ? (
            <p className="bst-empty">
              <strong>No characters</strong>
              No character notes in this vault. Import one from D&amp;D Beyond on the Characters page.
            </p>
          ) : (
            <>
              {rows.map(({ entry, projected }) =>
                narrow ? (
                  <NarrowRow key={entry.path} entry={entry} projected={projected} busy={busy} apply={apply} />
                ) : (
                  <PartyRow key={entry.path} entry={entry} projected={projected} ready={ready} busy={busy} apply={apply} />
                ),
              )}
              {unreadable.map(entry => (
                // Listed rather than hidden, with the reason — the roster's own
                // rule. A character that needs fixing must not be invisible on
                // the page the GM runs the table from.
                <article key={entry.path} aria-label={entry.name} className="bst-prow bst-prow--broken">
                  <strong>{entry.name}</strong>
                  <span className="bst-note">no readable sheet ({entry.error})</span>
                </article>
              ))}
              {narrow && <Budget levels={levels} rows={rows} narrow />}
              <div className="bst-party-log">
                <RollLog />
              </div>
            </>
          )}
        </main>
        {!narrow && players.length > 0 && (
          <aside aria-label="Encounter budget" className="my-dnd-vault__scroll bst-party-aside">
            <Budget levels={levels} rows={rows} />
          </aside>
        )}
      </div>
    </div>
  )
}

type Apply = (targets: RosterEntry[], transform: (v: Vitals, s: RosterEntry['sheet']) => Vitals, done?: string) => Promise<void>

/** The HP bar's tone — the roster's: teal at full, orange hurt, rose at half or below. */
const toneOf = (current: number, max: number | null): 'full' | 'hurt' | 'low' =>
  max === null || max <= 0 ? 'full' : current / max <= 0.5 ? 'low' : current < max ? 'hurt' : 'full'

function HpBar({ entry, projected }: { entry: RosterEntry; projected: ProjectedVitals }) {
  const { current, max, temp } = projected.hp
  const total = Math.max(1, (max ?? current) + temp)
  const tone = toneOf(current, max)
  return (
    <span role="img" aria-label={`${entry.name}: ${current} of ${max ?? '?'} hit points${temp > 0 ? `, ${temp} temporary` : ''}`} className="bst-hp-bar bst-hp-bar--tall">
      <span className={`bst-hp-fill bst-hp-fill--${tone}`} style={{ width: `${(current / total) * 100}%` }} />
      {temp > 0 && <span className="bst-hp-fill bst-hp-fill--temp" style={{ width: `${(temp / total) * 100}%` }} />}
    </span>
  )
}

function HpControls({ entry, busy, apply, compact = false }: { entry: RosterEntry; busy: boolean; apply: Apply; compact?: boolean }) {
  const [amount, setAmount] = useState('')
  const n = parseInt(amount, 10)
  const ok = Number.isFinite(n) && n > 0 && !busy
  const run = (transform: (v: Vitals, s: RosterEntry['sheet']) => Vitals) => {
    if (!ok) return
    setAmount('')
    void apply([entry], transform)
  }
  return (
    <span className="bst-hpctl">
      <input
        type="number"
        min={0}
        inputMode="numeric"
        placeholder="amount"
        aria-label={`Amount for ${entry.name}`}
        value={amount}
        onChange={e => setAmount(e.target.value)}
        className="bst-input bst-hpctl-input"
      />
      <button type="button" disabled={!ok} className="bst-plain bst-hpctl-btn bst-hpctl-btn--dmg" onClick={() => run((v, s) => takeDamage(v, s?.hp?.max ?? null, n))}>
        {compact ? 'Dmg' : 'Damage'}
      </button>
      <button type="button" disabled={!ok} className="bst-plain bst-hpctl-btn bst-hpctl-btn--heal" onClick={() => run(v => heal(v, n))}>
        Heal
      </button>
      {!compact && (
        <button type="button" disabled={!ok} className="bst-plain bst-hpctl-btn" onClick={() => run(v => setTemp(v, n))}>
          Temp
        </button>
      )}
    </span>
  )
}

function Chips({ projected }: { projected: ProjectedVitals }) {
  return (
    <span className="bst-pchips">
      {projected.down && (
        <span className="bst-pchip bst-pchip--down">
          {projected.dead ? 'Dead' : projected.stable ? 'Stable' : 'Dying'} · {projected.deathSaves.successes}✓ {projected.deathSaves.failures}✗
        </span>
      )}
      {projected.conditions.map(c => (
        <span key={c} className="bst-pchip">
          {c}
        </span>
      ))}
    </span>
  )
}

function PartyRow({
  entry,
  projected,
  ready,
  busy,
  apply,
}: {
  entry: RosterEntry
  projected: ProjectedVitals | null
  ready: boolean
  busy: boolean
  apply: Apply
}) {
  const app = useObsidian()
  const link = useRouteLink()
  const sheet = entry.sheet!
  const character = { name: sheet.name, notePath: entry.path }
  const level = typeof sheet.level === 'number' ? sheet.level : 0
  const xp = projected?.xp ?? null
  const tone = projected ? toneOf(projected.hp.current, projected.hp.max) : 'full'

  return (
    <article aria-label={entry.name} className={tone === 'low' ? 'bst-prow bst-prow--low' : 'bst-prow'}>
      <div className="bst-prow-who">
        <span aria-hidden="true" className="bst-token bst-roster-token bst-token--lg44">
          {entry.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="bst-ccard-names">
          <button type="button" className="bst-plain bst-ccard-name" {...link(sheetPath(entry.path))}>
            {entry.name}
          </button>
          <span className="bst-ccard-line">{sheet.classes}</span>
        </span>
      </div>

      {projected ? (
        <>
          <div className="bst-prow-hp">
            <span className="bst-hp-head">
              <span>HIT POINTS</span>
              <span className={`bst-hp-value bst-hp-value--${tone} bst-prow-hpv`}>
                {`${projected.hp.current}${projected.hp.max === null ? '' : ` / ${projected.hp.max}`}${projected.hp.temp > 0 ? ` +${projected.hp.temp}` : ''}`}
              </span>
            </span>
            <HpBar entry={entry} projected={projected} />
            <HpControls entry={entry} busy={busy} apply={apply} />
          </div>

          <dl className="bst-ptiles">
            <Tile label="PERC" value={sheet.passives?.perception} />
            <Tile label="INSIGHT" value={sheet.passives?.insight} />
            <Tile label="INVEST" value={sheet.passives?.investigation} />
          </dl>

          <div className="bst-prow-more">
            <span className="bst-prow-line">
              AC {typeof sheet.ac === 'number' ? sheet.ac : '—'} · HIT DICE{' '}
              {projected.hitDice.map(h => `${h.remaining}/${h.total}d${h.sides || '?'}`).join(' ') || '—'}
            </span>
            {xp !== null && level > 0 ? (
              <>
                <span className="bst-prow-line">
                  <span>XP</span>
                  <span>
                    {xp.toLocaleString('en-US')}
                    {level < 20 ? ` / ${(xpForLevel(level + 1)).toLocaleString('en-US')}` : ''}
                  </span>
                </span>
                <span className="bst-load-bar">
                  <span className="bst-load-fill bst-xp-fill" style={{ width: `${Math.round((xpProgressForLevel(xp, level)) * 100)}%` }} />
                </span>
              </>
            ) : (
              <span className="bst-prow-line">XP not tracked</span>
            )}
            <Chips projected={projected} />
          </div>

          <div className="bst-prow-acts">
            {typeof sheet.initiative === 'number' && (
              <span className="bst-croll">
                <span className="bst-croll-label">init</span>
                <Rollable value={fmtMod(sheet.initiative)} label={`${entry.name} — Initiative`} character={character} rollType="initiative" className="bst-roll" />
              </span>
            )}
            <button type="button" className="bst-plain bst-link" onClick={() => openNote(app, entry.path)}>
              Open note
            </button>
          </div>
        </>
      ) : (
        <p className="bst-note bst-prow-wait">{ready ? '' : 'Reading vitals…'}</p>
      )}
    </article>
  )
}

function NarrowRow({ entry, projected, busy, apply }: { entry: RosterEntry; projected: ProjectedVitals | null; busy: boolean; apply: Apply }) {
  const link = useRouteLink()
  const sheet = entry.sheet!
  const tone = projected ? toneOf(projected.hp.current, projected.hp.max) : 'full'
  return (
    <article aria-label={entry.name} className={tone === 'low' ? 'bst-nprow bst-nprow--low' : 'bst-nprow'}>
      <span className="bst-nprow-head">
        <button type="button" className="bst-plain bst-ccard-name bst-nprow-name" {...link(sheetPath(entry.path))}>
          {entry.name}
        </button>
        <span className="bst-row-kind">{sheet.classes}</span>
        <span className="bst-spacer" />
        <span className="bst-mono bst-muted">AC {sheet.ac ?? '—'}</span>
        {projected && <span className={`bst-hp-value bst-hp-value--${tone}`}>{`${projected.hp.current}/${projected.hp.max ?? '?'}`}</span>}
      </span>
      {projected ? (
        <>
          <HpBar entry={entry} projected={projected} />
          <HpControls entry={entry} busy={busy} apply={apply} compact />
          <span className="bst-note">
            {[
              `Perc ${sheet.passives?.perception ?? '—'}`,
              `Insight ${sheet.passives?.insight ?? '—'}`,
              projected.hitDice.length > 0 ? `HD ${projected.hitDice.map(h => `${h.remaining}/${h.total}`).join(' ')}` : null,
              ...projected.conditions,
              projected.hp.temp > 0 ? `+${projected.hp.temp} temp` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </>
      ) : (
        <span className="bst-note">Reading vitals…</span>
      )}
    </article>
  )
}

/**
 * The aside: the party's budget for each difficulty, what the encounter note
 * holds against it, and the party at a glance.
 */
function Budget({
  levels,
  rows,
  narrow = false,
}: {
  levels: number[]
  rows: Array<{ entry: RosterEntry; projected: ProjectedVitals | null }>
  narrow?: boolean
}) {
  const link = useRouteLink()
  const compendium = useCompendium()
  const monsters = useCatalogRows(() => compendium.monsters.list())
  const { encounter } = useEncounter()
  const b = budgets(levels)
  const groups = encounter ? encounterGroups(encounter.combatants, monsters) : []
  const spent = spentXp(groups)
  const standing =
    spent === 0
      ? null
      : spent > b.high
        ? 'Above High'
        : spent >= b.moderate
          ? spent >= b.high
            ? 'High'
            : 'Above Moderate, below High'
          : spent >= b.low
            ? 'Above Low, below Moderate'
            : 'Below Low'
  const projected = rows.map(r => r.projected).filter((p): p is ProjectedVitals => p !== null)
  const down = projected.filter(p => p.down).length
  const low = projected.filter(p => !p.down && p.hp.max !== null && p.hp.current / p.hp.max <= 0.5).length
  const dice = projected.flatMap(p => p.hitDice)
  const lowest = levels.length > 0 ? Math.min(...levels) : 0

  return (
    <div className={narrow ? 'bst-budget bst-budget--narrow' : 'bst-budget'}>
      <section aria-label="Budget" className="bst-col bst-col--gap">
        <h3 className="bst-shelf-title">Encounter budget</h3>
        <span className="bst-note">{partyLabel(levels)}</span>
        {(['low', 'moderate', 'high'] as const).map(d => (
          <div key={d} className="bst-budget-row">
            <span aria-hidden="true" className={`bst-dot bst-dot--${d === 'low' ? 'teal' : d === 'moderate' ? 'orange' : 'rose'}`} />
            <span className="bst-spacer">{DIFFICULTY_LABEL[d]}</span>
            <span className="bst-mono">{b[d].toLocaleString('en-US')} XP</span>
          </div>
        ))}
        {groups.length > 0 && (
          <div className="bst-budget-now">
            <span className="bst-budget-now-label">Current encounter</span>
            <strong className="bst-mono bst-budget-now-xp">{spent.toLocaleString('en-US')} XP</strong>
            {standing && <span className="bst-note">{standing} · {groups.map(g => `${g.count} ${g.name}`).join(', ')}</span>}
            <button type="button" className="bst-plain bst-link" {...link('/gm/encounter')}>
              Open the tracker →
            </button>
          </div>
        )}
      </section>
      <section aria-label="Party at a glance" className="bst-col">
        <h3 className="bst-label">Party at a glance</h3>
        <Glance label="Down or dying" value={String(down)} />
        <Glance label="At half HP or below" value={String(low)} warn={low > 0} />
        {dice.length > 0 && (
          <Glance label="Hit dice left" value={`${dice.reduce((n, h) => n + h.remaining, 0)} / ${dice.reduce((n, h) => n + h.total, 0)}`} />
        )}
        {lowest > 0 && lowest < 20 && <Glance label={`Level ${lowest + 1} at`} value={`${(xpForLevel(lowest + 1)).toLocaleString('en-US')} XP`} />}
      </section>
    </div>
  )
}

function Glance({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <span className="bst-glance">
      <span>{label}</span>
      <span className={warn ? 'bst-mono bst-glance-warn' : 'bst-mono'}>{value}</span>
    </span>
  )
}

function Tile({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="bst-ctile">
      <dt>{label}</dt>
      <dd>{value ?? '—'}</dd>
    </div>
  )
}

/** A rest for everyone is two clicks: the first asks. */
function ConfirmButton({ label, confirm, disabled, onConfirm }: { label: string; confirm: string; disabled: boolean; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false)
  if (!asking) {
    return (
      <button type="button" className="bst-plain bst-btn-secondary" disabled={disabled} onClick={() => setAsking(true)}>
        {label}
      </button>
    )
  }
  return (
    <span className="bst-confirm">
      <span className="bst-note">{confirm}</span>
      <button
        type="button"
        className="bst-plain bst-btn-primary bst-btn-sm"
        onClick={() => {
          setAsking(false)
          onConfirm()
        }}
      >
        Yes
      </button>
      <button type="button" className="bst-plain bst-btn-ghost" onClick={() => setAsking(false)}>
        No
      </button>
    </span>
  )
}

function XpAwardButton({ disabled, onAward }: { disabled: boolean; onAward: (xp: number) => void }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  if (!open) {
    return (
      <button type="button" className="bst-plain bst-btn-secondary" disabled={disabled} onClick={() => setOpen(true)}>
        Award XP…
      </button>
    )
  }
  const n = parseInt(value, 10)
  return (
    <span className="bst-confirm">
      <input
        type="number"
        min={1}
        autoFocus
        aria-label="XP for each character"
        placeholder="XP each"
        value={value}
        onChange={e => setValue(e.target.value)}
        className="bst-input bst-hpctl-input"
      />
      <button
        type="button"
        className="bst-plain bst-btn-primary bst-btn-sm"
        disabled={disabled || !(n > 0)}
        onClick={() => {
          setOpen(false)
          setValue('')
          onAward(n)
        }}
      >
        Award
      </button>
      <button type="button" className="bst-plain bst-btn-ghost" onClick={() => setOpen(false)}>
        Cancel
      </button>
    </span>
  )
}
