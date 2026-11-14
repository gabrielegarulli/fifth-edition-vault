import { fightingStyleOptions } from '@vault/derive/fightingStyles.js'
import { blankChoices, originFeatSpec } from '@vault/derive/originFeatChoices.js'

import { withFeatureChoice } from '../../model/draft'
import { featureTitle, fightingStyleFeats, itemComplete, type LevelItem } from '../../model/choices'
import { baseClassName, type FeatRow } from '../../../compendium'
import { OptionSelect, Section } from '../fields'
import { OriginFeatChoices } from '../OriginFeatChoices'
import { FeatPreview } from '../Previews'

import type { FeaturesStepProps } from './types'
import { NoteText } from './shared'
import { SkillPicker, ExpertisePicker } from './skills'
import { AsiPicker, BoonPicker } from './feats'
import { InvocationPicker } from './invocations'
import { MetamagicPicker } from './metamagic'
import { OptionalFeaturesPicker } from './optionalFeatures'
import { SpellChoicePicker, AdditionalSpellsPicker } from './spells'
import { FamiliarPicker } from './familiar'
import { MasteryPicker } from './masteries'

// The step: a section per question, and the picker each one gets.
// One file of the Features step (MYDND-197); index.ts says what the step is.

export function FeaturesStep(props: FeaturesStepProps) {
  const { items, draft } = props
  if (draft.classes.every(c => !c.id)) return <p className="bst-note">Choose a class first.</p>
  if (items.length === 0) {
    return <p className="bst-note">Nothing to choose at these levels — on to the background.</p>
  }
  return (
    <>
      {items.map(item => (
        <FeatureSection key={item.feature.id} item={item} {...props} />
      ))}
    </>
  )
}

function FeatureSection(props: FeaturesStepProps & { item: LevelItem }) {
  const { item, draft, featData, masteryCount, invocationCount } = props
  const complete = itemComplete(item, draft, {
    feats: featData,
    masteryCount,
    invocationCount: invocationCount(item.classIndex),
  })
  const many = draft.classes.filter(c => c.id).length > 1
  const title = (
    <>
      <span className="bst-note--faint">
        {many ? `${item.className} ` : ''}Level {item.level}.
      </span>{' '}
      {featureTitle(item, draft)}
      {item.isSubclass ? ' (subclass)' : ''}
      {complete ? null : <span className="bst-note bst-note--faint"> — to choose</span>}
    </>
  )
  return (
    <Section title={title} open={!complete}>
      <Picker {...props} />
    </Section>
  )
}

function Picker(props: FeaturesStepProps & { item: LevelItem }) {
  const { item, draft, setDraft } = props
  const id = item.feature.id
  const answer = draft.featureChoices[id]
  const set = (choice: unknown) => setDraft(d => withFeatureChoice(d, id, choice))
  const choices: Record<string, unknown> = item.feature.choices ?? {}

  switch (item.kind) {
    case 'skill':
      return <SkillPicker {...props} answer={answer} set={set} />
    case 'expertise':
      return <ExpertisePicker {...props} answer={answer} set={set} />
    case 'asi':
      return <AsiPicker {...props} answer={answer} set={set} />
    case 'boon':
      return <BoonPicker {...props} answer={answer} set={set} />
    case 'fighting_style': {
      const options = fightingStyleOptions(fightingStyleFeats(props.feats), baseClassName(item.className)) as FeatRow[]
      const style = answer as { featId?: string; featName?: string; choices?: unknown } | undefined
      const current = style?.featId ?? ''
      // A Champion's second style can't be the first one again (MYDND-171).
      const taken = new Set(
        Object.entries(draft.featureChoices)
          .filter(([key]) => key !== id)
          .map(([, a]) => (a as { featId?: string } | null)?.featId),
      )
      return (
        <>
          <OptionSelect
            label="Fighting style"
            value={current}
            placeholder={options.length === 0 ? 'No fighting style feats exported' : '— Choose one'}
            options={options.map(f => ({ value: f.id, label: f.name, disabled: taken.has(f.id) }))}
            onChange={v => {
              const f = options.find(o => o.id === v)
              // Blessed and Druidic Warrior ask two cantrips (MYDND-182).
              set(
                f
                  ? { type: 'feat', featId: f.id, featName: f.name, featSource: f.source ?? null, choices: blankChoices(originFeatSpec(f.name)) }
                  : null,
              )
            }}
          />
          <FeatPreview feat={options.find(o => o.id === current)} />
          {current ? (
            <OriginFeatChoices
              feat={{ id: current, name: String(style?.featName ?? ''), source: null, choices: style?.choices ?? null }}
              spellsFor={props.spellsFor}
              onChange={choices => set({ ...style, choices })}
            />
          ) : null}
        </>
      )
    }
    case 'feature_option': {
      const current = (answer as { optionId?: string } | undefined)?.optionId ?? ''
      const picked = item.options.find(o => o.id === current)
      return (
        <>
          <OptionSelect
            label={`Choose ${item.feature.name}`}
            value={current}
            placeholder="— Choose one"
            options={item.options.map(o => ({ value: o.id, label: o.name }))}
            onChange={v => {
              const o = item.options.find(x => x.id === v)
              set(
                o
                  ? {
                      type: 'feature_option',
                      label: item.feature.name,
                      optionId: o.id,
                      optionName: o.name,
                      optionDescription: o.description ?? null,
                    }
                  : null,
              )
            }}
          />
          {picked?.description ? <NoteText text={picked.description} /> : null}
        </>
      )
    }
    case 'invocations':
      return <InvocationPicker {...props} answer={answer} set={set} />
    case 'metamagic':
      return <MetamagicPicker {...props} answer={answer} set={set} />
    case 'optional_features':
      return <OptionalFeaturesPicker {...props} answer={answer} set={set} />
    case 'spell_choice':
      return <SpellChoicePicker {...props} answer={answer} set={set} levels={(choices.spellLevels as number[]) ?? []} />
    case 'familiar':
      return <FamiliarPicker {...props} answer={answer} />
    case 'mastery':
      return <MasteryPicker {...props} />
    case 'additional_spells':
      return <AdditionalSpellsPicker {...props} answer={answer} set={set} />
  }
}
