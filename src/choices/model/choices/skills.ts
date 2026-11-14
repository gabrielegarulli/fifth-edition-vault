import { multiclassSkillKey } from '@vault/derive/builderDraft.js'
import { VAULT_SKILLS } from '@vault/derive/vaultDerive.js'

import type { ClassFence } from '../../../compendium'

import { asRecord, asList } from './shared'

// Skills: what a class and a multiclass pick offer.
// One module of the builder's choices (MYDND-197); index.ts says what the folder is.

// --- Skills -------------------------------------------------------------------

export const SKILL_NAME: Record<string, string> = Object.fromEntries(
  VAULT_SKILLS.map(s => [s.slug, s.name]),
)
export const ALL_SKILLS: string[] = VAULT_SKILLS.map(s => s.slug)

/** `{ count, options }` — what a class's skill pick offers. */
export interface SkillChoices {
  count: number
  options: string[]
}

const asSkillChoices = (v: unknown): SkillChoices | null => {
  const r = asRecord(v)
  const count = Number(r?.count)
  if (!r || !Number.isFinite(count) || count <= 0) return null
  const options = asList(r.options).filter((s): s is string => typeof s === 'string')
  return { count, options: options.length > 0 ? options : ALL_SKILLS }
}

/** The primary class's level-1 skill pick (`data.skillChoices`). */
export function classSkillChoices(fence: ClassFence | null): SkillChoices | null {
  return asSkillChoices(fence?.data?.skillChoices)
}

/**
 * The skill a class taken **beyond the first** grants — the Bard, the Ranger
 * and the Rogue give one, every other class none (`CoreTraitsPanel`'s
 * `multiclassProfs.skills`).
 *
 * The fence spells it `multiclassProficiencies.skills: { count, options }`,
 * the same shape as `skillChoices` (observed on all three, 2026-10-08).
 */
export function multiclassSkillChoices(fence: ClassFence | null): SkillChoices | null {
  return asSkillChoices(asRecord(fence?.data?.multiclassProficiencies)?.skills)
}

/**
 * The `featureChoices` key a multiclass's skill pick is stored under:
 * `<classId>:multiclass:skills`, a bare array that `finalVaultJson` flattens
 * into `skillProficiencies`, so the first class's picks survive. The plugin's
 * spelling (MYDND-29), adopted upstream by VAULT-243, which also drops the key
 * when that class is replaced or removed.
 */
export { multiclassSkillKey }
