import {
  additionalSpellAlternatives,
  additionalSpellPicks,
  pickKey,
  spellAllowed,
} from '@vault/derive/additionalSpells.js'

import { ADDITIONAL_SPELLS, additionalSpellsAnswer, type AdditionalSpellPick } from '../../../characterModel'
import { OptionSelect } from '../fields'
import { SpellPreview } from '../Previews'

import type { PickerProps } from './types'
import { Prose, NoteText } from './shared'

// A feature's spell picks, and the spells outside the caps a note names.
// One file of the Features step (MYDND-197); index.ts says what the step is.

interface SpellChoicePick {
  spellLevel: number
  spellId: string
  spellName: string
}

/** Mystic Arcanum and its kin — one spell of a fixed level per slot, from the class's list. */
export function SpellChoicePicker({ item, answer, set, spellsFor, levels }: PickerProps & { levels: number[] }) {
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
export function AdditionalSpellsPicker({ item, answer, set, draft, spells = [] }: PickerProps) {
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
