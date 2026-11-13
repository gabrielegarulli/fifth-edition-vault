// The catalogs domain's host surface (MYDND-201): what other domains import from
// ui/ and obsidian/ — React, and the Obsidian edges. The pure half is index.ts.
// Rules: scripts/eslint-domain-order.mjs.

export { SpellItemView } from './obsidian/SpellView'
export { SrdNotes } from './obsidian/srdNotes'
export { MonsterDetail } from './ui/BestiaryDetail'
export { default as ClassesPage } from './ui/ClassesPage'
export { CatalogsProvider, type MonsterEncounter } from './ui/context'
export { default as FeatsPage } from './ui/FeatsPage'
export { default as ItemsPage } from './ui/ItemsPage'
export { default as MagicItemsPage } from './ui/MagicItemsPage'
export { default as MonstersPage } from './ui/MonstersPage'
export { default as SpellsPage } from './ui/SpellsPage'
export { type SrdNotesHost, SrdSetupCard } from './ui/SrdSetupCard'
