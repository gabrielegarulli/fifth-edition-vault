// The sub-choices an origin feat asks for, shared by the builder and
// level-up.

import {
  blankChoices,
  chosenSpellAllowed,
  chosenSpellCount,
  choicesComplete,
  originFeatSpec,
  toolName,
} from '@vault/derive/originFeatChoices.js'
import type {
  ChosenSpellsSpec,
  OriginFeatSpec as Spec,
  ProficienciesSpec as ProficiencySpec,
  SkillsSpec,
  SpellsSpec,
} from '@vault/derive/originFeatChoices.js'
import { ABILITY_FULL } from '@vault/derive/speciesChoices.js'
import { TOOLS } from '@vault/derive/tools.js'

import { ALL_SKILLS, SKILL_NAME } from '../model/choices'
import type { BuilderDraft } from '../model/draft'
import type { SpellRow } from '../../compendium'
import { OptionSelect, Section, type Option } from './fields'
import { SpellPreview } from './Previews'

/**
 * The origin feat's own questions — Magic Initiate's list, ability and spells;
 * Skilled's, Crafter's and Musician's three picks (MYDND-29; the web builder's
 * `OriginFeatSubPicker`). Renders nothing for the feats that ask nothing, which
 * is most of them.
 *
 * Since MYDND-182 it asks a general feat's too, wherever one is taken: Fey and
 * Shadow Touched's spell and Ritual Caster's rituals (`chosen_spells`),
 * Elemental Adept's damage type, Skill Expert's, Keen Mind's and Observant's
 * skills, and the two cantrips of Blessed and Druidic Warrior, whose list and
 * ability are fixed and so not asked.
 *
 * The spec and its shape are `@vault/derive/originFeatChoices.js`, so what is
 * saved here is exactly what `originFeatEffects` bakes.
 */

type SpellPick = { spellId: string; spellName: string } | null
interface SpellChoices {
  spellList: string | null
  ability: string | null
  cantrips: SpellPick[]
  spells: SpellPick[]
}
interface ProficiencyChoices {
  picks: Array<{ kind: 'skill' | 'tool'; slug: string } | null>
}

const TOOL_TABLE = TOOLS as Record<string, { name: string; category: string }>
const ABILITY = ABILITY_FULL

export function OriginFeatChoices({
  feat,
  spellsFor,
  spells = [],
  context = {},
  takenLists = [],
  onChange,
}: {
  feat: BuilderDraft['originFeat']
  spellsFor: (list: string) => SpellRow[]
  /** Every spell note: what Fey Touched and Ritual Caster choose from, any list. */
  spells?: readonly SpellRow[]
  /** The Proficiency Bonus Ritual Caster counts by (`featContext`). */
  context?: { proficiencyBonus?: number }
  /** Spell lists another copy of the feat holds; it must choose a different one. */
  takenLists?: readonly string[]
  onChange: (choices: unknown) => void
}) {
  const spec: Spec | null = originFeatSpec(feat?.name)
  if (!feat || !spec) return null
  const complete = choicesComplete(spec, feat.choices, context)
  // A feat picked before its spec existed was saved with no choices at all.
  const choices = (feat.choices ?? blankChoices(spec, context)) as Record<string, unknown>
  return (
    <Section title={`${feat.name} — choices`} open={!complete}>
      {spec.kind === 'spells' ? (
        <SpellChoicesPicker
          spec={spec}
          choices={choices as unknown as SpellChoices}
          spellsFor={spellsFor}
          takenLists={takenLists}
          onChange={onChange}
        />
      ) : spec.kind === 'chosen_spells' ? (
        <ChosenSpellsPicker
          spec={spec}
          count={chosenSpellCount(spec, context)}
          picks={(choices.spells as SpellPick[] | undefined) ?? []}
          spells={spells}
          onChange={picks => onChange({ ...choices, spells: picks })}
        />
      ) : spec.kind === 'damage_type' ? (
        <OptionSelect
          label="Damage type"
          value={typeof choices.damageType === 'string' ? choices.damageType : ''}
          options={spec.options.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
          onChange={v => onChange({ ...choices, damageType: v || null })}
        />
      ) : spec.kind === 'skills' ? (
        <SkillSlots spec={spec} picked={(choices.skills as Array<string | null> | undefined) ?? []} onChange={skills => onChange({ ...choices, skills })} />
      ) : (
        <ProficiencyPicker spec={spec} choices={choices as unknown as ProficiencyChoices} onChange={onChange} />
      )}
    </Section>
  )
}

function SpellChoicesPicker({
  spec,
  choices,
  spellsFor,
  takenLists,
  onChange,
}: {
  spec: SpellsSpec
  choices: SpellChoices
  spellsFor: (list: string) => SpellRow[]
  takenLists: readonly string[]
  onChange: (choices: SpellChoices) => void
}) {
  const rows = choices.spellList ? spellsFor(choices.spellList) : []
  const taken = new Set([...choices.cantrips, ...choices.spells].filter(Boolean).map(p => p!.spellId))
  const slot = (field: 'cantrips' | 'spells', i: number, options: SpellRow[], label: string) => {
    const current = choices[field][i]?.spellId ?? ''
    return (
      <div key={`${field}-${i}`} className="bst-col">
        <OptionSelect
          label={label}
          value={current}
          options={options.map(s => ({ value: s.id, label: s.name, disabled: s.id !== current && taken.has(s.id) }))}
          onChange={v => {
            const length = field === 'cantrips' ? spec.cantripCount : spec.spellCount
            const next = Array.from({ length }, (_, j) => choices[field][j] ?? null)
            const spell = options.find(s => s.id === v)
            next[i] = spell ? { spellId: spell.id, spellName: spell.name } : null
            onChange({ ...choices, [field]: next })
          }}
        />
        <SpellPreview spell={options.find(s => s.id === current)} />
      </div>
    )
  }
  return (
    <>
      {/* Blessed and Druidic Warrior: one list, one ability, so neither is asked. */}
      {spec.lists.length === 1 && spec.abilities.length === 1 ? (
        <p className="bst-note">
          {spec.lists[0]} spells, cast with {ABILITY[spec.abilities[0]] ?? spec.abilities[0]}.
        </p>
      ) : null}
      {spec.lists.length > 1 ? (
        <OptionSelect
          label="Spell list"
          value={choices.spellList ?? ''}
          options={spec.lists.map(l => {
            const taken = l !== choices.spellList && takenLists.includes(l)
            return { value: l, label: taken ? `${l} (taken)` : l, disabled: taken }
          })}
          onChange={v =>
            // A new list empties the picks: a Wizard cantrip is not a Cleric one.
            onChange({
              ...choices,
              spellList: v || null,
              cantrips: Array.from({ length: spec.cantripCount }, () => null),
              spells: Array.from({ length: spec.spellCount }, () => null),
            })
          }
        />
      ) : null}
      {spec.abilities.length > 1 ? (
        <OptionSelect
          label="Spellcasting ability"
          value={choices.ability ?? ''}
          options={spec.abilities.map(a => ({ value: a, label: ABILITY[a] ?? a }))}
          onChange={v => onChange({ ...choices, ability: v || null })}
        />
      ) : null}
      {choices.spellList && rows.length === 0 ? (
        <p className="bst-note">No spell note lists {choices.spellList}.</p>
      ) : null}
      {choices.spellList
        ? [
            ...Array.from({ length: spec.cantripCount }, (_, i) =>
              slot('cantrips', i, rows.filter(s => s.level === 0), `Cantrip ${i + 1}`),
            ),
            ...Array.from({ length: spec.spellCount }, (_, i) =>
              slot('spells', i, rows.filter(s => s.level === spec.spellLevel), `Level ${spec.spellLevel} spell`),
            ),
          ]
        : null}
    </>
  )
}

/**
 * Fey Touched, Shadow Touched, Ritual Caster (MYDND-182): spells from any list,
 * held to the feat's level, schools and Ritual tag (`chosenSpellAllowed`). The
 * count is the spec's, or Ritual Caster's Proficiency Bonus.
 */
function ChosenSpellsPicker({
  spec,
  count,
  picks,
  spells,
  onChange,
}: {
  spec: ChosenSpellsSpec
  count: number
  picks: SpellPick[]
  spells: readonly SpellRow[]
  onChange: (picks: SpellPick[]) => void
}) {
  const options = spells.filter(s => chosenSpellAllowed(spec, s))
  const taken = new Set(picks.filter(Boolean).map(p => p!.spellId))
  const what = [spec.schools?.join(' or '), spec.ritual ? 'Ritual' : null].filter(Boolean).join(' ')
  return (
    <>
      <p className="bst-note">
        {spec.fixedSpells.length > 0 ? `Always prepared as well: ${spec.fixedSpells.join(', ')}. ` : ''}
        Cast with the ability this feat increases.
      </p>
      {options.length === 0 ? <p className="bst-note">No spell note is a level {spec.spellLevel} {what} spell.</p> : null}
      {Array.from({ length: count }, (_, i) => {
        const current = picks[i]?.spellId ?? ''
        return (
          <div key={i} className="bst-col">
            <OptionSelect
              label={`${what ? `${what} spell` : 'Spell'} ${i + 1}`}
              value={current}
              options={options.map(s => ({ value: s.id, label: s.name, disabled: s.id !== current && taken.has(s.id) }))}
              onChange={v => {
                const next = Array.from({ length: count }, (_, j) => picks[j] ?? null)
                const spell = options.find(s => s.id === v)
                next[i] = spell ? { spellId: spell.id, spellName: spell.name } : null
                onChange(next)
              }}
            />
            <SpellPreview spell={options.find(s => s.id === current)} />
          </div>
        )
      })}
    </>
  )
}

/** Skill Expert, Keen Mind, Observant (MYDND-182): one select per slot, from its own list. */
function SkillSlots({
  spec,
  picked,
  onChange,
}: {
  spec: SkillsSpec
  picked: Array<string | null>
  onChange: (skills: Array<string | null>) => void
}) {
  return (
    <>
      {spec.slots.some(s => s.grant === 'proficiency_or_expertise') ? (
        <p className="bst-note">Proficiency, or Expertise if you already have it.</p>
      ) : null}
      {spec.slots.map((slot, i) => (
        <OptionSelect
          key={slot.label}
          label={slot.label}
          value={picked[i] ?? ''}
          options={(slot.from ?? ALL_SKILLS).map(s => ({ value: s, label: SKILL_NAME[s] ?? s }))}
          onChange={v => {
            const next = spec.slots.map((_, j) => picked[j] ?? null)
            next[i] = v || null
            onChange(next)
          }}
        />
      ))}
    </>
  )
}

function ProficiencyPicker({
  spec,
  choices,
  onChange,
}: {
  spec: ProficiencySpec
  choices: ProficiencyChoices
  onChange: (choices: ProficiencyChoices) => void
}) {
  const encode = (p: { kind: string; slug: string } | null) => (p ? `${p.kind}:${p.slug}` : '')
  const encoded = choices.picks.map(encode)
  const options: Option[] = [
    ...(spec.allowsSkills ? ALL_SKILLS.map(s => ({ value: `skill:${s}`, label: SKILL_NAME[s] ?? s })) : []),
    ...spec.toolSlugs
      .filter(slug => TOOL_TABLE[slug])
      .map(slug => ({ value: `tool:${slug}`, label: toolName(slug) })),
  ]
  return (
    <>
      {Array.from({ length: spec.count }, (_, i) => (
        <OptionSelect
          key={i}
          label={`${spec.slotLabel} ${i + 1}`}
          value={encoded[i] ?? ''}
          options={options.map(o => ({
            ...o,
            disabled: o.value !== encoded[i] && encoded.includes(o.value),
          }))}
          onChange={v => {
            const next = Array.from({ length: spec.count }, (_, j) => choices.picks[j] ?? null)
            const [kind, slug] = v.split(/:(.*)/s)
            next[i] = v ? { kind: kind as 'skill' | 'tool', slug } : null
            onChange({ ...choices, picks: next })
          }}
        />
      ))}
    </>
  )
}
