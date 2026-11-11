// Feature Options: a class feature that is a choice between named sub-features
// which exist as content_class_feature rows of their own (Cleric Divine Order →
// Protector / Thaumaturge, Blessed Strikes → Divine Strike / Potent
// Spellcasting).
//
// The parent row declares `choices = { type: 'feature_option' }`; each option row
// is tagged `data.optionOf = '<parent feature name>'`. That single tag does three
// jobs: it groups the options under their parent, it hides them from the places
// that list automatic grants, and it marks their effects as conditional on the
// pick (see effectBaking.js).

export const FEATURE_OPTION_TYPE = 'feature_option'

export function isFeatureOption(feature) {
  return typeof feature?.data?.optionOf === 'string'
}

// The option rows belonging to one parent feature, in the order the query
// returned them (alphabetical by name).
export function featureOptionsFor(features, parentName) {
  if (!parentName) return []
  return (features ?? []).filter(f => f?.data?.optionOf === parentName)
}

// Features minus the option rows — what the level accordions and the Core Traits
// features table should list, since an option is picked rather than granted.
export function withoutFeatureOptions(features) {
  return (features ?? []).filter(f => !isFeatureOption(f))
}

// Ids of the option rows the player actually picked, across every
// feature_option choice. Effect baking keeps only these option rows' effects.
// (The sheet-side reader of the same picks is vaultFeatureOptions().)
export function chosenFeatureOptionIds(featureChoices) {
  return new Set(
    Object.values(featureChoices ?? {})
      .filter(c => c?.type === FEATURE_OPTION_TYPE)
      .map(c => c.optionId)
      .filter(Boolean)
  )
}
