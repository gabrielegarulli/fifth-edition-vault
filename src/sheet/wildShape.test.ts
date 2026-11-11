import { describe, expect, it } from 'vitest'

import type { MonsterRow } from '../content/monsters'
import type { Sheet } from '../ddb/sheet'
import { beastForms, druidLevel, formFromStatblock } from './wildShape'

const m = (id: string, cr: number | null, creatureType: string): MonsterRow =>
  ({ id, name: id, cr, creatureType, path: `bestiary/${id}.md` }) as MonsterRow

describe('Wild Shape on the sheet (MYDND-51)', () => {
  it('reads the leading AC and walking speed off a statblock fence', () => {
    expect(
      formFromStatblock(
        { id: 'wolf', name: 'Wolf', cr: 0.25 },
        { ac: '13 (natural armor)', speed: '40 ft., climb 30 ft.' },
      ),
    ).toEqual({
      id: 'wolf',
      name: 'Wolf',
      cr: 0.25,
      ac: 13,
      walkSpeed: 40,
    })
    expect(formFromStatblock({ id: 'x', name: 'X', cr: null }, null)).toMatchObject({ ac: null, walkSpeed: null })
  })

  it('offers beasts at or under the cap, weakest first', () => {
    const rows = [
      m('wolf', 0.25, 'Beast'),
      m('brown-bear', 1, 'beast'),
      m('cat', 0, 'Beast'),
      m('goblin', 0.25, 'Humanoid'),
    ]
    expect(beastForms(rows, 0.25).map(r => r.id)).toEqual(['cat', 'wolf'])
    expect(beastForms(rows, null)).toEqual([])
  })

  it('takes the Druid level from the hit-die lines', () => {
    const sheet = {
      hit_dice: [
        { label: 'Druid', formula: '4d8' },
        { label: 'Fighter', formula: '1d10' },
      ],
    } as Sheet
    expect(druidLevel(sheet)).toBe(4)
    expect(druidLevel({ hit_dice: [] } as unknown as Sheet)).toBe(0)
  })
})
