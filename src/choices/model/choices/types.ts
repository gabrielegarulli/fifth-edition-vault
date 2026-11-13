import type { FenceFeature, SubclassFence } from '../../../compendium'
import type { ClassSource, StepKey } from '../draft'

// The shapes the choice modules share.
// One module of the builder's choices (MYDND-197); index.ts says what the folder is.

/** One fence feature as the web builder's `classFeatures` row. */
export interface FeatureRow {
  id: string
  name: string
  level: number
  description: string | null
  choices: FenceFeature['choices'] | null
  data: { optionOf?: string; [k: string]: unknown }
}

/** What the builder has loaded for one class row of the draft. */
export interface ClassContext {
  index: number
  source: ClassSource | null
  subclassId: string | null
  subclassFence: SubclassFence | null
}

/**
 * The kinds of question a feature can ask — `LevelProgressionAccordions`'s
 * `show*Picker` flags, as one value. The subclass pick is not here: the Class
 * step asks it, at the level the class's own fence names (MYDND-24).
 */
export type ChoiceKind =
  | 'skill'
  | 'expertise'
  | 'asi'
  | 'boon'
  | 'familiar'
  | 'invocations'
  | 'metamagic'
  | 'spell_choice'
  | 'fighting_style'
  | 'feature_option'
  | 'optional_features'
  | 'mastery'
  | 'additional_spells'

export interface LevelItem {
  classIndex: number
  className: string
  level: number
  isSubclass: boolean
  feature: FeatureRow
  kind: ChoiceKind
  /** The rows a `feature_option` picks from; empty for every other kind. */
  options: FeatureRow[]
}

/** A feat row with its fence as `data` — what `featAbilities.js` reads. */
export interface FeatData {
  id: string
  name: string
  source: string | null
  kind?: string | null
  tags?: string[]
  data: Record<string, unknown>
}

/** A question still open, and the step that asks it — never a gate. */
export interface OpenChoice {
  text: string
  step: StepKey
}
