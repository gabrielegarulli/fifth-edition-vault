import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { SpellRow } from '../../compendium/model/spells'
import { OriginFeatChoices } from '../../choices/ui/OriginFeatChoices'

// The previews read a note through the compendium (`useCompendium`); what is offered is the point here.
vi.mock('../../choices/ui/Previews', () => ({ SpellPreview: () => null }))

/**
 * A general feat's own questions, asked where the feat is taken (MYDND-182).
 * The rules are `@vault/derive/originFeatChoices.js`'s; this pins that the
 * picker offers what they allow and writes the shape they read.
 */

const spell = (name: string, level: number, school: string, ritual = false, classes = ['Wizard']): SpellRow =>
  ({ id: name.toLowerCase().replace(/\s+/g, '-'), name, level, school, ritual, classes }) as unknown as SpellRow

const SPELLS = [
  spell('Command', 1, 'Enchantment', false, ['Cleric']),
  spell('Detect Magic', 1, 'Divination', true),
  spell('Magic Missile', 1, 'Evocation'),
  spell('Alarm', 1, 'Abjuration', true),
  spell('Suggestion', 2, 'Enchantment'),
  spell('Guidance', 0, 'Divination', false, ['Cleric']),
  spell('Sacred Flame', 0, 'Evocation', false, ['Cleric']),
]

const optionsOf = (label: string) =>
  within(screen.getByRole('combobox', { name: label }))
    .getAllByRole('option')
    .map(o => o.textContent)
    .filter(t => t !== '—')

describe('the feats an Ability Score Improvement can take', () => {
  it("offers Fey Touched only level 1 Divination and Enchantment spells, from any list", () => {
    const onChange = vi.fn()
    render(
      <OriginFeatChoices
        feat={{ id: 'fey-touched', name: 'Fey Touched', source: null, choices: null }}
        spellsFor={() => []}
        spells={SPELLS}
        onChange={onChange}
      />,
    )
    expect(optionsOf('Divination or Enchantment spell 1')).toEqual(['Command', 'Detect Magic'])
    expect(screen.getByText(/Always prepared as well: Misty Step/)).toBeTruthy()
    fireEvent.change(screen.getByRole('combobox', { name: 'Divination or Enchantment spell 1' }), { target: { value: 'command' } })
    expect(onChange).toHaveBeenLastCalledWith({ spells: [{ spellId: 'command', spellName: 'Command' }] })
  })

  it('asks Ritual Caster for as many rituals as the Proficiency Bonus', () => {
    render(
      <OriginFeatChoices
        feat={{ id: 'ritual-caster', name: 'Ritual Caster', source: null, choices: null }}
        spellsFor={() => []}
        spells={SPELLS}
        context={{ proficiencyBonus: 3 }}
        onChange={() => {}}
      />,
    )
    expect(screen.getAllByRole('combobox')).toHaveLength(3)
    expect(optionsOf('Ritual spell 1')).toEqual(['Detect Magic', 'Alarm'])
  })

  it("asks Elemental Adept for one of its five damage types", () => {
    const onChange = vi.fn()
    render(
      <OriginFeatChoices
        feat={{ id: 'elemental-adept', name: 'Elemental Adept', source: null, choices: null }}
        spellsFor={() => []}
        onChange={onChange}
      />,
    )
    expect(optionsOf('Damage type')).toEqual(['Acid', 'Cold', 'Fire', 'Lightning', 'Thunder'])
    fireEvent.change(screen.getByRole('combobox', { name: 'Damage type' }), { target: { value: 'fire' } })
    expect(onChange).toHaveBeenLastCalledWith({ damageType: 'fire' })
  })

  it("offers Keen Mind its five skills only", () => {
    render(
      <OriginFeatChoices
        feat={{ id: 'keen-mind', name: 'Keen Mind', source: null, choices: null }}
        spellsFor={() => []}
        onChange={() => {}}
      />,
    )
    expect(optionsOf('Lore Knowledge')).toEqual(['Arcana', 'History', 'Investigation', 'Nature', 'Religion'])
  })

  it("asks Blessed Warrior for two Cleric cantrips, and not for a list or an ability", () => {
    const onChange = vi.fn()
    render(
      <OriginFeatChoices
        feat={{ id: 'blessed-warrior', name: 'Blessed Warrior', source: null, choices: null }}
        spellsFor={list => SPELLS.filter(s => s.classes.includes(list))}
        onChange={onChange}
      />,
    )
    expect(screen.queryByRole('combobox', { name: 'Spell list' })).toBeNull()
    expect(screen.queryByRole('combobox', { name: 'Spellcasting ability' })).toBeNull()
    expect(optionsOf('Cantrip 1')).toEqual(['Guidance', 'Sacred Flame'])
    fireEvent.change(screen.getByRole('combobox', { name: 'Cantrip 1' }), { target: { value: 'guidance' } })
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ spellList: 'Cleric', ability: 'cha', cantrips: [{ spellId: 'guidance', spellName: 'Guidance' }, null] }),
    )
  })
})
