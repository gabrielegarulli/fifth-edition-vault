import { getFeats } from '@vault/derive/ddbDerive.js'

import type { DdbPayload } from '../payload'
import type { SheetResource } from '../../sheet/sheet'

import { abilityMod } from '../../sheet/abilityMod'
import { proficiencyBonus, getAbilityScore, flattenActions } from './shared'

// Class resources and feats.
// One file of the D&D Beyond derivation (MYDND-197); index.ts says what it is and why it is kept.

/**
 * A resource's key in `feature_uses_used`: `Bardic Inspiration` →
 * `bardic_inspiration`, the spelling `@vault/derive`'s pools use, so a Vault
 * character and a D&D Beyond one address the same counter.
 */
export function resourceKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

const RESET_TYPES: Record<number, SheetResource['resets']> = { 1: 'short_rest', 2: 'long_rest' }

/**
 * Everything with uses — Bardic Inspiration, Luck Points, Psychic Veil, Fury of
 * the Small (MYDND-47). Read from each action's `limitedUse`; see `DdbAction`
 * for why `maxUses` alone is not the count.
 *
 * **One row per name.** D&D Beyond lists Bardic Inspiration twice on a level-13
 * Bard — the base feature resetting on a long rest and Font of Inspiration's
 * short-rest version — and the character has one pool, the better one. So the
 * more uses wins, and then the shorter rest. A use count that works out to zero
 * (a modifier of +0) is the rules' minimum of one, as the web sheet has it.
 */
export function buildClassResources(payload: DdbPayload): SheetResource[] {
  const pb = proficiencyBonus(payload)
  const byKey = new Map<string, SheetResource>()

  for (const action of flattenActions(payload)) {
    const lu = action.limitedUse
    const name = (action.name ?? '').trim()
    if (!lu || !name) continue

    const fixed = Math.max(0, Number(lu.maxUses) || 0)
    let uses = fixed
    if (typeof lu.statModifierUsesId === 'number' && lu.statModifierUsesId >= 1 && lu.statModifierUsesId <= 6) {
      uses += abilityMod(getAbilityScore(payload, lu.statModifierUsesId))
    }
    if (lu.useProficiencyBonus) uses = lu.proficiencyBonusOperator === 2 ? Math.max(1, fixed) * pb : uses + pb
    // A stat-based pool is at least one use; a pool D&D Beyond states as zero
    // with nothing to add is a feature that is not limited after all.
    if (typeof lu.statModifierUsesId === 'number') uses = Math.max(1, uses)
    if (uses <= 0) continue

    const key = resourceKey(name)
    const resets = RESET_TYPES[Number(lu.resetType)] ?? null
    const roll = action.dice?.diceString || null
    const candidate: SheetResource = { key, name, uses, resets, roll }
    const current = byKey.get(key)
    const better =
      !current ||
      candidate.uses > current.uses ||
      (candidate.uses === current.uses && resets === 'short_rest' && current.resets !== 'short_rest')
    if (better) byKey.set(key, { ...candidate, roll: candidate.roll ?? current?.roll ?? null })
  }
  return [...byKey.values()]
}

/**
 * The names of the feats the character has taken.
 *
 * **Names only, and deliberately so** (MYDND-15). What a feat *does* is in its
 * note's ` ```vault-feat ` fence, which `resolveFeatEffects` reads; duplicating
 * any of it here would be a second copy of a feat's rules that could disagree
 * with the catalog. See `DdbFeat` for why an ASI must not be read off this.
 *
 * Deduplicated case-insensitively and sorted, because the fence is rewritten on
 * every re-sync and a list whose order moved would show as a diff in a note the
 * player is watching. DDB has been observed to repeat an entry across its own
 * buckets, so the dedupe is not hypothetical. The reader is `ddbDerive`'s
 * `getFeats` since MYDND-140, moved upstream so there is one copy.
 */
export function buildFeats(payload: DdbPayload): string[] {
  return getFeats(payload)
}
