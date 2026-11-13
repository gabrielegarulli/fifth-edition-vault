import {
  optionalFeatureAnswer,
  optionalFeatureCount,
  optionalFeatureOptions,
  optionalFeaturePicks,
  requiredOptionalFeatures,
} from '../../model/choices'
import { SlotSelects } from '../fields'

import type { PickerProps } from './types'
import { NoteText } from './shared'

// Optional features: maneuvers, runes, arcane shots (MYDND-181).
// One file of the Features step (MYDND-197); index.ts says what the step is.

/**
 * A subclass's maneuvers, runes, arcane shots or disciplines (MYDND-181): one
 * slot per option the class level has the character know, the required ones
 * (Elemental Attunement) given, not asked. An option with a level prerequisite
 * waits for it.
 */
export function OptionalFeaturesPicker({ item, answer, set, draft }: PickerProps) {
  const choices: Record<string, unknown> = item.feature.choices ?? {}
  const level = draft.classes[item.classIndex]?.level ?? 1
  const required = requiredOptionalFeatures(choices)
  const count = Math.max(0, optionalFeatureCount(choices, level) - required.length)
  const options = optionalFeatureOptions(choices, level).filter(o => !required.includes(o.name))
  const picks = optionalFeaturePicks(answer).filter(n => !required.includes(n))
  const label = typeof choices.name === 'string' ? choices.name : item.feature.name
  const one = label.replace(/s$/, '')
  return (
    <>
      {required.length > 0 ? <p className="bst-note">Known without choosing: {required.join(', ')}.</p> : null}
      <SlotSelects
        count={count}
        label={i => `${one} ${i + 1}`}
        picks={picks}
        options={options.map(o => ({ value: o.name, label: o.minLevel ? `${o.name} (level ${o.minLevel})` : o.name }))}
        placeholder={options.length === 0 ? `No ${label.toLowerCase()} exported` : `— Choose ${one.toLowerCase()}`}
        onChange={next => set(optionalFeatureAnswer(item, next))}
      />
      {picks.map(name => {
        const desc = options.find(o => o.name === name)?.description
        return desc ? <NoteText key={name} text={`**${name}.** ${desc}`} /> : null
      })}
    </>
  )
}
