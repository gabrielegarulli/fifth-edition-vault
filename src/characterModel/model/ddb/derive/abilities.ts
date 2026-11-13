import type { DdbPayload } from '../payload'
import type { SheetAbility, SheetPassives, SheetSave, SheetSkill } from '../../sheet/sheet'

import { abilityMod } from '../../sheet/abilityMod'
import {
  STAT_IDS,
  STAT_ORDER,
  SAVE_SLUG,
  flattenModifiers,
  proficiencyBonus,
  getAbilityScore,
  proficiencyLevel,
} from './shared'

// Saves, skills, passives and the ability block.
// One file of the D&D Beyond derivation (MYDND-197); index.ts says what it is and why it is kept.

export function getSaves(payload: DdbPayload): SheetSave[] {
  const pb = proficiencyBonus(payload)
  const mods = flattenModifiers(payload)
  return STAT_ORDER.map(label => {
    const id = STAT_IDS[label]
    const mod = abilityMod(getAbilityScore(payload, id))
    const prof = proficiencyLevel(mods, SAVE_SLUG[id])
    const mult = prof === 2 ? 2 : prof === 1 ? 1 : 0
    return { label, proficient: mult > 0, total: mod + mult * pb }
  })
}

const SKILL_DEFS = [
  { name: 'Acrobatics', statId: 2, sub: 'acrobatics' },
  { name: 'Animal Handling', statId: 5, sub: 'animal-handling' },
  { name: 'Arcana', statId: 4, sub: 'arcana' },
  { name: 'Athletics', statId: 1, sub: 'athletics' },
  { name: 'Deception', statId: 6, sub: 'deception' },
  { name: 'History', statId: 4, sub: 'history' },
  { name: 'Insight', statId: 5, sub: 'insight' },
  { name: 'Intimidation', statId: 6, sub: 'intimidation' },
  { name: 'Investigation', statId: 4, sub: 'investigation' },
  { name: 'Medicine', statId: 5, sub: 'medicine' },
  { name: 'Nature', statId: 4, sub: 'nature' },
  { name: 'Perception', statId: 5, sub: 'perception' },
  { name: 'Performance', statId: 6, sub: 'performance' },
  { name: 'Persuasion', statId: 6, sub: 'persuasion' },
  { name: 'Religion', statId: 4, sub: 'religion' },
  { name: 'Sleight of Hand', statId: 2, sub: 'sleight-of-hand' },
  { name: 'Stealth', statId: 2, sub: 'stealth' },
  { name: 'Survival', statId: 5, sub: 'survival' },
] as const

export function getSkills(payload: DdbPayload): SheetSkill[] {
  const pb = proficiencyBonus(payload)
  const mods = flattenModifiers(payload)
  return SKILL_DEFS.map(({ name, statId, sub }) => {
    const ab = abilityMod(getAbilityScore(payload, statId))
    const prof = proficiencyLevel(mods, sub)
    const mult = prof === 2 ? 2 : prof === 1 ? 1 : 0
    return {
      name,
      ability: STAT_ORDER[statId - 1],
      proficient: mult > 0,
      expertise: prof === 2,
      total: ab + mult * pb,
    }
  })
}

export function getPassives(payload: DdbPayload): SheetPassives {
  const skills = getSkills(payload)
  const find = (n: string): number => skills.find(x => x.name === n)?.total ?? 0
  return {
    perception: 10 + find('Perception'),
    insight: 10 + find('Insight'),
    investigation: 10 + find('Investigation'),
  }
}

export function abilityBlock(payload: DdbPayload): SheetAbility[] {
  return STAT_ORDER.map(label => {
    const score = getAbilityScore(payload, STAT_IDS[label])
    return { label, score, mod: abilityMod(score) }
  })
}
