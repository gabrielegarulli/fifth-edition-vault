import { featAbilityChoice } from '@vault/derive/featAbilities.js'

import { useCompendium } from '../../compendium/host'
import type { FeatRow } from '../../compendium'
import type { Sheet } from '../../characterModel'
import { useDetails } from '../../platform/host'

/**
 * The one question adding a feat can need: which ability it raises.
 *
 * Shared by the sheet's Features tab (MYDND-58) and the catalog's "Add to a
 * character…" (MYDND-62), so the two cannot disagree on which options exist,
 * which are at their cap, or when the question is already answered.
 */

const ABILITY: Record<string, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
}

export interface AbilityChoice {
  options: string[]
  amount: number
  max: number | null
}

/** The feat's ability question, from its fence — `null` when it asks none. */
export function useFeatAbilityChoice(feat: FeatRow | null): { choice: AbilityChoice | null; loading: boolean } {
  const compendium = useCompendium()
  const { details, loading } = useDetails(compendium.feats, feat ? [feat.id] : [])
  const choice = feat
    ? (featAbilityChoice({ ...feat, data: details.get(feat.id)?.fence ?? {} }) as AbilityChoice | null)
    : null
  return { choice, loading }
}

/** The answer to add with: the one option when there is only one, else the pick. */
export function abilityBonus(choice: AbilityChoice | null, picked: string | null): string | null {
  if (!choice) return null
  return choice.options.length === 1 ? choice.options[0] : picked
}

/** Whether Add can go ahead: no question, or a valid answer to it. */
export function abilityAnswered(choice: AbilityChoice | null, picked: string | null): boolean {
  const bonus = abilityBonus(choice, picked)
  return !choice || (!!bonus && choice.options.includes(bonus))
}

export function FeatAbilityQuestion({
  choice,
  value,
  onChange,
  sheet,
  canvas = false,
}: {
  choice: AbilityChoice | null
  value: string | null
  onChange(ability: string | null): void
  /** For the cap: an option already at `max` cannot be picked. */
  sheet: Pick<Sheet, 'abilities'> | null
  /** Drawn inside the feats catalog's `.bst` root, in its classes (MYDND-65). */
  canvas?: boolean
}) {
  if (!choice) return null
  if (choice.options.length === 1) {
    return (
      <p className={canvas ? 'bst-note' : 'm-0 text-smaller text-muted'}>
        +{choice.amount} to {ABILITY[choice.options[0]] ?? choice.options[0]}
      </p>
    )
  }
  const scores = Object.fromEntries((sheet?.abilities ?? []).map(a => [a.label.toLowerCase(), a.score]))
  const atCap = (a: string) => choice.max != null && (scores[a] ?? 0) >= choice.max
  return (
    <label className={canvas ? 'bst-field' : 'flex flex-col gap-1 text-smaller text-muted'}>
      Ability to raise by {choice.amount}
      <select
        className={canvas ? 'bst-select' : 'dropdown w-full'}
        aria-label={`Ability to raise by ${choice.amount}`}
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
      >
        <option value="">— Choose an ability</option>
        {choice.options.map(a => (
          <option key={a} value={a} disabled={atCap(a)}>
            {ABILITY[a] ?? a}
            {atCap(a) ? ` (at ${choice.max})` : ''}
          </option>
        ))}
      </select>
    </label>
  )
}
