import { BACKGROUND_BONUS_MODES, backgroundBonusMode, backgroundBonusOptions, withBackgroundSelected } from '@vault/derive/builderDraft.js'
import { ABILITY_FULL } from '@vault/derive/speciesChoices.js'
import { toolName } from '@vault/derive/tools.js'
import { blankChoices, originFeatSpec } from '@vault/derive/originFeatChoices.js'

import {
  LANGUAGE_PICKS,
  ORIGIN_FEAT_OWNER,
  STANDARD_LANGUAGES,
  TOOL_CHOICE_LABEL,
  spellListsTaken,
  toolPicksIn,
  toolSlugsOf,
  withLanguagePick,
  withToolPick,
  ABILITY_KEYS,
  withBackgroundEquipmentOption,
  withBackgroundBonus,
  withBackgroundBonusMode,
  type BuilderDraft,
} from '../../choices'
import { useCompendium } from '../../compendium/host'
import type { FeatRow, BackgroundRow, SpellRow } from '../../compendium'
import type { CatalogRow } from '../../platform'
import {
  OptionSelect,
  SourceSelect,
  withCurrent,
  type SetDraft,
  OriginFeatChoices,
  FeatPreview,
  TraitsPreview,
} from '../../choices/host'

export function BackgroundStep({
  draft,
  setDraft,
  rows,
  background,
  originFeats,
  originFeatRow,
  pickOriginFeat,
  spellsFor,
}: {
  draft: BuilderDraft
  setDraft: SetDraft
  rows: readonly BackgroundRow[]
  background: BackgroundRow | null
  originFeats: readonly CatalogRow[]
  /** The picked origin feat's row. Not always in `originFeats`: a background names its own. */
  originFeatRow: FeatRow | null
  pickOriginFeat: (name: string | null) => CatalogRow | null
  spellsFor: (className: string) => SpellRow[]
}) {
  const compendium = useCompendium()
  // A background whose abilities the exporter could not name is unconstrained
  // rather than impossible — the same choice `backgroundAbilities.js` made in
  // the web app: offering too much is recoverable, offering nothing is a dead end.
  const eligible = (bg: BackgroundRow | null): string[] =>
    bg && bg.abilities.length > 0 ? bg.abilities : [...ABILITY_KEYS]
  const allowed = eligible(background)
  const mode = backgroundBonusMode(draft) as string
  const bonuses = draft.backgroundBonuses ?? {}

  const setOriginFeat = (feat: CatalogRow | null, namedAs: string | null = null) =>
    setDraft(d => ({
      ...d,
      // A blank `choices` rather than the previous feat's — the sub-questions
      // differ per feat, so carrying them over would attach Magic Initiate's
      // cantrips to Crafter.
      originFeat: feat ? { id: feat.id, name: feat.name, source: feat.source, choices: originChoices(feat.name, namedAs) } : null,
    }))

  return (
    <>
      <SourceSelect
        label="Background"
        rows={rows}
        value={draft.background?.id ?? ''}
        empty="No backgrounds exported"
        onChange={row => {
          setDraft(d => {
            const next = { ...(withBackgroundSelected(d, row, eligible(row)) as unknown as BuilderDraft), backgroundTools: [] }
            return row?.id === d.background?.id ? next : withBackgroundEquipmentOption(next, null)
          })
          // The background names its origin feat; it is preselected, and the
          // picker below stays free because the 2024 rules let a table swap it.
          setOriginFeat(pickOriginFeat(row?.originFeat ?? null), row?.originFeat ?? null)
        }}
      />
      <TraitsPreview catalog={compendium.backgrounds} row={background} />

      {draft.background ? (
        <div className="flex flex-col gap-2 rounded-obs-m border border-background-modifier-border p-3">
          <span className="text-smaller font-medium text-normal">Ability score increases</span>
          <div role="group" aria-label="Increase mode" className="flex flex-wrap gap-1">
            {(BACKGROUND_BONUS_MODES).map(m => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                className={mode === m ? 'chip-filter-selected' : 'chip-filter'}
                onClick={() => setDraft(d => withBackgroundBonusMode(d, m, allowed))}
              >
                {m === 'two_one' ? '+2 / +1' : '+1 / +1 / +1'}
              </button>
            ))}
          </div>
          {mode === 'three_ones' ? (
            <p className="text-smaller text-muted">
              {allowed.map(k => `${(ABILITY_FULL as Record<string, string>)[k] ?? k} +1`).join(' · ')}
            </p>
          ) : (
            (['primary', 'secondary'] as const).map(slot => {
              const other = slot === 'primary' ? 'secondary' : 'primary'
              return (
                <OptionSelect
                  key={slot}
                  label={slot === 'primary' ? '+2 to' : '+1 to'}
                  value={bonuses[slot] ?? ''}
                  options={(backgroundBonusOptions(draft, slot, allowed) as string[]).map(k => ({
                    value: k,
                    label: (ABILITY_FULL as Record<string, string>)[k] ?? k,
                    disabled: bonuses[other] === k,
                  }))}
                  onChange={v => setDraft(d => withBackgroundBonus(d, slot, v))}
                />
              )
            })
          )}
        </div>
      ) : null}

      <OptionSelect
        label="Origin feat"
        value={draft.originFeat?.id ?? ''}
        placeholder={originFeats.length === 0 ? 'No origin feats exported' : 'None'}
        options={withCurrent(originFeats, draft.originFeat).map(f => ({ value: f.id, label: f.name }))}
        onChange={v => setOriginFeat(originFeats.find(f => f.id === v) ?? null)}
      />
      <FeatPreview feat={originFeatRow} />
      {background?.originFeat && draft.originFeat === null ? (
        <p className="text-smallest text-faint">
          {background.name} names {background.originFeat}, but no feat note answers to that name.
        </p>
      ) : null}
      <OriginFeatChoices
        feat={draft.originFeat}
        spellsFor={spellsFor}
        takenLists={spellListsTaken(draft, ORIGIN_FEAT_OWNER)}
        onChange={choices => setDraft(d => (d.originFeat ? { ...d, originFeat: { ...d.originFeat, choices } } : d))}
      />

      {(background?.toolChoices ?? []).flatMap(({ category, count }) => {
        const picks = toolPicksIn(draft, category)
        return Array.from({ length: count }, (_, slot) => (
          <OptionSelect
            key={`${category}-${slot}`}
            label={count > 1 ? `${TOOL_CHOICE_LABEL[category]} ${slot + 1}` : TOOL_CHOICE_LABEL[category]}
            value={picks[slot] ?? ''}
            placeholder="— Choose one"
            options={toolSlugsOf(category).map(slug => ({
              value: slug,
              label: toolName(slug) as string,
              disabled: slug !== picks[slot] && picks.includes(slug),
            }))}
            onChange={v => setDraft(d => withToolPick(d, category, slot, v))}
          />
        ))
      })}

      <div className="flex flex-col gap-2 rounded-obs-m border border-background-modifier-border p-3">
        <span className="text-smaller font-medium text-normal">Languages</span>
        <p className="text-smaller text-muted">You know Common, plus two more.</p>
        {Array.from({ length: LANGUAGE_PICKS }, (_, slot) => {
          const current = draft.languages?.[slot] ?? ''
          return (
            <OptionSelect
              key={slot}
              label={`Language ${slot + 1}`}
              value={current}
              placeholder="— Choose one"
              options={STANDARD_LANGUAGES.map(language => ({
                value: language,
                label: language,
                disabled: language !== current && (draft.languages ?? []).includes(language),
              }))}
              onChange={v => setDraft(d => withLanguagePick(d, slot, v))}
            />
          )
        })}
      </div>
    </>
  )
}

/**
 * A just-picked origin feat's blank choices — with the spell list filled in
 * when the background named one. Acolyte grants "Magic Initiate (Cleric)", and
 * asking the player which list after the book has said so would be a question
 * with one right answer (MYDND-29).
 */
export function originChoices(featName: string, namedAs: string | null): unknown {
  const spec = originFeatSpec(featName) as { kind: string; lists?: string[] } | null
  const blank = blankChoices(spec) as Record<string, unknown> | null
  const list = /\(([^()]+)\)\s*$/.exec(namedAs ?? '')?.[1]?.trim()
  if (blank && spec?.kind === 'spells' && list && spec.lists?.includes(list)) return { ...blank, spellList: list }
  return blank
}
