// The homebrew domain's pure surface (MYDND-233): the note builders' model and
// their one write. Nothing here reaches React or obsidian. Rules:
// scripts/eslint-domain-order.mjs; the decision is docs/adr/0014.

export { formProblems, noteCompendium, previewCompendium, readBackProblems } from './model/check'
export { nameClash, type NamedRow, notePath, subfolderProblem, suggestName } from './model/destination'
export {
  ABILITIES,
  ABILITY_NAMES,
  type Ability,
  ARMOR_CATEGORIES,
  DAMAGE_TYPES,
  EFFECT_LABEL,
  type EffectForm,
  effectFormProblems,
  effectSummary,
  effectToFence,
  type EffectType,
  emptyEffect,
  FEAT_EFFECT_TYPES,
  MAGIC_ITEM_EFFECT_TYPES,
  RESETS,
  SENSES,
  SKILLS,
  SPEED_MODES,
  WEAPON_CATEGORIES,
} from './model/effects'
export { buildNote, type BuiltNote, slugOf } from './model/emit'
export {
  type BenefitForm,
  type BuilderForm,
  type ConditionForm,
  emptyForm,
  prefilledForm,
  FEAT_KINDS,
  type FeatForm,
  type FormOf,
  isArmorType,
  isWeaponType,
  ITEM_TYPES,
  type ItemForm,
  MAGIC_ITEM_TYPES,
  type MagicItemForm,
  MASTERIES,
  RARITIES,
  RECHARGES,
  SPELL_SCHOOLS,
  type SpellForm,
  WEAPON_PROPERTIES,
} from './model/forms'
export {
  BUILDER_CATALOG,
  BUILDER_KINDS,
  BUILDER_LABEL,
  type BuilderDefaults,
  builderDefaults,
  type BuilderKind,
  type BuilderSettings,
  DEFAULT_SOURCE,
  DEFAULT_SUBFOLDER,
  isBuilderKind,
  mergeBuilderSettings,
} from './model/kinds'
export { descriptionOf, differences, fenceToEffect, formOf, type LoadedNote, loadNote } from './model/parse'
export { createHomebrewNote } from './store/create'
export {
  createImportedNotes,
  IMPORTED_SUBFOLDER,
  type ImportedKind,
  type ImportedNoteRequest,
  type ImportedNotesInput,
  type ImportedOutcome,
  PLACEHOLDER_BENEFIT,
} from './store/imported'
export { replaceHomebrewNote } from './store/replace'
