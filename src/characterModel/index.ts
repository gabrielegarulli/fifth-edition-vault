// The characterModel domain's pure surface (MYDND-201): what other domains import from
// outside ui/ and obsidian/. Nothing here reaches React or obsidian, so any test
// loads it in plain Node. Rules: scripts/eslint-domain-order.mjs.

export {
  addInputFor,
  type BagTab,
  isEssence,
  pickerMatches,
  type PickerOption,
  pouchGp,
  rowLabel,
  sortDdbItems,
  splitBag,
} from './model/bag'
export {
  createCharacters,
  filterRoster,
  formatRelativeTime,
  initiativeOrder,
  isCharacterNote,
  type Roster,
  type RosterEntry,
} from './model/characters'
export { CHARSHEET_FENCE, readSheetFromNote } from './model/ddb/charsheet'
export { buildSheet } from './model/ddb/derive'
export { fmtMod } from './model/sheet/abilityMod'
export type { DdbPayload } from './model/ddb/payload'
export { type DdbSettings, DEFAULT_DDB_SETTINGS } from './model/ddb/settings'
export {
  type Sheet,
  SHEET_VERSION,
  type SheetAttack,
  type SheetFeatureDie,
  type SheetFreeCast,
  type SheetGrantedSpell,
  type SheetItem,
  type SheetResource,
} from './model/sheet/sheet'
export {
  type AddItemInput,
  type CharacterInventory,
  type EquipInput,
  extractInventoryFromNote,
  generateItemId,
  type HydratedRow,
  hydrateRow,
  type InventoryCatalogs,
  type InventoryCurrency,
  type InventoryItem,
  type Quirk,
  type ToggleInput,
  type TransferInput,
  type UnequipInput,
  writeInventoryToNote,
} from './model/inventory'
export { isLocalId, mintLocalId } from './model/localId'
export { companionView, parseSpeed, tamerLevelOf } from './model/sheet/companion'
export { itemDataSource, preloadCatalogs } from './model/sheet/equipment'
export { featureSources, picksAt } from './model/sheet/features'
export { beastForms, druidLevel, formFromStatblock } from './model/sheet/wildShape'
export { overlayNote, projectSheetWithInventory } from './model/sheetProjection'
export {
  addSpell,
  bookCapacity,
  casterCaps,
  castingClasses,
  type CharacterSpells,
  characterSpells,
  removeSpell,
  setSpellPrepared,
} from './model/spells/characterSpells'
export { highestRank, MAX_RANK, shortRestPlan, slotMapFor, slotTable } from './model/spells/slots'
export { spellDamageBonus, spellPushFeet, type SpellRoll, spellRoll } from './model/spells/spellDice'
export {
  ADDITIONAL_SPELLS,
  type AdditionalSpellPick,
  additionalSpellsAnswer,
  additionalSpellsKey,
  additionalSpellsOf,
} from './model/vaultCharacter/additionalSpells'
export { featureId, followedChoices } from './model/vaultCharacter/bake'
export { removableFeats, sheetFeatKey, withFeatAdded, withFeatRemoved } from './model/vaultCharacter/feats'
export {
  persistedVaultCharacter,
  readVaultCharacterFromNote,
  readVaultCharacterOrThrow,
  VAULT_CHARACTER_FENCE,
  type VaultCharacterJson,
  vaultCharacterProblems,
} from './model/vaultCharacter/fence'
export { buildVaultSheet, type BuiltSheet } from './model/vaultCharacter/index'
export {
  addXp,
  type CastCost,
  castSpell,
  clearDefense,
  concentrationDc,
  type DefenseType,
  emptyVitals,
  endConcentration,
  extractVitalsFromNote,
  heal,
  hurtFamiliar,
  longRest,
  recordDeathSave,
  refundSlot,
  refundUse,
  restoreUses,
  revertShape,
  seedFromSheet,
  setDefense,
  setInspiration,
  setTemp,
  setXp,
  shapeInto,
  shortRest,
  spendHitDie,
  spendPoints,
  spendSlot,
  spendUse,
  type StoredDefense,
  takeDamage,
  toggleCondition,
  toggleEffect,
  type Vitals,
  type WildShapeForm,
  writeVitalsToNote,
} from './model/vitals'
export { type ProjectedVitals, projectVitals } from './model/vitalsProjection'
