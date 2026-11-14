// The Character Builder page: the draft, the step tabs, and saving the result
// as a Vault character.

import { useEffect, useState, type ReactNode } from 'react'
import { Notice } from 'obsidian'
import { useLocation, useNavigate } from 'react-router-dom'

import {
  backgroundEquipmentOptions,
  combinedEquipmentGrants,
  equipmentOptions,
  itemRowForEquipment,
  openChoicesOf,
  scoreOverCapText,
  scoresOverCap,
  type OpenChoice,
  allProblems,
  blankDraft,
  draftFromJson,
  stepProblems,
  toVaultJson,
  visibleSteps,
  withClass,
  type BuilderDraft,
  type StepContext,
  type StepKey,
} from '../../choices'
import { subclassesOf } from '../../compendium'
import { BUILDER_EDIT_PREFIX, SPELLS_STEP_HASH, sheetPath } from '../../platform'
import { useGo, useElementWidth } from '../../platform/host'
import { useCompendium } from '../../compendium/host'
import { fmtMod, buildVaultSheet, type BuiltSheet, type VaultCharacterJson } from '../../characterModel'
import { useCharacters } from '../../characters/host'
import { ClassStep } from './ClassStep'
import { EquipmentStep } from './EquipmentStep'
import { FeaturesStep, useBuilderSources } from '../../choices/host'
import { SpellsStep } from './SpellsStep'
import { SpeciesStep } from './SpeciesStep'
import { BackgroundStep } from './BackgroundStep'
import { AbilitiesStep } from './AbilitiesStep'
import { ReviewStep, Stat, type Preview } from './ReviewStep'

/** Below this the stepper is a progress bar and the sheet folds into the footer (design F). */
const WIDE_WIDTH = 760

/** How a step reads in the stepper: answered, being answered, left with questions, or ahead. */
type StepState = 'done' | 'current' | 'open' | 'todo'

/** The id the preview is projected under. Never written — Create mints a real one. */
const PREVIEW_ID = 'local:preview'

/**
 * The Character Builder (MYDND-24) — the web app's `CharacterBuilder.jsx`,
 * rewritten for a pane rather than ported.
 *
 * **The draft lives in memory until the player saves.** The web builder
 * autosaves a database row after every step; here that would put a half-made
 * note into `characters/`, where the roster and Atlas would both
 * find it, and on the web build every write is a change Sync replays. So
 * nothing reaches the vault until a `saveVaultCharacter`, which bakes, projects
 * and writes both fences in one file write (ADR 0007).
 *
 * **Save is on every step** (MYDND-116), gated only on what makes a character
 * at all — name, species, class (`allProblems`). A save on a middle step stays
 * in the builder, so a player can save as they go; Review's save finishes on
 * the sheet. Either way the next save targets the path the first one returned.
 *
 * **Edit mode** re-opens a Vault character from its `vault-character` fence and
 * saves over the same note, keeping its `local:` id. It replaces "edit the
 * fence by hand, then Rebuild" as the way to correct a choice.
 *
 * MYDND-29 added the choices: skills, every per-level feature question
 * (Features), multiclassing, the origin feat's sub-choices, starting equipment
 * and spells. Their rules are `choices/model/choices.ts`; the pickers are
 * `builder/ui/` and `choices/ui/`. Anything a saved character carries that the builder does
 * not model still passes through an edit untouched (`toVaultJson`).
 */
export default function CharacterBuilderPage() {
  const { pathname } = useLocation()
  const editPath = pathname.startsWith(BUILDER_EDIT_PREFIX)
    ? decodeURIComponent(pathname.slice(BUILDER_EDIT_PREFIX.length))
    : null
  // Keyed on the path so moving from one edit to another starts afresh rather
  // than carrying the previous character's draft.
  return <Builder key={editPath ?? 'new'} editPath={editPath} />
}

function Builder({ editPath }: { editPath: string | null }) {
  const { characters } = useCharacters()
  const [loaded, setLoaded] = useState<{ json: VaultCharacterJson | null; error: string | null } | null>(null)

  useEffect(() => {
    if (editPath === null) return
    const path = editPath
    let cancelled = false
    async function run() {
      try {
        const json = await characters.readVaultCharacter(path)
        if (!cancelled) setLoaded({ json, error: null })
      } catch (err) {
        if (!cancelled) setLoaded({ json: null, error: err instanceof Error ? err.message : String(err) })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [characters, editPath])

  if (editPath === null) return <BuilderForm editPath={null} original={null} />
  if (loaded === null) return <Frame title="Edit character">Reading the note…</Frame>
  if (loaded.json === null) {
    // Refused rather than opened blank: Save on a blank draft would write a
    // blank character over this one.
    return (
      <Frame title="Edit character">
        <p className="text-smaller text-error">
          Could not open {editPath}: {loaded.error}
        </p>
      </Frame>
    )
  }
  return <BuilderForm editPath={editPath} original={loaded.json} />
}

function Frame({ title, children }: { title: string; children: ReactNode }) {
  const go = useGo()
  return (
    <div className="my-dnd-vault__scroll p-4">
      <h2 className="text-ui-larger font-bold text-normal">{title}</h2>
      <div className="mt-2 text-smaller text-muted">{children}</div>
      <button type="button" className="mt-3" onClick={evt => go('/characters', evt)}>
        Back to characters
      </button>
    </div>
  )
}

function BuilderForm({ editPath, original }: { editPath: string | null; original: VaultCharacterJson | null }) {
  const compendium = useCompendium()
  const { inventory: inventoryStore, saveVaultCharacter } = useCharacters()
  const navigate = useNavigate()
  const go = useGo()
  const [ref, width] = useElementWidth<HTMLDivElement>()

  const [draft, setDraft] = useState<BuilderDraft>(() => (original ? draftFromJson(original) : blankDraft()))
  // The step is held by **key**, not position: Spells appears and disappears as
  // a caster is picked or removed, and an index would then point at the wrong step.
  // `#spells` opens on Spells: the level-up panel's way here, when a level
  // brings new spells to choose (MYDND-127).
  const { hash } = useLocation()
  const [stepKey, setStepKey] = useState<StepKey>(() => (hash === SPELLS_STEP_HASH ? 'spells' : 'species'))
  const [busy, setBusy] = useState(false)
  // The note this draft saves to: the edited one, or the one a first save made.
  // Every later save targets it — without it, a second save of a new character
  // would write it twice.
  const [savedPath, setSavedPath] = useState<string | null>(editPath)

  const {
    species,
    classes,
    subclasses,
    backgrounds,
    feats,
    items,
    familiars,
    backgroundRow,
    backgroundFence,
    race,
    fences,
    classSources,
    contexts,
    featureItems,
    featData,
    scores,
    masteryCount,
    masteryWeapons,
    casterList,
    spells,
    spellsFor,
    invocationCount,
    skillSources,
    onFamiliar,
    companions,
    weaponNames,
    loading,
  } = useBuilderSources(draft, setDraft)
  const originFeats = feats.filter(f => f.kind === 'origin')

  const equipmentCatalog = items.map(itemRowForEquipment)
  const kitOptions = equipmentOptions(fences[0], equipmentCatalog)
  const equipmentOption = kitOptions.find(o => o.key === draft.equipment.option) ?? null
  const backgroundKitOptions = backgroundEquipmentOptions(backgroundFence, equipmentCatalog)
  const backgroundEquipmentOption =
    backgroundKitOptions.find(o => o.key === draft.equipment.backgroundOption) ?? null

  const steps = visibleSteps(casterList.length > 0)
  const stepIndex = Math.max(0, steps.findIndex(s => s.key === stepKey))
  const current = steps[stepIndex]

  const ctx: StepContext = {
    race,
    classFence: fences[0] ?? null,
    classFences: fences,
    background: backgroundRow,
    equipmentOption,
    backgroundEquipmentOption,
  }
  const problems = stepProblems(current.key, draft, ctx)
  const isLast = stepIndex === steps.length - 1

  // The questions still open — never a gate, always said (see `stepProblems`).
  const subclassCount = (i: number) => {
    const row = classSources[i]?.row
    return row ? subclassesOf(subclasses, row, classes).length : 0
  }
  const openChoices = openChoicesOf({ items: featureItems, draft, feats: featData, masteryCount, invocationCount, casters: casterList, fences, subclassCount, background: backgroundRow })
  // Not a question but the same kind of thing: said, and never a gate.
  const overCap = scoresOverCap(draft, featData).map(scoreOverCapText)
  const flagged: OpenChoice[] = [...openChoices, ...overCap.map(text => ({ text, step: 'abilities' as const }))]

  // Cheap — pure functions over the draft — so it is simply recomputed. The
  // preview keys its bake on the serialised result, not on this object.
  const json = toVaultJson(draft, { classSources, subclassFences: contexts.map(c => c.subclassFence), race, background: backgroundRow, original })

  // The kit is handed over once: `granted` is stamped into the json written
  // with it, so a later Save of this character hands over nothing.
  const kitKey =
    [equipmentOption?.key, backgroundEquipmentOption?.key].filter((k): k is string => Boolean(k)).join(' + ') || null
  const grants =
    kitKey && !draft.equipment.granted
      ? combinedEquipmentGrants(equipmentOption, backgroundEquipmentOption, draft.equipment)
      : null
  const willGrant = grants !== null && (grants.items.length > 0 || grants.gold > 0)

  // What stops a save: name, species and class. Open questions never do.
  const blockers = allProblems(draft, ctx)

  /** Save the draft; `finish` (Review's button) then opens the sheet, otherwise the builder stays. */
  const create = async ({ finish }: { finish: boolean }): Promise<void> => {
    if (blockers.length > 0) {
      new Notice(`Not yet: ${blockers.join(' · ')}`)
      return
    }
    setBusy(true)
    try {
      const toSave = willGrant ? { ...json, equipment: { ...draft.equipment, granted: true } } : json
      const path = await saveVaultCharacter(toSave, savedPath)
      // `null` is a refusal, and its reason is already on screen.
      if (path === null) return
      setSavedPath(path)
      if (willGrant && grants) {
        // After the character note exists, because the inventory lives in it.
        // A failure part-way re-saves with `granted: false`, so the kit can be
        // handed over by a later save rather than recorded as given and lost.
        try {
          for (const { item, quantity } of grants.items) {
            await inventoryStore.addEquipmentToInventory(path, { contentItemId: item.id, quantity })
          }
          if (grants.gold > 0) await inventoryStore.updateCurrency(path, { gp: grants.gold })
          // Recorded in the draft too, so the builder's next save hands over nothing.
          setDraft(d => ({ ...d, equipment: { ...d.equipment, granted: true } }))
        } catch (err) {
          new Notice(`Could not hand over the starting equipment: ${err instanceof Error ? err.message : String(err)}`)
          await saveVaultCharacter(json, path)
        }
      }
      new Notice(`${savedPath ? 'Saved' : 'Created'} ${json.name}`)
      if (!finish) return
      // Plain `navigate`, not `useGo`: this is the builder *finishing*, not a
      // link. Left in place, a pinned builder would keep the draft it just
      // saved — and that is the one case where staying is not the point.
      void navigate(sheetPath(path))
    } finally {
      setBusy(false)
    }
  }

  const narrow = width > 0 && width < WIDE_WIDTH
  const preview = useLivePreview(json)
  const sheet = preview?.built?.sheet ?? null

  // Every step's open questions, so the stepper can mark them and the sheet can list them.
  const stepState = steps.map((s, i) => {
    const open = stepProblems(s.key, draft, ctx)
    // Not a gate, but not done either: a question left open, or no background.
    const unanswered = open.length > 0 || flagged.some(c => c.step === s.key) || (s.key === 'background' && !draft.background)
    const state: StepState = i === stepIndex ? 'current' : i > stepIndex ? 'todo' : unanswered ? 'open' : 'done'
    return { step: s, open, state }
  })
  const stillToAnswer = [
    ...stepState.filter(s => s.step.key !== current.key).flatMap(s => s.open.map(text => ({ step: s.step, text }))),
    ...flagged.map(({ text, step }) => ({ step: steps.find(s => s.key === step) ?? current, text })),
  ]
  const subLabel = (key: StepKey): string => stepSubLabel(key, { draft, json, openChoices, kit: kitKey })

  const nav = (
    <div className="bst-bnav">
      <button type="button" className="bst-plain bst-btn-secondary" disabled={busy || stepIndex === 0} onClick={() => setStepKey(steps[stepIndex - 1].key)}>
        Back
      </button>
      {isLast ? (
        <button
          type="button"
          className="bst-plain bst-btn-primary"
          disabled={busy || loading || blockers.length > 0}
          title={blockers.length > 0 ? `Not yet: ${blockers.join(' · ')}` : undefined}
          onClick={() => void create({ finish: true })}
        >
          {busy ? 'Saving…' : savedPath ? 'Save character' : 'Create character'}
        </button>
      ) : (
        <>
          <button
            type="button"
            className="bst-plain bst-btn-secondary"
            disabled={busy || loading || blockers.length > 0}
            title={blockers.length > 0 ? `Not yet: ${blockers.join(' · ')}` : 'Save and keep building'}
            onClick={() => void create({ finish: false })}
          >
            {busy ? 'Saving…' : savedPath ? 'Save' : 'Create character'}
          </button>
          <button
            type="button"
            className="bst-plain bst-btn-primary"
            disabled={busy || problems.length > 0}
            onClick={() => setStepKey(steps[stepIndex + 1].key)}
          >
            {narrow ? 'Next' : <>Next<span className="bst-bnav-next">: {steps[stepIndex + 1].label}</span></>}
          </button>
        </>
      )}
    </div>
  )

  return (
    <div ref={ref} className="bst">
      <header className={narrow ? 'bst-header bst-header--narrow' : 'bst-header bst-header--stack'}>
        <div className="bst-header-row bst-header-row--wrap">
          <h2 className="bst-title">{editPath ? `Edit ${original?.name ?? 'character'}` : 'New character'}</h2>
          <input
            type="text"
            autoFocus={!editPath}
            aria-label="Name"
            value={draft.name}
            onChange={e => {
              const name = e.target.value
              setDraft(d => ({ ...d, name }))
            }}
            placeholder="e.g. Mira Thornwood"
            className="bst-search bst-bname"
          />
          <span className="bst-spacer" />
          {!narrow && (
            <span className="bst-count">{savedPath ? `Saves to ${savedPath}` : 'Nothing is written to characters/ until you save'}</span>
          )}
          <button type="button" className="bst-plain bst-btn-ghost" disabled={busy} onClick={evt => go('/characters', evt)}>
            Cancel
          </button>
        </div>
        {narrow ? (
          <>
            <ol aria-label="Builder steps" className="bst-bprogress" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
              {stepState.map(({ step, state }) => (
                <li key={step.key} aria-label={`${step.label} — ${state}`} className={`bst-bprogress-seg bst-bprogress-seg--${state}`} />
              ))}
            </ol>
            <div className="bst-header-row">
              <span className="bst-bstep-count">
                STEP {stepIndex + 1} OF {steps.length}
              </span>
              <strong className="bst-bstep-now">{current.label}</strong>
              <span className="bst-spacer" />
              <select aria-label="Jump to step" className="bst-select bst-select--compact" value={current.key} onChange={e => setStepKey(e.target.value as StepKey)}>
                {steps.map((s, i) => (
                  <option key={s.key} value={s.key}>
                    {i + 1}. {s.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <ol aria-label="Builder steps" className="bst-bsteps" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
            {stepState.map(({ step, state }, i) => (
              <li key={step.key}>
                <button
                  type="button"
                  aria-current={state === 'current' ? 'step' : undefined}
                  className={`bst-plain bst-bstep bst-bstep--${state}`}
                  onClick={() => setStepKey(step.key)}
                >
                  <span aria-hidden="true" className="bst-bstep-dot">
                    {state === 'done' ? '✓' : state === 'open' ? '!' : i + 1}
                  </span>
                  <span className="bst-bstep-names">
                    <span className="bst-bstep-label">
                      {i + 1}. {step.label}
                    </span>
                    <span className="bst-bstep-sub">{subLabel(step.key)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </header>

      <div className="bst-body">
        <main className="my-dnd-vault__scroll bst-bmain">
          {current.key === 'species' && <SpeciesStep draft={draft} setDraft={setDraft} rows={species} race={race} />}
          {current.key === 'class' && (
            <ClassStep
              draft={draft}
              setDraft={setDraft}
              rows={classes}
              subclasses={subclasses}
              fences={fences}
              feats={featData}
              onPick={(index, row) => {
                // The new class's fence is not loaded yet at this point. Nothing
                // the pick does needs it: saves and hit die come from the fence
                // in `toVaultJson`, at save time, once it has been read.
                setDraft(d => withClass(d, row ? { row, fence: null } : null, index))
              }}
            />
          )}
          {current.key === 'features' && (
            <FeaturesStep
              draft={draft}
              setDraft={setDraft}
              items={featureItems}
              feats={feats}
              featData={featData}
              scores={scores}
              skillSources={skillSources}
              masteryCount={masteryCount}
              masteryWeapons={masteryWeapons}
              invocationCount={invocationCount}
              spellsFor={spellsFor}
              spells={spells}
              familiars={familiars}
              onFamiliar={onFamiliar}
              companions={companions}
              weaponNames={weaponNames}
            />
          )}
          {current.key === 'background' && (
            <BackgroundStep
              draft={draft}
              setDraft={setDraft}
              rows={backgrounds}
              background={backgroundRow}
              originFeats={originFeats}
              originFeatRow={feats.find(f => f.id === draft.originFeat?.id) ?? null}
              pickOriginFeat={name => (name ? (compendium.feats.byName(name) ?? null) : null)}
              spellsFor={spellsFor}
            />
          )}
          {current.key === 'abilities' && <AbilitiesStep draft={draft} setDraft={setDraft} narrow={narrow} feats={featData} background={backgroundRow} overCap={overCap} />}
          {current.key === 'equipment' && (
            <EquipmentStep
              draft={draft}
              setDraft={setDraft}
              options={kitOptions}
              backgroundOptions={backgroundKitOptions}
              items={items}
            />
          )}
          {current.key === 'spells' && <SpellsStep draft={draft} setDraft={setDraft} casters={casterList} spellsFor={spellsFor} />}
          {current.key === 'review' && (
            <ReviewStep
              preview={preview}
              draft={draft}
              ctx={ctx}
              openChoices={openChoices}
              overCap={overCap}
              kit={willGrant && grants && kitKey ? { key: kitKey, ...grants } : null}
            />
          )}

          {loading ? <p className="bst-note bst-note--faint">Reading the notes…</p> : null}
          {problems.length > 0 && narrow ? (
            <p role="status" className="bst-note bst-note--warn">
              {problems.join(' · ')}
            </p>
          ) : null}
        </main>

        {!narrow && (
          <aside aria-label="Sheet so far" className="bst-bsheet">
            <LiveSheet sheet={sheet} pending={preview === null} />
            <h3 className="bst-section-title">Still to answer</h3>
            <div className="my-dnd-vault__scroll bst-btodo">
              {problems.length > 0 && (
                <p role="status" className="bst-note bst-note--warn bst-btodo-now">
                  {problems.join(' · ')}
                </p>
              )}
              {stillToAnswer.length === 0 && problems.length === 0 ? (
                <p className="bst-note">Nothing — every question is answered.</p>
              ) : (
                stillToAnswer.map(({ step, text }) => (
                  <button key={`${step.key}-${text}`} type="button" className="bst-plain bst-btodo-row" onClick={() => setStepKey(step.key)}>
                    <span aria-hidden="true" className="bst-dot bst-dot--orange" />
                    <span className="bst-btodo-text">
                      <span>{text}</span>
                      <span className="bst-btodo-step">{step.label}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
            <div className="bst-detail-foot">{nav}</div>
          </aside>
        )}
      </div>

      {narrow && (
        <footer className="bst-bfoot">
          <span className="bst-bfoot-tiles">
            {sheet ? (
              <>
                <span className="bst-bfoot-tile">HP {sheet.hp.max}</span>
                <span className="bst-bfoot-tile">AC {sheet.ac}</span>
                {sheet.spellcasting?.dc != null && <span className="bst-bfoot-tile">DC {sheet.spellcasting.dc}</span>}
              </>
            ) : null}
            <span className="bst-spacer" />
            {stillToAnswer.length > 0 && <span className="bst-bfoot-open">{stillToAnswer.length} open</span>}
          </span>
          {nav}
        </footer>
      )}
    </div>
  )
}

/** The sheet the draft would make, baked as Create bakes it — what the right-hand panel and Review show. */
/**
 * The same bake and projection Create runs, against a throwaway id, so the
 * numbers shown are the numbers written. Keyed on the *serialised* json: the
 * object is rebuilt on every render, so depending on it would re-bake, set
 * state, re-render and re-bake forever. Null until the current draft's bake
 * has landed.
 */
function useLivePreview(json: VaultCharacterJson): Preview | null {
  const compendium = useCompendium()
  const key = JSON.stringify(json)
  const [preview, setPreview] = useState<Preview | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const built = await buildVaultSheet(JSON.parse(key) as VaultCharacterJson, compendium, PREVIEW_ID)
        if (!cancelled) setPreview({ key, built, error: null })
      } catch (err) {
        if (!cancelled) setPreview({ key, built: null, error: err instanceof Error ? err.message : String(err) })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [key, compendium])

  return preview?.key === key ? preview : null
}

/** Design D's right-hand sheet: who, what, and the four numbers a choice moves. */
function LiveSheet({ sheet, pending }: { sheet: BuiltSheet['sheet'] | null; pending: boolean }) {
  const name = sheet?.name || 'Unnamed'
  return (
    <div className="bst-detail-head">
      <div className="bst-detail-id">
        <span aria-hidden="true" className="bst-token bst-token--lg bst-bsheet-token">
          {name.charAt(0).toUpperCase()}
        </span>
        <div className="bst-detail-names">
          <h3 className="bst-detail-name">{name}</h3>
          <span className="bst-detail-sub">{sheet ? [sheet.race, sheet.classes].filter(Boolean).join(' · ') : pending ? 'Working out the sheet…' : '—'}</span>
        </div>
      </div>
      <dl className="bst-bsheet-tiles">
        <Stat label="HP" value={sheet?.hp.max} />
        <Stat label="AC" value={sheet?.ac} />
        <Stat label="PB" value={sheet ? fmtMod(sheet.proficiency_bonus) : null} />
        <Stat label="DC" value={sheet?.spellcasting?.dc} />
      </dl>
      <span className="bst-note">Updates as you choose.</span>
    </div>
  )
}

function stepSubLabel(
  key: StepKey,
  { draft, json, openChoices, kit }: { draft: BuilderDraft; json: VaultCharacterJson; openChoices: OpenChoice[]; kit: string | null },
): string {
  switch (key) {
    case 'species':
      return draft.race?.name ?? 'not chosen'
    case 'class':
      return draft.classes.filter(c => c.id).map(c => `${c.name} ${c.level}`).join(' / ') || 'not chosen'
    case 'features': {
      const n = openChoices.filter(c => c.step === 'features').length
      return n === 0 ? 'all answered' : `${n} to choose`
    }
    case 'background':
      return draft.background?.name ?? 'not chosen'
    case 'abilities':
      return draft.abilityMethod === 'pointbuy' ? 'point buy' : draft.abilityMethod === 'standard' ? 'standard array' : 'manual'
    case 'equipment':
      return kit ? `option ${kit.toUpperCase()}` : 'from the kit'
    case 'spells': {
      const n = openChoices.filter(c => c.step === 'spells').length
      return n === 0 ? 'chosen' : 'to choose'
    }
    default:
      return json.name ? 'check and save' : 'check'
  }
}
