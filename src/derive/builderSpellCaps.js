import { spellbookCapacity } from './spellbook.js'
import { cleanColLabel } from './classTable.js'

// Find the columns in classTableGroups (5etools shape) whose label matches
// any of the given labels. PHB 2024 tables label these columns "Cantrips" and
// "Prepared Spells"; older content uses "Cantrips Known" / "Spells Known".
// Returns the per-level value at the given class level, or Infinity if no
// such column exists.
export function readKnownCap(classData, colLabels, classLevel = 1) {
  const wanted = (colLabels ?? []).map(l => l.toLowerCase())
  const groups = classData?.data?.classTableGroups ?? []
  for (const group of groups) {
    if (!Array.isArray(group.rows)) continue
    const colIdx = (group.colLabels ?? []).findIndex(
      l => wanted.includes(cleanColLabel(String(l ?? '')).trim().toLowerCase())
    )
    if (colIdx < 0) continue
    const cell = group.rows[classLevel - 1]?.[colIdx]
    const v = typeof cell === 'object' ? cell?.value : cell
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return Infinity
}

// Extract the spell caps for a class at a given level.
// Handles cantrips, prepared spells, and wizard spellbook capacity.
export function getCasterCaps(classData, classLevel = 1) {
  const isSpellbook = Boolean(classData?.data?.spellbook)
  const spellbookCap = isSpellbook ? spellbookCapacity(classData?.data?.spellbook, classLevel) : null
  const data = classData?.data
  const cantripCap = orProgression(
    readKnownCap(classData, ['Cantrips', 'Cantrips Known'], classLevel),
    data?.cantripProgression,
    classLevel,
  )
  const spellsCap = orProgression(
    readKnownCap(classData, ['Prepared Spells', 'Spells Known'], classLevel),
    data?.spellsKnownProgression ?? data?.preparedSpellsProgression,
    classLevel,
  )

  return {
    cantripCap,
    spellsCap,
    spellbookCap,
    isSpellbook,
  }
}

// A table column wins; with none, 5e.tools' per-level progression array — VAULT-263.
// A subclass that casts (Eldritch Knight, Arcane Trickster) has no
// `classTableGroups`, only a `subclassTableGroups` whose labels are filter tags,
// and its counts are in `cantripProgression` and `spellsKnownProgression` /
// `preparedSpellsProgression`. A class note that keeps its counts the same way
// is read by the same fallback. Still `Infinity` when neither says.
function orProgression(fromTable, progression, classLevel) {
  if (Number.isFinite(fromTable) || !Array.isArray(progression)) return fromTable
  const n = Number(progression[classLevel - 1])
  return Number.isFinite(n) ? n : fromTable
}

/**
 * How a subclass casts, or null when it does not — VAULT-263.
 *
 * The Eldritch Knight and the Arcane Trickster are third casters by their
 * subclass alone: the Fighter and Rogue rows carry no `spellcasting_ability`
 * and no `casterProgression`, so a reader of the class row alone gave them no
 * spells, no slots and no caps. Their subclass rows carry 5e.tools' own keys,
 * and `list` is the class whose spells they learn (Wizard), which 5e.tools
 * states only as the filter in `additionalSpells.expanded` (`class=Wizard`).
 *
 * `subclassData` is a subclass row (`{ data }`), or its fence.
 */
export function subclassCasting(subclassData) {
  const data = subclassData?.data
  const progression = data?.casterProgression
  if (typeof progression !== 'string' || !progression) return null
  const ability = subclassData?.spellcasting_ability ?? data?.spellcastingAbility ?? null
  return {
    progression,
    ability: typeof ability === 'string' && ability !== 'none' ? ability : null,
    list: typeof data?.spellList === 'string' && data.spellList ? data.spellList : expandedList(data?.additionalSpells),
  }
}

// The first `class=<Name>` an `additionalSpells[].expanded` filter names.
function expandedList(additionalSpells) {
  for (const block of Array.isArray(additionalSpells) ? additionalSpells : []) {
    for (const entries of Object.values(block?.expanded ?? {})) {
      for (const entry of Array.isArray(entries) ? entries : []) {
        const m = /(?:^|\|)class=([^|]+)/i.exec(String(entry?.all ?? ''))
        if (m) return m[1].trim()
      }
    }
  }
  return null
}

// Determines whether a class row in a character draft represents a caster —
// by its own row, or since VAULT-263 by the subclass row it has chosen.
export function isClassCaster(draftClass, catalogClass, catalogSubclass = null) {
  if (draftClass?.spellcastingAbility) return true
  const ability = catalogClass?.spellcasting_ability
  if (ability && ability !== 'none') return true
  return Boolean(subclassCasting(catalogSubclass))
}

// Verifies if the chosen spells satisfy the class caps.
// Useful for UI validation and indicators.
export function isSpellSelectionComplete(spells, caps) {
  if (!caps) return true
  const cantripsCount = Array.isArray(spells?.cantrips) ? spells.cantrips.length : 0
  const knownCount = Array.isArray(spells?.known) ? spells.known.length : 0
  const preparedCount = Array.isArray(spells?.prepared) ? spells.prepared.length : 0

  const cantripsOk = Number.isFinite(caps.cantripCap) ? cantripsCount >= caps.cantripCap : true

  if (caps.isSpellbook) {
    const bookOk = caps.spellbookCap != null ? knownCount >= caps.spellbookCap : true
    const prepOk = Number.isFinite(caps.spellsCap) ? preparedCount >= caps.spellsCap : true
    return cantripsOk && bookOk && prepOk
  }

  const spellsOk = Number.isFinite(caps.spellsCap) ? knownCount >= caps.spellsCap : true
  return cantripsOk && spellsOk
}
