import { useState } from 'react'

import { isAsiFeat } from '../../choices'
import { useCompendium } from '../../compendium/host'
import type { Sheet, VaultCharacterJson } from '../../characterModel'
import { useCatalogRows, useDetails } from '../../platform/host'
import { useCharacters } from './context'
import { removableFeats, sheetFeatKey, withFeatAdded, withFeatRemoved } from '../../characterModel'
import { FeatQuestions, isRepeatableFeat, useFeatQuestions } from './FeatQuestions'

/**
 * Add and remove a Vault character's feats from the Features tab (MYDND-58) —
 * the web sheet's feat controls. A D&D Beyond character's feats are D&D
 * Beyond's, so this is not offered there.
 *
 * Every change is one `saveVaultCharacter`, the builder's own save: the choices
 * are rewritten and the sheet re-baked in the same write, so a feat's effects
 * (Tough's hit points, an ability increase) land with it and leave with it.
 *
 * **It asks what the builder asks** (MYDND-274, shared via `FeatQuestions` in
 * MYDND-276): Magic Initiate's list, ability and spells, Skilled's three
 * proficiencies, through the builder's own `OriginFeatChoices`. Before, a feat
 * added here was saved with no answer and granted nothing its choices decide.
 * And a feat whose note says Repeatable stays in the list once held, as the
 * builder's background step allows.
 */

export function FeatEditor({ json, notePath, sheet }: { json: VaultCharacterJson; notePath: string; sheet: Sheet }) {
  const compendium = useCompendium()
  const { saveVaultCharacter } = useCharacters()
  const featRows = useCatalogRows(() => compendium.feats.list())
  const [adding, setAdding] = useState(false)
  const [pickId, setPickId] = useState('')
  const [confirming, setConfirming] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const removable = removableFeats(json)
  const heldIds = [...new Set(removable.map(f => f.id))]
  // The held feats' notes, for which of them say Repeatable.
  const held = useDetails(compendium.feats, heldIds)
  const taken = new Set(heldIds.filter(id => !isRepeatableFeat(held.details.get(id)?.fence)))
  const totalLevel = (Array.isArray(json.classes) ? json.classes : []).reduce((sum, c) => sum + (c?.level ?? 0), 0)
  // An Epic Boon is a feat of level 19 and up; anything else is offered at any
  // level, bar the ASI's own note, which models nothing. Held, it is still
  // listed above, and offered again only if it is repeatable.
  const pool = featRows
    .filter(f => !taken.has(f.id) && !isAsiFeat(f) && (f.kind !== 'epic_boon' || totalLevel >= 19))
    .sort((a, b) => a.name.localeCompare(b.name))

  const picked = featRows.find(f => f.id === pickId) ?? null
  const questions = useFeatQuestions(picked, json, sheet)
  const ready = !held.loading && questions.complete

  function reset(): void {
    setAdding(false)
    setPickId('')
    questions.reset()
  }

  async function save(next: VaultCharacterJson): Promise<void> {
    setBusy(true)
    try {
      await saveVaultCharacter(next, notePath)
    } finally {
      setBusy(false)
    }
  }

  async function add(): Promise<void> {
    if (!picked) return
    await save(
      withFeatAdded(
        json,
        { id: picked.id, name: picked.name, source: picked.source },
        questions.addition(heldIds.includes(picked.id)),
      ),
    )
    reset()
  }

  /** True when a feature (an Ability Score Improvement) took the feat, not the sheet. */
  const takenAtFeature = (featId: string) =>
    Object.entries((json.featureChoices as Record<string, { featId?: string } | null> | undefined) ?? {}).some(
      ([key, v]) => v?.featId === featId && key !== sheetFeatKey(featId),
    )

  return (
    <div className="flex flex-col gap-2">
      {removable.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {removable.map((f, i) => (
            <li key={`${f.id}-${i}`} className="flex flex-wrap items-center gap-2 text-smaller">
              <span className="flex-1 text-normal">{f.name}</span>
              {confirming === (f.key ?? f.id) ? (
                <>
                  <span className="text-muted">
                    {takenAtFeature(f.id)
                      ? 'Remove it? The Ability Score Improvement that took it will be unanswered again.'
                      : 'Remove it?'}
                  </span>
                  <button type="button" disabled={busy} onClick={() => setConfirming(null)}>
                    Keep
                  </button>
                  <button
                    type="button"
                    className="mod-warning"
                    disabled={busy}
                    onClick={() => void save(withFeatRemoved(json, f.id, f.key)).then(() => setConfirming(null))}
                  >
                    {busy ? 'Saving…' : `Remove ${f.name}`}
                  </button>
                </>
              ) : (
                <button type="button" disabled={busy} onClick={() => setConfirming(f.key ?? f.id)}>
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {adding ? (
        <section
          aria-label="Add a feat"
          className="flex flex-col gap-2 rounded-obs-m border border-background-modifier-border p-3"
        >
          <label className="flex flex-col gap-1 text-smaller text-muted">
            Feat
            <select
              className="dropdown w-full"
              aria-label="Feat"
              value={pickId}
              onChange={e => {
                setPickId(e.target.value)
                questions.reset()
              }}
            >
              <option value="">{pool.length === 0 ? 'No feats exported' : '— Choose a feat'}</option>
              {pool.map(f => (
                <option key={f.id} value={f.id}>
                  {f.prerequisite ? `${f.name} (${f.prerequisite})` : f.name}
                </option>
              ))}
            </select>
          </label>

          <FeatQuestions questions={questions} sheet={sheet} />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={reset}
            >
              Cancel
            </button>
            <button type="button" className="mod-cta" disabled={busy || !ready} onClick={() => void add()}>
              {busy ? 'Saving…' : picked ? `Add ${picked.name}` : 'Add feat'}
            </button>
          </div>
        </section>
      ) : (
        <div>
          <button type="button" disabled={busy} onClick={() => setAdding(true)}>
            + Add feat
          </button>
        </div>
      )}
    </div>
  )
}
