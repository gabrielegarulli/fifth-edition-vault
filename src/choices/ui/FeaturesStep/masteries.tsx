import { SlotSelects } from '../fields'

import type { FeaturesStepProps } from './types'
import { Prose } from './shared'

// Weapon masteries.
// One file of the Features step (MYDND-197); index.ts says what the step is.

/** Weapon Mastery — weapons whose note names a mastery, one slot per mastery the class has. */
export function MasteryPicker({ draft, setDraft, masteryCount, masteryWeapons }: FeaturesStepProps) {
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
