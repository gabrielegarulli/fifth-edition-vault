// The gm domain's host surface (MYDND-201): what other domains import from
// ui/ and obsidian/ — React, and the Obsidian edges. The pure half is index.ts.
// Rules: scripts/eslint-domain-order.mjs.

export { GmProvider } from './ui/context'
export { default as GmEncounterPage } from './ui/GmEncounterPage'
export { default as GmLogPage } from './ui/GmLogPage'
export { default as GmNotesPage } from './ui/GmNotesPage'
export { default as GmPartyPage } from './ui/GmPartyPage'
export { default as GmShopPage } from './ui/GmShopPage'
export { useMonsterEncounter } from './ui/hooks/useAddMonster'
export { useActivityLog, useEncounter, useSessions } from './ui/hooks/useGm'
