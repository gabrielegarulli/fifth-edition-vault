import { useEffect, useMemo, useState } from 'react'
import { Notice } from 'obsidian'
import { preparedIdSet } from '@vault/derive/spellbook.js'
import { LEVEL_LABEL } from '@vault/derive/spellUtils.js'

import { useCompendium, useSpellIndex } from '../../../compendium/host'
import type { ClassFence, SubclassFence, SpellRow } from '../../../compendium'
import {
  type VaultCharacterJson,
  addSpell,
  bookCapacity,
  casterCaps,
  castingClasses,
  characterSpells,
  removeSpell,
  setSpellPrepared,
  type CharacterSpells,
  highestRank,
  MAX_RANK,
  slotTable,
} from '../../../characterModel'
import { useDetails } from '../../../platform/host'
import { useCharacters } from '../context'

import type { SpellPanelProps, Loaded, Picking, BookSpell } from './types'
import { slotsLeft, LevelCard, CardNote } from './shared'
import { SpellLine, castFor } from './spellLine'
import { AddButton, RemoveButton, AddPicker } from './addPicker'
import { SheetSpells } from './sheetSpells'

// A Vault character's own spells, which it can add, remove and prepare.
// One file of the sheet's spell panel (MYDND-197); index.ts says what the panel is.

export function VaultSpells(props: SpellPanelProps) {
  const { notePath, generation } = props
  const { characters } = useCharacters()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const key = `${notePath}:${generation}`

  // Re-read on every generation: a write here comes back as a vault change, and
  // that is what redraws the list — no copy of it is kept in React (ADR 0003).
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const json = await characters.readVaultCharacter(notePath)
        if (!cancelled) setLoaded({ key, json, error: null })
      } catch (err) {
        if (!cancelled) setLoaded({ key, json: null, error: err instanceof Error ? err.message : String(err) })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [characters, notePath, key])

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

function VaultSpellEditor(props: SpellPanelProps & { json: VaultCharacterJson }) {
  const { sheet, notePath, json } = props
  const compendium = useCompendium()
  const { characters, saveVaultCharacter, rebuildVaultCharacter } = useCharacters()
  const index = useSpellIndex()
  const [picking, setPicking] = useState<Picking>(null)
  const [writing, setWriting] = useState(false)

  const classes = castingClasses(json)
  const classIds = classes.map(c => c.id).filter((id): id is string => !!id)
  const { details, loading } = useDetails(compendium.classes, classIds)
  const fences = useMemo(() => {
    const out = new Map<string, ClassFence | null>()
    for (const [id, d] of details) out.set(id, d?.fence ?? null)
    return out
  }, [details])
  // An Eldritch Knight's caps are on its subclass's note (MYDND-182).
  const subclassIds = classes.map(c => c.subclass?.id).filter((id): id is string => !!id)
  const { details: subDetails, loading: subLoading } = useDetails(compendium.subclasses, subclassIds)
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
        const current = await characters.readVaultCharacter(notePath)
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
