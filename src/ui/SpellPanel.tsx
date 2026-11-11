import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Notice } from 'obsidian'

import { preparedIdSet } from '@vault/derive/spellbook.js'
import { LEVEL_LABEL } from '@vault/derive/spellUtils.js'

import { useContent } from '../ContentContext'
import type { ClassFence, SubclassFence } from '../content/classes'
import type { SpellRow } from '../content/spells'
import type { Sheet, SheetFreeCast, SheetGrantedSpell } from '../ddb/sheet'
import { useCatalogRows } from '../hooks/useVaultGeneration'
import { useDetails } from '../hooks/useDetails'
import type { SpellSlotActions } from '../hooks/useVitals'
import {
  addSpell,
  bookCapacity,
  casterCaps,
  castingClasses,
  characterSpells,
  removeSpell,
  setSpellPrepared,
  type CharacterSpells,
} from '../spells/characterSpells'
import { highestRank, MAX_RANK, slotTable } from '../spells/slots'
import { isLocalId } from '../state/characters'
import type { Vitals } from '../state/vitals'
import { useStateHost } from '../StateContext'
import type { VaultCharacterJson } from '../vaultCharacter/fence'
import { spellDamageBonus, spellPushFeet, spellRoll } from '../spells/spellDice'
import { CastButton, castOptions, type CastOption } from './CastButton'
import { Block, LABEL } from './CharacterSheet'
import { Rollable } from './Rollable'
import { Icon } from './Icon'
import { SpellLink, useSpellIndex, type SpellIndex } from './SpellLink'

/**
 * The sheet's spells: slots, the spell list, and — for a Vault character —
 * adding, removing and preparing (MYDND-36).
 *
 * Ported in *intent* from `the-vault`'s `SpellPanel.jsx` and `DdbSpellPanel.jsx`,
 * the way `HpPanel` was: the rules are `@vault/derive`'s, the layout is a strip
 * in a pane that is sometimes 380px wide.
 *
 * ## Three files, three owners
 *
 * - **Slot maxima** are the charsheet fence's (`spell_slots`), projected from the
 *   classes. A number of the sheet, like max hit points.
 * - **Slots spent** are `vault-vitals`' (`spell_slots_used`): play state, which a
 *   re-sync must not reset — the reason that fence exists.
 * - **The spell list** of a Vault character is its `vault-character` fence. An
 *   edit reads the note, changes `spells`, and goes through
 *   `saveVaultCharacter`, which re-projects the charsheet in the same write —
 *   so the list is never edited in the charsheet, where a rebuild would erase it.
 *
 * ## A D&D Beyond character's list is D&D Beyond's
 *
 * It gets slots and links, and no editing: a re-sync replaces the charsheet's
 * spell list wholesale, so an edit made here would be silently undone. Exactly
 * the web app's `DdbSpellPanel`, which has no add or remove either.
 *
 * ## What it does not do
 *
 * - **One DC for every spell.** The sheet carries one spellcasting line (ADR 0007,
 *   decision 5); a Cleric/Wizard's second DC is a gap, not a wrong number.
 * - **No armour-proficiency block on casting** (`VAULT-154`) — the sheet does not
 *   carry the armour penalty that would drive it.
 */

export interface SpellPanelProps {
  sheet: Sheet
  notePath: string
  vitals: Vitals
  actions: SpellSlotActions
  busy: boolean
  /** The vault generation, so a Vault character's list is re-read after a write. */
  generation: number
}

// `last:rounded-b-obs-m`: the level card does not clip (MYDND-55), so the
// concentration wash on a last row rounds its own corners.
const ROW =
  'flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-background-modifier-border px-2.5 py-1.5 last:rounded-b-obs-m last:border-b-0'
const PLAIN_BUTTON = 'h-auto border-none bg-transparent p-0 shadow-none'

const ORDINAL = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th']

/**
 * Whether a character has anything for this panel to show. A character with
 * nothing to cast and no way to cast it has no Spells tab, the way the web
 * sheet hides its Spells tab from a Fighter.
 */
export function hasSpellPanel(sheet: Sheet): boolean {
  const listed = (sheet.spells ?? []).some(g => (g.spells ?? []).length > 0)
  const slots = slotTable(sheet)
  const hasSlots = !!slots && highestRank(slots.max) > 0
  return (
    !!sheet.spellcasting ||
    listed ||
    hasSlots ||
    (sheet.granted_spells ?? []).length > 0 ||
    (sheet.free_cast_spells ?? []).length > 0
  )
}

export function SpellPanel(props: SpellPanelProps) {
  const { sheet } = props
  const isVault = isLocalId(sheet.ddb_id)
  // A Savant's free book spells (MYDND-183) are listed in the Vault editor's
  // spellbook, preparable; everywhere else they are a granted group.
  const granted = (sheet.granted_spells ?? []).filter(g => !isVault || g.mode !== 'spellbook')
  const free = sheet.free_cast_spells ?? []

  if (!hasSpellPanel(sheet)) return null

  // The DC and spell attack are in the play strip on this tab, so the panel
  // opens on the slots rather than repeating them (MYDND-53).
  return (
    <div className="flex flex-col gap-4">
      <SlotTiles {...props} />
      {isVault ? <VaultSpells {...props} /> : <SheetSpells {...props} />}

      <GrantedSpells granted={granted} props={props} />
      <FreeCasts free={free} {...props} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------

/**
 * One pip per slot: filled is available, hollow is spent. Clicking a filled pip
 * spends one, a hollow one gives one back — the web panel's `SlotPip` rule, and
 * why refunding is never disabled: it corrects a click.
 *
 * Drawn in the text colour, not the accent (MYDND-44): the accent is for rolls,
 * and a pip is a control with a hover and a pointer, which the old ● glyphs in
 * the accent never said. Exported for the class resources (MYDND-47), which
 * spend the same way.
 */
export function Pips({
  max,
  used,
  label,
  busy,
  onSpend,
  onRefund,
  showCount = true,
}: {
  max: number
  used: number
  label: string
  busy: boolean
  onSpend(): void
  onRefund(): void
  /** The `3/4` after the pips. A slot tile leaves it to the level card. */
  showCount?: boolean
}) {
  const spent = Math.min(used, max)
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="flex flex-wrap items-center">
        {Array.from({ length: max }, (_, i) => {
          // Available ones first, so the row empties from the right as it is spent.
          const isSpent = i >= max - spent
          return (
            <button
              key={i}
              type="button"
              disabled={busy}
              aria-label={isSpent ? `Recover a ${label}` : `Spend a ${label}`}
              title={isSpent ? `Recover a ${label}` : `Spend a ${label}`}
              aria-pressed={isSpent}
              className={isSpent ? 'pip-spent' : 'pip'}
              onClick={isSpent ? onRefund : onSpend}
            />
          )
        })}
      </span>
      {showCount ? (
        <span className="font-mono text-smallest tabular-nums text-muted">
          {max - spent}/{max}
        </span>
      ) : null}
    </span>
  )
}

/**
 * Every slot the character has, one tile per rank, above the spell list
 * (MYDND-53). The pips used to sit in each rank's heading, which spread the one
 * thing read before casting across the whole tab; here they are one glance, and
 * each level card says how many of its own are left.
 */
function SlotTiles(props: SpellPanelProps) {
  const max = slotTable(props.sheet)?.max ?? []
  const ranks = max.map((m, i) => ({ rank: i + 1, max: m })).filter(r => r.max > 0)
  if (ranks.length === 0) return null
  return (
    <Block title="Slots" hint="filled = available">
      <div className="flex flex-wrap gap-1.5">
        {ranks.map(({ rank, max: m }) => (
          <div
            key={rank}
            className="flex flex-col gap-1.5 rounded-obs-m border border-background-modifier-border bg-background-secondary px-2.5 py-1.5"
          >
            <span className={`${LABEL} font-mono`}>{ORDINAL[rank]}</span>
            <Pips
              max={m}
              used={props.vitals.spellSlotsUsed[String(rank)] ?? 0}
              label={`${LEVEL_LABEL(rank) as string} slot`}
              busy={props.busy}
              onSpend={() => props.actions.spendSlot(rank, m)}
              onRefund={() => props.actions.refundSlot(rank)}
              showCount={false}
            />
          </div>
        ))}
      </div>
    </Block>
  )
}

/** "3 of 4 left" — what a level card says about its own slots. */
function slotsLeft(props: SpellPanelProps, rank: number): string {
  const max = slotTable(props.sheet)?.max?.[rank - 1] ?? 0
  if (max === 0) return 'no slots'
  const used = Math.min(props.vitals.spellSlotsUsed[String(rank)] ?? 0, max)
  return `${max - used} of ${max} left`
}

/**
 * One level of spells as a card (MYDND-53): the title and how many slots are
 * left in the card's own header, then a row per spell. `action` is the header's
 * right-hand end — a Vault character's + Add.
 */
function LevelCard({
  title,
  sub,
  action,
  children,
}: {
  title: string
  sub?: string
  action?: ReactNode
  children: ReactNode
}) {
  // The frame of `.panel-container` without its `overflow-hidden` (MYDND-55):
  // a row's ▾ cast menu opens downward out of the card, and a clipping card cut
  // it off at its bottom edge. The rows round their own last corners instead.
  return (
    <section
      className="rounded-obs-m border border-background-modifier-border bg-background-secondary"
      aria-label={title}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-background-modifier-border px-2.5 py-2">
        <h4 className="m-0 text-smaller font-bold text-normal">{title}</h4>
        {sub ? <span className="font-mono text-smaller text-muted">{sub}</span> : null}
        <span className="flex-1" />
        {action}
      </div>
      {children}
    </section>
  )
}

/** A line inside a level card that is not a spell — "None known.", a warning. */
function CardNote({ children }: { children: ReactNode }) {
  return <div className="px-2.5 py-1.5 text-smaller italic text-faint">{children}</div>
}

// ---------------------------------------------------------------------------
// A spell row
// ---------------------------------------------------------------------------

/**
 * `1 reaction` → `reaction`, `1 bonus` → `bonus action`, `60 feet` → `60 ft`:
 * the row's right-hand end is read at a glance, so it says the short thing
 * (MYDND-53). The exporter writes a bonus action as `1 bonus` on 120 notes.
 */
export function shortCastingTime(t: string | null): string | null {
  if (!t) return null
  const s = t.trim()
  if (/^1 reaction\b/i.test(s)) return 'reaction'
  if (/^1 bonus\b/i.test(s)) return 'bonus action'
  return s
}

export function shortRange(r: string | null): string | null {
  return r ? r.trim().replace(/\b(\d+)\s*feet\b/i, '$1 ft').replace(/\b(\d+)\s*miles?\b/i, '$1 mi') : null
}

/** Concentration, ritual, and how it is cast — off the note's frontmatter, so free. */
function SpellMeta({ row }: { row: SpellRow | null }) {
  if (!row) return null
  const bits = [shortCastingTime(row.castingTime), shortRange(row.range)].filter(Boolean).join(' · ')
  return (
    <>
      {row.concentration ? (
        <span className="badge" title="Concentration">
          C
        </span>
      ) : null}
      {row.ritual ? (
        <span className="badge" title="Ritual">
          R
        </span>
      ) : null}
      {bits ? <span className="font-mono text-smaller text-muted">{bits}</span> : null}
    </>
  )
}

function SpellLine({
  name,
  row,
  dim = false,
  cast,
  dice,
  concentrating = false,
  children,
}: {
  name: string
  row: SpellRow | null
  /** An unprepared spell in a book: listed, but not ready to cast. */
  dim?: boolean
  /** The row's Cast control, first on the row — the verb (MYDND-46). */
  cast?: ReactNode
  /** What it rolls at its own rank, as a roll — Fireball's 8d6 (MYDND-49). */
  dice?: ReactNode
  /** This is the spell being concentrated on now. */
  concentrating?: boolean
  children?: ReactNode
}) {
  // Cast and the name on the left; everything read about the spell on the
  // right (MYDND-53). The concentration row is washed in amber from the left.
  return (
    <div
      className={`${ROW} ${dim ? 'opacity-60' : ''} ${concentrating ? 'bg-linear-to-r from-obs-yellow/15 to-transparent' : ''}`}
    >
      {cast}
      <SpellLink name={name} row={row} />
      <span className="ml-auto flex flex-wrap items-center justify-end gap-2">
        {concentrating ? <span className="text-smallest text-obs-yellow">concentrating</span> : null}
        <SpellMeta row={row} />
        {dice}
        {children}
      </span>
    </div>
  )
}

/**
 * The Cast control for one row, wired to this character's slots (MYDND-46).
 * `level` is the spell's own level — the rank heading it sits under for a D&D
 * Beyond list, the pick's or the note's for a Vault one.
 */
function castFor(
  props: SpellPanelProps,
  name: string,
  row: SpellRow | null,
  level: number,
  prepared = true,
  ritualAllowed = true,
): { cast: ReactNode; dice: ReactNode } {
  const { sheet } = props
  const max = slotTable(sheet)?.max ?? Array.from({ length: MAX_RANK }, () => 0)
  const characterLevel = sheet.level ?? 1
  const spellMod = sheet.spellcasting?.mod ?? 0
  const damageBonus = spellDamageBonus(sheet.spell_damage_bonuses, name, row?.id)
  const options = castOptions({
    name,
    level,
    concentration: !!row?.concentration,
    ritual: !!row?.ritual && ritualAllowed,
    prepared,
    max,
    used: props.vitals.spellSlotsUsed,
    row,
    characterLevel,
    spellMod,
    damageBonus,
  })
  const character = { name: sheet.name, notePath: props.notePath }
  // The roll at the spell's own rank, shown on the row whether or not a slot is
  // left: it is what the spell does, and rolling it without casting is allowed.
  const base = row ? spellRoll({ ...row, level }, { rank: level, characterLevel, spellMod, damageBonus }) : null
  return {
    cast: (
      <CastButton
        name={name}
        options={options}
        busy={props.busy}
        onCast={props.actions.cast}
        character={character}
        range={row?.range}
        pushFeet={spellPushFeet(sheet.spell_pushes, name, row?.id)}
        attack={sheet.spellcasting ? { bonus: sheet.spellcasting.attack, characterLevel } : null}
        noneLeft={`No ${LEVEL_LABEL(level) as string} slot or higher left`}
      />
    ),
    dice: base ? (
      <Rollable
        value={base.formula}
        label={`${name} ${base.kind === 'heal' ? 'healing' : 'damage'}`}
        character={character}
        rollType={base.kind === 'damage' ? 'damage' : null}
        damageType={base.damageType}
      />
    ) : null,
  }
}

// ---------------------------------------------------------------------------
// D&D Beyond: the sheet's list, slots, links
// ---------------------------------------------------------------------------

/**
 * The spell list as the charsheet fence states it, under slot pips.
 *
 * Also what a Vault character shows for the moment its own note is being read,
 * so the panel does not blink empty on every write.
 */
function SheetSpells(props: SpellPanelProps) {
  const { sheet } = props
  const index = useSpellIndex()
  const slots = slotTable(sheet)
  const max = slots?.max ?? Array.from({ length: MAX_RANK }, () => 0)
  const groups = new Map((sheet.spells ?? []).map(g => [g.level, g.spells ?? []]))
  const top = Math.max(highestRank(max), ...[...groups.keys()].filter(l => l > 0))

  // A level with no spells gets no card: its slots are in the tiles above, and
  // they are spent by upcasting from a lower card.
  return (
    <>
      <SpellGroup level={0} names={groups.get(0) ?? []} index={index} props={props} />
      {Array.from({ length: top }, (_, i) => i + 1).map(rank => (
        <SpellGroup key={rank} level={rank} names={groups.get(rank) ?? []} index={index} props={props} />
      ))}
    </>
  )
}

function SpellGroup({
  level,
  names,
  index,
  props,
}: {
  level: number
  names: string[]
  index: SpellIndex | null
  props: SpellPanelProps
}) {
  if (names.length === 0) return null
  return (
    <LevelCard
      title={level === 0 ? 'Cantrips' : (LEVEL_LABEL(level) as string)}
      sub={level === 0 ? 'at will' : slotsLeft(props, level)}
    >
      {names.map(name => {
        const row = index?.find(name) ?? null
        return (
          <SpellLine
            key={name}
            name={name}
            row={row}
            {...castFor(props, name, row, level)}
            concentrating={props.vitals.concentration === name}
          />
        )
      })}
    </LevelCard>
  )
}

// ---------------------------------------------------------------------------
// Vault characters: the json's list, caps, editing
// ---------------------------------------------------------------------------

type Loaded = { key: string; json: VaultCharacterJson | null; error: string | null }

function VaultSpells(props: SpellPanelProps) {
  const { notePath, generation } = props
  const { state } = useStateHost()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const key = `${notePath}:${generation}`

  // Re-read on every generation: a write here comes back as a vault change, and
  // that is what redraws the list — no copy of it is kept in React (ADR 0003).
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const json = await state.characters.readVaultCharacter(notePath)
        if (!cancelled) setLoaded({ key, json, error: null })
      } catch (err) {
        if (!cancelled) setLoaded({ key, json: null, error: err instanceof Error ? err.message : String(err) })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [state, notePath, key])

  // The last answer stays up while the next generation is read, so a write does
  // not flash the read-only list in between.
  if (!loaded) return <SheetSpells {...props} />
  if (!loaded.json) {
    return (
      <>
        <p className="text-smaller text-error">Spells cannot be edited: {loaded.error}</p>
        <SheetSpells {...props} />
      </>
    )
  }
  return <VaultSpellEditor {...props} json={loaded.json} />
}

/** Which add-picker is open: a rank, or 0 for cantrips. */
type Picking = number | null

/** A spell in the book: written by a level, or free from a feature (`freeFrom`, MYDND-183). */
interface BookSpell {
  id: string
  name: string
  level?: number
  freeFrom: string | null
}

function VaultSpellEditor(props: SpellPanelProps & { json: VaultCharacterJson }) {
  const { sheet, notePath, json } = props
  const content = useContent()
  const { state, saveVaultCharacter, rebuildVaultCharacter } = useStateHost()
  const index = useSpellIndex()
  const [picking, setPicking] = useState<Picking>(null)
  const [writing, setWriting] = useState(false)

  const classes = castingClasses(json)
  const classIds = classes.map(c => c.id).filter((id): id is string => !!id)
  const { details, loading } = useDetails(content.classes, classIds)
  const fences = useMemo(() => {
    const out = new Map<string, ClassFence | null>()
    for (const [id, d] of details) out.set(id, d?.fence ?? null)
    return out
  }, [details])
  // An Eldritch Knight's caps are on its subclass's note (MYDND-182).
  const subclassIds = classes.map(c => c.subclass?.id).filter((id): id is string => !!id)
  const { details: subDetails, loading: subLoading } = useDetails(content.subclasses, subclassIds)
  const subclassFences = useMemo(() => {
    const out = new Map<string, SubclassFence | null>()
    for (const [id, d] of subDetails) out.set(id, (d?.fence as SubclassFence | undefined) ?? null)
    return out
  }, [subDetails])
  const casters = useMemo(() => casterCaps(json, fences, subclassFences), [json, fences, subclassFences])

  const spells: CharacterSpells = characterSpells(json)
  // Summed class by class, the multiclass rule. A class whose note is missing
  // contributes no cap — and with no class note at all there is no table to
  // claim a cap from, so nothing is capped rather than everything being blocked.
  const capped = casters.length > 0
  const cantripCap = capped
    ? casters.reduce((sum, c) => sum + c.cantripCap, 0) + (sheet.bonus_cantrips ?? 0)
    : Infinity
  const spellsCap = capped ? casters.reduce((sum, c) => sum + c.spellsCap, 0) : Infinity

  const bookCaster = casters.find(c => c.spellbook) ?? null
  const spellbook = bookCaster?.spellbook ?? null
  const capacity = bookCapacity(bookCaster)
  const preparedIds = preparedIdSet(spells, !!spellbook) as Set<string>

  const slots = slotTable(sheet)
  const max = slots?.max ?? Array.from({ length: MAX_RANK }, () => 0)
  const levelOf = (s: { id: string; name: string; level?: number }): number =>
    typeof s.level === 'number' ? s.level : (index?.find(s.name, s.id)?.level ?? 1)
  // Written into the book by a feature, not by a level (MYDND-183): a Savant's
  // free picks. Listed with the rest and prepared like them, never removed here —
  // the builder's answer is what holds them.
  const freeBook: BookSpell[] = (sheet.granted_spells ?? [])
    .filter(g => g.mode === 'spellbook')
    .map(g => {
      const row = index?.find(g.name, g.id) ?? null
      return { id: g.id ?? row?.id ?? g.name, name: g.name, level: row?.level, freeFrom: g.source ?? 'a feature' }
    })
  const book: BookSpell[] = [...spells.known.map(s => ({ ...s, freeFrom: null })), ...freeBook]
  const preparedCount = book.filter(s => preparedIds.has(s.id)).length
  const preparedFull = Number.isFinite(spellsCap) && preparedCount >= spellsCap
  const knownByRank = new Map<number, BookSpell[]>()
  for (const s of book) {
    const lvl = Math.max(1, levelOf(s))
    knownByRank.set(lvl, [...(knownByRank.get(lvl) ?? []), s])
  }
  const top = Math.max(highestRank(max), ...knownByRank.keys())
  const canAddCantrip = spells.cantrips.length < cantripCap
  const canAddSpell = !!spellbook || spells.known.length < spellsCap

  const busy = props.busy || writing

  /**
   * One edit: read the note fresh, change its `spells`, save. Read here rather
   * than from `json` above so an edit never writes back a list another write has
   * since changed. `saveVaultCharacter` puts its own failure on screen.
   */
  const edit = (change: (j: VaultCharacterJson) => VaultCharacterJson): void => {
    if (busy) return
    setWriting(true)
    void (async () => {
      try {
        const current = await state.characters.readVaultCharacter(notePath)
        await saveVaultCharacter(change(current), notePath)
      } catch (err) {
        new Notice(`Could not change ${notePath}'s spells: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setWriting(false)
      }
    })()
  }

  const add = (row: SpellRow): void => {
    edit(j => addSpell(j, { id: row.id, name: row.name, source: row.source, level: row.level }))
    setPicking(null)
  }

  const known = new Set([...spells.cantrips, ...book].map(s => s.id))

  return (
    <>
      {!slots ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-smaller text-warning">
            This sheet was projected before it counted spell slots.
          </span>
          <button type="button" disabled={busy} onClick={() => void rebuildVaultCharacter(notePath)}>
            Rebuild sheet
          </button>
        </div>
      ) : null}
      {!loading && !subLoading && !capped && classes.length > 0 ? (
        <p className="text-smallest text-warning">
          No class note found for {classes.map(c => c.name ?? c.id).join(', ')} — spell counts are not capped.
        </p>
      ) : null}

      <LevelCard
        title="Cantrips"
        sub={Number.isFinite(cantripCap) ? `at will · ${spells.cantrips.length} of ${cantripCap} known` : 'at will'}
        action={
          canAddCantrip ? (
            <AddButton open={picking === 0} busy={busy} onToggle={() => setPicking(p => (p === 0 ? null : 0))} />
          ) : null
        }
      >
        {picking === 0 ? (
          <AddPicker
            level={0}
            classNames={classes.map(c => c.name ?? '').filter(Boolean)}
            known={known}
            busy={busy}
            onAdd={add}
          />
        ) : null}
        {spells.cantrips.length === 0 ? <CardNote>None known.</CardNote> : null}
        {spells.cantrips.map(s => {
          const row = index?.find(s.name, s.id) ?? null
          return (
            <SpellLine
              key={s.id}
              name={s.name}
              row={row}
              {...castFor(props, s.name, row, 0)}
              concentrating={props.vitals.concentration === s.name}
            >
              <RemoveButton name={s.name} busy={busy} onRemove={() => edit(j => removeSpell(j, 'cantrips', s.id))} />
            </SpellLine>
          )
        })}
      </LevelCard>

      {spellbook ? (
        <div className="flex flex-wrap items-center gap-2 rounded-obs-m bg-background-secondary px-2 py-1">
          <span className="text-smaller font-semibold text-normal">Spellbook</span>
          <span className="text-smallest text-muted">
            {book.length} written{capacity !== null ? ` · ${capacity} from levelling` : ''}
            {freeBook.length > 0 ? ` · ${freeBook.length} free` : ''}
          </span>
          <span className="flex-1" />
          <span className={`text-smallest ${preparedFull ? 'text-warning' : 'text-muted'}`}>
            Prepared {preparedCount}
            {Number.isFinite(spellsCap) ? `/${spellsCap}` : ''}
          </span>
        </div>
      ) : Number.isFinite(spellsCap) ? (
        <span className="text-smallest text-muted">
          Prepared spells {spells.known.length}/{spellsCap}
        </span>
      ) : null}

      {top === 0 ? <span className="text-smaller italic text-faint">No spell slots yet.</span> : null}

      {Array.from({ length: top }, (_, i) => i + 1).map(rank => {
        // Adding is offered up to the highest rank with a slot, which is the
        // web panel's rule: you learn spells you can cast.
        const addable = canAddSpell && rank <= highestRank(max)
        const listed = knownByRank.get(rank) ?? []
        return (
          <LevelCard
            key={rank}
            title={LEVEL_LABEL(rank) as string}
            sub={slotsLeft(props, rank)}
            action={
              addable ? (
                <AddButton
                  open={picking === rank}
                  busy={busy}
                  label={spellbook ? 'Add to book' : 'Add'}
                  onToggle={() => setPicking(p => (p === rank ? null : rank))}
                />
              ) : null
            }
          >
            {listed.length === 0 && picking !== rank ? <CardNote>None yet.</CardNote> : null}
            {picking === rank ? (
              <AddPicker
                level={rank}
                classNames={[...classes.map(c => c.name ?? ''), ...(sheet.spell_list_classes ?? [])].filter(Boolean)}
                known={known}
                busy={busy}
                onAdd={add}
              />
            ) : null}
            {listed.map(s => {
              const row = index?.find(s.name, s.id) ?? null
              const prepared = preparedIds.has(s.id)
              // An unprepared spell in a book casts only as a ritual, and only
              // for a caster whose book allows that (Ritual Adept).
              const ready = !spellbook || prepared
              return (
                <SpellLine
                  key={s.id}
                  name={s.name}
                  row={row}
                  dim={!!spellbook && !prepared}
                  {...castFor(props, s.name, row, rank, ready, ready || !!spellbook?.ritualAdept)}
                  concentrating={props.vitals.concentration === s.name}
                >
                  {s.freeFrom ? <span className="text-smallest text-muted">free · {s.freeFrom}</span> : null}
                  {spellbook ? (
                    <>
                      {!prepared && spellbook.ritualAdept && row?.ritual ? (
                        <span className="text-smallest text-faint">castable as a ritual</span>
                      ) : null}
                      <label className="flex items-center gap-1 text-smallest text-muted">
                        <input
                          type="checkbox"
                          checked={prepared}
                          disabled={busy || (!prepared && preparedFull)}
                          onChange={() => edit(j => setSpellPrepared(j, s.id, !prepared))}
                        />
                        prepared
                      </label>
                    </>
                  ) : null}
                  {s.freeFrom ? null : (
                    <RemoveButton name={s.name} busy={busy} onRemove={() => edit(j => removeSpell(j, 'known', s.id))} />
                  )}
                </SpellLine>
              )
            })}
          </LevelCard>
        )
      })}
    </>
  )
}

function AddButton({
  open,
  busy,
  label = 'Add',
  onToggle,
}: {
  open: boolean
  busy: boolean
  label?: string
  onToggle(): void
}) {
  return (
    <button type="button" className="btn-ui-link h-auto" disabled={busy} onClick={onToggle} aria-expanded={open}>
      {open ? 'Close' : `+ ${label}`}
    </button>
  )
}

function RemoveButton({ name, busy, onRemove }: { name: string; busy: boolean; onRemove(): void }) {
  return (
    <button
      type="button"
      className={`${PLAIN_BUTTON} text-faint`}
      disabled={busy}
      aria-label={`Remove ${name}`}
      title={`Remove ${name}`}
      onClick={onRemove}
    >
      <Icon name="x" />
    </button>
  )
}

/** How many candidates to draw at once — a class list at one level is rarely more. */
const PICKER_LIMIT = 40

/**
 * The spells a character may add at one level: their classes' lists — and
 * Magical Secrets' extra lists, for levelled spells only — less what they know.
 */
function AddPicker({
  level,
  classNames,
  known,
  busy,
  onAdd,
}: {
  level: number
  classNames: string[]
  known: ReadonlySet<string>
  busy: boolean
  onAdd(row: SpellRow): void
}) {
  const content = useContent()
  const [query, setQuery] = useState('')
  const listKey = classNames.join('\u0001')
  const all = useCatalogRows(() => content.spells.forClasses(listKey ? listKey.split('\u0001') : []))
  const q = query.trim().toLowerCase()
  const candidates = all.filter(s => s.level === level && !known.has(s.id) && (!q || s.name.toLowerCase().includes(q)))

  return (
    <div className="flex flex-col gap-1 border-b border-background-modifier-border bg-background-primary p-2">
      <input
        type="search"
        value={query}
        placeholder={`Search ${level === 0 ? 'cantrips' : `${LEVEL_LABEL(level) as string} spells`}…`}
        aria-label="Search spells to add"
        onChange={e => setQuery(e.target.value)}
      />
      {candidates.length === 0 ? (
        <span className="text-smaller text-faint">
          {classNames.length === 0
            ? 'No casting class to take spells from.'
            : `Nothing left on the ${classNames.join(' / ')} list at this level.`}
        </span>
      ) : null}
      <div className="flex max-h-72 flex-col overflow-y-auto">
        {candidates.slice(0, PICKER_LIMIT).map(row => (
          <SpellLine key={row.id} name={row.name} row={row}>
            <button type="button" className="btn-ui-link h-auto" disabled={busy} onClick={() => onAdd(row)}>
              Add
            </button>
          </SpellLine>
        ))}
      </div>
      {candidates.length > PICKER_LIMIT ? (
        <span className="text-smallest text-faint">
          {candidates.length - PICKER_LIMIT} more — narrow the search.
        </span>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Granted and free-cast spells
// ---------------------------------------------------------------------------

/** Group rows by a label, keeping first-seen order. */
function groupBy<T>(rows: readonly T[], label: (row: T) => string): [string, T[]][] {
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    const key = label(row)
    groups.set(key, [...(groups.get(key) ?? []), row])
  }
  return [...groups.entries()]
}

/**
 * Spells a feature hands over — Bard Words of Creation, a Paladin's Smite. No
 * remove button: the player did not choose these, so there is nothing to
 * unchoose.
 */
function GrantedSpells({ granted, props }: { granted: readonly SheetGrantedSpell[]; props: SpellPanelProps }) {
  const index = useSpellIndex()
  if (granted.length === 0) return null
  return (
    <>
      {groupBy(granted, g => g.source ?? 'Always prepared').map(([label, rows]) => (
        <LevelCard
          key={label}
          title={label}
          sub={rows.every(r => r.mode === 'cantrip') ? 'always available, not counted' : 'always prepared, not counted'}
        >
          {rows.map(r => {
            const row = index?.find(r.name, r.id) ?? null
            // A granted spell is cast like any other — with a slot of its level.
            const level = r.mode === 'cantrip' ? 0 : Math.max(1, row?.level ?? 1)
            return (
              <SpellLine
                key={`${r.mode}-${r.name}`}
                name={r.name}
                row={row}
                {...castFor(props, r.name, row, level)}
                concentrating={props.vitals.concentration === r.name}
              />
            )
          })}
        </LevelCard>
      ))}
    </>
  )
}

const RESET_LABEL: Record<string, string> = {
  long_rest: 'back on a long rest',
  short_rest: 'back on a short or long rest',
}

/** Spells a feature casts without a slot — Mystic Arcanum, Spell Mastery. */
function FreeCasts({ free, vitals, actions, busy, sheet, notePath }: { free: readonly SheetFreeCast[] } & SpellPanelProps) {
  const index = useSpellIndex()
  if (free.length === 0) return null
  return (
    <>
      {groupBy(free, f => f.label).map(([label, rows]) => (
        <LevelCard
          key={label}
          title={label}
          sub={
            rows[0].uses === null
              ? 'at will, no slot'
              : `${rows[0].uses} free cast${rows[0].uses === 1 ? '' : 's'} each, ${RESET_LABEL[rows[0].resets ?? ''] ?? 'no slot'}`
          }
        >
          {rows.map(f => {
            const row = index?.find(f.name, f.id) ?? null
            const left = f.uses === null ? Infinity : f.uses - (vitals.featureUsesUsed[f.key] ?? 0)
            // A free cast spends its own use, never a slot, and is cast at the
            // spell's own level (Mystic Arcanum does not upcast).
            const option: CastOption = {
              label: f.uses === null ? 'Cast' : 'Cast free',
              detail: f.uses === null ? 'at will' : `${left} left`,
              cost: {
                ...(f.uses === null ? {} : { use: { key: f.key, max: f.uses } }),
                concentration: row?.concentration ? f.name : null,
              },
              rank: f.level,
              roll: row
                ? spellRoll(
                    { ...row, level: f.level },
                    { rank: f.level, characterLevel: sheet.level ?? 1, spellMod: sheet.spellcasting?.mod ?? 0 },
                  )
                : null,
            }
            return (
              <SpellLine
                key={f.key}
                name={f.name}
                row={row}
                cast={
                  <CastButton
                    name={f.name}
                    options={left > 0 ? [option] : []}
                    busy={busy}
                    onCast={actions.cast}
                    character={{ name: sheet.name, notePath }}
                    range={row?.range}
                    attack={sheet.spellcasting ? { bonus: sheet.spellcasting.attack, characterLevel: sheet.level ?? 1 } : null}
                    noneLeft={`No free casts of ${f.name} left`}
                  />
                }
                concentrating={vitals.concentration === f.name}
              >
                {f.uses !== null ? (
                  <Pips
                    max={f.uses}
                    used={vitals.featureUsesUsed[f.key] ?? 0}
                    label={`free cast of ${f.name}`}
                    busy={busy}
                    onSpend={() => actions.spendUse(f.key, f.uses ?? 0)}
                    onRefund={() => actions.refundUse(f.key)}
                  />
                ) : null}
              </SpellLine>
            )
          })}
        </LevelCard>
      ))}
    </>
  )
}
