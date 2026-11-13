import { ABILITY_FULL, SIZE_FULL, abilityOptions, lineageOptions, sizeOptions } from '@vault/derive/speciesChoices.js'

import {
  pickableSpecies,
  withRaceChoice,
  withSpecies,
  type BuilderDraft,
  type StepContext,
} from '../../choices'
import { useCompendium } from '../../compendium/host'
import type { SpeciesRow } from '../../compendium'
import { OptionSelect, SourceSelect, type SetDraft, TraitsPreview } from '../../choices/host'

export function SpeciesStep({
  draft,
  setDraft,
  rows,
  race,
}: {
  draft: BuilderDraft
  setDraft: SetDraft
  rows: readonly SpeciesRow[]
  race: StepContext['race']
}) {
  const compendium = useCompendium()
  const sizes = sizeOptions(race) as string[]
  const lineages = lineageOptions(race) as Array<{ name: string; benefit: string }>
  const abilities = abilityOptions(race) as string[]
  const benefit = lineages.find(l => l.name === draft.race?.subrace)?.benefit

  return (
    <>
      <SourceSelect
        label="Species"
        rows={pickableSpecies(rows, draft.race?.id ?? null)}
        value={draft.race?.id ?? ''}
        empty="No species exported"
        onChange={row => setDraft(d => withSpecies(d, row))}
      />
      <TraitsPreview catalog={compendium.species} row={rows.find(r => r.id === draft.race?.id) ?? null} />
      {sizes.length > 1 ? (
        <OptionSelect
          label="Size"
          value={draft.race?.size ?? ''}
          options={sizes.map(s => ({ value: s, label: (SIZE_FULL as Record<string, string>)[s] ?? s }))}
          onChange={v => setDraft(d => withRaceChoice(d, { size: v || null }))}
        />
      ) : null}
      {lineages.length > 0 ? (
        <OptionSelect
          label="Lineage"
          value={draft.race?.subrace ?? ''}
          options={lineages.map(l => ({ value: l.name, label: l.name }))}
          onChange={v => setDraft(d => withRaceChoice(d, { subrace: v || null, cantrip: null }))}
        />
      ) : null}
      {benefit ? <p className="bst-note bst-note--pre">{benefit}</p> : null}
      {abilities.length > 0 ? (
        <OptionSelect
          label="Species spellcasting ability"
          value={draft.race?.spellcastingAbility ?? ''}
          options={abilities.map(a => ({ value: a, label: (ABILITY_FULL as Record<string, string>)[a] ?? a }))}
          onChange={v => setDraft(d => withRaceChoice(d, { spellcastingAbility: v || null }))}
        />
      ) : null}
    </>
  )
}
