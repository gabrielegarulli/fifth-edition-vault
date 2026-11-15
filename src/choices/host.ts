// The choices domain's host surface (MYDND-201): what other domains import from
// ui/ and obsidian/ — React, and the Obsidian edges. The pure half is index.ts.
// Rules: scripts/eslint-domain-order.mjs.

export { FeatureQuestion, type FeaturesStepProps, FeaturesStep } from './ui/FeaturesStep'
export {
  Field,
  OptionSelect,
  Section,
  type SetDraft,
  SlotSelects,
  SourceSelect,
  withCurrent,
} from './ui/fields'
export { Banner, ErrorIcon, Message, MessageIcon, type MessageKind, WarningIcon } from './ui/Messages'
export { OriginFeatChoices } from './ui/OriginFeatChoices'
export { FeatPreview, ItemPreview, ReadButton, SpellPreview, TraitsPreview } from './ui/Previews'
export { useBuilderSources } from './ui/useBuilderSources'
