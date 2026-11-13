// The compendium domain's host surface (MYDND-201): what other domains import from
// ui/ and obsidian/ — React, and the Obsidian edges. The pure half is index.ts.
// Rules: scripts/eslint-domain-order.mjs.

export { openSpellWindow, SPELL_VIEW_TYPE, type SpellViewState } from './obsidian/spellWindow'
export { createVaultCompendium } from './obsidian/vaultCompendium'
export { CompendiumProvider, useCompendium } from './ui/context'
export { FeatBenefits } from './ui/FeatBenefits'
export { ItemFacts, ItemNotes } from './ui/ItemFacts'
export { SpellWindow } from './ui/SpellDetail'
export { SpellFacts, SpellText } from './ui/SpellFacts'
export { type SpellIndex, SpellLink, useSpellIndex } from './ui/SpellLink'
