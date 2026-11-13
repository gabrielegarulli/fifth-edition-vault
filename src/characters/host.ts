// The characters domain's host surface (MYDND-201): what other domains import from
// ui/ and obsidian/ — React, and the Obsidian edges. The pure half is index.ts.
// Rules: scripts/eslint-domain-order.mjs.

export { installVaultSheetTemplate } from './obsidian/atlasTemplate'
export { renderCharsheetFence } from './obsidian/charsheetFence'
export { SHEET_FENCE } from './obsidian/sheetFenceName'
export {
  convertDdbCharacter,
  type ConvertInput,
  rebuildVaultCharacter,
  saveVaultCharacter,
} from './obsidian/vaultCharacterActions'
export { CharacterCard, CharacterLines } from './ui/CharacterCard'
export { CharacterSheet } from './ui/CharacterSheet'
export { default as CharacterSheetPage, CharacterSheetView } from './ui/CharacterSheetPage'
export { default as CharactersPage } from './ui/CharactersPage'
export { type CharactersHost, CharactersProvider, type DdbRosterSlot, useCharacters, useOptionalCharacters } from './ui/context'
export {
  abilityAnswered,
  abilityBonus,
  FeatAbilityQuestion,
  useFeatAbilityChoice,
} from './ui/FeatAbilityQuestion'
export { FeatureList } from './ui/FeatureList'
export { useRoster } from './ui/hooks/useRoster'
export { useVaultCharacterJson } from './ui/hooks/useVaultCharacterJson'
export { PartyInitiativeButton } from './ui/PartyInitiative'
