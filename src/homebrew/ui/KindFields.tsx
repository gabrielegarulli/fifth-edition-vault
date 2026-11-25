import type { FeatKind } from '../../compendium'
import { FEAT_EFFECT_TYPES, MAGIC_ITEM_EFFECT_TYPES } from '../model/effects'
import {
  FEAT_KINDS,
  isArmorType,
  isWeaponType,
  ITEM_TYPES,
  MAGIC_ITEM_TYPES,
  MASTERIES,
  RARITIES,
  RECHARGES,
  SPELL_SCHOOLS,
  WEAPON_PROPERTIES,
  type BenefitForm,
  type BuilderForm,
  type FeatForm,
  type ItemForm,
  type MagicItemForm,
  type SpellForm,
} from '../model/forms'
import { DAMAGE_TYPES } from '../model/effects'
import { EffectEditor } from './EffectEditor'
import { CheckField, ChipGroup, NameList, SelectField, TextArea, TextField } from './fields'

/**
 * Each kind's own fields (MYDND-233), below the name and source every builder
 * shares. The keys behind them are `docs/homebrew/<kind>.md`'s; a field the
 * reader takes is here, and one it does not is not.
 */

export interface Suggestions {
  classes: readonly string[]
  spells: readonly string[]
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const DAMAGE_OPTIONS = [{ value: '', label: 'None' }, ...DAMAGE_TYPES.map(d => ({ value: d, label: cap(d) }))]

function SpellFields({ form, set, suggestions }: { form: SpellForm; set: (patch: Partial<SpellForm>) => void; suggestions: Suggestions }) {
  const level = Number(form.level)
  const grows = level > 0 && form.damageDice.trim() !== ''
  const every = Number(form.upcastEvery) || 1
  const example = grows && form.upcastDice.trim()
    ? `A level ${level} spell, every ${every}: +${form.upcastDice.trim()} at slots ${Array.from({ length: 9 }, (_, i) => i + 1)
        .filter(s => s > level && (s - level) % every === 0)
        .join(', ')}.`
    : undefined
  return (
    <>
      <div className="bst-nb-grid">
        <SelectField
          label="Level"
          value={form.level}
          options={Array.from({ length: 10 }, (_, i) => ({ value: String(i), label: i === 0 ? 'Cantrip' : String(i) }))}
          onChange={v => set({ level: v })}
        />
        <SelectField label="School" value={form.school} options={SPELL_SCHOOLS} onChange={school => set({ school })} />
      </div>
      <div className="bst-nb-grid">
        <TextField label="Casting time" value={form.castingTime} onChange={castingTime => set({ castingTime })} />
        <TextField label="Range" value={form.range} placeholder="60 feet" onChange={range => set({ range })} />
        <TextField label="Duration" value={form.duration} onChange={duration => set({ duration })} />
      </div>
      <TextField label="Components" value={form.components} placeholder="V, S, M (a pinch of ash)" onChange={components => set({ components })} />
      <div className="bst-nb-row bst-nb-row--wrap">
        <CheckField label="Concentration" checked={form.concentration} onChange={concentration => set({ concentration })} />
        <CheckField label="Ritual" checked={form.ritual} onChange={ritual => set({ ritual })} />
      </div>
      <NameList
        label="Classes that can prepare it"
        values={form.classes}
        onChange={classes => set({ classes })}
        suggestions={suggestions.classes}
        addLabel="Add class"
        hint="As each class's note titles it, homebrew classes included. With none, no class can prepare it."
      />
      <fieldset className="bst-nb-fieldset bst-nb-box">
        <legend className="bst-field-label">What Cast rolls (optional)</legend>
        <div className="bst-nb-grid">
          <TextField label="Damage" value={form.damageDice} placeholder="2d6" mono onChange={damageDice => set({ damageDice })} />
          <SelectField label="Damage type" value={form.damageType} options={DAMAGE_OPTIONS} onChange={damageType => set({ damageType })} />
        </div>
        {level > 0 ? (
          <div className="bst-nb-grid">
            <TextField label="Add when upcast" value={form.upcastDice} placeholder="1d6" mono onChange={upcastDice => set({ upcastDice })} />
            <SelectField
              label="For every"
              value={form.upcastEvery}
              options={['1', '2', '3'].map(v => ({ value: v, label: v === '1' ? '1 slot level above' : `${v} slot levels above` }))}
              onChange={upcastEvery => set({ upcastEvery })}
            />
          </div>
        ) : null}
        {example ? <p className="bst-nb-hint">{example}</p> : null}
      </fieldset>
    </>
  )
}

function ItemFields({ form, set }: { form: ItemForm; set: (patch: Partial<ItemForm>) => void }) {
  const weapon = isWeaponType(form.itemType)
  const armor = isArmorType(form.itemType)
  return (
    <>
      <SelectField label="Type" value={form.itemType} options={ITEM_TYPES} onChange={itemType => set({ itemType })} />
      <div className="bst-nb-grid">
        <TextField label="Cost (gp)" value={form.costGp} inputMode="decimal" onChange={costGp => set({ costGp })} />
        <TextField label="Weight (lb.)" value={form.weight} inputMode="decimal" onChange={weight => set({ weight })} />
      </div>
      {weapon ? (
        <fieldset className="bst-nb-fieldset bst-nb-box">
          <legend className="bst-field-label">Weapon</legend>
          <div className="bst-nb-grid">
            <SelectField label="Category" value={form.weaponCategory} options={[{ value: 'simple', label: 'Simple' }, { value: 'martial', label: 'Martial' }]} onChange={weaponCategory => set({ weaponCategory })} />
            <TextField label="Damage" value={form.damage} placeholder="1d8" mono onChange={damage => set({ damage })} />
            <SelectField label="Damage type" value={form.damageType} options={DAMAGE_OPTIONS.slice(1)} onChange={damageType => set({ damageType })} />
          </div>
          <div className="bst-nb-grid">
            <TextField label="Versatile damage" value={form.versatileDamage} placeholder="1d10" mono onChange={versatileDamage => set({ versatileDamage })} />
            <TextField label="Range" value={form.range} placeholder="80/320" onChange={range => set({ range })} />
            <SelectField label="Mastery" value={form.mastery} options={MASTERIES.map(m => ({ value: m, label: m || 'None' }))} onChange={mastery => set({ mastery })} />
          </div>
          <ChipGroup label="Properties" options={WEAPON_PROPERTIES.map(p => ({ value: p, label: p }))} selected={form.properties} onChange={properties => set({ properties })} />
        </fieldset>
      ) : null}
      {armor ? (
        <fieldset className="bst-nb-fieldset bst-nb-box">
          <legend className="bst-field-label">Armor</legend>
          <div className="bst-nb-grid">
            <TextField label="Armor Class" value={form.ac} inputMode="numeric" onChange={ac => set({ ac })} />
            <TextField label="Strength needed" value={form.strength} inputMode="numeric" onChange={strength => set({ strength })} />
          </div>
          <CheckField label="Disadvantage on Stealth" checked={form.stealthDisadvantage} onChange={stealthDisadvantage => set({ stealthDisadvantage })} />
        </fieldset>
      ) : null}
    </>
  )
}

function MagicItemFields({ form, set, suggestions }: { form: MagicItemForm; set: (patch: Partial<MagicItemForm>) => void; suggestions: Suggestions }) {
  return (
    <>
      <div className="bst-nb-grid">
        <SelectField label="Type" value={form.itemType} options={MAGIC_ITEM_TYPES} onChange={itemType => set({ itemType })} />
        <SelectField label="Rarity" value={form.rarity} options={RARITIES.map(r => ({ value: r, label: cap(r) }))} onChange={rarity => set({ rarity })} />
      </div>
      <div className="bst-nb-row bst-nb-row--wrap">
        <CheckField label="Requires attunement" checked={form.requiresAttunement} onChange={requiresAttunement => set({ requiresAttunement })} />
        <CheckField label="Cursed" checked={form.cursed} onChange={cursed => set({ cursed })} />
      </div>
      {form.requiresAttunement ? (
        <TextField label="Attunement by (optional)" value={form.attunementRestriction} placeholder="a Wizard" onChange={attunementRestriction => set({ attunementRestriction })} />
      ) : null}
      <TextField label="Weight (lb.)" value={form.weight} inputMode="decimal" onChange={weight => set({ weight })} />
      <fieldset className="bst-nb-fieldset bst-nb-box">
        <legend className="bst-field-label">Charges (optional)</legend>
        <div className="bst-nb-grid">
          <TextField label="Charges" value={form.charges} placeholder="3, or 1d6 + 1" onChange={charges => set({ charges })} />
          <SelectField label="Recharges" value={form.recharge} options={RECHARGES.map(r => ({ value: r.value, label: r.label }))} onChange={recharge => set({ recharge })} />
          <TextField label="Regains" value={form.rechargeAmount} placeholder="1d3" mono onChange={rechargeAmount => set({ rechargeAmount })} />
        </div>
      </fieldset>
      <NameList
        label="Spells it casts"
        values={form.casts}
        onChange={casts => set({ casts })}
        suggestions={suggestions.spells}
        addLabel="Add spell"
        hint="A spell's name, and how it is cast if you like: Ember Ward (1 charge)."
      />
      <div className="bst-field">
        <span className="bst-field-label">While worn</span>
        <EffectEditor effects={form.effects} onChange={effects => set({ effects })} types={MAGIC_ITEM_EFFECT_TYPES} owner={form.name.trim()} />
      </div>
    </>
  )
}

function BenefitCard({
  benefit,
  index,
  count,
  set,
  move,
  remove,
}: {
  benefit: BenefitForm
  index: number
  count: number
  set: (patch: Partial<BenefitForm>) => void
  move: (by: -1 | 1) => void
  remove: () => void
}) {
  const name = benefit.name.trim() || `Benefit ${index + 1}`
  return (
    <section className="bst-nb-card" aria-label={name}>
      <div className="bst-nb-row bst-nb-row--end">
        <div className="bst-nb-grow">
          <TextField label="Benefit name" value={benefit.name} onChange={v => set({ name: v })} />
        </div>
        <button type="button" className="bst-plain bst-btn-ghost bst-btn-sm" aria-label={`Move ${name} up`} disabled={index === 0} onClick={() => move(-1)}>
          ↑
        </button>
        <button type="button" className="bst-plain bst-btn-ghost bst-btn-sm" aria-label={`Move ${name} down`} disabled={index === count - 1} onClick={() => move(1)}>
          ↓
        </button>
        <button type="button" className="bst-plain bst-btn-ghost bst-btn-sm" aria-label={`Remove ${name}`} onClick={remove}>
          ✕
        </button>
      </div>
      <TextArea label="Text" rows={3} value={benefit.text} onChange={text => set({ text })} />
      <EffectEditor effects={benefit.effects} onChange={effects => set({ effects })} types={FEAT_EFFECT_TYPES} owner={benefit.name.trim()} />
    </section>
  )
}

function FeatFields({ form, set }: { form: FeatForm; set: (patch: Partial<FeatForm>) => void }) {
  const benefits = form.benefits
  const setBenefit = (i: number, patch: Partial<BenefitForm>) => set({ benefits: benefits.map((b, j) => (j === i ? { ...b, ...patch } : b)) })
  const move = (i: number, by: -1 | 1) => {
    const next = [...benefits]
    ;[next[i], next[i + by]] = [next[i + by], next[i]]
    set({ benefits: next })
  }
  const modelled = benefits.filter(b => b.effects.length > 0).length
  return (
    <>
      <ChipGroup<FeatKind> label="Kind" single options={FEAT_KINDS} selected={[form.featKind]} onChange={([featKind]) => set({ featKind })} />
      <TextField label="Prerequisite (optional)" value={form.prerequisite} placeholder="Level 4+" onChange={prerequisite => set({ prerequisite })} />
      <section className="bst-nb-section" aria-labelledby="bst-nb-benefits">
        <div className="bst-nb-row bst-nb-row--wrap">
          <h3 id="bst-nb-benefits" className="bst-nb-h">
            Benefits
          </h3>
          <span className="bst-nb-hint">
            {benefits.length} · {modelled} on the sheet
          </span>
        </div>
        {benefits.map((b, i) => (
          <BenefitCard
            key={i}
            benefit={b}
            index={i}
            count={benefits.length}
            set={patch => setBenefit(i, patch)}
            move={by => move(i, by)}
            remove={() => set({ benefits: benefits.filter((_, j) => j !== i) })}
          />
        ))}
        <button type="button" className="bst-plain bst-btn-secondary bst-nb-self-start" onClick={() => set({ benefits: [...benefits, { name: '', text: '', effects: [] }] })}>
          + Benefit
        </button>
        <p className="bst-nb-hint">
          Effects offered: score increases, skills, saving throws, weapon and armor training, resistance, senses, speed and uses. For anything else,
          copy a block from an exported feat into the note after saving.
        </p>
      </section>
    </>
  )
}

/** The fields `form`'s kind adds. `set` patches the form; it is typed by kind at each call. */
export function KindFields({ form, set, suggestions }: { form: BuilderForm; set: (patch: Partial<BuilderForm>) => void; suggestions: Suggestions }) {
  switch (form.kind) {
    case 'spell':
      return <SpellFields form={form} set={set} suggestions={suggestions} />
    case 'item':
      return <ItemFields form={form} set={set} />
    case 'magic-item':
      return <MagicItemFields form={form} set={set} suggestions={suggestions} />
    case 'feat':
      return <FeatFields form={form} set={set} />
    case 'condition':
      return null
  }
}
