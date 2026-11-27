/**
 * What "Use" does with a consumable in the bag (MYDND-278).
 *
 * The SRD's potions, combat gear and scrolls are used up in play, and the bag
 * could only count them down by hand: a Potion of Healing was a quantity, not a
 * roll. This names, per item, the one thing using it does, and the bag's Use
 * button rolls it (through Atlas, as every roll is) and takes one away.
 *
 * **By note id, not by reading the prose.** The numbers are the book's (2024
 * PHB and DMG), and none of these notes carries them in a field: the potion's
 * `2d4 + 2` is a sentence. Seven ids and a name pattern are a table a reader
 * can check against the book; a regex over prose would be a guess.
 *
 * - **A healing potion** heals what it rolls, on the drinker.
 * - **Combat gear** (Acid, Alchemist's Fire, Holy Water, Basic Poison) rolls its
 *   damage; the target is the table's, so nothing else is written.
 * - **A spell scroll** is spent; the spell is cast from the Spells tab.
 */
export type ConsumableUse =
  | { kind: 'heal'; formula: string; verb: string }
  | { kind: 'damage'; formula: string; damageType: string; verb: string }
  | { kind: 'scroll'; verb: string }

const HEALING: Record<string, string> = {
  'potion-of-healing': '2d4+2',
  'potion-of-greater-healing': '4d4+4',
  'potion-of-superior-healing': '8d4+8',
  'potion-of-supreme-healing': '10d4+20',
}

const GEAR: Record<string, { formula: string; damageType: string; verb: string }> = {
  acid: { formula: '2d6', damageType: 'acid', verb: 'Throw' },
  'alchemists-fire': { formula: '1d4', damageType: 'fire', verb: 'Throw' },
  'holy-water': { formula: '2d8', damageType: 'radiant', verb: 'Throw' },
  'basic-poison': { formula: '1d4', damageType: 'poison', verb: 'Apply' },
}

/** A row's catalog ids, as the bag holds them. */
export interface ConsumableRow {
  magic_item_id?: string | null
  content_item_id?: string | null
}

/** What using this row does, or null for anything that is not used up. */
export function consumableUse(row: ConsumableRow): ConsumableUse | null {
  const magic = row.magic_item_id?.trim().toLowerCase() ?? ''
  if (HEALING[magic]) return { kind: 'heal', formula: HEALING[magic], verb: 'Drink' }
  if (magic === 'spell-scroll' || magic.startsWith('spell-scroll-')) return { kind: 'scroll', verb: 'Read' }
  const plain = row.content_item_id?.trim().toLowerCase() ?? ''
  const gear = GEAR[plain]
  return gear ? { kind: 'damage', ...gear } : null
}
