// The catalogs domain's pure surface (MYDND-201): what other domains import from
// outside ui/ and obsidian/. Nothing here reaches React or obsidian, so any test
// loads it in plain Node. Rules: scripts/eslint-domain-order.mjs.

export { budgets, type Difficulty, encounterGroups, partyLabel, spentXp } from './model/bestiary'
export { initiativeMod } from './model/statblockRolls'
