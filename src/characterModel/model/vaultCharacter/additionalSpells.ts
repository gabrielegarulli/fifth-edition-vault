import { additionalSpellEffects } from '@vault/derive/additionalSpells.js'

import type { SpellRow } from '../../../compendium'

/**
 * The spells a class or subclass hands over outside the caps (MYDND-183) — the
 * plugin's half of derive's `additionalSpells.js` (the-vault VAULT-264).
 *
 * Derive reads 5e.tools' `additionalSpells` as a rule: which fixed spells a
 * level grants (a Life Cleric's domain spells, the Arcane Trickster's Mage
 * Hand), which it asks the player to pick (Lore's Magical Discoveries, a 2024
 * Savant's free book spells) and which alternative a row offers (Circle of the
 * Land's lands). What lives here is only where the answer is kept and what the
 * bake hands derive:
 *
 * - **One answer per owner**, at `<ownerId>:additional-spells` in
 *   `featureChoices`: `{ type: 'additional_spells', block, picks }`, `picks`
 *   keyed by derive's `pickKey` (`"6:prepared"`). The owner is the class or
 *   subclass note's id, the same prefix `featureId` gives its features.
 * - **The envelope**: the owner's name is the source, so the sheet groups a
 *   Life Cleric's spells under "Life Domain".
 */

export const ADDITIONAL_SPELLS = 'additional_spells'

/** Where an owner's answer lives in `featureChoices`. */
export const additionalSpellsKey = (ownerId: string): string => `${ownerId}:additional-spells`

/** One picked spell, in the shape `spell_choice` already stores. */
export interface AdditionalSpellPick {
  spellId: string
  spellName: string
  spellLevel: number
}

export interface AdditionalSpellsAnswer {
  type: typeof ADDITIONAL_SPELLS
  /** The alternative taken, for a row that offers several; null otherwise. */
  block: string | null
  picks: Record<string, Array<AdditionalSpellPick | null>>
}

/** A stored answer, or null for anything else. */
export function additionalSpellsAnswer(value: unknown): AdditionalSpellsAnswer | null {
  const v = value as Partial<AdditionalSpellsAnswer> | null | undefined
  if (!v || typeof v !== 'object' || v.type !== ADDITIONAL_SPELLS) return null
  return {
    type: ADDITIONAL_SPELLS,
    block: typeof v.block === 'string' ? v.block : null,
    picks: v.picks && typeof v.picks === 'object' ? v.picks : {},
  }
}

/** A row's `additionalSpells`, or `[]`. */
export function additionalSpellsOf(data: Record<string, unknown> | null | undefined): unknown[] {
  const value = data?.additionalSpells
  return Array.isArray(value) ? value : []
}

/**
 * The level a fixed entry's spell is, from the spell notes: `fire bolt|xphb`
 * carries no `#c`, and Circle of the Land grants it as a cantrip. The source
 * the entry names wins over another edition's note of the same title.
 */
export function spellLevelLookup(rows: readonly SpellRow[]): (name: string, source: string | null) => number | null {
  const byName = new Map<string, SpellRow[]>()
  for (const row of rows) {
    const key = row.name.toLowerCase()
    byName.set(key, [...(byName.get(key) ?? []), row])
  }
  return (name, source) => {
    const found = byName.get(name.toLowerCase()) ?? []
    const row = found.find(r => source && r.source?.toUpperCase() === source) ?? found[0]
    return row ? row.level : null
  }
}

/**
 * The effects one owner's `additionalSpells` bake to at its class's level, in
 * the bake's envelope.
 */
export function additionalSpellsEffects({
  ownerId,
  ownerName,
  data,
  classLevel,
  answer,
  spellbook,
  spellLevel,
}: {
  ownerId: string
  ownerName: string
  data: Record<string, unknown> | null | undefined
  classLevel: number
  answer: unknown
  /** Whether the class keeps a spellbook: a Savant's picks are written into it. */
  spellbook: boolean
  spellLevel?: (name: string, source: string | null) => number | null
}): Array<Record<string, unknown>> {
  const blocks = additionalSpellsOf(data)
  if (blocks.length === 0) return []
  const stored = additionalSpellsAnswer(answer)
  const effects = additionalSpellEffects(blocks, classLevel, {
    block: stored?.block ?? null,
    picks: stored?.picks ?? {},
    spellbook,
    spellLevel: spellLevel ?? (() => null),
  }) as Array<Record<string, unknown>>
  return effects.map(e => ({ ...e, source: ownerName, sourceFeatureId: additionalSpellsKey(ownerId) }))
}
