import type { MonsterRow, StatblockFence } from '../content/monsters'
import type { Sheet } from '../ddb/sheet'
import { classesOfSheet } from '../spells/slots'
import type { WildShapeForm } from '../state/vitals'

/**
 * Wild Shape's sheet-side rules (MYDND-51). The rules themselves — the CR cap
 * by Druid level, the temporary hit points — are `@vault/derive/wildShape.js`'s;
 * this reads the two numbers a form replaces off a bestiary note.
 *
 * The plugin's bestiary notes carry a Fantasy Statblocks ` ```statblock `
 * fence, not 5e.tools' monster object, so `monsterAc` / `monsterSpeeds` (which
 * read the latter) do not apply. The fence writes `ac: 12` or `ac: "12 (natural
 * armor)"`, and `speed: "40 ft., climb 30 ft."` — the leading number of each is
 * the one Wild Shape takes.
 */

const leadingNumber = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const m = /-?\d+/.exec(String(v ?? ''))
  return m ? parseInt(m[0], 10) : null
}

export function formFromStatblock(
  row: Pick<MonsterRow, 'id' | 'name' | 'cr'>,
  fence: StatblockFence | null,
): WildShapeForm {
  return {
    id: row.id,
    name: row.name,
    cr: row.cr,
    ac: leadingNumber(fence?.ac),
    walkSpeed: leadingNumber(fence?.speed),
  }
}

/** The character's Druid level, from its hit-die lines; 0 for a non-Druid. */
export function druidLevel(sheet: Sheet): number {
  return classesOfSheet(sheet).find(c => c.name.toLowerCase() === 'druid')?.level ?? 0
}

/** Beasts at or under the cap, weakest first — `wildShapeForms`' order. */
export function beastForms(rows: readonly MonsterRow[], cap: number | null): MonsterRow[] {
  if (cap === null) return []
  return rows
    .filter(m => (m.creatureType ?? '').toLowerCase().startsWith('beast') && m.cr !== null && m.cr <= cap)
    .sort((a, b) => (a.cr ?? 0) - (b.cr ?? 0) || a.name.localeCompare(b.name))
}
