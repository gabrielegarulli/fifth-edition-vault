import { getCasterCaps, subclassCasting } from '@vault/derive/builderSpellCaps.js'
import { spellbookCapacity } from '@vault/derive/spellbook.js'

import type { ClassFence, SubclassFence } from '../content/classes'
import type { VaultCharacterJson } from '../vaultCharacter/fence'

/**
 * A Vault character's own spells — the `spells` key of its `vault-character`
 * fence — and the caps its class tables put on them (MYDND-36).
 *
 * The json operations are `the-vault`'s `lib/characterJson.js` (`addSpell`,
 * `removeSpell`, `setSpellPrepared`), which lives in the web app rather than in
 * `@vault/derive` and so is ported, not imported. One deliberate addition: an
 * entry carries its **`level`**. The web panel looks every stored id up in the
 * class list it has just fetched to learn the level; the projection here is
 * synchronous and reads no catalog, and without the level it filed every spell a
 * player added under "Level 1".
 */

export interface StoredSpell {
  /** The spell note's slug — the vault has no uuids, and a slug is what the builder stores. */
  id: string
  name: string
  source?: string | null
  level?: number
}

export interface CharacterSpells {
  cantrips: StoredSpell[]
  known: StoredSpell[]
  /** Spellbook classes only: the ids of the known spells that are prepared. */
  prepared: string[] | null
}

const isStored = (s: unknown): s is StoredSpell =>
  !!s && typeof s === 'object' && typeof (s as StoredSpell).id === 'string' && typeof (s as StoredSpell).name === 'string'

/** The json's spells, defensively — the fence is hand-editable. */
export function characterSpells(json: VaultCharacterJson | null | undefined): CharacterSpells {
  const raw = (json?.spells ?? {}) as { cantrips?: unknown; known?: unknown; prepared?: unknown }
  return {
    cantrips: Array.isArray(raw.cantrips) ? raw.cantrips.filter(isStored) : [],
    known: Array.isArray(raw.known) ? raw.known.filter(isStored) : [],
    prepared: Array.isArray(raw.prepared) ? raw.prepared.filter((x): x is string => typeof x === 'string') : null,
  }
}

/** The `spells` value as it was, so a key this file does not model survives. */
const spellsOf = (json: VaultCharacterJson): Record<string, unknown> =>
  json.spells && typeof json.spells === 'object' && !Array.isArray(json.spells)
    ? (json.spells as Record<string, unknown>)
    : {}

/**
 * Add a spell to the right bucket: cantrips for level 0, `known` otherwise.
 * A spell already in the bucket is not added twice.
 */
export function addSpell(
  json: VaultCharacterJson,
  spell: { id: string; name: string; source?: string | null; level: number },
): VaultCharacterJson {
  const current = characterSpells(json)
  const bucket = spell.level === 0 ? 'cantrips' : 'known'
  if (current[bucket].some(s => s.id === spell.id)) return json
  const entry: StoredSpell = { id: spell.id, name: spell.name, source: spell.source ?? null, level: spell.level }
  return { ...json, spells: { ...spellsOf(json), cantrips: current.cantrips, known: current.known, [bucket]: [...current[bucket], entry] } }
}

/**
 * Remove a spell from a bucket by id. A spell torn out of the book stops being
 * prepared too — it cannot stay in the day's loadout.
 */
export function removeSpell(json: VaultCharacterJson, bucket: 'cantrips' | 'known', id: string): VaultCharacterJson {
  const current = characterSpells(json)
  const next: Record<string, unknown> = {
    ...spellsOf(json),
    cantrips: bucket === 'cantrips' ? current.cantrips.filter(s => s.id !== id) : current.cantrips,
    known: bucket === 'known' ? current.known.filter(s => s.id !== id) : current.known,
  }
  if (current.prepared) next.prepared = current.prepared.filter(p => p !== id)
  return { ...json, spells: next }
}

/**
 * Prepare or unprepare a known spell. Only spellbook classes track this; for
 * everyone else `prepared` stays absent and every known spell is prepared
 * (`@vault/derive/spellbook.js`'s `preparedIdSet`).
 */
export function setSpellPrepared(json: VaultCharacterJson, id: string, prepared: boolean): VaultCharacterJson {
  const current = characterSpells(json).prepared ?? []
  if (prepared === current.includes(id)) return json
  return {
    ...json,
    spells: { ...spellsOf(json), prepared: prepared ? [...current, id] : current.filter(p => p !== id) },
  }
}

export interface SpellbookConfig {
  initial?: number
  perLevel?: number
  ritualAdept?: boolean
}

/** One casting class, with the caps its own table gives at its own level. */
export interface CasterCaps {
  id: string | null
  name: string
  level: number
  /** `Infinity` when the class table has no such column — uncapped, as the web app treats it. */
  cantripCap: number
  spellsCap: number
  spellbook: SpellbookConfig | null
}

/**
 * The json's casting classes: those with a spellcasting ability chosen, or — for
 * a character built before the ability was recorded — the first class with an id.
 * Exactly the web Spell Panel's `castingRows`.
 */
export function castingClasses(json: VaultCharacterJson): NonNullable<VaultCharacterJson['classes']> {
  const list = json.classes ?? []
  const withAbility = list.filter(c => c?.spellcastingAbility)
  if (withAbility.length > 0) return withAbility
  const first = list.find(c => c?.id)
  return first ? [first] : []
}

/**
 * Caps per casting class, from each class note's `vault-class` fence.
 *
 * Worked out **class by class and then summed**, which is the 5e multiclass
 * rule — not from the character's total level. A class whose note is missing is
 * skipped rather than counted as uncapped: no table, no claim.
 */
export function casterCaps(
  json: VaultCharacterJson,
  fences: ReadonlyMap<string, ClassFence | null>,
  /**
   * Subclass fences by subclass id (MYDND-182). A class whose own note does not
   * cast reads its caps from its subclass's — the Eldritch Knight and the Arcane
   * Trickster, whose Fighter and Rogue tables have no spell columns at all, so
   * they read as uncapped.
   */
  subclassFences: ReadonlyMap<string, SubclassFence | null> = new Map(),
): CasterCaps[] {
  return castingClasses(json).flatMap(cls => {
    const fence = cls.id ? (fences.get(cls.id) ?? null) : null
    if (!fence) return []
    const level = Number(cls.level) || 0
    const sub = cls.subclass?.id ? (subclassFences.get(cls.subclass.id) ?? null) : null
    const castsBySubclass = !fence.data?.casterProgression && subclassCasting(sub) !== null
    const caps = getCasterCaps({ data: castsBySubclass ? sub!.data : fence.data }, level) as { cantripCap: number; spellsCap: number }
    const spellbook = fence.data?.spellbook
    return [
      {
        id: cls.id,
        name: cls.name ?? fence.name,
        level,
        cantripCap: caps.cantripCap,
        spellsCap: caps.spellsCap,
        spellbook: spellbook && typeof spellbook === 'object' ? (spellbook as SpellbookConfig) : null,
      },
    ]
  })
}

/** Spells a spellbook holds from levelling alone — a target the sheet shows, not a limit. */
export function bookCapacity(caster: CasterCaps | null): number | null {
  return caster?.spellbook ? (spellbookCapacity(caster.spellbook, caster.level) as number | null) : null
}
