import { useState } from 'react'
import { abilityMod, fmtMod } from '@vault/derive/dnd5e.js'

import { crGlyph, formatXp, kindLine } from '../catalog/bestiary'
import { ABILITY_LABELS, humanise } from '../catalog/labels'
import { stripPreamble } from '../catalog/preamble'
import { actionRolls, initiativeMod } from '../catalog/statblockRolls'
import { useContent } from '../ContentContext'
import { abilitiesOf, flattenSaves, type MonsterRow, type StatblockFence } from '../content/monsters'
import type { RollContext } from '../dice/atlas'
import { isRollable } from '../dice/groups'
import { useDetail } from '../hooks/useDetail'
import { openNote, useObsidian } from '../ObsidianContext'
import { MonsterToken } from './BestiaryCards'
import { Markdown } from './Markdown'
import { Rollable } from './Rollable'

/**
 * One monster, opened from a shelf — design A's right-hand panel (MYDND-64).
 *
 * Header: token, name, `size type · alignment · source`; chips for CR and XP,
 * initiative and senses; AC / HP / Speed tiles; the six abilities; saves,
 * skills and defences as lines. Body: every list the fence has — traits,
 * actions, bonus actions, reactions, legendary actions — numbered, each with
 * its rolls as chips. Footer: add it to the encounter, or open the note.
 *
 * **Every number the GM rolls is still a roll** (MYDND-16): the same `Rollable`
 * with the same labels the old stat block used, so Atlas' log reads the same.
 * Only the look is the canvas's — `bst-roll` in place of `roll-chip`. A DC is
 * text, because the monster imposes it and nobody rolls it.
 */
export function MonsterDetail({
  monster,
  onClose,
  encounter,
}: {
  monster: MonsterRow
  onClose(): void
  /** Null when there is no active campaign, which is where an encounter lives. */
  encounter: { add(): Promise<void>; count: number; busy: boolean } | null
}) {
  const app = useObsidian()
  const content = useContent()
  const { detail, loading } = useDetail(content.monsters, monster.id)
  const fence = detail?.fence ?? null
  const [adding, setAdding] = useState(false)

  const creature: RollContext = { name: monster.name, notePath: monster.path }
  const alignment = scalar(fence?.alignment)
  const subtitle = [kindLine(monster), alignment, monster.source].filter(Boolean).join(' · ')
  const prose = detail ? stripPreamble(detail.prose) : ''

  return (
    <>
      <div className="bst-detail-head">
        <div className="bst-detail-id">
          <MonsterToken monster={monster} size="lg" />
          <div className="bst-detail-names">
            <h3 className="bst-detail-name">{monster.name}</h3>
            <span className="bst-detail-sub">{subtitle}</span>
          </div>
          <button type="button" aria-label="Close" className="bst-plain bst-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <ul aria-label="At a glance" className="bst-chips">
          <li className="bst-chip bst-chip--accent">
            CR {crGlyph(monster.cr)}
            {monster.xp !== null ? ` · ${formatXp(monster.xp)} XP` : ''}
          </li>
          {fence && <InitiativeChip fence={fence} creature={creature} />}
          {senseChips(fence).map(s => (
            <li key={s} className="bst-chip">
              {s}
            </li>
          ))}
        </ul>

        {fence && <Vitals fence={fence} creature={creature} />}
        {fence && <Abilities fence={fence} creature={creature} />}
        {fence && <Lines fence={fence} creature={creature} />}
      </div>

      <div className="my-dnd-vault__scroll bst-detail-scroll">
        {loading ? (
          <p className="bst-prose">Reading the note…</p>
        ) : !fence ? (
          <p className="bst-prose">
            This note has no <code>statblock</code> block, so there are no stats to show.
          </p>
        ) : (
          <>
            <Entries title="Traits" entries={entryList(fence.traits)} path={monster.path} creature={creature} />
            <Entries title="Actions" entries={entryList(fence.actions)} path={monster.path} creature={creature} />
            <Entries title="Bonus actions" entries={entryList(fence.bonus_actions)} path={monster.path} creature={creature} />
            <Entries title="Reactions" entries={entryList(fence.reactions)} path={monster.path} creature={creature} />
            <Entries
              title="Legendary actions"
              entries={entryList(fence.legendary_actions)}
              path={monster.path}
              creature={creature}
              intro={scalar(fence.legendary_description)}
            />
          </>
        )}
        {/* Almost always empty: an exported note is the fence and nothing else.
            It shows when the GM has written their own notes under the block,
            which is the reason to keep a bestiary in Obsidian. */}
        {prose && <Markdown markdown={prose} sourcePath={monster.path} className="bst-prose bst-entry-desc" />}
      </div>

      <div className="bst-detail-foot">
        {encounter && encounter.count > 0 && (
          <p className="bst-note">
            {encounter.count === 1 ? '1 in the encounter' : `${encounter.count} in the encounter`}
          </p>
        )}
        {!encounter && <p className="bst-note">Pick a campaign in Settings to keep an encounter.</p>}
        <div className="bst-foot-row">
          <button
            type="button"
            className="bst-plain bst-btn-primary"
            disabled={!encounter || encounter.busy || adding}
            onClick={() => {
              if (!encounter) return
              setAdding(true)
              void encounter.add().finally(() => setAdding(false))
            }}
          >
            {adding ? 'Adding…' : 'Add to an encounter…'}
          </button>
          <button type="button" className="bst-plain bst-btn-secondary" onClick={() => openNote(app, monster.path)}>
            Open note
          </button>
        </div>
      </div>
    </>
  )
}

/** `Initiative +7`, the modifier rollable; the bracketed passive score stays out of the button. */
function InitiativeChip({ fence, creature }: { fence: StatblockFence; creature: RollContext }) {
  const mod = initiativeMod(fence.initiative)
  if (mod === null) return null
  return (
    <li className="bst-chip">
      Initiative{' '}
      <Rollable
        value={fmtMod(mod)}
        label={`${creature.name} — Initiative`}
        character={creature}
        rollType="initiative"
        className="bst-roll bst-roll--mod"
      />
    </li>
  )
}

/** `Darkvision 60 ft.`, `Passive 15` — one chip per sense, as the canvas draws them. */
function senseChips(fence: StatblockFence | null): string[] {
  if (!fence) return []
  const senses = (scalar(fence.senses) ?? '')
    .split(/[,;]\s*/)
    .map(s => s.trim())
    .filter(Boolean)
  return fence.passive != null ? [...senses, `Passive ${fence.passive}`] : senses
}

function Vitals({ fence, creature }: { fence: StatblockFence; creature: RollContext }) {
  const hitDice = scalar(fence.hit_dice)
  const speed = speedLines(scalar(fence.speed))
  return (
    <div className="bst-vitals">
      <div className="bst-vital">
        <span className="bst-vital-label">AC</span>
        <span className="bst-vital-value">{scalar(fence.ac) ?? '—'}</span>
      </div>
      <div className="bst-vital">
        <span className="bst-vital-label">HP</span>
        <span className="bst-vital-value">
          {scalar(fence.hp) ?? '—'}{' '}
          {/* Rollable: a GM rolling a creature's hit points is a real thing the
              books ask for, and this is the only place the expression is written. */}
          {hitDice &&
            (isRollable(hitDice) ? (
              <Rollable
                value={hitDice.replace(/\s+/g, '')}
                formula={hitDice}
                label={`${creature.name} — hit points`}
                character={creature}
                className="bst-roll bst-roll--mod"
              />
            ) : (
              <span className="bst-vital-aside">{hitDice}</span>
            ))}
        </span>
      </div>
      <div className="bst-vital">
        <span className="bst-vital-label">SPEED</span>
        <span className="bst-vital-value bst-vital-value--small">
          {speed.length === 0
            ? '—'
            : speed.map(line => (
                <span key={line} className="bst-speed-line">
                  {line}
                </span>
              ))}
        </span>
      </div>
    </div>
  )
}

/**
 * `40 ft., Climb 40 ft.` → `["40 ft.", "climb 40"]`: the walking speed as
 * written, then each other mode lower-cased and without its unit, as the
 * canvas's Speed tile has it.
 */
export function speedLines(speed: string | null): string[] {
  if (!speed) return []
  const [first, ...rest] = speed.split(/,\s*/).map(s => s.trim()).filter(Boolean)
  return [first, ...rest.map(m => m.replace(/\s*ft\.?/i, '').replace(/^\w+/, w => w.toLowerCase()))]
}

function Abilities({ fence, creature }: { fence: StatblockFence; creature: RollContext }) {
  const abilities = abilitiesOf(fence)
  if (!abilities) return null
  return (
    <dl className="bst-abilities">
      {ABILITY_LABELS.map(a => {
        const score = abilities[a.key]
        return (
          <div key={a.key} className="bst-ability">
            <dt>{a.short}</dt>
            <dd>{score}</dd>
            <dd>
              <Rollable
                value={fmtMod(abilityMod(score))}
                label={`${creature.name} — ${a.label} check`}
                character={creature}
                rollType="check"
                className="bst-roll bst-roll--mod"
              />
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

/** Saves and skills, each bonus its own roll; then languages and defences as plain lines. */
function Lines({ fence, creature }: { fence: StatblockFence; creature: RollContext }) {
  const saves = Object.entries(flattenSaves(fence.saves))
  const skills = Object.entries(flattenSaves(fence.skillsaves))
  const plain: Array<[string, string | null]> = [
    ['Languages', scalar(fence.languages)],
    ['Resistances', scalar(fence.resistances)],
    ['Immunities', scalar(fence.immunities)],
    ['Vulnerabilities', scalar(fence.vulnerabilities)],
    ['Condition immunities', scalar(fence.condition_immunities)],
  ]
  return (
    <>
      {/* "save" in the label because the ability grid rolls the same ability as
          a check — two buttons both called "Aboleth — Dexterity" would put two
          different rolls under one name in Atlas' log. */}
      <BonusLine label="Saves" bonuses={saves} creature={creature} rollType="save" suffix=" save" />
      <BonusLine label="Skills" bonuses={skills} creature={creature} rollType="check" />
      {plain.map(([label, value]) =>
        value ? (
          <p key={label} className="bst-line">
            {label} · {value}
          </p>
        ) : null,
      )}
    </>
  )
}

function BonusLine({
  label,
  bonuses,
  creature,
  rollType,
  suffix = '',
}: {
  label: string
  bonuses: Array<[string, number]>
  creature: RollContext
  rollType: string
  suffix?: string
}) {
  if (bonuses.length === 0) return null
  return (
    <p className="bst-line bst-line-rolls">
      {label} ·
      {bonuses.map(([stat, bonus]) => (
        <span key={stat}>
          {humanise(stat)}{' '}
          <Rollable
            value={fmtMod(bonus)}
            label={`${creature.name} — ${humanise(stat)}${suffix}`}
            character={creature}
            rollType={rollType}
            className="bst-roll bst-roll--mod"
          />
        </span>
      ))}
    </p>
  )
}

function Entries({
  title,
  entries,
  path,
  creature,
  intro,
}: {
  title: string
  entries: Array<{ name?: string; desc?: string }>
  path: string
  creature: RollContext
  intro?: string | null
}) {
  if (entries.length === 0) return null
  return (
    <section aria-label={title}>
      <h4 className="bst-section-title">{title}</h4>
      {intro && <Markdown markdown={stripHtml(intro)} sourcePath={path} className="bst-prose bst-entry-desc" />}
      <ol className="bst-entries">
        {entries.map((entry, i) => (
          <li key={`${entry.name ?? ''}-${i}`} className="bst-entry">
            <span className="bst-entry-n">{i + 1}</span>
            <div className="bst-entry-body">
              <div className="bst-entry-head">
                <strong className="bst-entry-name">{entry.name ?? title}</strong>
                {attackKind(entry.desc) && <span className="bst-entry-tag">{attackKind(entry.desc)}</span>}
              </div>
              {entry.desc && <Markdown markdown={stripHtml(entry.desc)} sourcePath={path} className="bst-entry-desc" />}
              <EntryRolls name={entry.name} desc={entry.desc} creature={creature} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** `+7 to hit`, `2d8 + 5 slashing` — the rolls out of an action's prose, as chips under it. */
function EntryRolls({ name, desc, creature }: { name?: string; desc?: string; creature: RollContext }) {
  const { attack, damage } = actionRolls(desc)
  // Only formulas the dice layer reads in full: a partial parse would roll fewer
  // dice than the prose states, and under-reporting looks like an answer.
  const rollable = damage.filter(d => isRollable(d.formula))
  if (attack === null && rollable.length === 0) return null
  const label = [creature.name, name].filter(Boolean).join(' — ')
  return (
    <span className="bst-line-rolls">
      {attack !== null && (
        <Rollable
          value={`${fmtMod(attack)} to hit`}
          formula={fmtMod(attack)}
          label={`${label} attack`}
          character={creature}
          rollType="attack"
          className="bst-roll"
        />
      )}
      {rollable.map((d, i) => (
        <Rollable
          key={`${d.formula}-${i}`}
          value={[d.formula.replace(/\s+/g, ' '), d.damageType?.toLowerCase()].filter(Boolean).join(' ')}
          formula={d.formula}
          label={`${label} damage`}
          character={creature}
          rollType="damage"
          damageType={d.damageType}
          className="bst-roll"
        />
      ))}
    </span>
  )
}

/** `Melee`, `Ranged`, `Melee or Ranged` — read off the 2024 attack line. */
function attackKind(desc: string | undefined): string | null {
  const m = /\*?(Melee or Ranged|Melee|Ranged) (?:Weapon |Spell )?Attack Roll/i.exec(desc ?? '')
  return m ? m[1] : null
}

/** The fence quotes some numbers and not others; either way it is one value. */
const scalar = (v: unknown): string | null =>
  typeof v === 'number' ? String(v) : typeof v === 'string' && v.trim() !== '' ? v.trim() : null

function entryList(v: unknown): Array<{ name?: string; desc?: string }> {
  if (!Array.isArray(v)) return []
  return v.filter((e): e is { name?: string; desc?: string } => !!e && typeof e === 'object')
}

/**
 * Tags are stripped, never rendered — `legendary_description` arrives wrapped in
 * a `<span>` for Fantasy Statblocks, and no path in this plugin renders HTML from
 * a file (see `Markdown`).
 */
const stripHtml = (text: string): string => text.replace(/<\/?[a-z][^>]*>/gi, '')
