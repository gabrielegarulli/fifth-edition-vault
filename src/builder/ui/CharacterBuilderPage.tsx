// The Character Builder page: the draft, the step tabs, and saving the result
// as a Vault character.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Notice } from 'obsidian'
import { useLocation, useNavigate } from 'react-router-dom'

import {
  backgroundEquipmentOptions,
  blankDraft,
  combinedEquipmentGrants,
  draftFromJson,
  equipmentOptions,
  itemRowForEquipment,
  kitComplete,
  openChoicesOf,
  saveErrors,
  scoreOverCapText,
  scoresOverCap,
  stepProblems,
  toVaultJson,
  visibleSteps,
  type BuilderDraft,
  type BuilderProblem,
  type StepContext,
  type StepKey,
} from '../../choices'
import { subclassesOf } from '../../compendium'
import { BUILDER_EDIT_PREFIX, SPELLS_STEP_HASH, sheetPath } from '../../platform'
import { useGo } from '../../platform/host'
import { useCompendium } from '../../compendium/host'
import { buildVaultSheet, type VaultCharacterJson } from '../../characterModel'
import { useCharacters } from '../../characters/host'
import { Message, useBuilderSources } from '../../choices/host'
import { ClassStep } from './ClassStep'
import { EquipmentStep } from './EquipmentStep'
import { SpellsStep } from './SpellsStep'
import { SpeciesStep } from './SpeciesStep'
import { BackgroundStep } from './BackgroundStep'
import { AbilitiesStep } from './AbilitiesStep'
import { ReviewStep, type Preview } from './ReviewStep'
import { BuilderHeader, type TabInfo, type TabState } from './BuilderHeader'

/** The id the preview is projected under. Never written — Create mints a real one. */
const PREVIEW_ID = 'local:preview'

/**
 * The Character Builder (MYDND-24) — the web app's `CharacterBuilder.jsx`,
 * rewritten for a pane rather than ported, and laid out like D&D Beyond's since
 * MYDND-216: a sticky header with the step tabs and the name row, then one
 * centred 600px column with the step and, at its end, Back / Save / Next.
 *
 * **The draft lives in memory until the player saves.** The web builder
 * autosaves a database row after every step; here that would put a half-made
 * note into `characters/`, where the roster and Atlas would both
 * find it, and on the web build every write is a change Sync replays. So
 * nothing reaches the vault until a `saveVaultCharacter`, which bakes, projects
 * and writes both fences in one file write (ADR 0007). The portrait too: picking
 * one only sets the draft.
 *
 * **Save is on every step** (MYDND-116), gated only on what makes a character
 * at all — name, species, class (`saveErrors`), the builder's **errors**. Every
 * other open question is a **warning**, shown where it is answered and listed
 * on Review, and never stops a save or a step. A save on a middle step stays
 * in the builder; Review's save finishes on the sheet. Either way the next save
 * targets the path the first one returned.
 *
 * **Edit mode** re-opens a Vault character from its `vault-character` fence and
 * saves over the same note, keeping its `local:` id. Anything a saved character
 * carries that the builder does not model passes through untouched (`toVaultJson`).
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
  const { inventory: inventoryStore, saveVaultCharacter, pickPortrait } = useCharacters()
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLElement>(null)

  const [draft, setDraft] = useState<BuilderDraft>(() => (original ? draftFromJson(original) : blankDraft()))
  // The step is held by **key**, not position: Spells appears and disappears as
  // a caster is picked or removed, and an index would then point at the wrong step.
  // `#spells` opens on Spells: the level-up panel's way here, when a level
  // brings new spells to choose (MYDND-127).
  const { hash } = useLocation()
  const [stepKey, setStepKey] = useState<StepKey>(() => (hash === SPELLS_STEP_HASH ? 'spells' : 'class'))
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
  const isLast = stepIndex === steps.length - 1

  /** A new step starts at its top: the scroller is the page's, and it is kept across steps. */
  const goTo = (key: StepKey) => {
    setStepKey(key)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }

  const ctx: StepContext = {
    race,
    classFence: fences[0] ?? null,
    classFences: fences,
    background: backgroundRow,
    feats: featData,
    equipmentOption,
    backgroundEquipmentOption,
    equipmentOffered: kitOptions.length > 0,
    backgroundEquipmentOffered: backgroundKitOptions.length > 0,
  }

  // The questions still open — warnings, never a gate.
  const subclassCount = (i: number) => {
    const row = classSources[i]?.row
    return row ? subclassesOf(subclasses, row, classes).length : 0
  }
  const openChoices = openChoicesOf({ items: featureItems, draft, feats: featData, masteryCount, invocationCount, casters: casterList, fences, subclassCount, background: backgroundRow })
  // Not a question but the same kind of thing: said, and never a gate.
  const overCap = scoresOverCap(draft, featData).map(scoreOverCapText)

  // What stops a save: name, species and class. Open questions never do.
  const errors = saveErrors(draft)
  const blockers = errors.map(e => e.text)
  const warnings: BuilderProblem[] = [
    ...steps.flatMap(s => stepProblems(s.key, draft, ctx).map(text => ({ text, step: s.key }))),
    ...openChoices,
    ...overCap.map(text => ({ text, step: 'abilities' as const })),
  ]

  // Cheap — pure functions over the draft — so it is simply recomputed. The
  // preview keys its bake on the serialised result, not on this object.
  const json = toVaultJson(draft, { classSources, subclassFences: contexts.map(c => c.subclassFence), race, background: backgroundRow, original })

  // The kit is handed over once: `granted` is stamped into the json written
  // with it, so a later Save of this character hands over nothing. A kit with
  // a line still open waits for a save that has it answered.
  const kitKey =
    [equipmentOption?.key, backgroundEquipmentOption?.key].filter((k): k is string => Boolean(k)).join(' + ') || null
  const grants =
    kitKey && !draft.equipment.granted && kitComplete(draft, ctx)
      ? combinedEquipmentGrants(equipmentOption, backgroundEquipmentOption, draft.equipment)
      : null
  const willGrant = grants !== null && (grants.items.length > 0 || grants.gold > 0)

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

  const preview = useLivePreview(json)
  const sheet = preview?.built?.sheet ?? null

  // Each tab shows the worse of its step's messages, ✓ with none (MYDND-216).
  const tabs: TabInfo[] = steps.map(step => {
    const state: TabState = errors.some(e => e.step === step.key)
      ? 'error'
      : warnings.some(w => w.step === step.key)
        ? 'warning'
        : step.key === 'review'
          ? 'plain'
          : 'done'
    return { step, state }
  })
  // The step's own warnings, which each step places beside the control that answers it.
  const here = stepProblems(current.key, draft, ctx)

  /** Review's "Name the character" row: the name row is above every step. */
  const focusName = () => rootRef.current?.querySelector<HTMLInputElement>('[data-builder-name]')?.focus()
  const jump = (step: BuilderProblem['step']) => (step === 'name' ? focusName() : goTo(step))

  const saveLabel = busy ? 'Saving…' : savedPath ? 'Save' : 'Create character'
  const nav = (
    <footer className="bst-cb-foot">
      <div className="bst-cb-nav">
        <button type="button" className="bst-plain bst-btn-secondary" disabled={busy || stepIndex === 0} onClick={() => goTo(steps[stepIndex - 1].key)}>
          Back
        </button>
        {isLast ? (
          <button
            type="button"
            className="bst-plain bst-btn-primary bst-cb-next"
            disabled={busy || loading || blockers.length > 0}
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
              onClick={() => void create({ finish: false })}
            >
              {saveLabel}
            </button>
            <button type="button" className="bst-plain bst-btn-primary bst-cb-next" disabled={busy} onClick={() => goTo(steps[stepIndex + 1].key)}>
              Next: {steps[stepIndex + 1].label}
            </button>
          </>
        )}
      </div>
      {blockers.length > 0 ? (
        <Message kind="error">Save needs {needs(errors)}. Open questions never stop it.</Message>
      ) : (
        <p className="bst-cb-note">
          {savedPath
            ? `Saves to ${savedPath}`
            : 'Saving keeps you here. Nothing is written to characters/ until you save.'}
        </p>
      )}
    </footer>
  )

  return (
    <div ref={rootRef} className="bst bst-cb">
      <BuilderHeader
        title={editPath ? `Edit ${original?.name ?? 'character'}` : 'New character'}
        tabs={tabs}
        current={current.key}
        onStep={goTo}
        name={draft.name}
        onName={name => setDraft(d => ({ ...d, name }))}
        nameMissing={!draft.name.trim()}
        portrait={draft.portrait ?? null}
        pickPortrait={pickPortrait}
        onPortrait={portrait => setDraft(d => ({ ...d, portrait }))}
      />

      <main ref={scrollRef} className="my-dnd-vault__scroll bst-cb-main">
        <div className="bst-cb-col">
          {current.key === 'species' && (
            <SpeciesStep
              draft={draft}
              setDraft={setDraft}
              rows={species}
              race={race}
              problems={here}
              weaponNames={weaponNames}
              feat={{ feats, featData, scores, spellsFor, spells }}
            />
          )}
          {current.key === 'class' && (
            <ClassStep
              draft={draft}
              setDraft={setDraft}
              rows={classes}
              subclasses={subclasses}
              fences={fences}
              contexts={contexts}
              feats={featData}
              features={{
                draft,
                setDraft,
                items: featureItems,
                feats,
                featData,
                scores,
                skillSources,
                masteryCount,
                masteryWeapons,
                invocationCount,
                spellsFor,
                spells,
                familiars,
                onFamiliar,
                companions,
                weaponNames,
              }}
              summary={<ClassSummary draft={draft} json={json} maxHp={sheet?.hp.max ?? null} />}
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
              open={openChoices.filter(c => c.step === 'background')}
            />
          )}
          {current.key === 'abilities' && (
            <AbilitiesStep
              draft={draft}
              setDraft={setDraft}
              feats={featData}
              background={backgroundRow}
              overCap={overCap}
              problems={here}
              open={openChoices.filter(c => c.step === 'abilities')}
              sets={preview?.built?.abilitySets ?? {}}
            />
          )}
          {current.key === 'equipment' && (
            <EquipmentStep
              draft={draft}
              setDraft={setDraft}
              options={kitOptions}
              backgroundOptions={backgroundKitOptions}
              items={items}
            />
          )}
          {current.key === 'spells' && (
            <>
              <h3 className="bst-cb-h1">Spells</h3>
              <p className="bst-cb-lede">Shown while a class casts. Each list is that class&apos;s.</p>
              {openChoices
                .filter(c => c.step === 'spells')
                .map(c => (
                  <Message key={c.text} kind="warning">
                    {c.text}: still to choose
                  </Message>
                ))}
              <SpellsStep draft={draft} setDraft={setDraft} casters={casterList} spellsFor={spellsFor} />
            </>
          )}
          {current.key === 'review' && (
            <ReviewStep
              preview={preview}
              draft={draft}
              errors={errors}
              warnings={warnings}
              stepLabel={key => steps.find(s => s.key === key)?.label ?? key}
              onJump={jump}
              kit={willGrant && grants && kitKey ? { key: kitKey, ...grants } : null}
            />
          )}

          {loading ? <p className="bst-cb-note">Reading the notes…</p> : null}
          {nav}
        </div>
      </main>
    </div>
  )
}

/** "a name, a species and a class", from the errors left. */
function needs(errors: readonly BuilderProblem[]): string {
  const words = errors.map(e => (e.step === 'name' ? 'a name' : e.step === 'species' ? 'a species' : 'a class'))
  return words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}` : words.join('')
}

/**
 * Above the class cards, as D&D Beyond draws it: the character's level, the
 * class line, and the two numbers a class sets, Max HP and Hit Dice. The HP is
 * the preview's bake, so it is the number Create writes.
 */
function ClassSummary({ draft, json, maxHp }: { draft: BuilderDraft; json: VaultCharacterJson; maxHp: number | null }) {
  const picked = draft.classes.filter(c => c.id)
  const level = picked.reduce((n, c) => n + c.level, 0)
  const dice = new Map<number, number>()
  for (const c of json.classes ?? []) {
    const die = Number((c as { hit_die?: unknown }).hit_die)
    if (Number.isFinite(die) && die > 0) dice.set(die, (dice.get(die) ?? 0) + Number((c as { level?: unknown }).level ?? 0))
  }
  const hitDice = [...dice].map(([die, n]) => `${n}d${die}`).join(' + ')
  return (
    <section aria-label="Character level" className="bst-cb-card bst-cb-summary">
      <div>
        <h3 className="bst-cb-card-title">Character level {level}</h3>
        <p className="bst-cb-card-sub">
          {picked.map(c => `${c.name ?? 'Class'}${c.subclass ? ` (${c.subclass.name})` : ''} ${c.level}`).join(' / ')}
        </p>
      </div>
      <dl className="bst-cb-summary-stats">
        <div>
          <dt>Max HP</dt>
          <dd>{maxHp ?? '—'}</dd>
        </div>
        <div>
          <dt>Hit Dice</dt>
          <dd>{hitDice || '—'}</dd>
        </div>
      </dl>
    </section>
  )
}

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
