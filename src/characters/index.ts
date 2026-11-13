// The characters domain's pure surface (MYDND-201): what other domains import from
// outside ui/ and obsidian/. Nothing here reaches React or obsidian, so any test
// loads it in plain Node. Rules: scripts/eslint-domain-order.mjs.

export { VAULT_SHEET_TEMPLATE_ID } from './store/atlasMirror'
export {
  type CharacterNoteSettings,
  type CharacterStore,
  DDB_ID_KEY,
  DDB_SOURCE_KEY,
  sanitiseFileName,
} from './store/characters'
export { createCharacterStores } from './store/characterStores'
export type { InventoryStore } from './store/inventory'
