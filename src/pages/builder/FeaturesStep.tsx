import { formatCR } from '@vault/derive/dnd5e.js'
import { featAbilityChoice } from '@vault/derive/featAbilities.js'
import { fightingStyleOptions, withoutFightingStyleFeats } from '@vault/derive/fightingStyles.js'
import { withFamiliarImprovements, withFeatureChoice } from '@vault/derive/builderDraft.js'
import { additionalSpellAlternatives, additionalSpellPicks, pickKey, spellAllowed } from '@vault/derive/additionalSpells.js'
import { blankChoices, originFeatSpec } from '@vault/derive/originFeatChoices.js'
import { ABILITY_FULL } from '@vault/derive/speciesChoices.js'

import {
  TARGETED,
  armorOptions,
  improvementSlots,
  slotLevel,
  slotOptions,
  slottedOf,
  storedImprovements,
  type ImprovementDef,
  type ImprovementPick,
} from '../../builder/companion'
import {
  SKILL_NAME,
  featureTitle,
  fightingStyleFeats,
  invocationOffered,
  invocationOwner,
  invocationTargetKind,
  invocationTargets,
  isAsiFeat,
  isPactInvocation,
  itemComplete,
  keepingPrerequisites,
  optionalFeatureAnswer,
  optionalFeatureCount,
  optionalFeatureOptions,
  optionalFeaturePicks,
  requiredOptionalFeatures,
  spellListsTaken,
  type FeatData,
  type InvocationOption,
  type InvocationPick,
  featContext,
  type InvocationTarget,
  type LevelItem,
} from '../../builder/choices'
import { ABILITY_KEYS, type BuilderDraft } from '../../builder/draft'
import { baseClassName } from '../../content/classes'
import type { FeatRow } from '../../content/feats'
import type { MonsterRow } from '../../content/monsters'
import type { SpellRow } from '../../content/spells'
import { parseSpeed } from '../../sheet/companion'
import { ADDITIONAL_SPELLS, additionalSpellsAnswer, type AdditionalSpellPick } from '../../vaultCharacter/additionalSpells'
import { Markdown } from '../../ui/Markdown'
import { OptionSelect, Section, SlotSelects, withCurrent, type Option, type SetDraft } from './fields'
import { OriginFeatChoices } from './OriginFeatChoices'
import { FeatPreview, SpellPreview } from './Previews'

/**
 * Every question a class, its subclass and its levels ask (MYDND-29) — the web
 * builder's `LevelProgressionAccordions` and its eleven pickers, as one list of
 * sections in a pane.
 *
 * Each section is outlined while it is unanswered and never blocks Next, the
 * web builder's rule: an unanswered choice is saved as it stands and finished
 * in Edit. Every answer goes into `featureChoices` under the feature's
 * `featureId` — the key the bake reads it back by — in the web app's own shape,
 * so `@vault/derive` resolves it unchanged.
 *
 * **Each pick shows what it does under its select** (MYDND-155): a native select
 * cannot show text beside an option, but a pick is free to change. The level-up
 * panel renders this step, so it gets the same.
 */

const ABILITY = ABILITY_FULL as Record<string, string>

export interface MasteryWeapon {
  id: string
  name: string
  mastery: string
}

export interface FeaturesStepProps {
  draft: BuilderDraft
  setDraft: SetDraft
  items: LevelItem[]
  /** Every feat note's row — the ASI, boon and fighting-style pools. */
  feats: readonly FeatRow[]
  /** The picked feats, with fences: what a half-feat's +1 is read from. */
  featData: readonly FeatData[]
  scores: Record<string, number>
  /** `skillSourceMap` — which skills the character already has, and from where. */
  skillSources: Record<string, string>
  masteryCount: number
  /** Weapons carrying a mastery, or null while their notes are read. */
  masteryWeapons: MasteryWeapon[] | null
  invocationCount(classIndex: number): number
  spellsFor(className: string): SpellRow[]
  /** Every spell note, for a feat that chooses from any list (MYDND-182). Optional for older callers. */
  spells?: readonly SpellRow[]
  familiars: readonly MonsterRow[]
  onFamiliar(featureId: string, monster: MonsterRow | null): void
  /** Each picked familiar's improvement tree, by monster id; absent while read (MYDND-126). */
  companions?: ReadonlyMap<string, ImprovementDef[]>
  /** Weapon names War Training may name. */
  weaponNames?: readonly string[]
}

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
  const set = (choice: unknown) => setDraft(d => withFeatureChoice(d, id, choice) as unknown as BuilderDraft)
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

type PickerProps = FeaturesStepProps & { item: LevelItem; answer: unknown; set(choice: unknown): void }

function Prose({ text }: { text: string }) {
  return <p className="bst-note bst-note--pre">{text}</p>
}

/** Text out of a note, which is markdown: an option's `#### Repeatable` is a heading. */
function NoteText({ text }: { text: string }) {
  return <Markdown markdown={text} sourcePath="" className="bst-entry-desc" />
}

const skillOption = (slug: string, sources?: Record<string, string>): Option => ({
  value: slug,
  label: sources?.[slug] ? `${SKILL_NAME[slug] ?? slug} (${sources[slug]})` : (SKILL_NAME[slug] ?? slug),
  disabled: Boolean(sources?.[slug]),
})

/** A feature granting skills — Primal Knowledge, Bonus Proficiencies. A bare array of slugs. */
function SkillPicker({ item, answer, set, skillSources }: PickerProps) {
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
function ExpertisePicker({ item, answer, set, skillSources, draft }: PickerProps) {
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
function AsiPicker({ item, answer, set, feats, featData, scores, spellsFor, spells, draft }: PickerProps) {
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
function BoonPicker({ answer, set, feats, featData, scores }: PickerProps) {
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

interface NamedOption {
  name: string
  description?: string
  minLevel?: number
  requires?: string
  repeatable?: boolean
  cost?: number
}

const optionsOf = (item: LevelItem): NamedOption[] => {
  const raw = item.feature.choices?.options
  return Array.isArray(raw) ? (raw as NamedOption[]).filter(o => typeof o?.name === 'string') : []
}

/**
 * Eldritch Invocations — as many as the class table's column says at this
 * level, each gated on its `minLevel` and on any invocation it `requires`.
 *
 * **A pact is one of them** (MYDND-175). The SRD has no Pact Boon feature, so Pact
 * of the Blade, Chain and Tome are picked here; they come first and the picker
 * says what they unlock, because a player expecting a separate pact choice sees
 * only invocations locked behind something nothing seems to offer.
 *
 * **A repeatable invocation names what it repeats on**, and each repeat must name
 * something else: that is the whole of the rule, so a repeat with no target is
 * left open. The rules are `builder/choices.ts`.
 */
function InvocationPicker({ item, answer, set, draft, invocationCount, spellsFor, feats }: PickerProps) {
  const options = optionsOf(item) as InvocationOption[]
  const pacts = options.filter(isPactInvocation)
  const ordered = [...pacts, ...options.filter(o => !isPactInvocation(o))]
  const count = invocationCount(item.classIndex)
  const level = draft.classes[item.classIndex]?.level ?? 1
  const picks = (answer as { invocations?: InvocationPick[] } | undefined)?.invocations ?? []
  const pool = { cantrips: spellsFor(item.className), originFeats: feats.filter(f => f.kind === 'origin') }
  const setSlot = (i: number, pick: InvocationPick | null) => {
    const next: Array<InvocationPick | null> = Array.from({ length: count }, (_, j) => picks[j] ?? null)
    next[i] = pick
    set({ type: 'invocations', invocations: keepingPrerequisites(next.filter((p): p is InvocationPick => p !== null)) })
  }
  return (
    <>
      {pacts.length > 0 ? (
        <Prose text={`Your pact is an invocation. Take ${new Intl.ListFormat('en', { type: 'disjunction' }).format(pacts.map(p => p.name))} here to unlock the invocations that need it.`} />
      ) : null}
      {Array.from({ length: count }, (_, i) => {
        const pick = picks[i]
        const current = pick?.name ?? ''
        const option = options.find(o => o.name === current)
        return (
          <div key={i} className="bst-col">
            <OptionSelect
              label={count > 1 ? `Invocation ${i + 1}` : 'Invocation'}
              value={current}
              placeholder="— Choose an invocation"
              options={ordered.map(o => ({
                value: o.name,
                label: [o.name, (o.minLevel ?? 1) > 1 ? `${item.className} ${o.minLevel}+` : null, o.requires ? `needs ${o.requires}` : null]
                  .filter(Boolean)
                  .join(' · '),
                disabled: o.name !== current && !invocationOffered(o, picks, i, level, invocationTargets(o, pool).length),
                group: pacts.length > 0 ? (isPactInvocation(o) ? 'Pacts' : 'Invocations') : undefined,
              }))}
              onChange={v => {
                const o = options.find(x => x.name === v)
                setSlot(i, o ? { ...o } : null)
              }}
            />
            {option && pick && invocationTargetKind(option) ? (
              <InvocationTargetPicker
                slot={i}
                pick={pick}
                targets={invocationTargets(option, pool)}
                taken={picks.flatMap((p, j) => (j !== i && p.name === current && p.target ? [p.target.id] : []))}
                known={draft.spells.cantrips.map(c => c.id)}
                onChange={next => setSlot(i, next)}
                spellsFor={spellsFor}
                takenLists={spellListsTaken(draft, invocationOwner(item.feature.id, i))}
              />
            ) : null}
            {option?.description ? <NoteText text={option.description} /> : null}
          </div>
        )
      })}
    </>
  )
}

/** Which cantrip or Origin feat a repeatable invocation names; none another copy holds. */
function InvocationTargetPicker({
  slot,
  pick,
  targets,
  taken,
  known,
  onChange,
  spellsFor,
  takenLists,
}: {
  slot: number
  pick: InvocationPick
  targets: InvocationTarget[]
  taken: string[]
  known: string[]
  onChange(pick: InvocationPick): void
  spellsFor(list: string): SpellRow[]
  takenLists: readonly string[]
}) {
  const noun = invocationTargetKind(pick) === 'cantrip' ? 'cantrip' : 'Origin feat'
  const target = pick.target ?? null
  return (
    <>
      <OptionSelect
        label={`${noun === 'cantrip' ? 'Cantrip' : noun} for invocation ${slot + 1}`}
        value={target?.id ?? ''}
        placeholder={targets.length === 0 ? `No eligible ${noun} exported` : `— Choose ${noun === 'cantrip' ? 'a' : 'an'} ${noun}`}
        options={targets.map(t => ({
          value: t.id,
          label: taken.includes(t.id) ? `${t.name} (taken)` : t.name,
          disabled: t.id !== target?.id && taken.includes(t.id),
        }))}
        onChange={v => {
          const next = targets.find(t => t.id === v) ?? null
          onChange({ ...pick, target: next, choices: next?.kind === 'origin_feat' ? blankChoices(originFeatSpec(next.name)) : undefined })
        }}
      />
      {target?.kind === 'cantrip' && !known.includes(target.id) ? (
        <p className="bst-note">Learn {target.name} on the Spells step for this to apply.</p>
      ) : null}
      {target?.kind === 'origin_feat' ? (
        <OriginFeatChoices
          feat={{ id: target.id, name: target.name, source: target.source ?? null, choices: pick.choices ?? null }}
          spellsFor={spellsFor}
          takenLists={takenLists}
          onChange={choices => onChange({ ...pick, choices })}
        />
      ) : null}
    </>
  )
}

/** Metamagic — `count` options, none taken twice across the class's three grants. */
function MetamagicPicker({ item, answer, set, draft }: PickerProps) {
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

/**
 * A subclass's maneuvers, runes, arcane shots or disciplines (MYDND-181): one
 * slot per option the class level has the character know, the required ones
 * (Elemental Attunement) given, not asked. An option with a level prerequisite
 * waits for it.
 */
function OptionalFeaturesPicker({ item, answer, set, draft }: PickerProps) {
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

interface SpellChoicePick {
  spellLevel: number
  spellId: string
  spellName: string
}

/** Mystic Arcanum and its kin — one spell of a fixed level per slot, from the class's list. */
function SpellChoicePicker({ item, answer, set, spellsFor, levels }: PickerProps & { levels: number[] }) {
  const list = spellsFor(item.className)
  const picks = (answer as { spells?: Array<SpellChoicePick | null> } | undefined)?.spells ?? []
  const choices: Record<string, unknown> = item.feature.choices ?? {}
  return (
    <>
      {levels.map((level, i) => {
        const options = list.filter(s => s.level === level)
        const current = picks[i]?.spellId ?? ''
        if (options.length === 0) {
          return <Prose key={i} text={`No level ${level} ${item.className} spells exported.`} />
        }
        return (
          <div key={i} className="bst-col">
            <OptionSelect
              label={`Level ${level} spell`}
              value={current}
              placeholder="— Choose a spell"
              options={options.map(s => ({
                value: s.id,
                label: s.name,
                disabled: picks.some((p, j) => j !== i && p?.spellId === s.id),
              }))}
              onChange={v => {
                const next = Array.from({ length: levels.length }, (_, j) => picks[j] ?? null)
                const spell = options.find(s => s.id === v)
                next[i] = spell ? { spellLevel: level, spellId: spell.id, spellName: spell.name } : null
                set(
                  next.some(Boolean)
                    ? {
                        type: 'spell_choice',
                        label: item.feature.name,
                        className: item.className,
                        minLevel: item.level,
                        uses: choices.uses ?? null,
                        resets: choices.resets ?? null,
                        spells: next,
                      }
                    : null,
                )
              }}
            />
            <SpellPreview spell={options.find(s => s.id === current)} />
          </div>
        )
      })}
    </>
  )
}

interface SpellFilter {
  levels: number[] | null
  classes: string[] | null
  schools: string[] | null
  ritual: boolean
}

/** "levels 0–3 · Cleric, Druid or Wizard · Abjuration": what a pick allows, in words. */
function filterText(f: SpellFilter): string {
  const levels = f.levels?.length
    ? f.levels.length === 1
      ? f.levels[0] === 0
        ? 'a cantrip'
        : `level ${f.levels[0]}`
      : `levels ${Math.min(...f.levels)}–${Math.max(...f.levels)}`
    : null
  const lists = f.classes?.length ? `${f.classes.join(', ').replace(/, ([^,]*)$/, ' or $1')} list` : null
  return [levels, lists, f.schools?.join(' or ') ?? null, f.ritual ? 'ritual' : null].filter(Boolean).join(' · ')
}

/**
 * Spells a class or subclass hands over outside the caps (MYDND-183): Lore's
 * Magical Discoveries, a 2024 Savant's free spellbook spells, and the
 * alternative a note offers (Circle of the Land's land). Which picks a level
 * brings and what each allows is derive's `additionalSpells.js`; the answer is
 * one per note, `{ type: 'additional_spells', block, picks }`.
 */
function AdditionalSpellsPicker({ item, answer, set, draft, spells = [] }: PickerProps) {
  const choices: Record<string, unknown> = item.feature.choices ?? {}
  const blocks = (Array.isArray(choices.additionalSpells) ? choices.additionalSpells : []) as object[]
  const level = draft.classes[item.classIndex]?.level ?? 1
  const stored = additionalSpellsAnswer(answer)
  const block = stored?.block ?? null
  const alternatives = (additionalSpellAlternatives(blocks) as Array<{ name: string; level: number }>).filter(a => a.level <= level)
  const picks = additionalSpellPicks(blocks, level, block, { spellbook: choices.spellbook === true }) as Array<{
    level: number
    mode: string
    slots: SpellFilter[]
  }>
  const save = (next: { block: string | null; picks: Record<string, Array<AdditionalSpellPick | null>> }) =>
    set(next.block || Object.values(next.picks).some(l => l.some(Boolean)) ? { type: ADDITIONAL_SPELLS, ...next } : null)
  // By name: the 2014 and 2024 notes of one spell are two ids and one spell.
  const taken = new Set(
    Object.values(stored?.picks ?? {}).flatMap(l => l.flatMap(p => (p?.spellName ? [p.spellName.toLowerCase()] : []))),
  )

  return (
    <>
      {item.feature.description ? <NoteText text={item.feature.description} /> : null}
      {alternatives.length > 0 ? (
        <OptionSelect
          label={`${String(choices.owner ?? item.className)}: choose one`}
          value={block ?? ''}
          placeholder="— Choose one"
          options={alternatives.map(a => ({ value: a.name, label: a.name }))}
          // Another alternative asks other picks; the old ones would not apply.
          onChange={v => save({ block: v || null, picks: {} })}
        />
      ) : null}
      {picks.map(pick => {
        const key = pickKey(pick) as string
        const chosen = stored?.picks?.[key] ?? []
        return pick.slots.map((filter, i) => {
          const options = spells
            .filter(s => spellAllowed(filter, s))
            .slice()
            .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
          const current = chosen[i]?.spellId ?? ''
          return (
            <div key={`${key}-${i}`} className="bst-col">
              <OptionSelect
                label={`Level ${pick.level} spell ${i + 1} (${filterText(filter)})`}
                value={current}
                placeholder={options.length === 0 ? 'No spell note fits' : '— Choose a spell'}
                options={options.map(s => ({
                  value: s.id,
                  label: s.level === 0 ? `${s.name} (cantrip)` : `${s.name} (level ${s.level})`,
                  disabled: s.id !== current && taken.has(s.name.toLowerCase()),
                }))}
                onChange={v => {
                  const spell = options.find(s => s.id === v)
                  const next = Array.from({ length: pick.slots.length }, (_, j) => chosen[j] ?? null)
                  next[i] = spell ? { spellId: spell.id, spellName: spell.name, spellLevel: spell.level } : null
                  save({ block, picks: { ...(stored?.picks ?? {}), [key]: next } })
                }}
              />
              <SpellPreview spell={options.find(s => s.id === current)} />
            </div>
          )
        })
      })}
    </>
  )
}

/**
 * The Tamer's companion — a bestiary note flagged `is_familiar` — and its
 * improvements (MYDND-126): one slot per improvement its Tamer's level gives,
 * from the tree on the familiar's note. The rules are `builder/companion.ts`.
 */
function FamiliarPicker({
  item,
  answer,
  familiars,
  onFamiliar,
  draft,
  setDraft,
  companions,
  weaponNames,
}: FeaturesStepProps & { item: LevelItem; answer: unknown }) {
  const current = (answer as { monsterId?: string } | undefined)?.monsterId ?? ''
  const taken = new Set(
    Object.entries(draft.featureChoices)
      .filter(([key, c]) => key !== item.feature.id && (c as { type?: string })?.type === 'familiar')
      .map(([, c]) => (c as { monsterId?: string }).monsterId),
  )
  if (familiars.length === 0) {
    return <Prose text="No bestiary note is flagged is_familiar: true, so there is nothing to choose yet." />
  }
  return (
    <>
      <OptionSelect
        label="Companion"
        value={current}
        placeholder="None yet"
        options={familiars.map(m => ({
          value: m.id,
          label: `${m.name} · CR ${formatCR(m.cr) as string}${m.size ? ` · ${m.size}` : ''}`,
          disabled: m.id !== current && taken.has(m.id),
        }))}
        onChange={v => onFamiliar(item.feature.id, familiars.find(m => m.id === v) ?? null)}
      />
      {current ? (
        <ImprovementSlots
          featureId={item.feature.id}
          answer={answer as Record<string, unknown>}
          defs={companions?.get(current) ?? null}
          tamerLevel={draft.classes[item.classIndex]?.level ?? 1}
          speeds={Object.keys(parseSpeed(familiarEntry(draft, item.feature.id)?.data?.speed))}
          weaponNames={weaponNames ?? []}
          setDraft={setDraft}
        />
      ) : null}
    </>
  )
}

const familiarEntry = (draft: BuilderDraft, featureId: string) =>
  (draft.familiars as Array<{ featureId?: string; data?: { speed?: unknown } }>).find(f => f.featureId === featureId)

const ABILITY_OPTIONS: Option[] = ABILITY_KEYS.map(k => ({ value: k, label: ABILITY[k] ?? k }))

function ImprovementSlots({
  featureId,
  answer,
  defs,
  tamerLevel,
  speeds,
  weaponNames,
  setDraft,
}: {
  featureId: string
  answer: Record<string, unknown>
  defs: ImprovementDef[] | null
  tamerLevel: number
  speeds: string[]
  weaponNames: readonly string[]
  setDraft: SetDraft
}) {
  const count = improvementSlots(tamerLevel)
  if (defs === null) return <Prose text="Reading the companion's improvements…" />
  if (defs.length === 0) {
    return <Prose text="This familiar's note has no vault-companion fence. Run export:monsters to give it its improvements." />
  }
  const slots = slottedOf(answer.improvements)
  const free = defs.filter(d => d.free)
  const setSlot = (i: number, pick: ImprovementPick | null) => {
    const next = Array.from({ length: count }, (_, j) => slots[j] ?? null)
    next[i] = pick
    setDraft(
      d =>
        withFamiliarImprovements(d, featureId, {
          ...answer,
          improvements: storedImprovements(defs, next, tamerLevel),
        }) as unknown as BuilderDraft,
    )
  }
  return (
    <>
      {free.length > 0 ? <Prose text={`Granted on becoming a companion: ${free.map(d => d.name).join(', ')}.`} /> : null}
      <Prose
        text={
          count === 0
            ? 'No improvements yet. The first comes at Tamer level 2.'
            : `${count} improvement${count === 1 ? '' : 's'} at Tamer level ${tamerLevel}.`
        }
      />
      {Array.from({ length: count }, (_, i) => {
        const pick = slots[i] ?? null
        const options = slotOptions(defs, slots, i)
        // A saved pick the rules no longer offer stays listed, so it is visible.
        const kept = pick && !options.some(o => o.slug === pick.slug) ? defs.find(x => x.slug === pick.slug) : undefined
        const def = pick ? defs.find(d => d.slug === pick.slug) : undefined
        return (
          <div key={i} className="flex flex-col gap-1.5">
            <OptionSelect
              label={`Improvement ${i + 1} (level ${slotLevel(i)})`}
              value={pick?.slug ?? ''}
              placeholder="— Choose one"
              options={[...options, ...(kept ? [kept] : [])].map(o => ({
                value: o.slug,
                label: o.kind === 'universal' ? `${o.name} (training)` : `${o.name} · L${o.level}`,
              }))}
              onChange={v => {
                const d = defs.find(x => x.slug === v)
                setSlot(i, d ? { slug: d.slug, name: d.name, kind: d.kind } : null)
              }}
            />
            {pick ? (
              <TargetPicker
                pick={pick}
                speeds={speeds}
                armor={armorOptions(slots, i)}
                weaponNames={weaponNames}
                onChange={target => setSlot(i, { ...pick, target })}
              />
            ) : null}
            {def?.description ? <Prose text={def.description} /> : null}
          </div>
        )
      })}
    </>
  )
}

/** The follow-up an improvement asks: an ability, a save, a speed, War Training's proficiency. */
function TargetPicker({
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
  onChange(target: ImprovementPick['target']): void
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

/** Weapon Mastery — weapons whose note names a mastery, one slot per mastery the class has. */
function MasteryPicker({ draft, setDraft, masteryCount, masteryWeapons }: FeaturesStepProps) {
  if (masteryWeapons === null) return <Prose text="Reading the weapon notes…" />
  const picks = draft.masteredWeapons.map(w => w.id)
  // A saved pick the notes no longer offer stays listed, so it is visible
  // rather than a blank select still holding it.
  const known = new Map<string, { id: string; name: string }>(masteryWeapons.map(w => [w.id, w]))
  for (const w of draft.masteredWeapons) if (!known.has(w.id)) known.set(w.id, w)
  return (
    <SlotSelects
      count={masteryCount}
      label={i => `Weapon ${i + 1}`}
      picks={picks}
      options={masteryWeapons
        .map(w => ({ value: w.id, label: `${w.name} (${w.mastery})` }))
        .concat(draft.masteredWeapons.filter(w => !masteryWeapons.some(m => m.id === w.id)).map(w => ({ value: w.id, label: w.name })))}
      placeholder={masteryWeapons.length === 0 ? 'No weapon note names a mastery' : '— Choose a weapon'}
      onChange={ids =>
        setDraft(d => ({ ...d, masteredWeapons: ids.flatMap(id => (known.has(id) ? [known.get(id)!] : [])).map(w => ({ id: w.id, name: w.name })) }))
      }
    />
  )
}
