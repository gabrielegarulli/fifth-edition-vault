import type { ActivityKind } from '../../platform'

/**
 * Each log kind's colour, as a rarity tone — the palette the `.bst-chip--*`
 * and `.bst-dot--r-*` classes already draw. Shared by `/gm/log` and the home
 * page's "Today's log" (MYDND-98), so a kind is the same colour in both.
 */
const KIND_TONE: Partial<Record<ActivityKind, string>> = {
  roll: 'rare',
  damage: 'artifact',
  heal: 'uncommon',
  rest: 'veryrare',
  harvest: 'uncommon',
  encounter: 'legendary',
  craft: 'rare',
  buy: 'legendary',
  sell: 'legendary',
  level: 'veryrare',
}

export const logTone = (kind: ActivityKind): string => KIND_TONE[kind] ?? 'common'
