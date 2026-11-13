import { describe, expect, it } from 'vitest'

import type { ClassRow, SubclassRow } from '../../../compendium/model/classes'
import type { FeatRow } from '../../../compendium/model/feats'
import type { SpeciesRow } from '../../../compendium/model/lineage'
import type { Sheet } from './sheet'
import { featureSources, picksAt } from './features'

const cls = (id: string, name: string, edition: string): ClassRow =>
  ({
    id,
    name,
    edition,
    path: `classes/${id}.md`,
    source: null,
    hitDie: null,
    primaryAbility: null,
    savingThrows: [],
  spellcastingAbility: null,
    tags: [],
    aliases: [],
  }) as ClassRow
const sub = (id: string, name: string, className: string): SubclassRow =>
  ({
    id,
    name,
    className,
    edition: '5.5e',
    path: `subclasses/${id}.md`,
    source: null,
    subclassTitle: null,
    tags: [],
    aliases: [],
  }) as SubclassRow

const sheet = (over: Partial<Sheet>): Sheet =>
  ({
    name: 'X',
    ddb_id: '1',
    level: 13,
    race: null,
    hit_dice: [
      { label: 'Bard', formula: '10d8' },
      { label: 'Warlock', formula: '3d8' },
    ],
    subclasses: [],
    feats: [],
    ...over,
  }) as Sheet

const none = { byName: () => undefined as FeatRow | undefined }

describe('featureSources (MYDND-50)', () => {
  it('takes the 2024 printing of a class, at the level the hit-die line says', () => {
    const out = featureSources(sheet({}), {
      classes: [cls('bard-2014', 'Bard', '5.0e'), cls('bard', 'Bard', '5.5e'), cls('warlock', 'Warlock', '5.5e')],
      subclasses: [],
      species: [],
      feats: none,
    })
    expect(out.classes).toEqual([
      { kind: 'class', id: 'bard', name: 'Bard', level: 10 },
      { kind: 'class', id: 'warlock', name: 'Warlock', level: 3 },
    ])
  })

  it("gives a subclass its own class's level, picking the right parent where two share a name", () => {
    const out = featureSources(sheet({ subclasses: ['Lore'] }), {
      classes: [cls('bard', 'Bard', '5.5e'), cls('warlock', 'Warlock', '5.5e')],
      subclasses: [sub('lore-of-something', 'Lore', 'Druid'), sub('college-of-lore', 'Lore', 'Bard')],
      species: [],
      feats: none,
    })
    expect(out.classes.find(c => c.kind === 'subclass')).toEqual({
      kind: 'subclass',
      id: 'college-of-lore',
      name: 'Lore',
      level: 10,
    })
  })

  it('reports a name no note answers, and lists a feat once though named twice', () => {
    const alert = { id: 'alert', name: 'Alert', path: 'feats/alert.md' } as FeatRow
    const out = featureSources(
      sheet({ race: 'Goblin', feats: ['Alert'] }),
      {
        classes: [],
        subclasses: [],
        species: [{ id: 'elf', name: 'Elf', edition: '5.5e' } as SpeciesRow],
        feats: { byName: n => (n === 'Alert' ? alert : undefined) },
      },
      ['Alert', 'Tough'],
    )
    expect(out.feats).toEqual([alert])
    expect(out.missing).toEqual(['Bard', 'Warlock', 'Goblin', 'Tough'])
  })
})

describe('picksAt (MYDND-53)', () => {
  const sheet = {
    feature_picks: [
      { class: 'Bard', feature: 'Magical Discoveries', level: 6, picks: ['Haste', 'Misty Step'] },
      { class: 'Bard', feature: 'Ability Score Improvement', level: 4, picks: ['Inspiring Leader (Charisma)'] },
      { class: 'Bard', feature: 'Ability Score Improvement', level: 8, picks: ['Ability Score Improvement (Charisma ×2)'] },
    ],
  } as unknown as Sheet

  it('finds a feature by class, name and level', () => {
    expect(picksAt(sheet, 'bard', 'Magical Discoveries', 6)).toEqual(['Haste', 'Misty Step'])
    expect(picksAt(sheet, 'Bard', 'Ability Score Improvement', 8)).toEqual(['Ability Score Improvement (Charisma ×2)'])
  })

  it('falls back to the name when the note files the feature at another level, but only if one matches', () => {
    expect(picksAt(sheet, 'Bard', 'Magical Discoveries', 7)).toEqual(['Haste', 'Misty Step'])
    // Two Ability Score Improvements: a level that matches neither picks neither.
    expect(picksAt(sheet, 'Bard', 'Ability Score Improvement', 12)).toEqual([])
  })

  it("is empty for another class's feature, and for a sheet imported before the field", () => {
    expect(picksAt(sheet, 'Wizard', 'Magical Discoveries', 6)).toEqual([])
    expect(picksAt({} as Sheet, 'Bard', 'Magical Discoveries', 6)).toEqual([])
  })
})
