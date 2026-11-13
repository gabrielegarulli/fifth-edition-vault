import { featAbilityChoice } from '@vault/derive/featAbilities.js'
import { withoutFightingStyleFeats } from '@vault/derive/fightingStyles.js'
import { blankChoices, originFeatSpec } from '@vault/derive/originFeatChoices.js'

import { isAsiFeat, spellListsTaken, type FeatData, featContext } from '../../model/choices'
import { ABILITY_KEYS } from '../../model/draft'
import type { FeatRow } from '../../../compendium'
import { OptionSelect, withCurrent } from '../fields'
import { OriginFeatChoices } from '../OriginFeatChoices'
import { FeatPreview } from '../Previews'

import type { PickerProps } from './types'
import { ABILITY, Prose } from './shared'

// An Ability Score Improvement or a feat in its place, and Epic Boons.
// One file of the Features step (MYDND-197); index.ts says what the step is.

/** A feat's own ability increase, when it asks which — `AbilityBonusPicker`. */
function AbilityBonus({
  feat,
  value,
  scores,
  onChange,
}: {
  feat: FeatData | undefined
  value: string | null
  scores: Record<string, number>
  onChange(ability: string | null): void
}) {
  const choice = feat ? (featAbilityChoice(feat) as { options: string[]; amount: number; max: number | null } | null) : null
  if (!choice) return null
  if (choice.options.length === 1) {
    return <Prose text={`+${choice.amount} to ${ABILITY[choice.options[0]] ?? choice.options[0]}`} />
  }
  const atCap = (a: string) => choice.max != null && (scores[a] ?? 0) - (value === a ? choice.amount : 0) >= choice.max
  return (
    <OptionSelect
      label={`Ability to raise by ${choice.amount}`}
      value={value && choice.options.includes(value) ? value : ''}
      options={choice.options.map(a => ({
        value: a,
        label: `${ABILITY[a] ?? a}${atCap(a) ? ` (at ${choice.max})` : ''}`,
        disabled: atCap(a),
      }))}
      onChange={v => onChange(v || null)}
    />
  )
}

/** Ability Score Improvement: two +1s, or a feat. */
export function AsiPicker({ item, answer, set, feats, featData, scores, spellsFor, spells, draft }: PickerProps) {
  const choice = (answer ?? null) as { type?: string; [k: string]: unknown } | null
  const mode = choice?.type === 'feat' ? 'feat' : 'score'
  // Fighting styles are gated on the Fighting Style feature and epic boons on
  // level 19, so neither is a legal ASI pick — the web builder's same filter.
  // Nor is the ASI's own note, which would spend the slot on nothing; a saved
  // character holding it keeps it, through `withCurrent` below.
  const pool = (withoutFightingStyleFeats(feats) as FeatRow[]).filter(f => f.kind !== 'epic_boon' && !isAsiFeat(f))
  const atCap = (slot: 'first' | 'second', k: string) => (scores[k] ?? 0) - (choice?.[slot] === k ? 1 : 0) >= 20
  const featId = (choice?.featId as string | undefined) ?? ''
  return (
    <>
      <div role="group" aria-label="Improvement" className="bst-wrap-row">
        {(['score', 'feat'] as const).map(m => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            className="bst-plain bst-pill bst-pill--lg"
            onClick={() =>
              m !== mode &&
              set(
                m === 'score'
                  ? { type: 'score', first: null, second: null }
                  : { type: 'feat', featId: null, featName: null, featSource: null },
              )
            }
          >
            {m === 'score' ? 'Ability scores' : 'Feat'}
          </button>
        ))}
      </div>
      {mode === 'score' ? (
        (['first', 'second'] as const).map(slot => (
          <OptionSelect
            key={slot}
            label={slot === 'first' ? 'First +1' : 'Second +1'}
            value={(choice?.[slot] as string | undefined) ?? ''}
            options={ABILITY_KEYS.map(k => ({
              value: k,
              label: `${ABILITY[k]}${atCap(slot, k) ? ' (at 20)' : ''}`,
              disabled: atCap(slot, k),
            }))}
            onChange={v => set({ ...choice, type: 'score', [slot]: v || null })}
          />
        ))
      ) : (
        <>
          <OptionSelect
            label="Feat"
            value={featId}
            placeholder={pool.length === 0 ? 'No feats exported' : '— Choose a feat'}
            options={withCurrent(pool, featId ? { id: featId, name: String(choice?.featName ?? featId) } : null).map(f => ({
              value: f.id,
              label: f.name,
            }))}
            onChange={v => {
              const f = pool.find(x => x.id === v)
              set(
                f
                  ? {
                      type: 'feat',
                      featId: f.id,
                      featName: f.name,
                      featSource: f.source,
                      choices: blankChoices(originFeatSpec(f.name), featContext(draft, item)),
                    }
                  : { type: 'feat', featId: null, featName: null, featSource: null },
              )
            }}
          />
          <AbilityBonus
            feat={featData.find(f => f.id === featId)}
            value={(choice?.abilityBonus as string | undefined) ?? null}
            scores={scores}
            onChange={ability => set({ ...choice, abilityBonus: ability })}
          />
          <FeatPreview feat={feats.find(f => f.id === featId)} />
          {featId ? (
            <OriginFeatChoices
              feat={{ id: featId, name: String(choice?.featName ?? ''), source: null, choices: choice?.choices ?? null }}
              spellsFor={spellsFor}
              spells={spells}
              context={featContext(draft, item)}
              takenLists={spellListsTaken(draft, item.feature.id)}
              onChange={choices => set({ ...choice, choices })}
            />
          ) : null}
        </>
      )}
    </>
  )
}

/** Epic Boon at 19 — a feat of kind `epic_boon`. */
export function BoonPicker({ answer, set, feats, featData, scores }: PickerProps) {
  const choice = (answer ?? null) as { featId?: string; featName?: string; abilityBonus?: string } | null
  const pool = feats.filter(f => f.kind === 'epic_boon')
  return (
    <>
      <OptionSelect
        label="Epic boon"
        value={choice?.featId ?? ''}
        placeholder={pool.length === 0 ? 'No epic boons exported' : '— Choose a boon'}
        options={pool.map(f => ({ value: f.id, label: f.name }))}
        onChange={v => {
          const f = pool.find(x => x.id === v)
          set(f ? { type: 'boon', featId: f.id, featName: f.name, featSource: f.source } : null)
        }}
      />
      <AbilityBonus
        feat={featData.find(f => f.id === choice?.featId)}
        value={choice?.abilityBonus ?? null}
        scores={scores}
        onChange={ability => set({ ...choice, abilityBonus: ability })}
      />
      <FeatPreview feat={pool.find(f => f.id === choice?.featId)} />
    </>
  )
}
