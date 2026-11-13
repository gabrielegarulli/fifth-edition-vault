import type { DdbPayload } from '../payload'
import type { SheetSpellcasting, SheetSpellLevel } from '../../sheet/sheet'

import { abilityMod } from '../../sheet/abilityMod'
import { STAT_KEY, flattenModifiers, proficiencyBonus, getAbilityScore } from './shared'
import { subclassCasts } from './classes'

// The spellcasting line and the spell list.
// One file of the D&D Beyond derivation (MYDND-197); index.ts says what it is and why it is kept.

const SPELLCASTING_STAT_ID: Record<string, number> = {
  wizard: 4,
  artificer: 4,
  cleric: 5,
  druid: 5,
  ranger: 5,
  bard: 6,
  sorcerer: 6,
  warlock: 6,
  paladin: 6,
}

/**
 * Spell attack bonus and save DC, from the first spellcasting class found.
 * A multiclassed caster has one DC per class in the rules; this reports the
 * first, which is the common case and is visibly labelled with its ability.
 *
 * **Plus the bonuses items grant** (MYDND-53). A Wand of the War Mage is a
 * `bonus spell-attacks`; a Rhythm-Maker's Drum names its class, `bonus
 * bard-spell-attacks` and `bard-spell-save-dc`, and applies to that class's
 * spells only. Both measured on Gabriela's payload, 2026-10-14. The bare
 * `spell-save-dc` is the same shape for the DC.
 */
export function buildSpellcasting(payload: DdbPayload): SheetSpellcasting | null {
  const classes = Array.isArray(payload?.classes) ? payload.classes : []
  // A class that casts in its own right comes first, and a third caster only
  // after (MYDND-139): Brammand is an Eldritch Knight 6 listed before his
  // Cleric 10, and his Cleric's DC is the one he casts with.
  const order = [
    ...classes.map(cls => ({ cls, third: false })),
    ...classes.filter(subclassCasts).map(cls => ({ cls, third: true })),
  ]
  for (const { cls, third } of order) {
    const name = String(cls?.definition?.name || cls?.name || '').toLowerCase()
    // A third caster's ability is its subclass's: Intelligence for both
    // Eldritch Knights measured.
    const statId = third ? cls?.subclassDefinition?.spellCastingAbilityId : SPELLCASTING_STAT_ID[name]
    if (!statId || !STAT_KEY[statId]) continue
    const mod = abilityMod(getAbilityScore(payload, statId))
    const pb = proficiencyBonus(payload)
    let attack = pb + mod
    let dc = 8 + pb + mod
    for (const m of flattenModifiers(payload)) {
      if (String(m.type ?? '').toLowerCase() !== 'bonus' || typeof m.value !== 'number') continue
      const sub = String(m.subType ?? '').toLowerCase()
      if (sub === 'spell-attacks' || sub === `${name}-spell-attacks`) attack += m.value
      if (sub === 'spell-save-dc' || sub === `${name}-spell-save-dc`) dc += m.value
    }
    return { ability: STAT_KEY[statId], mod, attack, dc }
  }
  return null
}

/** Known spells by level, merged across every source DDB lists them under. */
export function buildSpells(payload: DdbPayload): SheetSpellLevel[] {
  const seen = new Set<string>()
  const byLevel = new Map<number, string[]>()

  const push = (entry: { definition?: { name?: string | null; level?: number | null } | null } | null): void => {
    const def = entry?.definition
    if (!def || typeof def.name !== 'string') return
    const key = def.name.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    const level = typeof def.level === 'number' ? def.level : 0
    if (!byLevel.has(level)) byLevel.set(level, [])
    byLevel.get(level)?.push(def.name)
  }

  for (const cs of Array.isArray(payload?.classSpells) ? payload.classSpells : []) {
    for (const s of cs?.spells || []) push(s)
  }
  const sources = payload?.spells || {}
  for (const bucket of ['race', 'class', 'background', 'item', 'feat']) {
    for (const s of sources[bucket] || []) push(s)
  }

  return [...byLevel.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([level, names]) => ({ level, spells: names.sort((a, b) => a.localeCompare(b)) }))
}
