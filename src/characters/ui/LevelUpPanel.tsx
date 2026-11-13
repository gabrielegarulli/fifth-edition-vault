import { isLevelUpReady } from '@vault/derive/xpTable.js'
import { Notice } from 'obsidian'
import { useEffect, useState, type ReactNode } from 'react'

import { itemComplete, draftFromJson, type BuilderDraft } from '../../choices'
import { subclassesOf, type ClassFence, type SubclassFence } from '../../compendium'
import { useCompendium } from '../../compendium/host'
import {
  dueAnswers,
  featuresGained,
  levelItemsDue,
  levelUpProblems,
  levelUpVaultJson,
  nextClassLevel,
  nextTotalLevel,
  pendingChoices,
  spellsShort,
  subclassDue,
} from '../model/levelUp'
import { FeaturesStep, useBuilderSources } from '../../choices/host'
import { useGo } from '../../platform/host'
import { builderSpellsPath } from '../../platform'
import { isLocalId, buildVaultSheet, type VaultCharacterJson } from '../../characterModel'
import { useCharacters } from './context'

/**
 * Levelling up, under the XP bar (MYDND-25).
 *
 * **Only a Vault character levels here.** Its choices are its own
 * ` ```vault-character ` fence, so a level written into it is re-projected into
 * the sheet and stays. A D&D Beyond character's sheet is replaced on every
 * re-sync, so a level gained here would be undone; for those the panel says
 * where to level instead, once XP says a level is due, and offers nothing.
 *
 * A Vault character is offered the button whether or not XP is tracked —
 * plenty of tables level by milestone, and `xp === null` is how that looks.
 *
 * Inline rather than a modal: the sheet is a long scroll already, and the
 * player wants the numbers above it while deciding.
 *
 * **The level's questions are answered here** (MYDND-127): an ASI or feat,
 * expertise, a fighting style, invocations, Elemental Affinity — with the
 * builder's own Features-step pickers over a builder draft of the character,
 * saved with the level in one `saveVaultCharacter`. Before, each was named and
 * left for Edit, and levelling 1 → 20 was an Edit round trip at almost every
 * level. New spells still go to the builder's Spells step.
 */
export function LevelUp({
  notePath,
  ddbId,
  xp,
  level,
}: {
  notePath: string
  ddbId: string
  xp: number | null
  level: number
}) {
  const [open, setOpen] = useState(false)

  if (!isLocalId(ddbId)) {
    if (xp === null || !(isLevelUpReady(xp, level) as boolean)) return null
    return (
      <p className="text-smaller text-muted">
        This character levels on D&amp;D Beyond — level up there, then Re-sync. The sheet here mirrors it, so a level
        gained here would be undone by the next re-sync.
      </p>
    )
  }

  if (!open) {
    return (
      <div>
        <button type="button" className="btn-ui-primary" onClick={() => setOpen(true)}>
          Level up
        </button>
      </div>
    )
  }
  // Mounted only while open, so every field starts from the note as it is now.
  return <LevelUpLoader notePath={notePath} onClose={() => setOpen(false)} />
}

function LevelUpLoader({ notePath, onClose }: { notePath: string; onClose(): void }) {
  const { characters } = useCharacters()
  const [loaded, setLoaded] = useState<{ json: VaultCharacterJson | null; error: string | null } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const json = await characters.readVaultCharacter(notePath)
        if (!cancelled) setLoaded({ json, error: null })
      } catch (err) {
        if (!cancelled) setLoaded({ json: null, error: err instanceof Error ? err.message : String(err) })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [characters, notePath])

  if (loaded === null) return <Shell onClose={onClose}>Reading the note…</Shell>
  if (loaded.json === null) {
    return (
      <Shell onClose={onClose}>
        <span className="text-error">Could not read the character: {loaded.error}</span>
      </Shell>
    )
  }
  const problems = levelUpProblems(loaded.json)
  if (problems.length > 0) return <Shell onClose={onClose}>{problems.join(' · ')}</Shell>
  return <LevelUpForm notePath={notePath} json={loaded.json} onClose={onClose} />
}

function Shell({ onClose, children }: { onClose(): void; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-obs-m border border-background-modifier-border p-3">
      <div className="text-smaller text-muted">{children}</div>
      <div>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}

type Built = { key: string; before: number; after: number; error: null } | { key: string; error: string }

function LevelUpForm({ notePath, json, onClose }: { notePath: string; json: VaultCharacterJson; onClose(): void }) {
  const compendium = useCompendium()
  const { saveVaultCharacter } = useCharacters()
  const go = useGo()
  const classes = json.classes ?? []

  const [index, setIndex] = useState(0)
  // A subclass picked here belongs to the class it was picked for, so it is
  // tagged with that index and simply stops applying when the index changes —
  // a reset that falls out of rendering rather than out of an effect.
  const [picked, setPicked] = useState<{ index: number; id: string; name: string } | null>(null)
  const [busy, setBusy] = useState(false)
  // The character as the builder sees it, and the draft the pickers answer
  // into. Answers are never reset: `dueAnswers` writes only the due ones.
  const [before] = useState(() => draftFromJson(json))
  const [answers, setAnswers] = useState<BuilderDraft>(before)

  const cls = classes[index]
  const pick = picked?.index === index && !cls?.subclass ? picked : null
  // The draft one level up — what the pickers read their counts and levels off.
  const levelled: BuilderDraft = {
    ...answers,
    classes: answers.classes.map((c, i) =>
      i === index ? { ...c, level: c.level + 1, subclass: c.subclass ?? (pick ? { id: pick.id, name: pick.name } : null) } : c,
    ),
  }
  const sources = useBuilderSources(levelled, setAnswers)

  const classFence: ClassFence | null = sources.fences[index] ?? null
  const classRow = sources.classes.find(c => c.id === cls?.id) ?? null
  const subclassOptions = classRow ? subclassesOf(sources.subclasses, classRow, sources.classes) : []
  const subclassId = levelled.classes[index]?.subclass?.id ?? null
  const subclassFence: SubclassFence | null = sources.contexts[index]?.subclassFence ?? null
  const due = subclassDue(json, index, classFence)

  const gained = cls?.id
    ? featuresGained(json, index, { classId: cls.id, classFence, subclassId, subclassFence })
    : []
  const items = levelItemsDue(before, levelled, sources.contexts, index, sources.featData)
  const next = levelUpVaultJson(json, index, {
    subclass: pick ? { id: pick.id, name: pick.name } : null,
    answers: dueAnswers(before, answers, items),
  })
  // Still open once the pickers are answered: a picker left blank, and any
  // gained feature asking something no picker models. Said, never a gate.
  const open = [
    ...items
      .filter(
        i =>
          !itemComplete(i, levelled, {
            feats: sources.featData,
            masteryCount: sources.masteryCount,
            invocationCount: sources.invocationCount(i.classIndex),
          }),
      )
      .map(i => i.feature.name),
    ...pendingChoices(json, gained)
      .filter(f => !items.some(i => i.feature.id === f.id))
      .map(f => f.name),
  ]
  const newSpells = spellsShort(before, levelled, sources.classSources, index, sources.contexts.map(c => c.subclassFence))

  // The preview bakes both the character as it is and as it would be, through
  // the same call the save makes, so the gain shown is the gain written. Keyed
  // on the serialised json: the object is rebuilt on every render.
  const key = JSON.stringify(next)
  const [built, setBuilt] = useState<Built | null>(null)
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const [before, after] = await Promise.all([
          buildVaultSheet(json, compendium, 'local:preview'),
          buildVaultSheet(JSON.parse(key) as VaultCharacterJson, compendium, 'local:preview'),
        ])
        if (!cancelled) setBuilt({ key, before: before.sheet.hp.max, after: after.sheet.hp.max, error: null })
      } catch (err) {
        if (!cancelled) setBuilt({ key, error: err instanceof Error ? err.message : String(err) })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [key, json, compendium])
  const preview = built?.key === key ? built : null

  /** Save the level; `spells` then opens the builder's Spells step on the saved note. */
  const confirm = async ({ spells }: { spells: boolean }): Promise<void> => {
    setBusy(true)
    try {
      const path = await saveVaultCharacter(next, notePath)
      if (path === null) return
      new Notice(`${json.name} is level ${nextTotalLevel(json)}`)
      onClose()
      if (spells) go(builderSpellsPath(path))
    } finally {
      setBusy(false)
    }
  }

  const title = classFence?.data?.subclassTitle ? String(classFence.data.subclassTitle) : 'Subclass'
  const blocked = busy || sources.loading || (preview !== null && preview.error !== null)

  return (
    <section
      aria-label="Level up"
      className="flex flex-col gap-3 rounded-obs-m border border-background-modifier-border p-3"
    >
      <h3 className="m-0 text-ui-medium font-semibold text-normal">Level {nextTotalLevel(json)}</h3>

      {classes.length > 1 ? (
        <div className="flex flex-wrap gap-1" role="group" aria-label="Class gaining the level">
          {classes.map((c, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={i === index}
              className={i === index ? 'btn-ui-primary-active' : 'btn-ui-primary'}
              onClick={() => setIndex(i)}
            >
              {c.name} {c.level} → {c.level + 1}
            </button>
          ))}
        </div>
      ) : (
        <p className="m-0 text-smaller text-normal">
          {cls?.name} {cls?.level} → {nextClassLevel(json, index)}
        </p>
      )}

      {due ? (
        <label className="flex flex-col gap-1 text-smaller text-muted">
          {title}
          <select
            className="dropdown w-full"
            aria-label={title}
            value={pick?.id ?? ''}
            onChange={e => {
              const row = subclassOptions.find(s => s.id === e.target.value)
              setPicked(row ? { index, id: row.id, name: row.name } : null)
            }}
          >
            <option value="">{subclassOptions.length === 0 ? 'No subclasses exported' : 'None yet'}</option>
            {subclassOptions.map(s => (
              <option key={s.id} value={s.id}>
                {s.source ? `${s.name} (${s.source})` : s.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {gained.length > 0 ? (
        <div className="text-smaller text-muted">
          You gain: <span className="text-normal">{gained.map(f => f.name).join(', ')}</span>
        </div>
      ) : null}

      {/* The builder's own Features-step pickers, in the builder's palette:
          `.bst-embed` takes `.bst`'s tokens without its full-height page frame. */}
      {items.length > 0 ? (
        <div className="bst bst-embed">
          <FeaturesStep
            draft={levelled}
            setDraft={setAnswers}
            items={items}
            feats={sources.feats}
            featData={sources.featData}
            scores={sources.scores}
            skillSources={sources.skillSources}
            masteryCount={sources.masteryCount}
            masteryWeapons={sources.masteryWeapons}
            invocationCount={sources.invocationCount}
            spellsFor={sources.spellsFor}
            spells={sources.spells}
            familiars={sources.familiars}
            onFamiliar={sources.onFamiliar}
            companions={sources.companions}
            weaponNames={sources.weaponNames}
          />
        </div>
      ) : null}

      {/* Named rather than blocked: the level, its hit points and its subclass
          are right without these, and a missing +2 the player can see is
          better than a level they cannot take. */}
      {open.length > 0 ? (
        <p role="status" className="m-0 text-smaller text-warning">
          Still to choose: {open.join(', ')}. The level is gained without it; answer it later from Edit.
        </p>
      ) : null}

      {newSpells ? (
        <p className="m-0 text-smaller text-muted">
          This level brings spells to choose, on the builder's Spells step: gain the level, then choose them there.
        </p>
      ) : null}

      <div className="text-smaller text-muted">
        {preview === null ? (
          'Working out hit points…'
        ) : preview.error !== null ? (
          <span className="text-error">Could not work out the sheet: {preview.error}</span>
        ) : (
          <>
            Hit points{' '}
            <span className="tabular-nums text-normal">
              {preview.before} → {preview.after}
            </span>{' '}
            (+{preview.after - preview.before}, current rises with it)
          </>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" disabled={busy} onClick={onClose}>
          Cancel
        </button>
        {newSpells ? (
          <button type="button" disabled={blocked} onClick={() => void confirm({ spells: true })}>
            Gain and choose spells
          </button>
        ) : null}
        <button type="button" className="mod-cta" disabled={blocked} onClick={() => void confirm({ spells: false })}>
          {busy ? 'Saving…' : `Gain level ${nextTotalLevel(json)}`}
        </button>
      </div>
    </section>
  )
}
