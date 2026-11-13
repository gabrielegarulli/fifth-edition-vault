import type { DdbClass, DdbPayload } from '../payload'

import { present } from './shared'

// Species, classes and subclass casting.
// One file of the D&D Beyond derivation (MYDND-197); index.ts says what it is and why it is kept.

export function getRace(payload: DdbPayload): string | null {
  const r = payload?.race
  return r?.fullName || r?.definition?.name || null
}

interface DerivedClass {
  name: string
  subclass: string | null
  level: number
  hitDie: number | null
}

export function getClasses(payload: DdbPayload): DerivedClass[] {
  const classes = Array.isArray(payload?.classes) ? payload.classes : []
  return classes
    .filter(present)
    .filter((c: DdbClass) => (c.level ?? 0) > 0)
    .map((c: DdbClass) => ({
      name: c.definition?.name || c.name || 'Class',
      subclass: c.subclassDefinition?.name || null,
      level: c.level as number,
      hitDie: c.definition?.hitDice ?? null,
    }))
}

/**
 * Whether a class casts through its subclass: an Eldritch Knight or Arcane
 * Trickster. The class row says no and the subclass says yes; see
 * `slotMapForDdbClasses` for the measurement.
 */
export function subclassCasts(cls: DdbClass | null | undefined): boolean {
  return cls?.definition?.canCastSpells !== true && cls?.subclassDefinition?.canCastSpells === true
}

/** The classes as the slot rules want them, a third caster flagged. */
export function slotClasses(payload: DdbPayload): { name: string; level: number; subclassCasts: boolean }[] {
  return (Array.isArray(payload?.classes) ? payload.classes : [])
    .filter(present)
    .filter((c: DdbClass) => (c.level ?? 0) > 0)
    .map((c: DdbClass) => ({
      name: c.definition?.name || c.name || 'Class',
      level: c.level as number,
      subclassCasts: subclassCasts(c),
    }))
}

export function formatClasses(payload: DdbPayload): string {
  return (
    getClasses(payload)
      .map(c => (c.subclass ? `${c.name} (${c.subclass}) ${c.level}` : `${c.name} ${c.level}`))
      .join(' / ') || '—'
  )
}
