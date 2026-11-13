import { SKILL_NAME } from '../../model/choices'
import { SlotSelects, type Option } from '../fields'

import type { PickerProps } from './types'
import { Prose } from './shared'

// Skill and Expertise picks.
// One file of the Features step (MYDND-197); index.ts says what the step is.

const skillOption = (slug: string, sources?: Record<string, string>): Option => ({
  value: slug,
  label: sources?.[slug] ? `${SKILL_NAME[slug] ?? slug} (${sources[slug]})` : (SKILL_NAME[slug] ?? slug),
  disabled: Boolean(sources?.[slug]),
})

/** A feature granting skills — Primal Knowledge, Bonus Proficiencies. A bare array of slugs. */
export function SkillPicker({ item, answer, set, skillSources }: PickerProps) {
  const choices: Record<string, unknown> = item.feature.choices ?? {}
  const count = Number(choices.count ?? 1)
  const pool = Array.isArray(choices.options) ? (choices.options as string[]) : Object.keys(SKILL_NAME)
  const picks = Array.isArray(answer) ? (answer as string[]) : []
  // A skill held from elsewhere is refused — but not one this feature itself
  // gave, which the source map also lists, under this feature's name.
  const own = new Set(picks)
  const sources = Object.fromEntries(Object.entries(skillSources).filter(([slug]) => !own.has(slug)))
  return (
    <SlotSelects
      count={count}
      label={i => (count > 1 ? `Skill ${i + 1}` : 'Skill')}
      picks={picks}
      options={pool.map(s => skillOption(s, sources))}
      placeholder="— Choose a skill"
      onChange={next => set(next)}
    />
  )
}

/** Expertise — among skills the character is already proficient in. */
export function ExpertisePicker({ item, answer, set, skillSources, draft }: PickerProps) {
  const choices: Record<string, unknown> = item.feature.choices ?? {}
  const count = Number(choices.count ?? 2)
  const picks = ((answer as { skills?: string[] } | undefined)?.skills ?? []).filter(Boolean)
  const allowed = Array.isArray(choices.options) ? new Set(choices.options as string[]) : null
  const elsewhere = new Set(
    Object.entries(draft.featureChoices)
      .filter(([key, c]) => key !== item.feature.id && (c as { type?: string })?.type === 'expertise')
      .flatMap(([, c]) => (c as { skills?: string[] }).skills ?? []),
  )
  const options = [...new Set([...Object.keys(skillSources), ...picks])]
    .filter(slug => !allowed || allowed.has(slug) || picks.includes(slug))
    .sort((a, b) => (SKILL_NAME[a] ?? a).localeCompare(SKILL_NAME[b] ?? b))
  if (options.length === 0) {
    return <Prose text="Choose your skill proficiencies first — Expertise applies to skills you are already proficient in." />
  }
  return (
    <SlotSelects
      count={count}
      label={i => (count > 1 ? `Expertise ${i + 1}` : 'Expertise')}
      picks={picks}
      options={options.map(slug => ({ value: slug, label: SKILL_NAME[slug] ?? slug }))}
      disabled={slug => elsewhere.has(slug)}
      placeholder="— Choose a skill"
      onChange={next => set({ type: 'expertise', skills: next })}
    />
  )
}
