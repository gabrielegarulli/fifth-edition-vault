/**
 * The Character Builder's choices (MYDND-29) — the pure half.
 *
 * MYDND-24 built the stepper; this module is what decides which questions each
 * class, subclass, level and feat asks, and whether they have been answered.
 * As there, **no rule is re-derived**: the counts, eligibility and resolution
 * all come from `@vault/derive` — the web builder's own modules, moved into the
 * shared library by VAULT-241. What lives here is only:
 *
 * - **Fence features as `content_*_feature` rows.** The web builder keys
 *   `featureChoices` by a row's uuid; a fence feature has none, so it is keyed
 *   by `featureId` — the *same* id the bake stamps on the feature's effects
 *   (`characterModel/model/vaultCharacter/bake.ts`). One id on both sides is the whole contract: a
 *   choice saved here is the choice the bake finds.
 * - **The web components' inline logic, collected.** `LevelProgressionAccordions`
 *   decides which picker a feature gets and whether it is complete inside JSX;
 *   both answers are here as functions, so they are testable without a DOM.
 * - **Note-to-row adapters** for items, the shape `startingEquipment.js` reads.
 *
 * Nothing here imports `obsidian` or React, so it runs in the `logic` project.
 *
 * Since MYDND-197 it is a folder, one module per choice, with `completeness.ts`
 * as the controller that combines them. This file is the surface: the names
 * other files import, exactly as when it was one file.
 */

export {
  type ChoiceKind,
  type ClassContext,
  type FeatData,
  type FeatureRow,
  type LevelItem,
  type OpenChoice,
} from './types'
export {
  ALL_SKILLS,
  classSkillChoices,
  multiclassSkillChoices,
  multiclassSkillKey,
  SKILL_NAME,
  type SkillChoices,
} from './skills'
export {
  featContext,
  fightingStyleFeats,
  invocationOwner,
  isAsiFeat,
  ORIGIN_FEAT_OWNER,
  originFeatComplete,
  spellListsTaken,
} from './feats'
export {
  invocationCountAt,
  invocationOffered,
  type InvocationOption,
  type InvocationPick,
  invocationsComplete,
  type InvocationTarget,
  invocationTargetKind,
  type InvocationTargetKind,
  invocationTargets,
  isPactInvocation,
  keepingPrerequisites,
} from './invocations'
export {
  additionalSpellsFeature,
  choicePicks,
  featureRows,
  featureTitle,
  itemLabel,
} from './features'
export {
  masteryCountAt,
  masteryCountFor,
  masteryOf,
  WEAPON_ITEM_TYPES,
} from './masteries'
export {
  optionalFeatureAnswer,
  optionalFeatureCount,
  type OptionalFeatureOption,
  optionalFeatureOptions,
  optionalFeaturePicks,
  requiredOptionalFeatures,
} from './optionalFeatures'
export {
  LANGUAGE_PICKS,
  languagesComplete,
  STANDARD_LANGUAGES,
  TOOL_CHOICE_LABEL,
  toolChoiceComplete,
  toolPicksIn,
  toolSlugsOf,
  withLanguagePick,
  withToolPick,
} from './languagesAndTools'
export {
  ABILITY_SCORE_CAP,
  effectiveScores,
  prereqsMet,
  type ScoreOverCap,
  scoreOverCapText,
  scoresOverCap,
  uncappedScores,
} from './abilityScores'
export {
  affinityPicks,
  bonusCantrips,
  type Caster,
  type CasterCaps,
  casters,
  maxSpellRank,
  offeredByAffinity,
  spellListAccess,
  spellsComplete,
} from './spells'
export {
  backgroundEquipmentOptions,
  combinedEquipmentGrants,
  defaultEquipmentChoices,
  type EquipmentCatalogRow,
  type EquipmentDraft,
  type EquipmentEntry,
  equipmentGrants,
  type EquipmentOption,
  equipmentOptions,
  itemRowForEquipment,
} from './equipment'
export {
  itemComplete,
  levelItems,
  openChoicesOf,
} from './completeness'
