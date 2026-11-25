import { describe, expect, it } from 'vitest'

import type { DdbPayload } from '../../characterModel'
import type { ConversionPlan } from '../../choices'
import type { ConversionCatalog } from '../../choices'
import { notesToCreate, type NoteOutcome, withCreatedNotes } from './missing'

/**
 * What a conversion offers to create (MYDND-257): only what a builder can
 * write, once each, with what D&D Beyond plainly says of it and never prose.
 */

const match = (ddbName: string, chosen: unknown = null) => ({ ddbName, chosen, how: chosen ? 'exact' : null })

const plan = {
  feats: [match('Lucky Streak'), match('Alert', { id: 'alert' }), match('Lucky Streak')],
  spells: [{ ...match('Witch Bolt'), ddbLevel: 1 }, { ...match('Fire Bolt', { id: 'fire-bolt' }), ddbLevel: 0 }],
  items: [
    { ddbName: 'Rope of Climbing', magic: true, item: null, magicItem: null },
    { ddbName: 'Fancy Hat', magic: false, item: null, magicItem: null },
    { ddbName: 'Rope', magic: false, item: { id: 'rope' }, magicItem: null },
  ],
} as unknown as ConversionPlan

const payload: DdbPayload = {
  name: 'Gibbs',
  classSpells: [{ spells: [{ definition: { name: 'Witch Bolt', level: 1, school: 'Evocation' } }] }],
  inventory: [
    { definition: { name: 'Rope of Climbing', magic: true, rarity: 'Uncommon', canAttune: false, weight: 3, cost: null } },
    { definition: { name: 'Fancy Hat', weight: 0, cost: 5 } },
  ],
}

describe('notesToCreate', () => {
  it('lists each unmatched feat, spell and item once, prefilled', () => {
    expect(notesToCreate(plan, payload)).toEqual([
      { kind: 'feat', name: 'Lucky Streak', prefill: { name: 'Lucky Streak' } },
      { kind: 'spell', name: 'Witch Bolt', prefill: { name: 'Witch Bolt', level: '1', school: 'Evocation' } },
      { kind: 'magic-item', name: 'Rope of Climbing', prefill: { name: 'Rope of Climbing', weight: '3', rarity: 'uncommon' } },
      { kind: 'item', name: 'Fancy Hat', prefill: { name: 'Fancy Hat', costGp: '5' } },
    ])
  })

  it('lists nothing when everything matched', () => {
    const matched = { feats: [], spells: [], items: [] } as unknown as ConversionPlan
    expect(notesToCreate(matched, payload)).toEqual([])
  })
})

/**
 * The save matches what it just created (MYDND-273): every unmatched entry
 * named by an outcome, and nothing the GM picked.
 */
describe('withCreatedNotes', () => {
  const row = (id: string, name: string) => ({ id, name, path: `Homebrew/Imported from D&D Beyond/${id}.md` })
  const catalog = {
    feats: [],
    spells: [],
    items: [{ id: 'hat', name: 'Hat', path: 'items/hat.md' }],
    magicItems: [],
  } as unknown as ConversionCatalog
  const outcomes = [
    { kind: 'feat', name: 'Lucky Streak', outcome: 'created', path: 'x', row: row('lucky-streak', 'Lucky Streak') },
    { kind: 'spell', name: 'witch bolt', outcome: 'created', path: 'x', row: row('witch-bolt', 'Witch Bolt') },
    { kind: 'magic-item', name: 'Rope of Climbing', outcome: 'refused', reason: 'no' },
    { kind: 'item', name: 'Fancy Hat', outcome: 'matched', row: { id: 'hat', name: 'Hat', path: 'items/hat.md' } },
  ] as unknown as NoteOutcome[]

  it('matches each created or already-there note, and leaves a refused one unmatched', () => {
    const out = withCreatedNotes(plan, outcomes, catalog)
    expect(out.feats.map(f => (f.chosen as { id: string } | null)?.id ?? null)).toEqual(['lucky-streak', 'alert', 'lucky-streak'])
    expect(out.feats[0].how).toBe('exact')
    expect(out.spells.map(s => (s.chosen as { id: string } | null)?.id ?? null)).toEqual(['witch-bolt', 'fire-bolt'])
    expect(out.items.map(i => i.magicItem?.id ?? i.item?.id ?? null)).toEqual([null, 'hat', 'rope'])
  })

  it('keeps a pick the GM made over a note of the same name', () => {
    const picked = { ...plan, feats: [match('Lucky Streak', { id: 'gm-pick' })] } as unknown as ConversionPlan
    expect((withCreatedNotes(picked, outcomes, catalog).feats[0].chosen as { id: string }).id).toBe('gm-pick')
  })
})
