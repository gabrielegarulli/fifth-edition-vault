import { createActivity } from './activity'
import { createCampaigns } from './campaigns'
import { type CraftingStore } from './crafting'
import { createEncounters } from './encounter'
import { createCharacterStore } from './characters'
import { createHarvests } from './harvests'
import { createInventory } from './inventory'
import { createShop } from './shop'
import { createVitals } from './vitals'
import type { StateVault } from './vault'
import { campaignsFolder, DEFAULT_NOTE_FOLDERS, sessionsFolder, type NoteFoldersSettings } from '../content/folders'
import { readSheetFromNote } from '../ddb/charsheet'
import { fromYaml } from './note'

/**
 * The state layer — what replaces `vault_state`, `campaign_codes` and the
 * 17 plpgsql RPCs.
 *
 * **This module imports nothing from `obsidian`, and must not start**, for the
 * same reason `src/content/index.ts` must not: the `obsidian` package ships
 * `obsidian.d.ts` and no runtime entry, so importing a *value* from it makes the
 * importing file unloadable outside Obsidian and propagates to everything above.
 * That resolution failure is the guard which keeps this testable in plain Node —
 * and the stakes are higher here than for the readers, because this layer
 * rewrites the user's files and nothing in the lore vault is in any repository.
 *
 * The Obsidian wrapper is `./obsidian`.
 *
 * Phase 3 ships campaigns, the harvest log (MYDND-5), and characters,
 * inventory and currency (MYDND-6). Phase 4 adds `vitals` — the mutable half of
 * a sheet (MYDND-10), in its own fence because the charsheet one is replaced
 * wholesale by a re-sync. Phase 5 adds the activity log and session notes, the
 * encounter, and the shop (MYDND-11), and crafting (MYDND-13).
 */
export function createState(
  vault: StateVault,
  // The plugin's live settings, read on every call (MYDND-184). Only the two
  // folders the user's own notes are created in; the log, the harvests and the
  // encounters keep their fixed folders.
  folders: () => Pick<NoteFoldersSettings, 'campaigns' | 'sessions'> = () => DEFAULT_NOTE_FOLDERS,
) {
  const inventory = createInventory(vault)
  const campaigns = () => campaignsFolder(folders())
  return {
    activity: createActivity(vault, undefined, () => sessionsFolder(folders())),
    campaigns: createCampaigns(vault, campaigns),
    characters: createCharacterStore(vault),
    encounters: createEncounters(vault),
    harvests: createHarvests(vault, campaigns),
    inventory,
    // Both built over the inventory store rather than the vault: every price
    // and every rule comes from `@vault/derive`, and every write goes through
    // the one inventory API, so neither has business reaching a note directly.
    shop: createShop(inventory),
    crafting: (undefined as unknown as CraftingStore),
    // The sheet reader is injected rather than imported inside `vitals.ts`,
    // which keeps that module's only YAML dependency the `yaml` package — the
    // state layer parses and serialises with one library in both directions.
    vitals: createVitals(vault, markdown => readSheetFromNote(markdown, fromYaml)),
  }
}

export type State = ReturnType<typeof createState>

export type { Campaign, Campaigns } from './campaigns'
export { CAMPAIGNS_FOLDER } from './campaigns'
export type { CharacterNoteSettings, CharacterStore, SaveResult } from './characters'
export {
  DDB_ID_KEY,
  LOCAL_ID_PREFIX,
  describeSheetLosses,
  isLocalId,
  managedFrontmatter,
  mintLocalId,
  renderNote,
  renderVaultCharacterNote,
  sanitiseFileName,
} from './characters'
export type { HarvestComponent, HarvestCrew, HarvestEntry, HarvestRow, Harvests, ImportResult } from './harvests'
export { HARVESTS_FOLDER, HARVEST_FENCE } from './harvests'
export type {
  AddItemInput,
  CharacterInventory,
  EquipInput,
  InventoryCurrency,
  InventoryItem,
  InventoryStore,
  TransferInput,
  UnequipInput,
} from './inventory'
export {
  createInventory,
  extractInventoryFromNote,
  generateItemId,
  hydrateRow,
  INVENTORY_FENCE,
  parseInventory,
  writeInventoryToNote,
} from './inventory'
export type { DeathSaves, SheetReader, ShortRestRecovery, Vitals, VitalsStore } from './vitals'
export {
  addXp,
  createVitals,
  EMPTY_VITALS,
  emptyVitals,
  extractVitalsFromNote,
  heal,
  hitDicePool,
  longRest,
  maxHpOf,
  parseVitals,
  recordDeathSave,
  refundSlot,
  refundUse,
  seedFromSheet,
  serialiseVitals,
  setTemp,
  setXp,
  shortRest,
  spendHitDie,
  spendSlot,
  spendUse,
  takeDamage,
  castSpell,
  clearDefense,
  concentrationDc,
  endConcentration,
  restoreUses,
  setDefense,
  hurtFamiliar,
  revertShape,
  setInspiration,
  shapeInto,
  spendPoints,
  toggleCondition,
  toggleEffect,
  VITALS_FENCE,
  writeVitalsToNote,
} from './vitals'
export type { Activity, ActivityEntry, ActivityKind, LogDay, SessionNoteRow } from './activity'
export {
  ACTIVITY_KINDS,
  createActivity,
  dayKey,
  LOG_FENCE,
  LOG_FOLDER,
  parseEntries,
  serialiseEntries,
  SESSIONS_FOLDER,
} from './activity'
export type { Combatant, EncounterState, EncounterStore } from './encounter'
export {
  addToEncounter,
  advanceTurn,
  createEncounters,
  emptyEncounter,
  ENCOUNTER_FENCE,
  ENCOUNTERS_FOLDER,
  endEncounter,
  extractEncounterFromNote,
  parseEncounter,
  removeFromEncounter,
  rewindTurn,
  serialiseEncounter,
  setCombatantHp,
  setInitiative,
  startEncounter,
} from './encounter'
export type { BuyInput, SellInput, Shop, ShopItem, ShopOutcome, SpendResult } from './shop'
export { breakIntoCoins, createShop, emptyCurrency, receiveCp, spendCp } from './shop'
export type {
  CookInput,
  CraftingStore,
  CraftMaterial,
  CraftResult,
  EnchantInput,
  ManufactureInput,
} from './crafting'
export { createCrafting, sellPriceWithQuirks } from './crafting'
export type { StateVault } from './vault'
export { noteName, parseNote, serialiseNote, setFence, uniqueName } from './note'

