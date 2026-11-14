import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { App as ObsidianApp } from 'obsidian'

import { levelItems, type ClassContext } from '../../model/choices'
import { ROGUE, WARLOCK, row } from '../../model/choices/__fixtures__/classes'
import { blankDraft, withClass, withLevel, withSubclass, type BuilderDraft } from '../../model/draft'
import type { ClassFence, FeatRow, SpellRow, SubclassFence } from '../../../compendium'
import { ObsidianProvider } from '../../../platform/obsidian/ObsidianContext'
import { TestProviders } from '../../../__harness__/providers'
import { FeaturesStep, type FeaturesStepProps } from '.'

/**
 * The five Features-step pickers no other test renders (MYDND-206): Skill,
 * Expertise, Epic Boon, optional features and a fixed-level spell. Their rules
 * are pinned in `model/choices/`; this pins the markup — that each question is
 * drawn, offers what it should, and stores under the feature's id the answer
 * the bake reads. MYDND-197's negative control found each could render nothing
 * and every suite still passed.
 *
 * Mounted as the builder and the level-up panel mount it: the step alone,
 * inside the domain providers, its `setDraft` folding each update into a local
 * draft.
 */

function fakeApp(): ObsidianApp {
  const events = { on: () => ({}), offref: () => {} }
  return {
    workspace: { ...events, openLinkText: () => Promise.resolve(), getLeavesOfType: () => [] },
    vault: { ...events, getFileByPath: () => null, getResourcePath: () => '' },
    metadataCache: { ...events, getFileCache: () => null },
  } as unknown as ObsidianApp
}

const fence = (name: string, features: ClassFence['features']): ClassFence => ({
  name,
  source: 'XPHB',
  hit_die: 10,
  data: {},
  features,
})

const feat = (id: string, name: string, kind: FeatRow['kind']): FeatRow =>
  ({ id, name, kind, source: 'XPHB', path: `feats/${id}.md`, prerequisite: null, prerequisiteClass: null, abilities: [], tags: [], aliases: [] }) as unknown as FeatRow

const spell = (name: string, level: number): SpellRow =>
  ({ id: name.toLowerCase().replace(/\s+/g, '-'), name, level, school: 'Necromancy', ritual: false, classes: ['Warlock'], path: `spells/${name}.md` }) as unknown as SpellRow

interface Mount {
  id: string
  fence: ClassFence
  level: number
  sub?: { id: string; fence: SubclassFence }
  props?: Partial<FeaturesStepProps>
}

function mount({ id, fence, level, sub, props = {} }: Mount) {
  const source = { row: row(id, fence.name), fence }
  let draft: BuilderDraft = withLevel(withClass(blankDraft(), source, 0), level, fence, 0)
  if (sub) draft = withSubclass(draft, { id: sub.id, name: sub.fence.name }, 0)
  const ctx: ClassContext[] = [{ index: 0, source, subclassId: sub?.id ?? null, subclassFence: sub?.fence ?? null }]
  const setDraft = vi.fn((update: (d: BuilderDraft) => BuilderDraft) => {
    draft = update(draft)
  })
  const all: FeaturesStepProps = {
    draft,
    setDraft: setDraft,
    items: levelItems(draft, ctx),
    feats: [],
    featData: [],
    scores: {},
    skillSources: {},
    masteryCount: 0,
    masteryWeapons: [],
    invocationCount: () => 0,
    spellsFor: () => [],
    spells: [],
    familiars: [],
    onFamiliar: () => {},
    ...props,
  }
  render(
    <ObsidianProvider app={fakeApp()}>
      <TestProviders>
        <FeaturesStep {...all} />
      </TestProviders>
    </ObsidianProvider>,
  )
  return { answer: (featureId: string) => draft.featureChoices[featureId] }
}

/** A select's options, as offered: the placeholder dropped, a refused one marked. */
const offered = (label: string | RegExp) =>
  within(screen.getByRole('combobox', { name: label }))
    .getAllByRole('option')
    .slice(1)
    .map(o => `${o.textContent}${(o as HTMLOptionElement).disabled ? ' (refused)' : ''}`)

const pick = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByRole('combobox', { name: label }), { target: { value } })

describe('the Features step, for the pickers no page test reaches', () => {
  it('SkillPicker: offers the feature’s skills, refuses one held elsewhere, stores the slugs', () => {
    const { answer } = mount({
      id: 'barbarian',
      fence: fence('Barbarian', [
        { name: 'Primal Knowledge', level: 3, choices: { type: 'skill', count: 1, options: ['athletics', 'stealth', 'survival'] } },
      ]),
      level: 3,
      props: { skillSources: { athletics: 'Background' } },
    })
    expect(offered('Skill')).toEqual(['Athletics (Background) (refused)', 'Stealth', 'Survival'])
    pick('Skill', 'stealth')
    expect(answer('barbarian:3:primal-knowledge')).toEqual(['stealth'])
  })

  it('ExpertisePicker: offers only skills already held, stores them as an expertise answer', () => {
    const { answer } = mount({
      id: 'rogue',
      fence: ROGUE,
      level: 1,
      props: { skillSources: { stealth: 'Rogue', perception: 'Background' } },
    })
    expect(offered('Expertise 1')).toEqual(['Perception', 'Stealth'])
    expect(screen.getByRole('combobox', { name: 'Expertise 2' })).toBeTruthy()
    pick('Expertise 1', 'stealth')
    expect(answer('rogue:1:expertise')).toEqual({ type: 'expertise', skills: ['stealth'] })
  })

  it('BoonPicker: offers epic boons and no other feat, stores the boon', () => {
    const { answer } = mount({
      id: 'fighter',
      fence: fence('Fighter', [{ name: 'Epic Boon', level: 19, choices: { type: 'boon' } }]),
      level: 19,
      props: {
        feats: [
          feat('boon-of-fortitude', 'Boon of Fortitude', 'epic_boon'),
          feat('boon-of-speed', 'Boon of Speed', 'epic_boon'),
          feat('alert', 'Alert', 'origin'),
        ],
      },
    })
    expect(offered('Epic boon')).toEqual(['Boon of Fortitude', 'Boon of Speed'])
    pick('Epic boon', 'boon-of-speed')
    expect(answer('fighter:19:epic-boon')).toEqual({
      type: 'boon',
      featId: 'boon-of-speed',
      featName: 'Boon of Speed',
      featSource: 'XPHB',
    })
  })

  it('OptionalFeaturesPicker: one slot per option known, a later option waits, stores each pick with its text', () => {
    const MANEUVERS: SubclassFence = {
      name: 'Battle Master',
      class_name: 'Fighter',
      class_source: 'XPHB',
      source: 'XPHB',
      data: {},
      features: [
        {
          name: 'Combat Superiority',
          level: 3,
          choices: {
            type: 'optional_features',
            name: 'Maneuvers',
            progression: { 3: 3, 7: 5 },
            options: [
              { name: 'Parry', description: 'Reduce the damage by your superiority die.' },
              { name: 'Riposte' },
              { name: 'Trip Attack' },
              { name: 'Later Trick', minLevel: 7 },
            ],
          },
        },
      ],
    }
    const { answer } = mount({
      id: 'fighter',
      fence: fence('Fighter', []),
      level: 3,
      sub: { id: 'fighter-battle-master', fence: MANEUVERS },
    })
    expect(screen.getAllByRole('combobox', { name: /^Maneuver \d$/ })).toHaveLength(3)
    expect(offered('Maneuver 1')).toEqual(['Parry', 'Riposte', 'Trip Attack'])
    pick('Maneuver 1', 'Parry')
    expect(answer('fighter-battle-master:3:combat-superiority')).toEqual({
      type: 'optional_features',
      label: 'Maneuvers',
      picks: [{ name: 'Parry', description: 'Reduce the damage by your superiority die.' }],
    })
  })

  it('SpellChoicePicker: offers the class’s spells of the slot’s level, stores the pick with its uses', () => {
    const { answer } = mount({
      id: 'warlock',
      fence: WARLOCK,
      level: 11,
      props: { spellsFor: () => [spell('Fireball', 3), spell('Circle of Death', 6), spell('Mass Suggestion', 6)] },
    })
    expect(offered('Level 6 spell')).toEqual(['Circle of Death', 'Mass Suggestion'])
    pick('Level 6 spell', 'mass-suggestion')
    expect(answer('warlock:11:mystic-arcanum')).toEqual({
      type: 'spell_choice',
      label: 'Mystic Arcanum',
      className: 'Warlock',
      minLevel: 11,
      uses: null,
      resets: null,
      spells: [{ spellLevel: 6, spellId: 'mass-suggestion', spellName: 'Mass Suggestion' }],
    })
  })
})
