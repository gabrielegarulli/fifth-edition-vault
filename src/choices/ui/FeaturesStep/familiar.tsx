import { formatCR } from '@vault/derive/dnd5e.js'
import { withFamiliarImprovements } from '@vault/derive/builderDraft.js'

import {
  armorOptions,
  improvementSlots,
  slotLevel,
  slotOptions,
  slottedOf,
  storedImprovements,
  type ImprovementDef,
  type ImprovementPick,
} from '../../model/companion'
import type { LevelItem } from '../../model/choices'
import type { BuilderDraft } from '../../model/draft'
import { parseSpeed } from '../../../characterModel'
import { OptionSelect, type SetDraft } from '../fields'

import type { FeaturesStepProps } from './types'
import { Prose } from './shared'
import { TargetPicker } from './targets'

// A familiar or companion, and its improvements (MYDND-126).
// One file of the Features step (MYDND-197); index.ts says what the step is.

/**
 * The Tamer's companion — a bestiary note flagged `is_familiar` — and its
 * improvements (MYDND-126): one slot per improvement its Tamer's level gives,
 * from the tree on the familiar's note. The rules are `choices/model/companion.ts`.
 */
export function FamiliarPicker({
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
