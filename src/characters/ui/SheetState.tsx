import { useMemo } from 'react'

import { activatableBenefits } from '@vault/derive/sheetBenefits.js'

import { useCompendium } from '../../compendium/host'
import type { ResolvedEffect } from '../../compendium'
import { nameKey } from '../../platform'
import type { Sheet, Vitals } from '../../characterModel'
import { useCatalogRows, openNote, useObsidian, Icon, MenuButton, type MenuEntry } from '../../platform/host'
import { conditionLabel } from '../../dice'
import { Block } from './CharacterSheet'

/**
 * What a character *is* right now, as opposed to what it *has* (MYDND-45):
 * the conditions it is under, Heroic Inspiration, and the benefits switched on.
 *
 * All three were already state — `conditions` and `active_effects` in the
 * `vault-vitals` fence since MYDND-10, with writers in `characters/store/vitals.ts` — and
 * none had a control on the sheet. Conditions showed only on the GM's party
 * page, and `toggleEffect` had an action that no component called.
 *
 * ## Conditions are declared, never simulated
 *
 * The chip says the character is Poisoned; the table says for how long. The
 * part of a condition that is a roll mode is drawn on the rows it changes
 * (`dice/model/rollModes.ts`); the rest is the condition's note, one click away.
 */

/** The 2024 rules' fifteen, offered whether or not the vault has a note for each. */
export const STANDARD_CONDITIONS = [
  'blinded',
  'charmed',
  'deafened',
  'exhaustion',
  'frightened',
  'grappled',
  'incapacitated',
  'invisible',
  'paralyzed',
  'petrified',
  'poisoned',
  'prone',
  'restrained',
  'stunned',
  'unconscious',
]

const CHIP = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5'
const PLAIN = 'h-auto border-none bg-transparent p-0 shadow-none'

export interface SheetStateActions {
  toggleCondition(name: string): void
  setInspiration(on: boolean): void
  toggle(key: string): void
  endConcentration(): void
  revertShape(): void
}

/** The strip's state row: conditions, Inspiration, what is switched on. */
export function StateRow({
  vitals,
  benefits,
  actions,
  busy,
}: {
  vitals: Vitals
  benefits: readonly ActivatableBenefit[]
  actions: SheetStateActions
  busy: boolean
}) {
  const app = useObsidian()
  const compendium = useCompendium()
  const rows = useCatalogRows(() => compendium.conditions.list())

  // A condition note per name, the 2024 one first: the picker offers each
  // name once, and its chip opens the edition the table plays. The exporter
  // spells 2024 `5.5e` (all 23 notes, measured 2026-10-14).
  const notes = useMemo(() => {
    const byName = new Map<string, string>()
    const modern = (e: string | null) => (e === '5.5e' || e === '2024' ? 1 : 0)
    const ordered = [...rows].sort((a, b) => modern(b.edition) - modern(a.edition))
    for (const row of ordered) {
      const key = nameKey(row.name)
      if (!byName.has(key)) byName.set(key, row.path)
    }
    return byName
  }, [rows])

  const active = new Set(vitals.conditions.map(c => c.trim().toLowerCase()))
  const offered = [...new Set([...STANDARD_CONDITIONS, ...notes.keys()])].filter(name => !active.has(name)).sort()
  const menu: MenuEntry[] = offered.map(name => ({
    label: conditionLabel(name),
    onSelect: () => actions.toggleCondition(name),
    disabled: busy,
  }))
  const on = benefits.filter(b => b.isActive)

  return (
    <>
      {vitals.wildShape ? (
        <span className={`${CHIP} border-obs-green/40 bg-obs-green/15 text-obs-green`}>
          <span>Wild Shape</span>
          <span className="font-semibold text-normal">{vitals.wildShape.name}</span>
          <button
            type="button"
            className={`${PLAIN} inline-flex text-muted`}
            aria-label={`Revert from ${vitals.wildShape.name}`}
            title="Revert to your own form"
            disabled={busy}
            onClick={actions.revertShape}
          >
            <Icon name="x" />
          </button>
        </span>
      ) : null}

      {vitals.concentration ? (
        <span className={`${CHIP} border-obs-yellow/40 bg-obs-yellow/15 text-obs-yellow`}>
          <span>Concentrating</span>
          <span className="font-semibold text-normal">{vitals.concentration}</span>
          <button
            type="button"
            className={`${PLAIN} inline-flex text-muted`}
            aria-label={`End concentration on ${vitals.concentration}`}
            title="End concentration"
            disabled={busy}
            onClick={actions.endConcentration}
          >
            <Icon name="x" />
          </button>
        </span>
      ) : null}

      {vitals.conditions.map(raw => {
        const name = raw.trim().toLowerCase()
        const path = notes.get(nameKey(name))
        return (
          <span key={raw} className={`${CHIP} border-obs-yellow/40 bg-obs-yellow/15 text-obs-yellow`}>
            {path ? (
              <button
                type="button"
                className={`${PLAIN} font-semibold text-obs-yellow`}
                title={`Open ${path}`}
                onClick={() => openNote(app, path)}
              >
                {conditionLabel(name)}
              </button>
            ) : (
              <span className="font-semibold">{conditionLabel(name)}</span>
            )}
            <button
              type="button"
              className={`${PLAIN} inline-flex text-muted`}
              aria-label={`Clear ${conditionLabel(name)}`}
              title={`Clear ${conditionLabel(name)}`}
              disabled={busy}
              onClick={() => actions.toggleCondition(raw)}
            >
              <Icon name="x" />
            </button>
          </span>
        )
      })}

      {on.map(b => (
        <span
          key={b.key}
          className={`${CHIP} border-background-modifier-border text-normal`}
          title={b.lines.join(' · ')}
        >
          <span className="font-semibold">{b.name}</span>
          <button
            type="button"
            className={`${PLAIN} inline-flex text-muted`}
            aria-label={`Turn off ${b.name}`}
            title={`Turn off ${b.name}`}
            disabled={busy}
            onClick={() => actions.toggle(b.key)}
          >
            <Icon name="x" />
          </button>
        </span>
      ))}

      <MenuButton label="Add a condition" items={menu} align="left" disabled={busy}>
        + Condition
      </MenuButton>

      <button
        type="button"
        aria-pressed={vitals.heroicInspiration}
        disabled={busy}
        title={
          vitals.heroicInspiration
            ? 'Heroic Inspiration — spend it to reroll one die. Click when spent.'
            : 'No Heroic Inspiration. Click when the GM awards it.'
        }
        className={vitals.heroicInspiration ? 'text-obs-purple' : 'text-faint'}
        onClick={() => actions.setInspiration(!vitals.heroicInspiration)}
      >
        <Icon name="sparkles" /> {vitals.heroicInspiration ? 'Inspired' : 'Inspiration'}
      </button>
    </>
  )
}

/** `activatableBenefits`' row, as far as this file reads it. */
export interface ActivatableBenefit {
  key: string
  name: string
  source: string | null
  lines: string[]
  duration: string | null
  trigger: string | null
  isActive: boolean
}

/**
 * Every benefit this character can switch on, through the web sheet's own
 * derivation (`@vault/derive/sheetBenefits.js`, moved there by VAULT-246 so
 * this could call it). Grouped by `effectKey`, which is also what
 * `effectApplies` gates the dice engine on — so switching one on here is what
 * makes its effects count on a roll.
 */
export function useActivatableBenefits(
  sheet: Sheet | null,
  effects: readonly ResolvedEffect[],
  activeEffects: readonly string[],
): ActivatableBenefit[] {
  return useMemo(
    () =>
      !sheet
        ? []
        : (activatableBenefits({
            character: { json: { resolvedEffects: effects }, vault_state: { activeEffects } },
            // `sheetAmountContext` reads these two, to word "+your Proficiency Bonus".
            sheet: {
              pb: sheet.proficiency_bonus,
              abilityScores: (sheet.abilities ?? []).map(a => ({ key: a.label.toLowerCase(), mod: a.mod })),
            },
            featRows: [],
          }) as ActivatableBenefit[]),
    [sheet, effects, activeEffects],
  )
}

/** The Combat tab's list of switchable benefits. Absent when there are none. */
export function ActiveBenefits({
  benefits,
  onToggle,
  busy,
}: {
  benefits: readonly ActivatableBenefit[]
  onToggle(key: string): void
  busy: boolean
}) {
  if (benefits.length === 0) return null
  const count = benefits.filter(b => b.isActive).length
  return (
    <Block title="Active benefits" hint={count === 0 ? 'none on' : `${count} on`}>
      <div className="panel-container bg-background-secondary">
        {benefits.map(b => (
          <div
            key={b.key}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-background-modifier-border px-2.5 py-1.5 last:border-b-0"
          >
            <span className="min-w-0 flex-1">
              <span className={b.isActive ? 'font-semibold text-normal' : 'text-normal'}>{b.name}</span>
              {b.source ? <span className="text-smallest text-faint"> · {b.source}</span> : null}
              {b.lines.length > 0 ? (
                <span className="block text-smallest text-muted">{b.lines.join(' · ')}</span>
              ) : null}
              {/* Prose, never counted down (Ruling 8): the table owns durations. */}
              {b.duration || b.trigger ? (
                <span className="block text-smallest text-faint">
                  {[b.trigger, b.duration].filter(Boolean).join(' · ')}
                </span>
              ) : null}
            </span>
            <button type="button" aria-pressed={b.isActive} disabled={busy} onClick={() => onToggle(b.key)}>
              {b.isActive ? 'Turn off' : 'Turn on'}
            </button>
          </div>
        ))}
      </div>
    </Block>
  )
}
