// The convert page: review a D&D Beyond import's conversion plan, fill its
// holes, and write the Vault character. From a fetch, or from a saved file
// (MYDND-257).

import { Notice } from 'obsidian'
import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

import type { ClassRow, SubclassRow, Compendium } from '../../compendium'
import { useCompendium } from '../../compendium/host'
import {
  buildConversionPlan,
  planHoles,
  planIsConvertible,
  planToVaultJson,
  type ConversionCatalog,
  type ConversionPlan,
  type Hole,
  type Match,
  type PlanSources,
} from '../../choices'
import type { DdbPayload, Sheet } from '../../characterModel'
import { useElementWidth, useCatalogRows, useVaultGeneration, useGo } from '../../platform/host'
import { parseConvertPath, sheetPath } from '../../platform'
import { useCharacters } from '../../characters/host'
import { useDdbConvert } from './context'
import { FilePicker } from './FilePicker'
import { newNoteKey, notesToCreate, withCreatedNotes, type NewNote, type NoteOutcome } from '../model/missing'
import { buildVaultSheet } from '../../characterModel'
import { Field, Section, SourceSelect } from '../../choices/host'

/**
 * The review a D&D Beyond import goes through before it is written (MYDND-105).
 *
 * `the-vault`'s `ConvertToVaultDialog`, as a page: the plan proposes a catalog
 * note for every class, subclass, species, background and feat, says how it
 * found each one, and lets the GM correct any of them. **Nothing reaches the
 * vault until Convert.** A missing class or species blocks it; everything else
 * converts with a gap the builder can fill.
 *
 * One route serves three journeys, told apart by what the vault already holds
 * for the id: a new import, a note imported the old way converted in place, and
 * a converted character re-converted from its source.
 *
 * The preview re-bakes on every pick, against a throwaway id, through the same
 * `buildVaultSheet` the write uses — so the numbers shown are the numbers saved.
 *
 * **The payload comes from a fetch or from a file** (MYDND-257). A file the
 * roster picked is held by the provider; with none, and no fetch, the page asks
 * for one. A held file for another character is not this one's, so the id in
 * the route decides. Where the host reaches no server, the plan keeps no
 * portrait address, so the sheet never asks D&D Beyond's image host for one.
 */
export default function CharacterConvertPage() {
  const { pathname } = useLocation()
  const route = parseConvertPath(pathname)
  if (!route) return <p className="bst-note bst-note--warn">Not a D&D Beyond id.</p>
  return <Convert key={pathname} ddbId={route.ddbId} notePath={route.notePath} />
}

type Loaded = { payload: DdbPayload; error: null } | { payload: null; error: string }

/**
 * The GM's edited plan, with any feat, spell or item it still lacks taken from
 * the plan proposed now. That is proposed again on every vault change, so a
 * note made in a builder is matched even after the GM corrected something.
 * Both come from the same payload, so their lists line up index for index.
 */
function withNewMatches(edited: ConversionPlan, proposed: ConversionPlan | null): ConversionPlan {
  if (!proposed) return edited
  return {
    ...edited,
    feats: edited.feats.map((f, i) => (f.chosen ? f : (proposed.feats[i] ?? f))),
    spells: edited.spells.map((sp, i) => (sp.chosen ? sp : (proposed.spells[i] ?? sp))),
    items: edited.items.map((it, i) => (it.item || it.magicItem ? it : (proposed.items[i] ?? it))),
  }
}

function Convert({ ddbId, notePath }: { ddbId: string; notePath: string | null }) {
  const compendium = useCompendium()
  const { characters: charactersStore } = useCharacters()
  const { fetchDdbPayload, convertDdbCharacter, createNotes, file, holdFile } = useDdbConvert()
  const fromFile = file?.ddbId === ddbId ? file.payload : null
  const [wrongFile, setWrongFile] = useState<string | null>(null)
  const go = useGo()
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const narrow = width > 0 && width < 640

  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [edited, setPlan] = useState<ConversionPlan | null>(null)
  const [busy, setBusy] = useState(false)
  // The notes to create the GM unticked, by `newNoteKey`: all are ticked until then.
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(new Set())
  const generation = useVaultGeneration()

  const classes = useCatalogRows(() => compendium.classes.list())
  const subclasses = useCatalogRows(() => compendium.subclasses.list())
  const species = useCatalogRows(() => compendium.species.list())
  const backgrounds = useCatalogRows(() => compendium.backgrounds.list())
  const feats = useCatalogRows(() => compendium.feats.list())
  const spells = useCatalogRows(() => compendium.spells.list())
  const items = useCatalogRows(() => compendium.items.list())
  const magicItems = useCatalogRows(() => compendium.magicItems.list())
  const catalog = useMemo<ConversionCatalog>(
    () => ({ classes, subclasses, species, backgrounds, feats, spells, items, magicItems }),
    [classes, subclasses, species, backgrounds, feats, spells, items, magicItems],
  )

  useEffect(() => {
    if (!fetchDdbPayload || fromFile) return
    let live = true
    fetchDdbPayload(ddbId).then(
      payload => live && setLoaded({ payload, error: null }),
      (err: unknown) => live && setLoaded({ payload: null, error: err instanceof Error ? err.message : String(err) }),
    )
    return () => {
      live = false
    }
  }, [ddbId, fetchDdbPayload, fromFile])
  const source = useMemo<Loaded | null>(() => (fromFile ? { payload: fromFile, error: null } : loaded), [fromFile, loaded])

  // Proposed from the payload and the catalogs, and re-proposed when either
  // changes, until the GM picks something: from then on it is theirs, and a
  // vault change underneath must not undo a pick they made.
  const proposed = useMemo(
    () => {
      if (!source?.payload) return null
      const proposal = buildConversionPlan(source.payload, ddbId, catalog)
      // No server reached, no portrait address kept (see above).
      return fetchDdbPayload ? proposal : { ...proposal, avatarUrl: null }
    },
    [source, ddbId, catalog, fetchDdbPayload],
  )
  const plan = edited ? withNewMatches(edited, proposed) : proposed
  const toCreate = useMemo(() => (plan && source?.payload ? notesToCreate(plan, source.payload) : []), [plan, source])

  // Each lookup walks every note in the vault, so not on every render.
  const { target, reconvert } = useMemo(() => {
    const converted = charactersStore.findByDdbSource(ddbId)
    const at = notePath ?? converted ?? charactersStore.findByDdbId(ddbId)
    return { target: at, reconvert: at !== null && at === converted }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `generation` stands for the vault's notes, which the lookups read
  }, [charactersStore, ddbId, notePath, generation])

  const preview = usePreview(plan)

  if (!convertDdbCharacter) {
    return (
      <div className="my-dnd-vault__scroll p-4">
        <p className="bst-note">Importing from D&D Beyond runs in the Obsidian plugin, not here.</p>
      </div>
    )
  }

  // A file for another character must not replace this one's review.
  const pick = (picked: { ddbId: string; payload: DdbPayload }): void => {
    if (picked.ddbId !== ddbId) {
      setWrongFile(
        `That file is ${picked.payload.name ?? 'another character'} (D&D Beyond id ${picked.ddbId}), not character ${ddbId}.`,
      )
      return
    }
    setWrongFile(null)
    setPlan(null)
    holdFile(picked)
  }

  const holes = plan ? planHoles(plan) : []
  const convertible = plan ? planIsConvertible(plan) : false

  // The notes first, then the character, so its choices point at them in this
  // one save (MYDND-273). A note refused is named, and converts without it.
  const convert = async (): Promise<void> => {
    if (!plan) return
    setBusy(true)
    let final = plan
    const ticked = createNotes ? toCreate.filter(n => !skipped.has(newNoteKey(n.kind, n.name))) : []
    if (createNotes && ticked.length > 0) {
      let outcomes: NoteOutcome[] = []
      try {
        outcomes = await createNotes(ticked, catalog)
      } catch (err) {
        new Notice(`Could not create the notes: ${err instanceof Error ? err.message : String(err)}`)
      }
      final = withCreatedNotes(plan, outcomes, catalog)
      for (const message of outcomeNotices(outcomes)) new Notice(message)
    }
    const sources = await loadSources(compendium, final)
    const path = await convertDdbCharacter({ plan: final, sources, targetPath: target })
    setBusy(false)
    if (path) go(sheetPath(path))
  }

  const title = !plan
    ? 'Import from D&D Beyond'
    : reconvert
      ? `Re-convert ${plan.name}`
      : target
        ? `Convert ${plan.name}`
        : `Import ${plan.name}`

  return (
    <div ref={ref} className="bst">
      <header className={narrow ? 'bst-header bst-header--narrow' : 'bst-header bst-header--stack'}>
        <div className="bst-header-row bst-header-row--wrap">
          <h2 className="bst-title">{title}</h2>
          <span className="bst-spacer" />
          <button type="button" className="bst-plain bst-btn-ghost" disabled={busy} onClick={evt => go('/characters', evt)}>
            Cancel
          </button>
          <button
            type="button"
            className="bst-plain bst-btn-primary"
            disabled={busy || !convertible}
            onClick={() => void convert()}
          >
            {busy ? 'Converting…' : reconvert ? 'Re-convert' : 'Convert to a Vault character'}
          </button>
        </div>
        <p className="bst-count">{describeTarget(target, reconvert)}</p>
      </header>

      <main className="my-dnd-vault__scroll bst-bmain">
        {!source && fetchDdbPayload ? (
          <p className="bst-note bst-note--faint">Fetching character {ddbId} from D&D Beyond…</p>
        ) : null}
        {source?.error ? (
          <p role="alert" className="bst-note bst-note--warn">
            Could not fetch the character: {source.error}
          </p>
        ) : null}
        {!fromFile ? (
          <div className="bst-col">
            <p className="bst-note">
              {fetchDdbPayload
                ? 'Or convert from the character’s file, saved from D&D Beyond.'
                : `Pick the file saved from D&D Beyond for character ${ddbId}.`}
            </p>
            <FilePicker label="Pick the file" onFile={pick} />
            {wrongFile ? (
              <p role="alert" className="bst-note bst-note--warn">
                {wrongFile}
              </p>
            ) : null}
          </div>
        ) : null}

        {plan ? (
          <>
            <Holes holes={holes} />
            {createNotes ? (
              <NewNotes
                notes={toCreate}
                homebrew={compendium.homebrewFolder()}
                skipped={skipped}
                onToggle={(key, on) =>
                  setSkipped(prev => {
                    const next = new Set(prev)
                    if (on) next.delete(key)
                    else next.add(key)
                    return next
                  })
                }
              />
            ) : null}
            <Section title="Species, class and background" open>
              <MatchPicker
                label={`Species — D&D Beyond: ${plan.race.ddbName ?? 'none'}`}
                match={plan.race}
                rows={species}
                onPick={row => setPlan({ ...plan, race: picked(plan.race, row) })}
              />
              {plan.classes.map((c, i) => (
                <ClassPicker
                  key={i}
                  cls={c}
                  classes={classes}
                  subclasses={subclasses}
                  onClass={row =>
                    setPlan({
                      ...plan,
                      classes: plan.classes.map((x, j) =>
                        j === i
                          ? { ...picked(x, row), level: x.level, subclass: x.subclass && { ...x.subclass, chosen: null, how: null } }
                          : x,
                      ),
                    })
                  }
                  onSubclass={row =>
                    setPlan({
                      ...plan,
                      classes: plan.classes.map((x, j) =>
                        j === i && x.subclass ? { ...x, subclass: picked(x.subclass, row) } : x,
                      ),
                    })
                  }
                />
              ))}
              {plan.background ? (
                <MatchPicker
                  label={`Background — D&D Beyond: ${plan.background.ddbName}`}
                  match={plan.background}
                  rows={backgrounds}
                  onPick={row => setPlan({ ...plan, background: picked(plan.background!, row) })}
                />
              ) : null}
            </Section>

            {plan.feats.length > 0 ? (
              <Section title={`Feats (${plan.feats.filter(f => f.chosen).length} of ${plan.feats.length} found)`}>
                {plan.feats.map((f, i) => (
                  <MatchPicker
                    key={i}
                    label={f.ddbName ?? ''}
                    match={f}
                    rows={feats}
                    onPick={row => setPlan({ ...plan, feats: plan.feats.map((x, j) => (j === i ? picked(x, row) : x)) })}
                  />
                ))}
              </Section>
            ) : null}

            <Numbers plan={plan} preview={preview} />
            <CarriedAcross plan={plan} reconvert={reconvert} />
          </>
        ) : null}
      </main>
    </div>
  )
}

/** A pick the GM made, marked as theirs rather than as a guess. */
function picked<R>(match: Match<R>, row: R | null): Match<R> {
  return { ...match, chosen: row, how: row ? 'exact' : null }
}

function describeTarget(target: string | null, reconvert: boolean): string {
  if (reconvert) return `Replaces the choices in ${target}. Its hit points, inventory and notes stay as they are.`
  if (target) return `Converts ${target} where it sits. What the player wrote in the note is kept.`
  return 'Written as a new note in your characters folder when you convert.'
}

const HOW_LABEL: Record<string, string> = {
  exact: 'found',
  suffix: 'guessed: book removed from the name',
  alias: 'found under another name',
}

function HowChip({ match }: { match: Match<unknown> }) {
  if (!match.chosen) return <span className="bst-chip bst-chip--curse">not in the catalog</span>
  return (
    <span className={match.how === 'exact' ? 'bst-chip' : 'bst-chip bst-chip--accent'}>{HOW_LABEL[match.how ?? 'exact']}</span>
  )
}

function MatchPicker<R extends { id: string; name: string; source: string | null; path: string }>({
  label,
  match,
  rows,
  onPick,
}: {
  label: string
  match: Match<R>
  rows: readonly R[]
  onPick: (row: R | null) => void
}) {
  return (
    <div className="bst-col">
      <SourceSelect label={label} rows={rows} value={match.chosen?.id ?? ''} onChange={onPick} empty="No notes" />
      <HowChip match={match} />
    </div>
  )
}

function ClassPicker({
  cls,
  classes,
  subclasses,
  onClass,
  onSubclass,
}: {
  cls: ConversionPlan['classes'][number]
  classes: readonly ClassRow[]
  subclasses: readonly SubclassRow[]
  onClass: (row: ClassRow | null) => void
  onSubclass: (row: SubclassRow | null) => void
}) {
  const options = cls.chosen
    ? subclasses.filter(s => (s.className ?? '').toLowerCase() === cls.chosen!.name.toLowerCase())
    : []
  return (
    <>
      <MatchPicker label={`Class, level ${cls.level} — D&D Beyond: ${cls.ddbName}`} match={cls} rows={classes} onPick={onClass} />
      {cls.subclass ? (
        <MatchPicker
          label={`Subclass — D&D Beyond: ${cls.subclass.ddbName}`}
          match={cls.subclass}
          rows={options}
          onPick={onSubclass}
        />
      ) : null}
    </>
  )
}

const NEW_NOTE_LABEL: Record<NewNote['kind'], string> = {
  feat: 'feat',
  spell: 'spell',
  item: 'item',
  'magic-item': 'magic item',
}

/** Where the notes a conversion creates land (MYDND-273): `homebrew`'s `IMPORTED_SUBFOLDER`, restated (ADR 0014). */
const IMPORTED_SUBFOLDER = 'Imported from D&D Beyond'

/**
 * Each feat, spell and item with no note, ticked to be created when the GM
 * converts (MYDND-273): an empty shell each, with what D&D Beyond said of it
 * filled in, in the homebrew folder's `Imported from D&D Beyond`. Untick to
 * convert without one. Drawn only where the host can write them: the plugin,
 * both editions.
 */
function NewNotes({
  notes,
  homebrew,
  skipped,
  onToggle,
}: {
  notes: NewNote[]
  homebrew: string
  skipped: ReadonlySet<string>
  onToggle: (key: string, on: boolean) => void
}) {
  if (notes.length === 0) return null
  const ticked = notes.filter(n => !skipped.has(newNoteKey(n.kind, n.name))).length
  const folder = `${homebrew}/${IMPORTED_SUBFOLDER}`
  return (
    <Section title={`Notes to create (${ticked} of ${notes.length})`} open>
      <p className="bst-note bst-note--faint">
        Converting creates each ticked note in {folder}, and the character uses it. Each is an empty shell: fill it in from
        its catalog page with Edit. Moving one to another folder inside {homebrew} is fine; moved out of it, it stops
        listing.
      </p>
      <ul className="bst-new-notes">
        {notes.map(n => {
          const key = newNoteKey(n.kind, n.name)
          return (
            <li key={key}>
              <label className="bst-check">
                <input
                  type="checkbox"
                  className="bst-checkbox"
                  checked={!skipped.has(key)}
                  onChange={e => onToggle(key, e.target.checked)}
                />
                <span className="bst-check-label">
                  {n.name} ({NEW_NOTE_LABEL[n.kind]})
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

/** What the save says of its notes: one Notice for what it wrote, one for what it matched, one for what it refused. */
function outcomeNotices(outcomes: readonly NoteOutcome[]): string[] {
  const out: string[] = []
  const created = outcomes.flatMap(o => (o.outcome === 'created' ? [o] : []))
  const matched = outcomes.filter(o => o.outcome === 'matched')
  const refused = outcomes.flatMap(o => (o.outcome === 'refused' ? [o] : []))
  if (created.length > 0) {
    const n = created.length
    const folder = created[0].path.slice(0, created[0].path.lastIndexOf('/'))
    out.push(
      n === 1
        ? `Created 1 note in ${folder}; fill it in from its catalog page with Edit.`
        : `Created ${n} notes in ${folder}; fill them in from their catalog page with Edit.`,
    )
  }
  if (matched.length > 0) {
    out.push(`Already in the catalog, so matched rather than created: ${matched.map(o => o.name).join(', ')}.`)
  }
  if (refused.length > 0) {
    out.push(
      `Not created, so the character converts without ${refused.length === 1 ? 'it' : 'them'}: ${refused.map(o => `${o.name} (${o.reason})`).join('; ')}`,
    )
  }
  return out
}

function Holes({ holes }: { holes: Hole[] }) {
  if (holes.length === 0) return <p className="bst-note">Everything D&D Beyond names was found in the catalog.</p>
  const blocking = holes.filter(h => h.blocking)
  const rest = holes.filter(h => !h.blocking)
  return (
    <>
      {blocking.length > 0 ? (
        <p role="alert" className="bst-note bst-note--warn">
          Cannot convert: no note for the {blocking.map(h => `${h.kind} ${h.name}`).join(', ')}. Pick one below, or export
          it into the vault first.
        </p>
      ) : null}
      {rest.length > 0 ? (
        <p className="bst-note bst-note--faint">
          Converts without: {rest.map(h => `${h.name} (${h.kind})`).join(', ')}. Add them in the builder later.
        </p>
      ) : null}
    </>
  )
}

/** The sheet D&D Beyond showed beside the one the Vault will derive. */
function Numbers({ plan, preview }: { plan: ConversionPlan; preview: Sheet | null }) {
  const before = plan.ddbSheet
  const rows: Array<[string, string, string]> = [
    ['Hit points', String(before.hp.max), preview ? String(preview.hp.max) : '…'],
    ['Armour class', String(before.ac), preview ? String(preview.ac) : '…'],
    ...before.abilities.map(a => {
      const after = preview?.abilities.find(x => x.label === a.label)
      return [a.label, String(a.score), after ? String(after.score) : '…'] as [string, string, string]
    }),
  ]
  return (
    <Section title="Before and after">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left" />
            <th className="text-left">D&D Beyond</th>
            <th className="text-left">Vault</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, a, b]) => (
            <tr key={label}>
              <td>{label}</td>
              <td>{a}</td>
              <td className={a !== b && b !== '…' ? 'font-semibold' : undefined}>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="bst-note bst-note--faint">
        The Vault works out maximum hit points from hit dice and Constitution, so rolled hit points change.
        {plan.ddbBonusHp > 0 ? ` D&D Beyond's ${plan.ddbBonusHp} bonus hit points are kept.` : ''} Armour class counts
        only what is equipped here, and items arrive carried, not worn.
      </p>
      {plan.itemRaisedScores.length > 0 ? (
        <p className="bst-note bst-note--warn">
          Raised by an item on D&D Beyond, and without it here until it is equipped:{' '}
          {plan.itemRaisedScores.map(s => `${s.ability.toUpperCase()} ${s.withItems} → ${s.without}`).join(', ')}.
        </p>
      ) : null}
    </Section>
  )
}

function CarriedAcross({ plan, reconvert }: { plan: ConversionPlan; reconvert: boolean }) {
  const spellsFound = plan.spells.filter(s => s.chosen).length
  const worn = plan.items.filter(i => i.equipped).map(i => i.ddbName)
  const unmatched = plan.items.filter(i => !i.item && !i.magicItem).length
  const c = plan.currency
  return (
    <Section title="What else comes across">
      <Field label="Spells">
        <span>
          {spellsFound} of {plan.spells.length} found in the catalog.
        </span>
      </Field>
      {reconvert ? (
        <p className="bst-note bst-note--faint">
          A re-conversion leaves hit points, inventory and coins as they are in the vault.
        </p>
      ) : (
        <>
          <Field label="Inventory">
            <span>
              {plan.items.length} items{unmatched > 0 ? `, ${unmatched} with no catalog note (kept by name)` : ''}.
              {worn.length > 0 ? ` Worn on D&D Beyond, to equip again: ${worn.join(', ')}.` : ''}
            </span>
          </Field>
          <Field label="Coins">
            <span>
              {c.pp} pp, {c.gp} gp, {c.sp} sp, {c.cp} cp (electrum as silver), added to the purse.
            </span>
          </Field>
          <Field label="Hit points">
            <span>
              {plan.ddbSheet.hp.max - plan.ddbSheet.hp.current} damage and {plan.ddbSheet.hp.temp} temporary, as on D&D
              Beyond.
            </span>
          </Field>
        </>
      )}
    </Section>
  )
}

/** Each matched class's fence and the species' fence — what `planToVaultJson` needs and the plan does not hold. */
async function loadSources(compendium: Compendium, plan: ConversionPlan): Promise<PlanSources> {
  const classSources = await Promise.all(
    plan.classes
      .filter(c => c.chosen)
      .map(async c => ({ row: c.chosen!, fence: (await compendium.classes.detail(c.chosen!.id))?.fence ?? null })),
  )
  // An Eldritch Knight casts off its subclass's ability (MYDND-182).
  const subclassFences = await Promise.all(
    plan.classes
      .filter(c => c.chosen)
      .map(async c => (c.subclass?.chosen ? ((await compendium.subclasses.detail(c.subclass.chosen.id))?.fence ?? null) : null)),
  )
  const speciesFence = plan.race.chosen ? ((await compendium.species.detail(plan.race.chosen.id))?.fence ?? null) : null
  return { classSources, subclassFences, speciesFence }
}

/**
 * The sheet the Vault will derive, for the plan as it stands. Keyed on the
 * picks rather than the plan object, which is rebuilt on every change.
 */
function usePreview(plan: ConversionPlan | null): Sheet | null {
  const compendium = useCompendium()
  const [preview, setPreview] = useState<Sheet | null>(null)
  const key = plan
    ? JSON.stringify([
        plan.race.chosen?.id,
        plan.classes.map(c => [c.chosen?.id, c.subclass?.chosen?.id]),
        plan.background?.chosen?.id,
        plan.feats.map(f => f.chosen?.id),
      ])
    : ''
  useEffect(() => {
    if (!plan || !planIsConvertible(plan)) return
    let live = true
    void (async () => {
      const json = planToVaultJson(plan, await loadSources(compendium, plan))
      const { sheet } = await buildVaultSheet(json, compendium, 'local:preview')
      if (live) setPreview(sheet)
    })()
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the key stands for the plan's picks; see above
  }, [key, compendium])
  return plan && planIsConvertible(plan) ? preview : null
}
