import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { levelItems, type ClassContext } from '../../choices/model/choices'
import { blankDraft, withClass, withLevel, withSubclass, type BuilderDraft } from '../../choices/model/draft'
import type { ClassFence, ClassRow, SubclassFence } from '../../compendium/model/classes'
import type { SpellRow } from '../../compendium/model/spells'
import { FeaturesStep, type FeaturesStepProps } from '../../choices/ui/FeaturesStep'

// The previews read a note, and the feature's text goes through Obsidian's
// renderer; what is offered is the point here.
vi.mock('../../choices/ui/Previews', () => ({ SpellPreview: () => null, FeatPreview: () => null }))
vi.mock('../../platform/ui/Markdown', () => ({ Markdown: ({ markdown }: { markdown: string }) => <p>{markdown}</p> }))

/**
 * The Features step's question for spells outside the caps (MYDND-183). Which
 * picks a level brings and what each allows are derive's (`additionalSpells.js`);
 * this pins that the picker offers what they allow and stores the shape the
 * bake reads.
 */

const row = (id: string, name: string): ClassRow =>
  ({ id, name, source: 'XPHB', path: `classes/${id}.md`, edition: '5.5e', tags: [], aliases: [] }) as unknown as ClassRow

const spell = (name: string, level: number, school: string, classes: string[]): SpellRow =>
  ({ id: name.toLowerCase().replace(/\s+/g, '-'), name, level, school, ritual: false, classes }) as unknown as SpellRow

const SPELLS = [
  spell('Guidance', 0, 'Divination', ['Cleric', 'Druid']),
  spell('Guiding Bolt', 1, 'Evocation', ['Cleric']),
  spell('Shield', 1, 'Abjuration', ['Wizard', 'Sorcerer']),
  spell('Alarm', 1, 'Abjuration', ['Wizard', 'Ranger']),
  spell('Magic Missile', 1, 'Evocation', ['Wizard']),
  spell('Fireball', 3, 'Evocation', ['Wizard']),
  spell('Banishment', 4, 'Abjuration', ['Cleric', 'Wizard']),
  spell('Vicious Mockery', 0, 'Enchantment', ['Bard']),
  spell('Blade Ward', 0, 'Abjuration', ['Wizard']),
]

const caster = (name: string, data: Record<string, unknown> = {}): ClassFence => ({
  name,
  source: 'XPHB',
  hit_die: 8,
  spellcasting_ability: 'int',
  data: { casterProgression: 'full', ...data },
  features: [],
})

const LORE: SubclassFence = {
  name: 'College of Lore',
  class_name: 'Bard',
  class_source: 'XPHB',
  source: 'XPHB',
  data: {
    additionalSpells: [
      { prepared: { 6: [{ choose: 'level=0;1;2;3|class=Cleric;Druid;Wizard' }, { choose: 'level=0;1;2;3|class=Cleric;Druid;Wizard' }] } },
    ],
  },
  features: [{ name: 'Magical Discoveries', level: 6, description: 'You learn two spells of your choice.' }],
}

const ABJURER: SubclassFence = {
  name: 'Abjurer',
  class_name: 'Wizard',
  class_source: 'XPHB',
  source: 'XPHB',
  data: {
    additionalSpells: [{ known: { 3: [{ choose: 'level=0;1;2|class=Wizard|school=A' }, { choose: 'level=0;1;2|class=Wizard|school=A' }] } }],
  },
  features: [{ name: 'Abjuration Savant', level: 3, description: 'Add two Abjuration spells to your spellbook.' }],
}

const LAND: SubclassFence = {
  name: 'Circle of the Land',
  class_name: 'Druid',
  class_source: 'XPHB',
  source: 'XPHB',
  data: {
    additionalSpells: [
      { name: 'Arid Land', prepared: { 3: ['blur|xphb'] } },
      { name: 'Polar Land', prepared: { 3: ['fog cloud|xphb'] } },
    ],
  },
  features: [],
}

function step(clsId: string, fence: ClassFence, subId: string, sub: SubclassFence, level: number) {
  const source = { row: row(clsId, fence.name), fence }
  let draft: BuilderDraft = withSubclass(withLevel(withClass(blankDraft(), source, 0), level, fence, 0), { id: subId, name: sub.name }, 0)
  const ctx: ClassContext[] = [{ index: 0, source, subclassId: subId, subclassFence: sub }]
  const setDraft = vi.fn((update: (d: BuilderDraft) => BuilderDraft) => {
    draft = update(draft)
  })
  const props: FeaturesStepProps = {
    draft,
    setDraft: setDraft as unknown as FeaturesStepProps['setDraft'],
    items: levelItems(draft, ctx),
    feats: [],
    featData: [],
    scores: {},
    skillSources: {},
    masteryCount: 0,
    masteryWeapons: [],
    invocationCount: () => 0,
    spellsFor: () => [],
    spells: SPELLS,
    familiars: [],
    onFamiliar: () => {},
  }
  render(<FeaturesStep {...props} />)
  return { answer: () => draft.featureChoices[`${subId}:additional-spells`] }
}

const optionsOf = (label: string | RegExp) =>
  within(screen.getByRole('combobox', { name: label }))
    .getAllByRole('option')
    .map(o => o.textContent)
    .slice(1)

describe('the Features step, for spells outside the caps', () => {
  it("offers Magical Discoveries cantrips and spells to level 3 from the Cleric, Druid and Wizard lists", () => {
    const { answer } = step('bard', caster('Bard'), 'bard-college-of-lore', LORE, 6)
    expect(screen.getByText(/Magical Discoveries/)).toBeTruthy()
    const label = /^Level 6 spell 1/
    expect(optionsOf(label)).toEqual([
      'Blade Ward (cantrip)',
      'Guidance (cantrip)',
      'Alarm (level 1)',
      'Guiding Bolt (level 1)',
      'Magic Missile (level 1)',
      'Shield (level 1)',
      'Fireball (level 3)',
    ])
    fireEvent.change(screen.getByRole('combobox', { name: label }), { target: { value: 'guiding-bolt' } })
    expect(answer()).toEqual({
      type: 'additional_spells',
      block: null,
      picks: { '6:prepared': [{ spellId: 'guiding-bolt', spellName: 'Guiding Bolt', spellLevel: 1 }, null] },
    })
  })

  it("offers a Savant only its school's levelled spells: a spellbook holds no cantrip", () => {
    const { answer } = step('wizard', caster('Wizard', { spellbook: { initial: 6, perLevel: 2 } }), 'wizard-abjurer', ABJURER, 3)
    expect(screen.getAllByRole('combobox')).toHaveLength(2)
    expect(optionsOf(/^Level 3 spell 1/)).toEqual(['Alarm (level 1)', 'Shield (level 1)'])
    fireEvent.change(screen.getByRole('combobox', { name: /^Level 3 spell 1/ }), { target: { value: 'shield' } })
    expect(answer()).toMatchObject({ picks: { '3:known': [{ spellName: 'Shield' }, null] } })
  })

  it('asks Circle of the Land which land, and stores its name', () => {
    const { answer } = step('druid', caster('Druid'), 'druid-circle-of-the-land', LAND, 3)
    expect(optionsOf('Circle of the Land: choose one')).toEqual(['Arid Land', 'Polar Land'])
    fireEvent.change(screen.getByRole('combobox', { name: 'Circle of the Land: choose one' }), { target: { value: 'Polar Land' } })
    expect(answer()).toEqual({ type: 'additional_spells', block: 'Polar Land', picks: {} })
  })
})
