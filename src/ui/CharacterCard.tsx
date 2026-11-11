import { Notice } from 'obsidian'

import { formatRelativeTime, type RosterEntry } from '../content/index'
import type { SheetResource } from '../ddb/sheet'
import { fmtMod } from '../ddb/derive'
import { openNote, resourceUrl, useObsidian } from '../ObsidianContext'
import { useRouteLink } from '../pane'
import { builderEditPath, sheetPath } from '../routes'
import { slotTable } from '../spells/slots'
import { isLocalId } from '../state/characters'
import { useStateHost } from '../StateContext'
import { Icon } from './Icon'
import { Rollable } from './Rollable'

/**
 * A character as a card — design A of the "Character card rework" canvas
 * (https://claude.ai/artifact/CTTejN2vyrumCQBKW34QZw, MYDND-132), drawn on the
 * roster and on Home's "At the table".
 *
 * A banner over the portrait, AC in a shield beside it; the name, the class
 * line, and where the sheet comes from with when it was synced; hit points
 * with temporary ones as a blue run after them; initiative, passive Perception
 * and speed; the quick rolls and the save DC; spell slots and class resources
 * as pips, spent ones hollow; then the actions, the secondary ones as icons.
 *
 * A note whose sheet will not read is still a card — rose, with the reason and
 * Re-sync — because hiding it would hide the one that needs fixing.
 */
export function CharacterCard({ entry, onImport }: { entry: RosterEntry; onImport: ImportFn }) {
  const app = useObsidian()
  const link = useRouteLink()
  const sheet = entry.sheet
  const local = isLocalId(entry.ddbId)
  const character = { name: entry.name, notePath: entry.path }
  const portrait = portraitUrl(app, entry)
  const perception = sheet?.skills?.find(s => s.name === 'Perception')

  return (
    <article aria-label={entry.name} className={sheet ? 'bst-ccard' : 'bst-ccard bst-ccard--broken'}>
      <div aria-hidden="true" className={`bst-ccard-banner bst-ccard-banner--${bannerOf(entry.name)}`}>
        {portrait ? <img src={portrait} alt="" /> : null}
      </div>
      <div className="bst-ccard-body">
        <div className="bst-ccard-top">
          <Portrait entry={entry} size="card" />
          {sheet && typeof sheet.ac === 'number' ? <AcShield ac={sheet.ac} /> : null}
        </div>

        <span className="bst-ccard-names">
          <button type="button" {...link(sheetPath(entry.path))} className="bst-plain bst-ccard-name">
            {entry.name}
          </button>
          {sheet ? <span className="bst-ccard-line">{[sheet.race, sheet.classes].filter(Boolean).join(' · ')}</span> : null}
          <span className="bst-ccard-meta">
            <span aria-hidden="true" className={local ? 'bst-ccard-dot bst-ccard-dot--vault' : 'bst-ccard-dot bst-ccard-dot--ddb'} />
            <span>{local ? 'Vault' : 'D&D Beyond'}</span>
            <span>· synced {formatRelativeTime(entry.synced)}</span>
          </span>
        </span>

        {sheet ? (
          <>
            {sheet.hp ? <HitPoints name={entry.name} current={sheet.hp.current} max={sheet.hp.max} temp={sheet.hp.temp} /> : null}
            <dl className="bst-ccard-stats">
              <div className="bst-ctile">
                <dt>INIT</dt>
                <dd>
                  {typeof sheet.initiative === 'number' ? (
                    <Rollable value={fmtMod(sheet.initiative)} label={`${entry.name} — Initiative`} character={character} rollType="initiative" className="bst-roll" />
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <Tile label="PASSIVE" value={sheet.passives?.perception ?? null} />
              <Tile label="SPEED" value={typeof sheet.speed === 'number' ? sheet.speed : null} unit="ft" />
            </dl>
            {perception || sheet.spellcasting ? (
              <span className="bst-crolls">
                {perception ? <QuickRoll label="Perception" modifier={perception.total} name={entry.name} character={character} /> : null}
                {sheet.spellcasting ? (
                  <>
                    <QuickRoll label="Spell attack" modifier={sheet.spellcasting.attack} name={entry.name} character={character} />
                    {/* A number the target rolls against, so not a roll. */}
                    <span className="bst-croll bst-croll--dc">
                      <span className="bst-croll-label">Save DC</span>
                      <strong>{sheet.spellcasting.dc}</strong>
                    </span>
                  </>
                ) : null}
              </span>
            ) : null}
            <Pools entry={entry} />
          </>
        ) : (
          <div className="bst-ccard-error">
            <strong>The sheet in this note can’t be read</strong>
            <span>This note has no readable sheet ({entry.error}). Re-sync it, or fix the charsheet block.</span>
          </div>
        )}

        <div className="bst-ccard-foot">
          <CardActions entry={entry} onImport={onImport} />
        </div>
      </div>
    </article>
  )
}

/**
 * The party as one row per character — design C of the same canvas
 * (MYDND-135), for Home's "At the table" when a card each is too much.
 *
 * The portrait in a ring that is its hit points, with the source as a dot on
 * it; the name and the class line; current over maximum with the bar under
 * it; AC; initiative, which rolls. Everything else is the sheet's, a click on
 * the name away. A note whose sheet will not read keeps its row, rose, with
 * Re-sync, as the card does.
 */
export function CharacterLines({ entries, onImport }: { entries: RosterEntry[]; onImport: ImportFn }) {
  return (
    <div className="bst-clines">
      <div aria-hidden="true" className="bst-cline bst-cline--head">
        <span />
        <span>{`PARTY · ${entries.length}`}</span>
        <span>HIT POINTS</span>
        <span className="bst-cline-num">AC</span>
        <span className="bst-cline-num">INIT</span>
      </div>
      {entries.map(e => (
        <CharacterLine key={e.path} entry={e} onImport={onImport} />
      ))}
    </div>
  )
}

/** The ring's radius in a 44px box, and its length, which the dash is a share of. */
const RING_R = 19
const RING = 2 * Math.PI * RING_R

function CharacterLine({ entry, onImport }: { entry: RosterEntry; onImport: ImportFn }) {
  const link = useRouteLink()
  const sheet = entry.sheet
  const local = isLocalId(entry.ddbId)
  const character = { name: entry.name, notePath: entry.path }
  const hp = sheet?.hp
  const tone = hp ? hpTone(hp.current, hp.max) : 'full'
  const temp = hp ? Math.max(0, hp.temp) : 0
  // As on the card: with temporaries the bar's scale is max + temp.
  const scale = hp ? Math.max(1, hp.max + temp) : 1
  const pct = (n: number): string => `${Math.max(0, Math.min(100, (n / scale) * 100))}%`
  const ring = hp ? RING * Math.max(0, Math.min(1, hp.current / Math.max(1, hp.max))) : 0

  return (
    <article aria-label={entry.name} className={sheet ? 'bst-cline' : 'bst-cline bst-cline--broken'}>
      <span role="img" aria-label={`${entry.name}, ${local ? 'Vault' : 'D&D Beyond'} character`} className="bst-cline-face">
        <Portrait entry={entry} size="line" />
        {hp ? (
          <svg viewBox="0 0 44 44" aria-hidden="true" className="bst-cline-ring">
            <circle cx="22" cy="22" r={RING_R} className="bst-cline-ring-track" />
            <circle cx="22" cy="22" r={RING_R} className={`bst-cline-ring-fill bst-cline-ring-fill--${tone}`} strokeDasharray={`${ring.toFixed(1)} ${RING.toFixed(1)}`} />
          </svg>
        ) : null}
        <span aria-hidden="true" className={local ? 'bst-ccard-dot bst-ccard-dot--vault bst-cline-dot' : 'bst-ccard-dot bst-ccard-dot--ddb bst-cline-dot'} />
      </span>

      <span className="bst-cline-names">
        <button type="button" {...link(sheetPath(entry.path))} className="bst-plain bst-cline-name">
          {entry.name}
        </button>
        <span className="bst-cline-line">{sheet ? [sheet.race, sheet.classes].filter(Boolean).join(' · ') : `synced ${formatRelativeTime(entry.synced)}`}</span>
      </span>

      {sheet ? (
        <>
          {hp ? (
            <span role="img" aria-label={`${entry.name}: ${hp.current} of ${hp.max} hit points${temp > 0 ? `, ${temp} temporary` : ''}`} className="bst-cline-hp">
              <span className="bst-cline-hphead">
                <span className={`bst-cline-hpnow bst-hp-value--${tone}`}>{hp.current}</span>
                <span className="bst-cline-hpmax">{`/ ${hp.max}`}</span>
                <span className="bst-spacer" />
                {temp > 0 ? <span className="bst-ccard-temp bst-cline-temp">{`+${temp}`}</span> : null}
              </span>
              <span className="bst-hp-bar">
                <span className={`bst-hp-fill bst-hp-fill--${tone}`} style={{ width: pct(hp.current) }} />
                {temp > 0 ? <span className="bst-hp-fill bst-hp-fill--temp" style={{ width: pct(temp) }} /> : null}
              </span>
            </span>
          ) : (
            <span />
          )}
          <span className="bst-cline-num bst-cline-ac">{typeof sheet.ac === 'number' ? sheet.ac : '—'}</span>
          <span className="bst-cline-num">
            {typeof sheet.initiative === 'number' ? (
              <Rollable value={fmtMod(sheet.initiative)} label={`${entry.name} — Initiative`} character={character} rollType="initiative" className="bst-roll bst-cline-init" />
            ) : (
              '—'
            )}
          </span>
        </>
      ) : (
        <span className="bst-cline-error">
          <span>Sheet unreadable</span>
          <CardActions entry={entry} onImport={onImport} compact />
        </span>
      )}
    </article>
  )
}

export type ImportFn = (ddbId: string, targetPath?: string | null) => Promise<boolean>

/** The HP bar's tone: teal at full, orange when hurt, rose at half or below. */
export function hpTone(current: number, max: number): 'full' | 'hurt' | 'low' {
  if (max <= 0) return 'full'
  const r = current / max
  return r <= 0.5 ? 'low' : r < 1 ? 'hurt' : 'full'
}

/** A vault-relative portrait beats the remote avatar: it works offline. */
function portraitUrl(app: ReturnType<typeof useObsidian>, entry: RosterEntry): string | null {
  return resourceUrl(app, entry.sheet?.portrait ?? null) ?? entry.sheet?.avatar ?? null
}

const PORTRAIT_CLASS = {
  md: 'bst-token bst-roster-token',
  card: 'bst-token bst-ccard-portrait',
  line: 'bst-token bst-roster-token bst-cline-portrait',
}

export function Portrait({ entry, size }: { entry: RosterEntry; size: keyof typeof PORTRAIT_CLASS }) {
  const app = useObsidian()
  const portrait = portraitUrl(app, entry)
  return (
    <span aria-hidden="true" className={PORTRAIT_CLASS[size]}>
      {portrait ? <img src={portrait} alt="" /> : entry.name.slice(0, 1).toUpperCase()}
    </span>
  )
}

/** Six banner tints, picked by the name so a character keeps its colour. */
function bannerOf(name: string): number {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return (h % 6) + 1
}

function AcShield({ ac }: { ac: number }) {
  return (
    <span role="img" aria-label={`Armor class ${ac}`} className="bst-ccard-ac">
      <svg viewBox="0 0 56 64" aria-hidden="true">
        <path d="M28 2 L52 10 V30 C52 46 42 56 28 62 C14 56 4 46 4 30 V10 Z" />
      </svg>
      <span className="bst-ccard-ac-label">AC</span>
      <span className="bst-ccard-ac-value">{ac}</span>
    </span>
  )
}

/**
 * Current over maximum, temporary hit points as a chip and as a blue run after
 * the bar. With temporaries the bar's scale is max + temp, so a character at
 * full health with some on top shows both runs without overflowing.
 */
function HitPoints({ name, current, max, temp }: { name: string; current: number; max: number; temp: number }) {
  const tone = hpTone(current, max)
  const scale = Math.max(1, max + Math.max(0, temp))
  const pct = (n: number): string => `${Math.max(0, Math.min(100, (n / scale) * 100))}%`
  return (
    <div role="img" aria-label={`${name}: ${current} of ${max} hit points${temp > 0 ? `, ${temp} temporary` : ''}`} className="bst-ccard-hp">
      <span className="bst-ccard-hphead">
        <span className="bst-ccard-label">HIT POINTS</span>
        <span className="bst-spacer" />
        {temp > 0 ? <span className="bst-ccard-temp">{`+${temp} temp`}</span> : null}
        <span className={`bst-ccard-hpnow bst-hp-value--${tone}`}>{current}</span>
        <span className="bst-ccard-hpmax">{`/ ${max}`}</span>
      </span>
      <span className="bst-hp-bar">
        <span className={`bst-hp-fill bst-hp-fill--${tone}`} style={{ width: pct(current) }} />
        {temp > 0 ? <span className="bst-hp-fill bst-hp-fill--temp" style={{ width: pct(temp) }} /> : null}
      </span>
    </div>
  )
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']

/** Above this a pool is a count, not a row of pips — Lay on Hands, Psionic dice at 20. */
const MAX_PIPS = 10

/** How many class resources a card shows before it points at the sheet. */
const MAX_RESOURCES = 3

/**
 * Spell slots by rank and the class resources, spent ones hollow. The maxima
 * are the sheet's, through `slotTable` as the Spells tab reads them; what is
 * spent is the note's `vault-vitals`, read with the roster.
 */
function Pools({ entry }: { entry: RosterEntry }) {
  const sheet = entry.sheet
  if (!sheet) return null
  const slotsUsed = entry.vitals?.spellSlotsUsed ?? {}
  const usesUsed = entry.vitals?.featureUsesUsed ?? {}
  const table = slotTable(sheet)
  const ranks = (table?.max ?? [])
    .map((max, i) => ({ rank: i + 1, max, left: Math.max(0, max - Math.min(max, slotsUsed[String(i + 1)] ?? 0)) }))
    .filter(r => r.max > 0)
  const resources = (Array.isArray(sheet.class_resources) ? sheet.class_resources : []).filter(r => r && r.uses > 0)
  if (ranks.length === 0 && resources.length === 0) return null
  const shown = resources.slice(0, MAX_RESOURCES)

  return (
    <div className="bst-ccard-pools">
      {ranks.length > 0 ? (
        <div className="bst-ccard-slots">
          <span className="bst-ccard-label">SLOTS</span>
          {ranks.map(r => (
            <span key={r.rank} role="img" aria-label={`Rank ${r.rank}: ${r.left} of ${r.max} slots left`} className="bst-ccard-rank">
              <span className="bst-ccard-roman">{ROMAN[r.rank - 1]}</span>
              <Pips max={r.max} left={r.left} round />
            </span>
          ))}
        </div>
      ) : null}
      {shown.map(r => (
        <ResourceRow key={r.key} resource={r} used={usesUsed[r.key] ?? 0} />
      ))}
      {resources.length > shown.length ? (
        <span className="bst-ccard-more">{`+${resources.length - shown.length} more on the sheet`}</span>
      ) : null}
    </div>
  )
}

function ResourceRow({ resource: r, used }: { resource: SheetResource; used: number }) {
  const left = Math.max(0, r.uses - Math.min(r.uses, used))
  return (
    <span role="img" aria-label={`${r.name}: ${left} of ${r.uses} left`} className="bst-ccard-res">
      <span className="bst-ccard-resname">{r.name}</span>
      {!r.points && r.uses <= MAX_PIPS ? <Pips max={r.uses} left={left} /> : null}
      <span className="bst-ccard-rescount">{`${left}/${r.uses}${r.points && r.unit ? ` ${r.unit}` : ''}`}</span>
    </span>
  )
}

function Pips({ max, left, round = false }: { max: number; left: number; round?: boolean }) {
  return (
    <span aria-hidden="true" className="bst-ccard-pips">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`bst-ccard-pip${round ? ' bst-ccard-pip--round' : ''}${i < left ? '' : ' bst-ccard-pip--spent'}`} />
      ))}
    </span>
  )
}

/**
 * Open note, then Re-sync and Convert for a D&D Beyond character or Edit for a
 * Vault one, then Open sheet. The secondary actions are icons with their names
 * as labels; a broken card keeps Re-sync (Rebuild for a Vault character) as
 * words, rose, because it is the way out. `compact` is the narrow row's broken
 * state: that button and nothing else.
 */
export function CardActions({ entry, onImport, compact = false }: { entry: RosterEntry; onImport: ImportFn; compact?: boolean }) {
  const app = useObsidian()
  const link = useRouteLink()
  const { rebuildVaultCharacter } = useStateHost()
  const local = isLocalId(entry.ddbId)
  const broken = !entry.sheet
  const syncLabel = local ? 'Rebuild' : 'Re-sync'

  // A Vault character has no D&D Beyond to re-sync from; its own choices are
  // the source, so the button rebuilds from those.
  const sync = (): void => {
    if (local) {
      void rebuildVaultCharacter(entry.path)
      return
    }
    if (entry.ddbId === '') {
      new Notice(`${entry.name} has no D&D Beyond id to re-sync from.`)
      return
    }
    // The SRD edition reaches no server (MYDND-133); the note's sheet stands as it is.
    {
      new Notice(`${entry.name} came from D&D Beyond, which this edition cannot reach.`)
      return
    }
    void onImport(entry.ddbId, entry.path)
  }

  if (broken || compact) {
    return (
      <span className="bst-ccard-actions">
        {!compact && (
          <button type="button" onClick={() => openNote(app, entry.path)} className="bst-plain bst-link">
            Open note
          </button>
        )}
        <button type="button" onClick={sync} className={broken ? 'bst-plain bst-btn-primary bst-btn-primary--rose' : 'bst-plain bst-btn-secondary bst-btn-sm'}>
          {syncLabel}
        </button>
      </span>
    )
  }

  return (
    <span className="bst-ccard-actions">
      <button type="button" aria-label="Open note" title="Open note" onClick={() => openNote(app, entry.path)} className="bst-plain bst-ccard-icon">
        <Icon name="file-text" />
      </button>
      {/* A Vault character's Edit re-opens its choices and saving there
          rebuilds it, so a Rebuild beside it would be the same thing twice;
          only a broken card, which has no Edit, keeps one. */}
      {local ? null : (
        <button type="button" aria-label="Re-sync" title="Re-sync" onClick={sync} className="bst-plain bst-ccard-icon">
          <Icon name="refresh-cw" />
        </button>
      )}
      {/* Only a Vault character has choices to re-open; a D&D Beyond one can
          become a Vault character (MYDND-105), through a review that writes
          nothing until Convert. */}
      {local ? (
        <button type="button" aria-label="Edit" title="Edit choices" {...link(builderEditPath(entry.path))} className="bst-plain bst-ccard-icon">
          <Icon name="pencil" />
        </button>
      ) : null}
      <span className="bst-spacer" />
      <button type="button" {...link(sheetPath(entry.path))} className="bst-plain bst-btn-primary bst-ccard-open">
        Open sheet
      </button>
    </span>
  )
}

function Tile({ label, value, unit }: { label: string; value: string | number | null; unit?: string }) {
  return (
    <div className="bst-ctile">
      <dt>{label}</dt>
      <dd>
        {value ?? '—'}
        {value !== null && unit ? <span className="bst-ctile-unit">{` ${unit}`}</span> : null}
      </dd>
    </div>
  )
}

function QuickRoll({
  label,
  modifier,
  name,
  character,
}: {
  label: string
  modifier: number
  name: string
  character: { name: string; notePath: string }
}) {
  return (
    <span className="bst-croll">
      <span className="bst-croll-label">{label}</span>
      <Rollable value={fmtMod(modifier)} label={`${name} — ${label}`} character={character} className="bst-roll" />
    </span>
  )
}
