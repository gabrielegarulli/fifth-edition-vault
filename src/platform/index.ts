// The platform domain's pure surface (MYDND-201): what other domains import from
// outside ui/ and obsidian/. Nothing here reaches React or obsidian, so any test
// loads it in plain Node. Rules: scripts/eslint-domain-order.mjs.

export {
  bool,
  type Catalog,
  type CatalogRow,
  createCatalog,
  type Detail,
  hasBareTag,
  type HiddenNote,
  num,
  str,
  strList,
} from './model/catalog'
export {
  CORE_CLASS_SOURCES,
  DEFAULT_RULES_ROOT,
  OFFICIAL_CLASS_SOURCES,
  OFFICIAL_SOURCE_TITLES,
  OMITTED_PAGES,
  PLUGIN_TITLE,
  PREFERRED_ITEM_SOURCES,
  PUBLIC_REPO,
  QUIRK_COSTS_NOTE_LINE,
  THIRD_PARTY_SOURCE_TITLES,
} from './model/edition'
export { extractFence } from './model/fence'
export { applyFacets, countValues, type Facet, matchAnyField, type Page, paginate } from './model/filter'
export {
  campaignsFolder,
  DEFAULT_HOMEBREW_FOLDER,
  DEFAULT_NOTE_FOLDERS,
  homebrewFolder,
  isRuleFolderKey,
  isUnderFolder,
  mergeNoteFolders,
  normaliseFolder,
  type NoteFoldersSettings,
  resolveRuleFolder,
  RULE_FOLDER_KEYS,
  type RuleFolderKey,
  sessionsFolder,
} from './model/folders'
export type { RequestUrlFn, RequestUrlOptions, RequestUrlResult } from './model/http'
export { exporterSlug, nameKey, noteSlugs } from './model/names'
export { stripPreamble } from './model/preamble'
export {
  BUILDER_EDIT_PREFIX,
  BUILDER_NEW_PATH,
  builderEditPath,
  builderSpellsPath,
  CHARACTER_SHEET_PREFIX,
  CONVERT_PREFIX,
  convertPath,
  destinationFor,
  DESTINATIONS,
  groupFor,
  NAV_GROUP_LABELS,
  type NavGroup,
  NOTE_BUILDER_PREFIX,
  NOTE_EDIT_PREFIX,
  noteEditPath,
  noteBuilderPath,
  type PaneTarget,
  parseConvertPath,
  restoredPath,
  ROW_ORDER,
  sheetPath,
  SPELLS_STEP_HASH,
  tabFor,
} from './model/routes'
export { rulesSource } from './model/rulesFolder'
export type { ParseYaml, VaultSource } from './model/source'
export {
  ACTIVITY_KINDS,
  type ActivityEntry,
  type ActivityKind,
  createActivity,
  dayKey,
  LOG_FOLDER,
  type SessionNoteRow,
} from './store/activity'
export { type Campaign, CAMPAIGNS_FOLDER, activeLoadoutSystem, createCampaigns, resolveCampaignId } from './store/campaigns'
export { fromYaml, noteName, parseNote, serialiseNote, setFence, toYaml, uniqueName } from './store/note'
export type { NoteRef, StateVault } from './store/vault'
