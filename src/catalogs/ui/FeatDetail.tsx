import { useState } from 'react'

import { isAsiFeat } from '../../choices'
import { coverage, prerequisiteParts, raisesChip } from '../model/featShelves'
import { featKindLabel, countsFromFence, type FeatBenefit, type FeatRow } from '../../compendium'
import { useCompendium, FeatBenefits } from '../../compendium/host'
import { useDetail, useVaultGeneration, openNote, useObsidian } from '../../platform/host'
import {
  useRoster,
  useVaultCharacterJson,
  useCharacters,
  useOptionalCharacters,
  abilityAnswered,
  abilityBonus,
  FeatAbilityQuestion,
  useFeatAbilityChoice,
} from '../../characters/host'
import { isLocalId, withFeatAdded } from '../../characterModel'
import { CoverageMeter } from './FeatCards'

/**
 * One feat, opened from a shelf (MYDND-62, design A's right-hand panel).
 *
 * Header: the name, kind · source, then the prerequisite and what it raises as
 * chips, then how much of it the sheet applies. Body: the benefits, numbered,
 * each marked **On sheet** (it carries an effect the app acts on) or **Prose
 * only**. Footer: add it to a Vault character, or open the note.
 *
 * The coverage line here is counted from the **fence**, through the same
 * `splitBenefits` the list beneath it is drawn from, so the number and the list
 * cannot disagree. A card counts from frontmatter, which a note exported before
 * the exporter learned the intro rule overstates by one.
 *
 * Drawn in the canvas's palette with the Bestiary's `.bst-*` classes
 * (MYDND-65), so it must sit inside the page's `.bst` root.
 */
export function FeatDetail({ feat, onClose }: { feat: FeatRow; onClose: () => void }) {
  const app = useObsidian()
  const compendium = useCompendium()
  const host = useOptionalCharacters()
  const { detail, loading } = useDetail(compendium.feats, feat.id)
  const [adding, setAdding] = useState(false)
  // Added on its own the ASI's note does nothing, so it is not offered here either.
  const addable = host && !isAsiFeat(feat)

  const counts = detail?.fence ? countsFromFence(detail.fence) : null
  const c = counts ? coverage({ benefitCount: counts.benefits, modelledCount: counts.modelled }) : coverage(feat)
  const amount = amountOf(detail?.fence?.benefits)
  const chips = [...prerequisiteParts(feat.prerequisite)]
  const raises = raisesChip(feat.abilities, amount)

  return (
    <>
      <div className="bst-detail-head bst-detail-head--feat">
        <div className="bst-detail-id">
          <div className="bst-detail-names">
            <h3 className="bst-detail-name">{feat.name}</h3>
            <span className="bst-detail-sub">{[featKindLabel(feat.kind), feat.source].filter(Boolean).join(' · ')}</span>
          </div>
          <button type="button" aria-label="Close" className="bst-plain bst-close" onClick={onClose}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {(chips.length > 0 || raises) && (
          <ul aria-label="Prerequisites and raises" className="bst-chips">
            {chips.map(chip => (
              <li key={chip} className="bst-chip">
                {chip}
              </li>
            ))}
            {raises && <li className="bst-chip bst-chip--accent">{raises}</li>}
          </ul>
        )}

        {c && c.benefits > 0 && (
          <p className="bst-coverage bst-coverage--wide">
            <CoverageMeter coverage={c} wide />
            {coverageSentence(c.applied, c.benefits)}
          </p>
        )}
      </div>

      <div className="my-dnd-vault__scroll bst-detail-scroll">
        <FeatBenefits feat={feat} detail={detail} loading={loading} />
      </div>

      <div className="bst-detail-foot">
        {adding && host ? <AddToCharacter feat={feat} onCancel={() => setAdding(false)} /> : null}
        <div className="bst-foot-row">
          {addable && !adding ? (
            <button type="button" className="bst-plain bst-btn-primary" onClick={() => setAdding(true)}>
              Add to a character…
            </button>
          ) : null}
          <button
            type="button"
            className={addable && !adding ? 'bst-plain bst-btn-secondary' : 'bst-plain bst-btn-secondary bst-grow'}
            onClick={() => openNote(app, feat.path)}
          >
            Open note
          </button>
        </div>
      </div>
    </>
  )
}

/**
 * "Add to a character…" — the sheet's own add (MYDND-58), started from the
 * catalog instead of the sheet.
 *
 * **Vault characters only.** A D&D Beyond character's feats are D&D Beyond's:
 * a re-sync replaces them, so an add here would be silently undone. Epic Boons
 * wait for level 19, as on the sheet. Other prerequisites are not checked
 * there either — they are prose, and the table rules on them.
 */
function AddToCharacter({ feat, onCancel }: { feat: FeatRow; onCancel: () => void }) {
  const { saveVaultCharacter } = useCharacters()
  const { entries, loading: rosterLoading } = useRoster()
  const generation = useVaultGeneration()
  const characters = entries.filter(e => isLocalId(e.ddbId)).sort((a, b) => a.name.localeCompare(b.name))
  const [path, setPath] = useState('')
  const [ability, setAbility] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState<string | null>(null)

  const entry = characters.find(e => e.path === path) ?? null
  const json = useVaultCharacterJson(path, !!path, generation)
  const { choice, loading: choiceLoading } = useFeatAbilityChoice(feat)

  const feats = Array.isArray(json?.feats) ? json.feats : []
  const has = feats.some(f => f?.id === feat.id)
  const level = (Array.isArray(json?.classes) ? json.classes : []).reduce((sum, cl) => sum + (cl?.level ?? 0), 0)
  const tooLow = feat.kind === 'epic_boon' && !!json && level < 19
  const ready = !!json && !has && !tooLow && !choiceLoading && abilityAnswered(choice, ability)

  async function add(): Promise<void> {
    if (!json || !entry) return
    setBusy(true)
    try {
      const saved = await saveVaultCharacter(
        withFeatAdded(json, { id: feat.id, name: feat.name, source: feat.source }, abilityBonus(choice, ability)),
        path,
      )
      if (saved) setAdded(entry.name)
    } finally {
      setBusy(false)
    }
  }

  if (added) {
    return (
      <div className="bst-foot-row bst-foot-row--center">
        <span className="bst-grow">
          Added {feat.name} to {added}.
        </span>
        <button type="button" className="bst-plain bst-btn-secondary" onClick={onCancel}>
          Done
        </button>
      </div>
    )
  }

  return (
    <section aria-label={`Add ${feat.name} to a character`} className="bst-add">
      {!rosterLoading && characters.length === 0 ? (
        <p className="bst-note">
          No Vault characters to add it to. A D&amp;D Beyond character&rsquo;s feats come from D&amp;D Beyond.
        </p>
      ) : (
        <label className="bst-field">
          Character
          <select
            className="bst-select"
            aria-label="Character"
            value={path}
            onChange={e => {
              setPath(e.target.value)
              setAbility(null)
            }}
          >
            <option value="">{rosterLoading ? 'Reading the party…' : '— Choose a character'}</option>
            {characters.map(e => (
              <option key={e.path} value={e.path}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {has ? (
        <p className="bst-note">{entry?.name} already has {feat.name}.</p>
      ) : tooLow ? (
        <p className="bst-note">
          An Epic Boon needs level 19; {entry?.name} is level {level}.
        </p>
      ) : json ? (
        <FeatAbilityQuestion
          choice={choice}
          value={ability}
          onChange={setAbility}
          sheet={entry?.sheet ?? null}
          canvas
        />
      ) : null}

      <div className="bst-foot-row">
        <button type="button" className="bst-plain bst-btn-secondary" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="bst-plain bst-btn-primary" disabled={busy || !ready} onClick={() => void add()}>
          {busy ? 'Saving…' : entry ? `Add to ${entry.name}` : 'Add'}
        </button>
      </div>
    </section>
  )
}

function coverageSentence(applied: number, benefits: number): string {
  if (applied === 0) return benefits === 1 ? 'Its benefit is prose only' : `None of ${benefits} benefits is applied on the sheet`
  if (applied === benefits) return benefits === 1 ? 'Its benefit is applied on the sheet' : `All ${benefits} benefits are applied on the sheet`
  return `${applied} of ${benefits} benefits are applied on the sheet`
}

/** The `+N` of the feat's ability increase, from its fence. 1 when it does not say. */
function amountOf(benefits: FeatBenefit[] | undefined): number {
  for (const b of Array.isArray(benefits) ? benefits : []) {
    for (const e of b.effects ?? []) {
      if (e?.type === 'ability_score_choice' && typeof e.amount === 'number') return e.amount
    }
  }
  return 1
}
