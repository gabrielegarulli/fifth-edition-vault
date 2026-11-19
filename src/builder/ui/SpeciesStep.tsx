// The Character Builder's Species step: the shelves of species, the confirm
// dialog, and the picked species' card with every question it asks (size,
// lineage, version, spellcasting ability, and since MYDND-243 its skill, tool,
// language and weapon picks, and since MYDND-244 the feat a Human or a Custom
// Lineage chooses).

import { useState } from 'react'
import {
  ABILITY_FULL,
  SIZE_FULL,
  abilityOptions,
  fixedProficiencies,
  lineageOptions,
  PROFICIENCY_KINDS,
  proficiencyChoices,
  proficiencyPicks,
  proficiencyProblem,
  sizeOptions,
  speciesFeatGrant,
  speciesFeatText,
  versionOptions,
  versionProblem,
  versionQuestion,
} from '@vault/derive/speciesChoices.js'
import { toolName } from '@vault/derive/tools.js'

import {
  pickableSpecies,
  SKILL_NAME,
  speciesProficiencyOptions,
  withRaceChoice,
  withSpecies,
  withSpeciesProficiencyPicks,
  type BuilderDraft,
  type FeatData,
  type StepContext,
} from '../../choices'
import { useCompendium } from '../../compendium/host'
import { sourceLabel, type FeatRow, type SpeciesRow, type SpellRow } from '../../compendium'
import { stripPreamble } from '../../platform'
import { useDetail } from '../../platform/host'
import {
  Banner,
  Message,
  NoteProblems,
  OptionSelect,
  SlotSelects,
  SpeciesFeatPicker,
  TraitsPreview,
  type SetDraft,
} from '../../choices/host'
import { ConfirmDialog, firstParagraph, firstSentence } from './ConfirmDialog'
import { Initial, ShelfList } from './ShelfList'

export function SpeciesStep({
  draft,
  setDraft,
  rows,
  race,
  problems,
  weaponNames = [],
  feat,
}: {
  draft: BuilderDraft
  setDraft: SetDraft
  rows: readonly SpeciesRow[]
  race: StepContext['race']
  /** The step's warnings, placed under the controls that answer them. */
  problems: readonly string[]
  /** Every weapon note, by name: what a species' weapon choice offers. */
  weaponNames?: readonly string[]
  /** What the species' feat pick needs (MYDND-244); absent, it is not asked. */
  feat?: SpeciesFeatSources
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
        <SpeciesCard
          draft={draft}
          setDraft={setDraft}
          row={picked}
          race={race}
          problems={problems}
          weaponNames={weaponNames}
          feat={feat}
          onChange={() => setChanging(true)}
        />
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
  weaponNames,
  feat,
  onChange,
}: {
  draft: BuilderDraft
  setDraft: SetDraft
  row: SpeciesRow | null
  race: StepContext['race']
  /** `stepProblems('species')`: each is shown under its own select. */
  problems: readonly string[]
  weaponNames: readonly string[]
  feat?: SpeciesFeatSources
  onChange: () => void
}) {
  const compendium = useCompendium()
  const { detail } = useDetail(compendium.species, row?.id ?? null)
  // Versatile, Custom Lineage's Feat (MYDND-244). The background's origin feat
  // may not be taken again unless its note says it is repeatable.
  const grant = feat ? speciesFeatGrant(race, draft.race) : null
  const { detail: backgroundFeat } = useDetail(compendium.feats, grant ? (draft.originFeat?.id ?? null) : null)
  const benefits = (backgroundFeat?.fence as { benefits?: Array<{ key?: unknown } | null> } | null | undefined)?.benefits ?? []
  const repeatable = benefits.some(b => b?.key === 'repeatable')
  const taken = new Set(draft.originFeat?.id && !repeatable ? [draft.originFeat.id] : [])
  const sizes = sizeOptions(race)
  const lineages = lineageOptions(race) as Array<{ name: string; benefit: string }>
  const abilities = abilityOptions(race)
  const benefit = lineages.find(l => l.name === draft.race?.subrace)?.benefit
  // Giant Ancestry, Draconic Ancestry (MYDND-242): the choices that are not a lineage.
  const versions = versionOptions(race)
  const question = versionQuestion(race)
  const versionAsk = versionProblem(race)
  const chosenVersion = versions.find(v => v.name === draft.race?.version) ?? null
  // Skills, tools, languages and weapons (MYDND-243): what is fixed is listed,
  // what is chosen is asked.
  const profChoices = proficiencyChoices(race, draft.race)
  const granted = PROFICIENCY_KINDS.flatMap(kind => fixedProficiencies(race, draft.race, kind).map(v => grantedLabel(kind, v)))
  const name = draft.race?.name ?? row?.name ?? 'Species'
  const asks =
    sizes.length > 1 || lineages.length > 0 || abilities.length > 0 || versions.length > 0 || profChoices.length > 0 || grant != null

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

      <NoteProblems kind="species" fence={detail?.fence ?? null} />

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
          {versions.length > 0 && question ? (
            <div>
              <OptionSelect
                label={question}
                value={chosenVersion?.name ?? ''}
                placeholder="— Choose"
                options={versions.map(v => ({ value: v.name, label: v.name }))}
                onChange={v => setDraft(d => withRaceChoice(d, { version: v || null }))}
              />
              {versionAsk && problems.includes(versionAsk) ? <Message kind="warning">Still to choose</Message> : null}
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
          {profChoices.map(choice => {
            const kindLabel = KIND_LABEL[choice.kind]
            // A fixed one of the same kind is already had, so it is not offered again.
            const had = new Set(fixedProficiencies(race, draft.race, choice.kind))
            return (
              <div key={choice.key}>
                <SlotSelects
                  count={choice.count}
                  label={i => (choice.count === 1 ? kindLabel : `${kindLabel} ${i + 1}`)}
                  picks={proficiencyPicks(draft.race, choice)}
                  options={speciesProficiencyOptions(choice, { weaponNames })}
                  disabled={v => had.has(v)}
                  placeholder="— Choose"
                  onChange={picks => setDraft(d => withSpeciesProficiencyPicks(d, choice.key, picks))}
                />
                {problems.includes(proficiencyProblem(choice)) && proficiencyPicks(draft.race, choice).length < choice.count ? (
                  <Message kind="warning">Still to choose</Message>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="bst-cb-note">No choices to make.</p>
      )}
      {grant && feat ? (
        <>
          <h4 className="bst-cb-sub">{speciesFeatText(grant).label}</h4>
          <SpeciesFeatPicker grant={grant} draft={draft} setDraft={setDraft} taken={taken} problems={problems} {...feat} />
        </>
      ) : null}
      {granted.length > 0 ? <p className="bst-cb-note">Proficient with {granted.join(', ')}.</p> : null}
      {benefit ? <p className="bst-cb-note bst-cb-pre">{benefit}</p> : null}
      {chosenVersion
        ? chosenVersion.traits.map(t => (
            <p key={t.key ?? t.name} className="bst-cb-note bst-cb-pre">
              <strong>{t.name}.</strong> {(t.text ?? '').replace(/\*\*/g, '')}
            </p>
          ))
        : null}
    </section>
  )
}

/** The feat rows, spells and scores the species' feat pick reads (MYDND-244). */
export interface SpeciesFeatSources {
  feats: readonly FeatRow[]
  featData: readonly FeatData[]
  scores: Record<string, number>
  spellsFor: (list: string) => SpellRow[]
  spells: readonly SpellRow[]
}

const KIND_LABEL: Record<(typeof PROFICIENCY_KINDS)[number], string> = {
  skill: 'Skill',
  tool: 'Tool',
  language: 'Language',
  weapon: 'Weapon',
}

/** A fixed proficiency as the card names it: a skill or tool by its name, the rest as written. */
function grantedLabel(kind: (typeof PROFICIENCY_KINDS)[number], value: string): string {
  if (kind === 'skill') return SKILL_NAME[value] ?? value
  if (kind === 'tool') return toolName(value) ?? value
  return value
}
