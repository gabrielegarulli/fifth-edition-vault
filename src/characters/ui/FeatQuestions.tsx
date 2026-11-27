import { useState } from 'react'
import { featAbilityChoice } from '@vault/derive/featAbilities.js'
import {
  blankChoices,
  choicesComplete,
  originFeatSpec,
  type OriginFeatSpec,
} from '@vault/derive/originFeatChoices.js'

import { draftFromJson, spellListsTaken } from '../../choices'
import { OriginFeatChoices } from '../../choices/host'
import type { FeatRow } from '../../compendium'
import { useCompendium } from '../../compendium/host'
import type { FeatAddition, Sheet, VaultCharacterJson } from '../../characterModel'
import { useCatalogRows, useDetails } from '../../platform/host'
import {
  abilityAnswered,
  abilityBonus,
  FeatAbilityQuestion,
  type AbilityChoice,
} from './FeatAbilityQuestion'

/**
 * The full set of questions adding a feat can ask: which ability it raises,
 * plus any sub-choices (`OriginFeatChoices` — Magic Initiate's list/ability/spells,
 * Skilled's three picks, Fey Touched's spell, Elemental Adept's damage type).
 *
 * Shared by the sheet's Features tab (`FeatEditor`, MYDND-274) and the feats
 * catalog's "Add to a character…" (`FeatDetail`, MYDND-276), so both ask the
 * same questions, honour repeatability the same way, and build the same
 * `FeatAddition` for `withFeatAdded`.
 */

/** Whether a feat's note says it may be taken more than once: a `repeatable` benefit. */
export function isRepeatableFeat(fence: unknown): boolean {
  const benefits = (fence as { benefits?: Array<{ key?: unknown } | null> } | null | undefined)?.benefits
  return Array.isArray(benefits) && benefits.some(b => b?.key === 'repeatable')
}

export interface FeatQuestionsState {
  feat: FeatRow | null
  choice: AbilityChoice | null
  spec: OriginFeatSpec | null
  ability: string | null
  setAbility: (ability: string | null) => void
  choices: unknown
  setChoices: (choices: unknown) => void
  loading: boolean
  repeatable: boolean
  complete: boolean
  context: { proficiencyBonus: number }
  takenLists: string[]
  addition: (repeat?: boolean) => FeatAddition
  reset: () => void
}

export function useFeatQuestions(
  feat: FeatRow | null,
  json: VaultCharacterJson | null,
  sheet: Pick<Sheet, 'proficiency_bonus'> | null,
): FeatQuestionsState {
  const compendium = useCompendium()
  const { details, loading } = useDetails(compendium.feats, feat ? [feat.id] : [])
  // The answers belong to the feat they were given for. The catalog keeps one
  // "Add to a character…" form open while another feat is picked in the list,
  // so answers held by id start blank for the next feat instead of saving
  // Magic Initiate's spell list into Skilled's choices.
  const featId = feat?.id ?? null
  const [answers, setAnswers] = useState<{ featId: string | null; ability: string | null; choices: unknown }>({
    featId,
    ability: null,
    choices: null,
  })
  const own = answers.featId === featId
  const ability = own ? answers.ability : null
  const choices = own ? answers.choices : null
  const setAbility = (next: string | null) =>
    setAnswers(a => ({ featId, ability: next, choices: a.featId === featId ? a.choices : null }))
  const setChoices = (next: unknown) =>
    setAnswers(a => ({ featId, ability: a.featId === featId ? a.ability : null, choices: next }))

  const fence = feat ? (details.get(feat.id)?.fence ?? null) : null
  const choice = feat ? featAbilityChoice({ ...feat, data: fence ?? {} }) : null
  const repeatable = isRepeatableFeat(fence)
  const spec = originFeatSpec(feat?.name)
  const context = { proficiencyBonus: sheet?.proficiency_bonus ?? 2 }
  const effectiveChoices = choices ?? blankChoices(spec, context)
  const complete =
    !!feat && !loading && abilityAnswered(choice, ability) && choicesComplete(spec, effectiveChoices, context)
  const takenLists = json ? spellListsTaken(draftFromJson(json), '') : []

  function reset(): void {
    setAnswers({ featId, ability: null, choices: null })
  }

  function addition(repeat = false): FeatAddition {
    return {
      abilityBonus: abilityBonus(choice, ability),
      ...(spec ? { choices: effectiveChoices } : {}),
      repeat,
    }
  }

  return {
    feat,
    choice,
    spec,
    ability,
    setAbility,
    choices: effectiveChoices,
    setChoices,
    loading,
    repeatable,
    complete,
    context,
    takenLists,
    addition,
    reset,
  }
}

export function FeatQuestions({
  questions,
  sheet,
  canvas = false,
}: {
  questions: FeatQuestionsState
  /** For the ability cap: an option already at `max` cannot be picked. */
  sheet: Pick<Sheet, 'abilities'> | null
  /** Drawn inside the feats catalog's `.bst` root, in its classes (MYDND-65). */
  canvas?: boolean
}) {
  const compendium = useCompendium()
  const spells = useCatalogRows(() => compendium.spells.list())
  const spellsFor = (list: string) => {
    const want = list.trim().toLowerCase()
    return spells.filter(s => s.classes.some(c => c.trim().toLowerCase() === want))
  }

  return (
    <>
      <FeatAbilityQuestion
        choice={questions.choice}
        value={questions.ability}
        onChange={questions.setAbility}
        sheet={sheet}
        canvas={canvas}
      />
      {questions.feat && questions.spec ? (
        <OriginFeatChoices
          feat={{
            id: questions.feat.id,
            name: questions.feat.name,
            source: questions.feat.source ?? null,
            choices: questions.choices as never,
          }}
          spellsFor={spellsFor}
          spells={spells}
          context={questions.context}
          // A second Magic Initiate must choose a list the first did not.
          takenLists={questions.takenLists}
          onChange={questions.setChoices}
        />
      ) : null}
    </>
  )
}
