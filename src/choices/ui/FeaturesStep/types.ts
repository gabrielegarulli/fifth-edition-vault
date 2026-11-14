import type { ImprovementDef } from '../../model/companion'
import type { FeatData, LevelItem } from '../../model/choices'
import type { BuilderDraft } from '../../model/draft'
import type { FeatRow, MonsterRow, SpellRow } from '../../../compendium'
import type { SetDraft } from '../fields'

// The step's props, and the shape every picker receives.
// One file of the Features step (MYDND-197); index.ts says what the step is.

export interface MasteryWeapon {
  id: string
  name: string
  mastery: string
}

export interface FeaturesStepProps {
  draft: BuilderDraft
  setDraft: SetDraft
  items: LevelItem[]
  /** Every feat note's row — the ASI, boon and fighting-style pools. */
  feats: readonly FeatRow[]
  /** The picked feats, with fences: what a half-feat's +1 is read from. */
  featData: readonly FeatData[]
  scores: Record<string, number>
  /** `skillSourceMap` — which skills the character already has, and from where. */
  skillSources: Record<string, string>
  masteryCount: number
  /** Weapons carrying a mastery, or null while their notes are read. */
  masteryWeapons: MasteryWeapon[] | null
  invocationCount: (classIndex: number) => number
  spellsFor: (className: string) => SpellRow[]
  /** Every spell note, for a feat that chooses from any list (MYDND-182). Optional for older callers. */
  spells?: readonly SpellRow[]
  familiars: readonly MonsterRow[]
  onFamiliar: (featureId: string, monster: MonsterRow | null) => void
  /** Each picked familiar's improvement tree, by monster id; absent while read (MYDND-126). */
  companions?: ReadonlyMap<string, ImprovementDef[]>
  /** Weapon names War Training may name. */
  weaponNames?: readonly string[]
}

export type PickerProps = FeaturesStepProps & { item: LevelItem; answer: unknown; set: (choice: unknown) => void }
