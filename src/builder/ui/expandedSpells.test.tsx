import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { Caster } from '../../choices'
import { blankDraft } from '../../choices/model/draft'
import type { SpellRow } from '../../compendium/model/spells'
import { SpellsStep } from './SpellsStep'

vi.mock('../../choices/ui/Previews', () => ({
  SpellPreview: () => null,
  FeatPreview: () => null,
  ItemPreview: () => null,
  TraitsPreview: () => null,
  ReadButton: () => null,
}))

// MYDND-285: a 2014 patron's expanded spells are offered beside the Warlock's
// own. Which spells an `expanded` list names is derive's; this pins that the
// step offers them.

const spell = (name: string, level: number, classes: string[]): SpellRow =>
  ({ id: name.toLowerCase().replace(/\s+/g, '-'), name, level, school: 'Evocation', ritual: false, classes }) as unknown as SpellRow

const SPELLS = [spell('Hex', 1, ['Warlock']), spell('Burning Hands', 1, ['Sorcerer', 'Wizard']), spell('Magic Missile', 1, ['Wizard'])]

const fiend = (names: string[]): Caster => ({
  index: 0,
  name: 'Warlock',
  list: 'Warlock',
  extraLists: [],
  expanded: { names, filters: [] },
  caps: { cantripCap: 2, spellsCap: 2, isSpellbook: false, spellbookCap: 0 } as unknown as Caster['caps'],
  maxRank: 1,
})

const step = (caster: Caster) =>
  render(
    <SpellsStep
      draft={blankDraft()}
      setDraft={() => {}}
      casters={[caster]}
      spellsFor={l => SPELLS.filter(s => s.classes.includes(l))}
      spells={SPELLS}
    />,
  )

describe('SpellsStep and an expanded list', () => {
  it('offers the spells it names, and not the rest of their lists', () => {
    step(fiend(['burning hands']))
    expect(screen.getByText('Hex')).toBeTruthy()
    expect(screen.getByText('Burning Hands')).toBeTruthy()
    expect(screen.queryByText('Magic Missile')).toBeNull()
  })

  it('offers nothing extra with no expanded list', () => {
    step(fiend([]))
    expect(screen.queryByText('Burning Hands')).toBeNull()
  })
})
