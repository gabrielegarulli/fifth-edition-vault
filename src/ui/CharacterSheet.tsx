import type { ReactNode } from 'react'

import { fmtMod } from '../ddb/derive'
import type { Sheet, SheetAttack, SheetFeatureDie } from '../ddb/sheet'
import type { RollContext } from '../dice/atlas'
import { useAtlasReady } from '../dice/useRoll'
import { useElementWidth } from '../hooks/useElementWidth'
import type { RollTarget } from '../sheet/rollModes'
import type { WildShapeForm } from '../state/vitals'
import { PushButton } from './PushButton'
import { DamageValue, NoRolls, Rollable } from './Rollable'
import { SpellLink, useSpellIndex } from './SpellLink'

/**
 * The character sheet's sections, and the sheet a note's `charsheet` fence draws.
 *
 * Ported from `obsidian-vault-characters`' section 6 (MYDND-7), which drew the
 * same eight sections as plain DOM. The arithmetic was already done — **the
 * fence is the sheet**, and this reads it and nothing else, so hand-editing a
 * number in a note still works and still survives until the next re-sync.
 *
 * ## Two compositions, one set of sections (MYDND-44)
 *
 * The pane's sheet page arranges these sections into a pinned strip and tabs,
 * around the writes (`HpPanel`, `SpellPanel`, the inventory). A note's own
 * fence has none of that — no vitals, no tabs, nothing to scroll inside — so
 * `CharacterSheet` below stacks the same sections flat. Splitting the
 * *sections* rather than the page is what keeps the two from drifting apart.
 *
 * ## One look per kind of thing
 *
 * Every number a player rolls is a `Rollable` — the sheet's only accent. A
 * value you just read (AC, a DC, the proficiency bonus) is plain text with no
 * frame, because a framed tile reads as a control. Two decisions carried over
 * unchanged because they are decisions, not styling:
 *
 * - **A spell save DC is not rollable.** It is a number the *target* rolls
 *   against.
 * - **"No attacks found", not "no weapons".** A character can attack with a
 *   class feature and own nothing, which is true of both characters this was
 *   built against.
 */

/**
 * Where the six ability cards stop fitting in one row, and where the skill list
 * gains a second and third column.
 *
 * **Measured from the sheet, not from the window.** Tailwind's `sm:`/`md:` are
 * media queries against the *screen*, which is wide while this pane is 380px.
 * The pane is the viewport here, so the branch is made in React off a
 * `ResizeObserver`. Six cards need more room since the save moved into each
 * card, and the 16px floor sets how small a card can get.
 *
 * Since MYDND-53 a card is wide rather than tall — name and score beside a
 * mod/save pair — and its narrowest is about 165px: "STR" over the score, then
 * the dot, "save" and a two-digit chip, at the 16px floor. Six of those, their
 * gaps and the panel's padding make the one-row width; three make the other.
 */
export const ABILITIES_ONE_ROW = 1060
export const ABILITIES_THREE_COLUMNS = 560
export const SKILLS_TWO_COLUMNS = 420
export const SKILLS_THREE_COLUMNS = 760

/**
 * The narrowest a stat-grid cell gets before the grid falls back to rows of
 * three: "INITIATIVE", the longest label word that cannot wrap, at the 16px
 * floor, plus the cell's padding. Longer labels — "SPELL DC (CHA)" — wrap at
 * their spaces instead.
 */
export const STAT_CELL_MIN = 120

/** A small caps label over or beside a value. */
export const LABEL = 'text-smallest font-semibold uppercase tracking-wide text-faint'

/** Every attack roll is one target for the roll-mode markers (MYDND-45). */
export const ATTACK: RollTarget = { kind: 'attack' }

const ABILITY_NAMES: Record<string, string> = {
  STR: 'Strength',
  DEX: 'Dexterity',
  CON: 'Constitution',
  INT: 'Intelligence',
  WIS: 'Wisdom',
  CHA: 'Charisma',
}

export function abilityName(code: string): string {
  return ABILITY_NAMES[code.toUpperCase()] ?? code
}

export function rollContextOf(sheet: Sheet): RollContext {
  return { name: sheet.name, notePath: sheet.notePath }
}

/**
 * The fence: every section, stacked. Review draws the same stack (MYDND-155)
 * for a character not saved yet, so with `rolls` off, and hands it the Features
 * tab's list as `children`.
 */
export function CharacterSheet({
  sheet,
  rolls = true,
  children,
}: {
  sheet: Sheet
  rolls?: boolean
  children?: ReactNode
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>()

  const sections = (
    <div ref={ref} className="flex flex-col gap-4">
      <SheetHeader sheet={sheet} />
      <StatGrid sheet={sheet} width={width} showHitPoints />
      <AbilityCards sheet={sheet} width={width} />
      <Block title="Skills">
        <SkillList sheet={sheet} width={width} />
      </Block>
      <PassiveLine sheet={sheet} />
      <ActionList sheet={sheet} showHitDice />
      <SpellList sheet={sheet} />
      {children}
      {rolls ? <RollHint /> : null}
    </div>
  )
  return rolls ? sections : <NoRolls>{sections}</NoRolls>
}

/** A section: a bold heading, an optional hint on the right, and its body. */
export function Block({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <h4 className="m-0 text-smaller font-bold text-normal">{title}</h4>
        {hint ? <span className="ml-auto text-smallest text-faint">{hint}</span> : null}
      </div>
      {children}
    </section>
  )
}

/** The fence's portrait, name and class line. The pane draws its own in the strip. */
export function SheetHeader({ sheet }: { sheet: Sheet }) {
  const bits = [sheet.race, sheet.classes].filter(Boolean).join(' · ')
  return (
    <div className="flex items-center gap-3">
      <Avatar sheet={sheet} size="h-12 w-12" />
      <div className="min-w-0">
        <div className="truncate text-ui-larger font-bold text-normal">{sheet.name || 'Unnamed'}</div>
        {bits ? <div className="truncate text-smaller text-muted">{bits}</div> : null}
      </div>
    </div>
  )
}

/** The portrait, or the initials when there is none — the strip always has a face. */
export function Avatar({ sheet, size }: { sheet: Sheet; size: string }) {
  if (sheet.avatar) {
    return (
      <img
        src={sheet.avatar}
        alt=""
        className={`${size} shrink-0 rounded-full border border-background-modifier-border object-cover`}
      />
    )
  }
  const initials = (sheet.name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
  return (
    <span
      aria-hidden="true"
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-obs-base-30 font-bold text-normal`}
    >
      {initials}
    </span>
  )
}

/** One cell of the stat grid: a label over a value, which may be a roll. */
function StatCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1 bg-background-secondary px-2.5 py-2">
      <span className={LABEL}>{label}</span>
      <span className="font-mono text-ui-medium font-semibold tabular-nums text-normal">{children}</span>
    </div>
  )
}

/**
 * The six numbers read every turn. Initiative and spell attack roll; AC, speed,
 * the proficiency bonus and the save DC are only read, and look it — no frame,
 * no fill, no colour.
 *
 * `showHitPoints` is the fence's: the pane has `HpPanel` in its strip, and two
 * hit-point readouts where one is static is the one somebody would click.
 */
export function StatGrid({
  sheet,
  width,
  showHitPoints = false,
  form = null,
}: {
  sheet: Sheet
  width: number
  showHitPoints?: boolean
  /**
   * A Wild Shape form in play (MYDND-51): its AC and walking speed stand in for
   * the character's, as the web sheet's `applyWildShape` has it, and the cells
   * say so.
   */
  form?: WildShapeForm | null
}) {
  const character = rollContextOf(sheet)
  const hp = sheet.hp
  const hpText = showHitPoints && hp ? `${hp.current ?? '—'} / ${hp.max ?? '—'}` : null
  const ac = form?.ac ?? sheet.ac
  const speed = form?.walkSpeed ?? sheet.speed

  const cells: ReactNode[] = []
  if (typeof ac === 'number')
    cells.push(
      <StatCell key="ac" label={form?.ac != null ? `AC (${form.name})` : 'AC'}>
        {ac}
      </StatCell>,
    )
  if (hpText) {
    cells.push(
      <StatCell key="hp" label="Hit Points">
        {hp?.temp ? `${hpText} +${hp.temp}` : hpText}
      </StatCell>,
    )
  }
  if (typeof sheet.initiative === 'number') {
    cells.push(
      <StatCell key="init" label="Initiative">
        {/* Initiative is a Dexterity check (2024), so what changes one changes it. */}
        <Rollable
          value={fmtMod(sheet.initiative)}
          label="Initiative"
          character={character}
          rollType="initiative"
          target={{ kind: 'check', ability: 'DEX' }}
          what="initiative"
        />
      </StatCell>,
    )
  }
  if (typeof speed === 'number')
    cells.push(
      <StatCell key="speed" label={form?.walkSpeed != null ? `Speed (${form.name})` : 'Speed'}>
        {speed} ft
      </StatCell>,
    )
  if (typeof sheet.proficiency_bonus === 'number') {
    cells.push(
      <StatCell key="prof" label="Prof.">
        {fmtMod(sheet.proficiency_bonus)}
      </StatCell>,
    )
  }
  if (sheet.spellcasting) {
    // The DC is a number the *target* rolls against, so it is not rollable.
    cells.push(
      <StatCell key="dc" label={`Spell DC (${sheet.spellcasting.ability})`}>
        {sheet.spellcasting.dc}
      </StatCell>,
    )
    cells.push(
      <StatCell key="atk" label="Spell atk">
        <Rollable
          value={fmtMod(sheet.spellcasting.attack)}
          label="Spell attack"
          character={character}
          rollType="attack"
          target={ATTACK}
          what="attack rolls"
        />
      </StatCell>,
    )
  }
  if (cells.length === 0) return null

  // A hairline grid: the gap shows the border colour through, so the cells
  // read as one block rather than six framed tiles.
  //
  // One row whenever the cells fit (MYDND-53), as many columns as there are
  // cells — four without spellcasting, seven in the fence. A fixed six left
  // border-coloured holes in the first and wrapped the seventh.
  const columns = width >= cells.length * STAT_CELL_MIN ? 'grid-flow-col auto-cols-fr' : 'grid-cols-3'
  return (
    <div
      className={`grid ${columns} gap-px overflow-hidden rounded-obs-m border border-background-modifier-border bg-background-modifier-border`}
    >
      {cells}
    </div>
  )
}

export type Proficiency = 'none' | 'proficient' | 'expertise'

/**
 * Proficiency as a shape, not a colour: hollow, filled, or a filled diamond for
 * expertise. Sized to sit beside 16px text — the old ○ ● ◆ glyphs were the
 * smallest, faintest thing on the sheet, which is why a scan could not find
 * Arcana +14 among the +1s.
 */
export function ProfMark({ kind, title }: { kind: Proficiency; title?: string }) {
  const label = title ?? (kind === 'expertise' ? 'Expertise' : kind === 'proficient' ? 'Proficient' : 'Not proficient')
  if (kind === 'expertise') {
    return (
      <span role="img" aria-label={label} title={label} className="inline-block h-2 w-2 shrink-0 rotate-45 bg-normal" />
    )
  }
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={
        kind === 'proficient'
          ? 'inline-block h-2 w-2 shrink-0 rounded-full border border-normal bg-normal'
          : 'inline-block h-2 w-2 shrink-0 rounded-full border border-faint'
      }
    />
  )
}

/**
 * The six abilities, each with its save inside it — the web sheet's layout.
 * The name and score sit on the left; on the right the modifier rolls the
 * check and the save under it rolls the save (MYDND-53). That frees a whole
 * section, and proficiency is a filled dot and bold text instead of an accent
 * border.
 */
export function AbilityCards({ sheet, width }: { sheet: Sheet; width: number }) {
  if (!Array.isArray(sheet.abilities) || sheet.abilities.length === 0) return null
  const character = rollContextOf(sheet)
  const saves = new Map((Array.isArray(sheet.saves) ? sheet.saves : []).map(s => [s.label, s]))
  // `width === 0` is the first render, before the observer has measured. Two
  // columns is the safe guess: correct in a narrow pane, merely tall for one
  // frame in a wide one.
  const columns =
    width >= ABILITIES_ONE_ROW ? 'grid-cols-6' : width >= ABILITIES_THREE_COLUMNS ? 'grid-cols-3' : 'grid-cols-2'

  return (
    <div className={`grid gap-1.5 ${columns}`}>
      {sheet.abilities.map(a => {
        const save = saves.get(a.label)
        return (
          <div
            key={a.label}
            className="flex items-center justify-between gap-2 rounded-obs-m border border-background-modifier-border bg-background-secondary px-2 py-2"
          >
            <div className="flex flex-col items-start gap-0.5">
              <span className={LABEL}>{a.label}</span>
              <span className="font-mono text-ui-medium font-semibold tabular-nums text-normal">{a.score}</span>
            </div>
            {/* Three columns — the proficiency dot, the word, the chip — so the
                two chips line up whether or not the save has a dot. */}
            <div className="grid grid-cols-[auto_auto_auto] items-center gap-x-1 gap-y-1">
              <span />
              <span className="justify-self-end text-smallest text-muted">mod</span>
              <Rollable
                value={fmtMod(a.mod)}
                label={`${a.label} check`}
                character={character}
                rollType="check"
                target={{ kind: 'check', ability: a.label }}
                what={`${abilityName(a.label)} checks`}
              />
              {save ? (
                <>
                  <span className="flex" title={save.proficient ? 'Proficient in this save' : 'Saving throw'}>
                    <ProfMark kind={save.proficient ? 'proficient' : 'none'} />
                  </span>
                  <span
                    className={`justify-self-end text-smallest ${save.proficient ? 'font-semibold text-normal' : 'text-muted'}`}
                  >
                    save
                  </span>
                  <Rollable
                    value={fmtMod(save.total)}
                    label={`${save.label} save`}
                    character={character}
                    rollType="save"
                    target={{ kind: 'save', ability: save.label }}
                    what={`${abilityName(save.label)} saves`}
                  />
                </>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const SKILL_RANK: Record<Proficiency, number> = { expertise: 0, proficient: 1, none: 2 }

/**
 * Skills, the proficient ones first and in bold, the rest dimmed — so the
 * numbers a character is built around are the ones the eye lands on.
 */
export function SkillList({ sheet, width }: { sheet: Sheet; width: number }) {
  if (!Array.isArray(sheet.skills) || sheet.skills.length === 0) return null
  const character = rollContextOf(sheet)
  const columns =
    width >= SKILLS_THREE_COLUMNS ? 'grid-cols-3' : width >= SKILLS_TWO_COLUMNS ? 'grid-cols-2' : 'grid-cols-1'
  const kindOf = (s: { proficient: boolean; expertise: boolean }): Proficiency =>
    s.expertise ? 'expertise' : s.proficient ? 'proficient' : 'none'
  const ordered = [...sheet.skills].sort(
    (a, b) => SKILL_RANK[kindOf(a)] - SKILL_RANK[kindOf(b)] || a.name.localeCompare(b.name),
  )

  return (
    <div className={`grid gap-x-4 ${columns}`}>
      {ordered.map(s => {
        const kind = kindOf(s)
        return (
          <div key={s.name} className="flex items-center gap-2 border-b border-background-modifier-border py-1">
            <ProfMark kind={kind} />
            {/* Just the skill name — the ability is implied by context on a sheet. */}
            <span className={`min-w-0 flex-1 truncate ${kind === 'none' ? 'text-faint' : 'font-semibold text-normal'}`}>
              {s.name}
            </span>
            {/* A skill check is an ability check, so it inherits the ability's mode. */}
            <Rollable
              value={fmtMod(s.total)}
              label={s.name}
              character={character}
              rollType="check"
              target={{ kind: 'check', ability: (s.ability ?? '').toUpperCase() }}
              what={`${s.name} checks`}
            />
          </div>
        )
      })}
    </div>
  )
}

/** Passive scores: read by the GM, never rolled, so one quiet line. */
export function PassiveLine({ sheet }: { sheet: Sheet }) {
  const p = sheet.passives
  if (!p) return null
  const items = (
    [
      ['Perception', p.perception],
      ['Insight', p.insight],
      ['Investigation', p.investigation],
    ] as [string, number | undefined][]
  ).filter((c): c is [string, number] => typeof c[1] === 'number')
  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className={LABEL}>Passive</span>
      {items.map(([label, value]) => (
        <span key={label} className="flex items-baseline gap-1 text-muted">
          <span>{label}</span>
          <span className="font-mono font-semibold tabular-nums text-normal">{value}</span>
        </span>
      ))}
    </div>
  )
}

/** The action-economy groups, in the order a turn spends them. */
const KINDS = ['Action', 'Bonus action', 'Reaction', 'Other'] as const
type Kind = (typeof KINDS)[number]

/** Each group's section heading (MYDND-53). */
const KIND_TITLE: Record<Kind, string> = {
  Action: 'Actions',
  'Bonus action': 'Bonus actions',
  Reaction: 'Reactions',
  Other: 'Other',
}

/**
 * Which group a row belongs in. A weapon from the inventory with no activation
 * is an attack, and an attack is an Action; a feature with none is something
 * that rides on another roll — Sneak Attack — and goes under Other.
 */
export function kindOf(activation: string | null | undefined, fromItem: boolean): Kind {
  const a = (activation ?? '').trim().toLowerCase()
  if (a === 'action' || a === '1 action') return 'Action'
  if (a.startsWith('bonus')) return 'Bonus action'
  if (a.startsWith('reaction')) return 'Reaction'
  if (!a && fromItem) return 'Action'
  return 'Other'
}

const ROW =
  'flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-background-modifier-border px-2.5 py-1.5 last:border-b-0'

/** An action row's extra cells — `MYDND-47` hangs a resource's Use button here. */
export type ActionExtra = (row: {
  name: string
  kind: Kind
  formula: string | null
  rollType?: string
  damageType?: string | null
}) => ReactNode

/**
 * Attacks and feature dice, grouped by what they cost: Action, Bonus action,
 * Reaction. What distinguishes a Soulknife's two Psychic Blades entries is the
 * action each costs, and the group heading now says it for every row at once.
 *
 * **Each group is its own section** (MYDND-53): a `Block` heading and a card,
 * not a sub-label inside one "Actions" card. So this renders the sections
 * itself, and a caller places it where a `Block` would go rather than inside
 * one. A group with nothing in it is not drawn — except Actions when there are
 * no attacks, which says so.
 */
export function ActionList({
  sheet,
  showHitDice = false,
  extra,
}: {
  sheet: Sheet
  /** The fence lists hit dice here; the pane has them under Resources. */
  showHitDice?: boolean
  extra?: ActionExtra
}) {
  const attacks = Array.isArray(sheet.attacks) ? sheet.attacks : []
  const featureDice = Array.isArray(sheet.feature_dice) ? sheet.feature_dice : []
  const hitDice = showHitDice && Array.isArray(sheet.hit_dice) ? sheet.hit_dice : []
  const character = rollContextOf(sheet)

  const groups = new Map<Kind, ReactNode[]>(KINDS.map(k => [k, []]))
  attacks.forEach((a, i) => {
    const kind = kindOf(a.activation, a.source === 'item')
    groups
      .get(kind)
      ?.push(
        <AttackRow
          key={`a-${a.name}-${i}`}
          attack={a}
          character={character}
          extra={extra?.({ name: a.name, kind, formula: a.damage, rollType: 'damage', damageType: a.damageType })}
        />,
      )
  })
  featureDice.forEach((f, i) => {
    const kind = kindOf(f.activation, false)
    groups
      .get(kind)
      ?.push(
        <FeatureDieRow
          key={`f-${f.name}-${i}`}
          die={f}
          character={character}
          extra={extra?.({ name: f.name, kind, formula: f.formula })}
        />,
      )
  })
  hitDice.forEach(hd => {
    groups.get('Other')?.push(
      <div key={`h-${hd.label}`} className={ROW}>
        <span className="flex-1 text-normal">Hit Dice ({hd.label})</span>
        <Rollable value={hd.formula} label={`${hd.label} hit dice`} character={character} />
      </div>,
    )
  })

  return (
    <>
      {KINDS.map(kind => {
        const rows = groups.get(kind) ?? []
        const noAttacks = kind === 'Action' && attacks.length === 0
        if (rows.length === 0 && !noAttacks) return null
        return (
          <Block key={kind} title={KIND_TITLE[kind]}>
            {/* Not "no weapons" — a character can attack with a feature and own nothing. */}
            {noAttacks ? <div className="text-smaller text-faint">No attacks found.</div> : null}
            {rows.length > 0 ? <div className="panel-container bg-background-secondary">{rows}</div> : null}
          </Block>
        )
      })}
    </>
  )
}

function AttackRow({
  attack: a,
  character,
  extra,
}: {
  attack: SheetAttack
  character: RollContext
  extra?: ReactNode
}) {
  return (
    <div className={ROW}>
      <span className={`min-w-0 flex-1 ${a.equipped ? 'font-medium text-normal' : 'text-muted'}`}>
        {a.name}
        {a.range ? <span className="text-smallest text-faint"> · {a.range}</span> : null}
      </span>
      {typeof a.attack === 'number' ? (
        <span className="flex items-center gap-1">
          <span className={LABEL}>hit</span>
          <Rollable
            value={fmtMod(a.attack)}
            label={`${a.name} attack`}
            character={character}
            rollType="attack"
            target={ATTACK}
            what="attack rolls"
          />
        </span>
      ) : null}
      {a.damage ? (
        <span className="flex items-center gap-1">
          <span className={LABEL}>dmg</span>
          <DamageValue damage={a.damage} damageType={a.damageType} label={a.name} character={character} />
        </span>
      ) : null}
      {a.push ? <PushButton weapon={a.name} feet={a.push} character={character} /> : null}
      {extra}
    </div>
  )
}

function FeatureDieRow({
  die: f,
  character,
  extra,
}: {
  die: SheetFeatureDie
  character: RollContext
  extra?: ReactNode
}) {
  return (
    <div className={ROW}>
      <span className="min-w-0 flex-1 text-normal">{f.name}</span>
      <Rollable value={f.formula} label={f.name} character={character} />
      {extra}
    </div>
  )
}

/**
 * The spells as the fence lists them, each name a link to its note (MYDND-36).
 * Read-only — this is what a note's own `charsheet` block draws; the pane's
 * Spells tab is `SpellPanel`.
 */
export function SpellList({ sheet }: { sheet: Sheet }) {
  const index = useSpellIndex()
  const groups = Array.isArray(sheet.spells) ? sheet.spells : []
  if (groups.length === 0) return null

  return (
    <Block title="Spells Known">
      {groups.map(g => (
        <div key={g.level} className="flex gap-2 py-0.5">
          <span className="w-24 shrink-0 font-medium text-muted">
            {g.level === 0 ? 'Cantrips' : `Level ${g.level}`}
          </span>
          <span className="flex min-w-0 flex-1 flex-wrap gap-x-2 gap-y-1 text-normal">
            {(g.spells || []).map((name, i) => (
              <SpellLink key={`${name}-${i}`} name={name} row={index?.find(name) ?? null} />
            ))}
          </span>
        </div>
      ))}
    </Block>
  )
}

/** Where rolls go, and what the modifier keys do — or that there is nowhere yet. */
export function RollHint() {
  const atlasReady = useAtlasReady()
  return (
    <p className={atlasReady ? 'text-smallest text-faint' : 'text-smallest text-warning'}>
      {atlasReady
        ? 'Click a number to roll it in the open Atlas scene. Shift = advantage, Alt = disadvantage.'
        : 'No Atlas VTT scene open — rolls have nowhere to go yet.'}
    </p>
  )
}
