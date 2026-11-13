import { SlotSelects } from '../fields'

import type { PickerProps } from './types'
import { NoteText, type NamedOption, optionsOf } from './shared'

// Metamagic options.
// One file of the Features step (MYDND-197); index.ts says what the step is.

/** Metamagic — `count` options, none taken twice across the class's three grants. */
export function MetamagicPicker({ item, answer, set, draft }: PickerProps) {
  const options = optionsOf(item)
  const count = Number(item.feature.choices?.count ?? 2)
  const picks = ((answer as { metamagic?: NamedOption[] } | undefined)?.metamagic ?? []).map(p => p.name)
  const elsewhere = new Set(
    Object.entries(draft.featureChoices)
      .filter(([key, c]) => key !== item.feature.id && (c as { type?: string })?.type === 'metamagic')
      .flatMap(([, c]) => ((c as { metamagic?: NamedOption[] }).metamagic ?? []).map(m => m?.name)),
  )
  return (
    <>
      <SlotSelects
        count={count}
        label={i => `Metamagic ${i + 1}`}
        picks={picks}
        options={options.map(o => ({
          value: o.name,
          label: o.cost != null ? `${o.name} (${o.cost} SP)` : o.name,
        }))}
        disabled={name => elsewhere.has(name)}
        placeholder="— Choose a Metamagic option"
        onChange={next =>
          set({ type: 'metamagic', metamagic: next.flatMap(n => options.filter(o => o.name === n).slice(0, 1)) })
        }
      />
      {picks.map(name => {
        const desc = options.find(o => o.name === name)?.description
        return desc ? <NoteText key={name} text={`${name}. ${desc}`} /> : null
      })}
    </>
  )
}
