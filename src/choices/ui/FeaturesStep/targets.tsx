import { TARGETED, type ImprovementPick } from '../../model/companion'
import { ABILITY_KEYS } from '../../model/draft'
import { OptionSelect, type Option } from '../fields'

import { ABILITY, Prose } from './shared'

// The target an invocation or a companion's improvement names.
// One file of the Features step (MYDND-197); index.ts says what the step is.

const ABILITY_OPTIONS: Option[] = ABILITY_KEYS.map(k => ({ value: k, label: ABILITY[k] ?? k }))

/** The follow-up an improvement asks: an ability, a save, a speed, War Training's proficiency. */
export function TargetPicker({
  pick,
  speeds,
  armor,
  weaponNames,
  onChange,
}: {
  pick: ImprovementPick
  speeds: string[]
  armor: string[]
  weaponNames: readonly string[]
  onChange: (target: ImprovementPick['target']) => void
}) {
  const asks = TARGETED[pick.slug]
  const value = typeof pick.target === 'string' ? pick.target : ''
  if (asks === 'ability' || asks === 'save') {
    return (
      <OptionSelect
        label={asks === 'ability' ? 'Ability to boost' : 'Saving throw proficiency'}
        value={value}
        placeholder="— Choose an ability"
        options={ABILITY_OPTIONS}
        onChange={v => onChange(v || null)}
      />
    )
  }
  if (asks === 'speed') {
    return (
      <OptionSelect
        label="Speed to increase"
        value={value}
        placeholder="— Choose a speed"
        options={speeds.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
        onChange={v => onChange(v || null)}
      />
    )
  }
  if (asks !== 'war') return null
  const t = typeof pick.target === 'object' && pick.target ? pick.target : null
  const weapons = t?.kind === 'weapons' ? (t.weapons ?? []) : []
  return (
    <>
      <OptionSelect
        label="Training"
        value={t?.kind ?? ''}
        placeholder="— Choose a training"
        options={[
          { value: 'armor', label: 'Armour proficiency', disabled: armor.length === 0 && t?.kind !== 'armor' },
          { value: 'weapons', label: 'Two weapon proficiencies' },
        ]}
        onChange={v =>
          onChange(
            v === 'armor'
              ? { kind: 'armor', armor: armor[0] ?? null }
              : v === 'weapons'
                ? { kind: 'weapons', weapons: [null, null] }
                : null,
          )
        }
      />
      {t?.kind === 'armor' ? (
        <Prose text={t.armor ? `Proficient with ${t.armor}.` : 'Already proficient with every armour.'} />
      ) : null}
      {t?.kind === 'weapons'
        ? [0, 1].map(w => (
            <OptionSelect
              key={w}
              label={`Weapon ${w + 1}`}
              value={weapons[w] ?? ''}
              placeholder="— Choose a weapon"
              options={weaponNames.map(n => ({ value: n, label: n, disabled: weapons[1 - w] === n }))}
              onChange={v => {
                const next = [weapons[0] ?? null, weapons[1] ?? null]
                next[w] = v || null
                onChange({ kind: 'weapons', weapons: next })
              }}
            />
          ))
        : null}
    </>
  )
}
