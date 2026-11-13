// The dice domain's host surface (MYDND-201): what other domains import from
// ui/ and obsidian/ — React, and the Obsidian edges. The pure half is index.ts.
// Rules: scripts/eslint-domain-order.mjs.

export { atlasAvailable, resolveAtlasDice, type RollContext } from './obsidian/atlas'
export { DamageValue, NoRolls, Rollable, useRollsOff } from './ui/Rollable'
export { RollProvider, useRollHost } from './ui/RollContext'
export { InterventionPrompt, RollLog } from './ui/RollLog'
export { RollModeProvider, useRollMode } from './ui/RollModeContext'
export { useAtlasReady, useRoll } from './ui/useRoll'
