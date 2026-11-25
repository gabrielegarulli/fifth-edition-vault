// The compendium domain's pure surface (MYDND-201): what other domains import from
// outside ui/ and obsidian/. Nothing here reaches React or obsidian, so any test
// loads it in plain Node. Rules: scripts/eslint-domain-order.mjs.

export {
  baseClassName,
  type ClassCatalog,
  type ClassFence,
  type ClassRow,
  type FenceFeature,
  type SubclassCatalog,
  subclassesOf,
  type SubclassFence,
  type SubclassRow,
} from './model/classes'
export {
  type ClassGroup,
  type FeatureCell,
  featuresByLevel,
  groupClasses,
  groupSubclasses,
  highestSlot,
  levelIn,
  type Progression,
  readProgression,
  type SubclassGroupId,
} from './model/classShelves'
export {
  booksInPlay,
  booksOf,
  isLegacyEdition,
  isOfficialSource,
  searchShelfRows,
  type Shelf,
  type ShelfKind,
  type ShelfRow,
  sourceShelfOf,
  shelvesBySource,
} from './model/shelves'
export { sourceLabel, sourceMatches } from './model/sourceNames'
export {
  CATALOG_KEYS,
  catalogCounts,
  type CatalogKey,
  type Compendium,
  createCompendium,
} from './model/compendium'
export {
  describeEffectCoverage,
  type FeatEffects,
  type ResolvedEffect,
  resolveFeatEffects,
} from './model/featEffects'
export {
  abilitiesFromFence,
  byFeatName,
  countsFromFence,
  type FeatBenefit,
  type FeatCatalog,
  type FeatKind,
  type FeatRow,
} from './model/feats'
export {
  damageCell,
  type ItemKind,
  itemLine,
  kindOf,
  type KindShelf,
  kindShelf,
  poundsLabel,
  type Proficiency,
  proficiencyFor,
  propertiesCell,
  shelveByKind,
} from './model/itemKinds'
export {
  type ItemCatalog,
  type ItemFence,
  type ItemRow,
  type MagicItemCatalog,
  type MagicItemFence,
  type MagicItemRow,
  packContentsFrom,
} from './model/items'
export {
  bonusLine,
  type Category,
  categoryLabel,
  categoryOf,
  chargeCount,
  chargeLadder,
  chargesChip,
  type ChargeStep,
  effectLine,
  iconOf,
  itemFlagsOf,
  type ItemIcon,
  itemShelfWhen,
  itemValueCp,
  kindLabel,
  parseCast,
  type RarityShelf,
  rechargeLine,
  rechargeTile,
  restrictionText,
  rowCorner,
  rowFlags,
  saveDcOf,
  shelfOf,
  shelveItems,
  weightLabel,
} from './model/itemShelves'
export {
  ABILITY_LABELS,
  copperLabel,
  featKindLabel,
  humanise,
  rarityColorVar,
  schoolLabel,
} from './model/labels'
export {
  type BackgroundRow,
  backgroundToolsOf,
  type LineageFence,
  type SpeciesCatalog,
  type SpeciesRow,
  type ToolChoice,
} from './model/lineage'
export {
  abilitiesOf,
  flattenSaves,
  type MonsterCatalog,
  type MonsterRow,
  MOVE_MODES,
  type MoveMode,
  type StatblockFence,
} from './model/monsters'
export { cantripTier, diceAtRank } from './model/spellRanks'
export type { SpellCatalog, SpellRow } from './model/spells'
export {
  cardLine,
  CAST_AS,
  castAsOf,
  componentPips,
  diceLabel,
  kindLine,
  type LevelShelf,
  shelveSpells,
  shortDuration,
  shortRange,
  shortTime,
  spellFlagsOf,
  spellShelfWhen,
} from './model/spellShelves'
export { SRD_PAYLOAD } from './store/srd/payload'
export { describeSeedReport, inflateSrdArchive, type SeedReport, seedSrdNotes } from './store/srd/seed'
export { DEFAULT_TEMPLATES_FOLDER, templateFolderProblem } from './model/homebrewTemplates'
export { NOTE_KINDS, type NoteKind } from './model/noteTemplates'
export { describeTemplatesReport, type TemplatesReport, writeHomebrewTemplates } from './store/templates'
