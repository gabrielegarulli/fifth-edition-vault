import { useState } from 'react'
import { ABILITY_FULL, SIZE_FULL, abilityOptions, lineageOptions, sizeOptions } from '@vault/derive/speciesChoices.js'

import { pickableSpecies, withRaceChoice, withSpecies, type BuilderDraft, type StepContext } from '../../choices'
import { useCompendium } from '../../compendium/host'
import { sourceLabel, type SpeciesRow } from '../../compendium'
import { stripPreamble } from '../../platform'
import { useDetail } from '../../platform/host'
import { Banner, Message, OptionSelect, TraitsPreview, type SetDraft } from '../../choices/host'
import { ConfirmDialog, firstParagraph, firstSentence } from './ConfirmDialog'
import { Initial, ShelfList } from './ShelfList'

export function SpeciesStep({
  draft,
  setDraft,
  rows,
  race,
  problems,
}: {
  draft: BuilderDraft
  setDraft: SetDraft
  rows: readonly SpeciesRow[]
  race: StepContext['race']
  /** The step's warnings, placed under the controls that answer them. */
  problems: readonly string[]
}) {
  const compendium = useCompendium()
  const [changing, setChanging] = useState(false)
  const [legacy, setLegacy] = useState(false)
  const [pending, setPending] = useState<{ row: SpeciesRow; from: HTMLElement } | null>(null)
  const { detail } = useDetail(compendium.species, pending?.row.id ?? null)
  const picked = rows.find(r => r.id === draft.race?.id) ?? null
  const listing = !draft.race || changing

  const traitNames = (detail?.fence?.traits ?? []).map(t => t.name).filter((n): n is string => Boolean(n))
  const creatureType = (detail?.fence?.traits ?? []).find(t => /creature type/i.test(t.name ?? ''))?.text

  return (
    <>
      {listing ? (
        <>
          <h3 className="bst-cb-h1">Choose a species</h3>
          <p className="bst-cb-lede">Grouped by where each species comes from. Picking one shows it before it is chosen.</p>
          {!draft.race ? <Banner kind="error">A species is needed before the character can be saved.</Banner> : null}
          {changing && draft.race ? (
            <p className="bst-cb-back">
              <button type="button" className="bst-plain bst-cb-link" onClick={() => setChanging(false)}>
                ‹ Keep {draft.race.name}
              </button>
            </p>
          ) : null}
          <ShelfList
            noun="species"
            rows={pickableSpecies(rows, draft.race?.id ?? null)}
            keep={[draft.race?.id]}
            onOpen={(row, from) => setPending({ row, from })}
            hideShelf={s => !legacy && s.kind === 'legacy'}
            tools={
              <button type="button" role="switch" aria-checked={legacy} className="bst-plain bst-cb-switch" onClick={() => setLegacy(l => !l)}>
                <span aria-hidden="true" className={legacy ? 'bst-cb-switch-track bst-cb-switch-track--on' : 'bst-cb-switch-track'}>
                  <span className="bst-cb-switch-dot" />
                </span>
                Show legacy content (5e)
              </button>
            }
          />
        </>
      ) : (
        <SpeciesCard draft={draft} setDraft={setDraft} row={picked} race={race} problems={problems} onChange={() => setChanging(true)} />
      )}

      {pending ? (
        <ConfirmDialog
          title="Choose species"
          name={pending.row.name}
          book={pending.row.source ? sourceLabel(pending.row.source) : 'No book named'}
          pitch={detail ? firstSentence(stripPreamble(detail.prose)) : null}
          facts={[
            ...(pending.row.size ? [{ label: 'Size', value: pending.row.size }] : []),
            ...(pending.row.speed != null ? [{ label: 'Speed', value: `${pending.row.speed} feet` }] : []),
            ...(creatureType ? [{ label: 'Creature type', value: firstParagraph(creatureType).replace(/\.$/, '') }] : []),
          ]}
          listTitle="Traits"
          confirmText="Choose species"
          onConfirm={() => {
            setDraft(d => withSpecies(d, pending.row))
            setChanging(false)
            setPending(null)
          }}
          onClose={() => setPending(null)}
          returnTo={pending.from}
        >
          {detail === null ? (
            <p className="bst-cb-note">Reading the note…</p>
          ) : traitNames.length > 0 ? (
            <div className="bst-cb-tags">
              {traitNames.map(n => (
                <span key={n} className="bst-cb-tag">
                  {n}
                </span>
              ))}
            </div>
          ) : (
            <p className="bst-cb-note">The note names no traits.</p>
          )}
        </ConfirmDialog>
      ) : null}
    </>
  )
}

function SpeciesCard({
  draft,
  setDraft,
  row,
  race,
  problems,
  onChange,
}: {
  draft: BuilderDraft
  setDraft: SetDraft
  row: SpeciesRow | null
  race: StepContext['race']
  /** `stepProblems('species')`: each is shown under its own select. */
  problems: readonly string[]
  onChange: () => void
}) {
  const compendium = useCompendium()
  const sizes = sizeOptions(race)
  const lineages = lineageOptions(race) as Array<{ name: string; benefit: string }>
  const abilities = abilityOptions(race)
  const benefit = lineages.find(l => l.name === draft.race?.subrace)?.benefit
  const name = draft.race?.name ?? row?.name ?? 'Species'
  const asks = sizes.length > 1 || lineages.length > 0 || abilities.length > 0

  return (
    <section aria-label={name} className="bst-cb-card bst-cb-kvcard">
      <div className="bst-cb-card-h">
        <Initial name={name} large />
        <div className="bst-cb-card-names">
          <h3 className="bst-cb-card-title">{name}</h3>
          <p className="bst-cb-card-sub">
            {[row?.source ? sourceLabel(row.source) : null, row?.size, row?.speed != null ? `Speed ${row.speed} ft.` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <span className="bst-spacer" />
        <button type="button" className="bst-plain bst-btn-secondary" onClick={onChange}>
          Change
        </button>
      </div>

      <h4 className="bst-cb-sub">Traits</h4>
      <TraitsPreview catalog={compendium.species} row={row} />

      <h4 className="bst-cb-sub">Choices</h4>
      {asks ? (
        <div className="bst-cb-grid2">
          {sizes.length > 1 ? (
            <div>
              <OptionSelect
                label="Size"
                value={draft.race?.size ?? ''}
                placeholder="— Choose"
                options={sizes.map(s => ({ value: s, label: SIZE_FULL[s] ?? s }))}
                onChange={v => setDraft(d => withRaceChoice(d, { size: v || null }))}
              />
              {problems.includes('Choose a size') ? <Message kind="warning">Still to choose</Message> : null}
            </div>
          ) : null}
          {lineages.length > 0 ? (
            <div>
              <OptionSelect
                label="Lineage"
                value={draft.race?.subrace ?? ''}
                placeholder="— Choose"
                options={lineages.map(l => ({ value: l.name, label: l.name }))}
                onChange={v => setDraft(d => withRaceChoice(d, { subrace: v || null, cantrip: null }))}
              />
              {problems.includes('Choose a lineage') ? <Message kind="warning">Still to choose</Message> : null}
            </div>
          ) : null}
          {abilities.length > 0 ? (
            <div>
              <OptionSelect
                label="Species spellcasting ability"
                value={draft.race?.spellcastingAbility ?? ''}
                placeholder="— Choose"
                options={abilities.map(a => ({ value: a, label: ABILITY_FULL[a] ?? a }))}
                onChange={v => setDraft(d => withRaceChoice(d, { spellcastingAbility: v || null }))}
              />
              {problems.includes('Choose a spellcasting ability') ? <Message kind="warning">Still to choose</Message> : null}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="bst-cb-note">No choices to make.</p>
      )}
      {benefit ? <p className="bst-cb-note bst-cb-pre">{benefit}</p> : null}
    </section>
  )
}
