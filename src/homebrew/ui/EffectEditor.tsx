import { useState } from 'react'

import {
  ABILITIES,
  ABILITY_NAMES,
  ARMOR_CATEGORIES,
  DAMAGE_TYPES,
  EFFECT_LABEL,
  effectFormProblems,
  effectSummary,
  emptyEffect,
  RESETS,
  SENSES,
  SKILLS,
  SPEED_MODES,
  WEAPON_CATEGORIES,
  type Ability,
  type EffectForm,
  type EffectType,
} from '../model/effects'
import { CheckField, ChipGroup, SelectField, TextField } from './fields'

/**
 * The effects on one feat benefit or one magic item (MYDND-233): what the
 * sheet will do with it. Each is edited in place, under its benefit, as the
 * mock-up drew it, and folds to one line ("Resistance · Fire") once it is
 * complete. A new one opens; one with a problem cannot fold, and says why.
 */

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')
const opts = (list: readonly string[]) => list.map(v => ({ value: v, label: cap(v) }))
const ABILITY_OPTIONS = ABILITIES.map(a => ({ value: a, label: ABILITY_NAMES[a] }))
const ABILITY_CHIPS = ABILITIES.map(a => ({ value: a, label: a.toUpperCase() }))

function Fields({ effect, set }: { effect: EffectForm; set: (patch: Partial<EffectForm>) => void }) {
  switch (effect.type) {
    case 'ability_score_bonus':
    case 'ability_score_choice':
      return (
        <>
          {effect.type === 'ability_score_choice' ? (
            <ChipGroup<Ability> label="Scores to choose from" options={ABILITY_CHIPS} selected={effect.options} onChange={options => set({ options })} />
          ) : (
            <SelectField<Ability> label="Score" value={effect.ability} options={ABILITY_OPTIONS} onChange={ability => set({ ability })} />
          )}
          <div className="bst-nb-grid">
            <TextField label="By" value={effect.amount} inputMode="numeric" onChange={amount => set({ amount })} />
            <TextField label="To a maximum of" value={effect.max} inputMode="numeric" onChange={max => set({ max })} />
          </div>
        </>
      )
    case 'skill_proficiency':
      return <SelectField label="Skill" value={effect.skill} options={SKILLS.map(s => ({ value: s.slug, label: s.name }))} onChange={skill => set({ skill })} />
    case 'saving_throw_proficiency':
      return <SelectField<Ability> label="Saving throw" value={effect.ability} options={ABILITY_OPTIONS} onChange={ability => set({ ability })} />
    case 'weapon_proficiency':
      return <SelectField label="Weapons" value={effect.category} options={opts(WEAPON_CATEGORIES)} onChange={category => set({ category })} />
    case 'armor_training':
      return <SelectField label="Armor" value={effect.category} options={opts(ARMOR_CATEGORIES)} onChange={category => set({ category })} />
    case 'resistance':
      return <SelectField label="Damage type" value={effect.damageType} options={opts(DAMAGE_TYPES)} onChange={damageType => set({ damageType })} />
    case 'sense':
      return (
        <>
          <div className="bst-nb-grid">
            <SelectField label="Sense" value={effect.sense} options={opts(SENSES)} onChange={sense => set({ sense })} />
            <TextField label="Range (feet)" value={effect.range} inputMode="numeric" onChange={range => set({ range })} />
          </div>
          <TextField
            label="If they already have it, add (feet; optional)"
            value={effect.extends}
            inputMode="numeric"
            onChange={value => set({ extends: value })}
          />
        </>
      )
    case 'speed':
      return (
        <>
          <div className="bst-nb-grid">
            <SelectField label="Speed" value={effect.mode} options={opts(SPEED_MODES)} onChange={mode => set({ mode })} />
            <TextField label="Feet" value={effect.amount} inputMode="numeric" onChange={amount => set({ amount })} />
          </div>
          <CheckField label="Add to the speed, rather than set it" checked={effect.add} onChange={add => set({ add })} />
        </>
      )
    case 'feature_resource':
      return (
        <>
          <TextField label="Name on the sheet" value={effect.name} onChange={name => set({ name })} />
          <div className="bst-nb-grid">
            <TextField label="Uses" value={effect.usesProficiency ? '' : effect.uses} inputMode="numeric" onChange={uses => set({ uses, usesProficiency: false })} />
            <SelectField
              label="Regained on"
              value={effect.resets}
              options={RESETS.map(r => ({ value: r, label: r === 'short_rest' ? 'A Short or Long Rest' : 'A Long Rest' }))}
              onChange={resets => set({ resets })}
            />
          </div>
          <CheckField label="As many uses as the Proficiency Bonus" checked={effect.usesProficiency} onChange={usesProficiency => set({ usesProficiency })} />
        </>
      )
    case 'ac_bonus':
    case 'spell_attack_bonus':
    case 'spell_save_dc_bonus':
      return <TextField label="Bonus" value={effect.amount} inputMode="numeric" onChange={amount => set({ amount })} />
  }
}

export function EffectEditor({
  effects,
  onChange,
  types,
  owner,
}: {
  effects: readonly EffectForm[]
  onChange: (effects: EffectForm[]) => void
  types: readonly EffectType[]
  /** What the effects are on, for the controls' names: "Steady Flame". */
  owner: string
}) {
  // Which are folded. A new effect opens; an existing one starts folded.
  const [folded, setFolded] = useState<ReadonlySet<number>>(() => new Set(effects.map((_, i) => i)))
  const set = (i: number, patch: Partial<EffectForm>) => onChange(effects.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  const remove = (i: number) => {
    onChange(effects.filter((_, j) => j !== i))
    setFolded(new Set([...folded].filter(j => j !== i).map(j => (j > i ? j - 1 : j))))
  }

  return (
    <div className="bst-nb-effects">
      {effects.map((effect, i) => {
        const problems = effectFormProblems(effect)
        const isFolded = folded.has(i) && problems.length === 0
        const label = `${EFFECT_LABEL[effect.type]} on ${owner || 'this'}`
        return (
          <div key={i} className="bst-nb-effect">
            {isFolded ? (
              <div className="bst-nb-row bst-nb-row--wrap">
                <span className="bst-nb-tag">{EFFECT_LABEL[effect.type]}</span>
                <span className="bst-nb-summary">{effectSummary(effect)}</span>
                <span className="bst-nb-spacer" />
                <button type="button" className="bst-plain bst-btn-secondary bst-btn-sm" aria-label={`Edit ${label}`} onClick={() => setFolded(new Set([...folded].filter(j => j !== i)))}>
                  Edit
                </button>
                <button type="button" className="bst-plain bst-btn-ghost bst-btn-sm" aria-label={`Remove ${label}`} onClick={() => remove(i)}>
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div className="bst-nb-row bst-nb-row--end">
                  <div className="bst-nb-grow">
                    <SelectField<EffectType>
                      label="Effect on the sheet"
                      value={effect.type}
                      options={types.map(t => ({ value: t, label: EFFECT_LABEL[t] }))}
                      onChange={type => set(i, { type })}
                    />
                  </div>
                  <button type="button" className="bst-plain bst-btn-ghost bst-btn-sm" aria-label={`Remove ${label}`} onClick={() => remove(i)}>
                    Remove
                  </button>
                </div>
                <Fields effect={effect} set={patch => set(i, patch)} />
                {problems.length > 0 ? (
                  <ul className="bst-nb-problems" aria-label={`What ${label} still needs`}>
                    {problems.map(p => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                ) : (
                  <button type="button" className="bst-plain bst-btn-secondary bst-btn-sm bst-nb-self-start" onClick={() => setFolded(new Set([...folded, i]))}>
                    Done
                  </button>
                )}
              </>
            )}
          </div>
        )
      })}
      <button type="button" className="bst-plain bst-btn-secondary bst-btn-sm bst-nb-self-start" onClick={() => onChange([...effects, emptyEffect(types[0])])}>
        + Effect{owner ? ` on ${owner}` : ''}
      </button>
    </div>
  )
}
