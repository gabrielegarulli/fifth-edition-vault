// The feat a species grants a choice of (MYDND-244): the 2024 Human's Versatile
// (an Origin feat) and Custom Lineage's Feat (any feat), asked on the Species
// step. The answer is a `featureChoices` entry in the shape an Ability Score
// Improvement's feat has, so everything downstream already reads it; why is in
// `@vault/derive/speciesChoices.js`.

import { blankChoices, originFeatSpec } from '@vault/derive/originFeatChoices.js'
import {
  speciesFeatAllowed,
  speciesFeatKeys,
  speciesFeatText,
  type SpeciesFeatGrant,
} from '@vault/derive/speciesChoices.js'

import { featContext, isAsiFeat, spellListsTaken, type FeatData } from '../model/choices'
import { withFeatureChoice, type BuilderDraft } from '../model/draft'
import type { FeatRow, SpellRow } from '../../compendium'
import { AbilityBonus } from './FeaturesStep/feats'
import { OptionSelect, withCurrent, type SetDraft } from './fields'
import { Message } from './Messages'
import { OriginFeatChoices } from './OriginFeatChoices'
import { FeatPreview } from './Previews'

/** The headings the "any feat" list groups its kinds under. */
const KIND_GROUP: Record<string, string> = { origin: 'Origin feats', general: 'General feats' }

interface FeatAnswer {
  type?: string
  featId?: string | null
  featName?: string | null
  featSource?: string | null
  abilityBonus?: string | null
  choices?: unknown
}

/**
 * A stored answer, read as a feat pick. A guard rather than `as`: every field
 * is optional, so the directory lint reads an assertion as a no-op (derive.md).
 */
const isAnswer = (v: unknown): v is FeatAnswer => typeof v === 'object' && v !== null && !Array.isArray(v)

export function SpeciesFeatPicker({
  grant,
  draft,
  setDraft,
  feats,
  featData,
  scores,
  spellsFor,
  spells,
  taken,
  problems,
}: {
  grant: SpeciesFeatGrant
  draft: BuilderDraft
  setDraft: SetDraft
  /** Every feat note's row. */
  feats: readonly FeatRow[]
  /** The picked feats with their fences: a general feat's +1 is read from it. */
  featData: readonly FeatData[]
  scores: Record<string, number>
  spellsFor: (list: string) => SpellRow[]
  spells: readonly SpellRow[]
  /**
   * Feats held elsewhere that may not be taken again: the background's origin
   * feat, unless it says it is repeatable.
   */
  taken: ReadonlySet<string>
  /** `stepProblems('species')`: a warning shows under the pick it is about. */
  problems: readonly string[]
}) {
  const { label, problem } = speciesFeatText(grant)
  const keys = speciesFeatKeys(grant)
  // Origin feats first: `OptionSelect` orders its groups by their first option.
  const rank = (f: FeatRow) => (f.kind === 'origin' ? 0 : 1)
  const pool = feats.filter(f => speciesFeatAllowed(grant, f) && !isAsiFeat(f)).sort((a, b) => rank(a) - rank(b))
  const grouped = !grant.kinds || grant.kinds.length > 1
  const answers = keys.map(key => {
    const stored = draft.featureChoices[key]
    return isAnswer(stored) ? stored : null
  })

  return (
    <>
      {keys.map((key, i) => {
        const answer = answers[i]
        const featId = answer?.featId ?? ''
        const name = answer?.featName ?? ''
        // The species' other picks are taken too, when it grants more than one.
        const held = new Set([...taken, ...answers.flatMap((a, j) => (j !== i && a?.featId ? [a.featId] : []))])
        const set = (next: FeatAnswer | null) => setDraft(d => withFeatureChoice(d, key, next))
        return (
          <div key={key} className="bst-col">
            <OptionSelect
              label={keys.length === 1 ? label : `${label} ${i + 1}`}
              value={featId}
              placeholder={pool.length === 0 ? 'No feats exported' : '— Choose'}
              options={withCurrent(pool, featId ? { id: featId, name: name || featId } : null).map(f => {
                const kind = (f as Partial<FeatRow>).kind ?? null
                return {
                  value: f.id,
                  label: held.has(f.id) && f.id !== featId ? `${f.name} (taken)` : f.name,
                  disabled: f.id !== featId && held.has(f.id),
                  ...(grouped && kind && KIND_GROUP[kind] ? { group: KIND_GROUP[kind] } : {}),
                }
              })}
              onChange={v => {
                const f = pool.find(x => x.id === v)
                set(
                  f
                    ? {
                        type: 'feat',
                        featId: f.id,
                        featName: f.name,
                        featSource: f.source,
                        choices: blankChoices(originFeatSpec(f.name), featContext(draft)),
                      }
                    : null,
                )
              }}
            />
            {!featId && problems.includes(problem) ? <Message kind="warning">Still to choose</Message> : null}
            {featId ? (
              <>
                <AbilityBonus
                  feat={featData.find(f => f.id === featId)}
                  value={answer?.abilityBonus ?? null}
                  scores={scores}
                  onChange={ability => set({ ...answer, abilityBonus: ability })}
                />
                <FeatPreview feat={feats.find(f => f.id === featId)} />
                <OriginFeatChoices
                  feat={{ id: featId, name, source: answer?.featSource ?? null, choices: answer?.choices ?? null }}
                  spellsFor={spellsFor}
                  spells={spells}
                  context={featContext(draft)}
                  takenLists={spellListsTaken(draft, key)}
                  onChange={choices => set({ ...answer, choices })}
                />
                {problems.includes(`${name} still has a choice to make`) ? (
                  <Message kind="warning">{name} still has a choice to make.</Message>
                ) : null}
              </>
            ) : null}
          </div>
        )
      })}
    </>
  )
}
