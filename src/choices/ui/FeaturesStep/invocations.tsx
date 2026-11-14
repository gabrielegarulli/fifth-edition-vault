import { blankChoices, originFeatSpec } from '@vault/derive/originFeatChoices.js'

import {
  invocationOffered,
  invocationOwner,
  invocationTargetKind,
  invocationTargets,
  isPactInvocation,
  keepingPrerequisites,
  spellListsTaken,
  type InvocationOption,
  type InvocationPick,
  type InvocationTarget,
} from '../../model/choices'
import type { SpellRow } from '../../../compendium'
import { OptionSelect } from '../fields'
import { OriginFeatChoices } from '../OriginFeatChoices'

import type { PickerProps } from './types'
import { Prose, NoteText, optionsOf } from './shared'

// Eldritch Invocations, and what one names.
// One file of the Features step (MYDND-197); index.ts says what the step is.

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
 * left open. The rules are `choices/model/choices.ts`.
 */
export function InvocationPicker({ item, answer, set, draft, invocationCount, spellsFor, feats }: PickerProps) {
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
  onChange: (pick: InvocationPick) => void
  spellsFor: (list: string) => SpellRow[]
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
