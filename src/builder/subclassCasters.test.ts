import { describe, expect, it } from 'vitest'

import { withFeatureChoice } from '@vault/derive/builderDraft.js'

import type { ClassFence, ClassRow, SubclassFence } from '../content/classes'
import { casterCaps } from '../spells/characterSpells'
import { casterEntries, type BakeCatalogs } from '../vaultCharacter'
import type { VaultCharacterJson } from '../vaultCharacter/fence'
import { bonusCantrips, casters, featureRows, spellListAccess } from './choices'
import { blankDraft, toVaultJson, withClass, withLevel, withSubclass, type BuilderDraft } from './draft'

/**
 * A subclass that casts, and extra cantrips from a picked option (MYDND-182).
 *
 * The Eldritch Knight's fence is trimmed from `subclasses/fighter-eldritch-knight.md`
 * as the exporter writes it since MYDND-182 — 5e.tools' caster keys under
 * `data`, and no `classTableGroups`. The Fighter's own fence says nothing about
 * casting, which is the whole bug: every reader looked only there.
 */

const row = (id: string, name: string): ClassRow => ({
  id,
  name,
  source: 'XPHB',
  path: `classes/${id}.md`,
  hitDie: null,
  primaryAbility: null,
  savingThrows: [],
  spellcastingAbility: null,
  edition: '5.5e',
  tags: [],
  aliases: [],
})

const FIGHTER: ClassFence = {
  name: 'Fighter',
  source: 'XPHB',
  hit_die: 10,
  data: { subclassTitle: 'Fighter Subclass' },
  features: [{ name: 'Fighter Subclass', level: 3 }],
}

const ELDRITCH_KNIGHT: SubclassFence = {
  name: 'Eldritch Knight',
  class_name: 'Fighter',
  class_source: 'XPHB',
  source: 'XPHB',
  data: {
    additionalSpells: [{ expanded: { 3: [{ all: 'level=0|class=Wizard' }, { all: 'level=1|class=Wizard' }] } }],
    casterProgression: '1/3',
    spellcastingAbility: 'int',
    spellList: 'Wizard',
    cantripProgression: [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    preparedSpellsProgression: [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13],
  },
  features: [{ name: 'Eldritch Knight', level: 3 }],
}

const CHAMPION: SubclassFence = { ...ELDRITCH_KNIGHT, name: 'Champion', data: {}, features: [] }

const fighterSource = { row: row('fighter', 'Fighter'), fence: FIGHTER }

function fighter(level: number, sub: { id: string; name: string } | null): BuilderDraft {
  const d = withLevel(withClass(blankDraft(), fighterSource, 0), level, FIGHTER, 0)
  return sub ? withSubclass(d, sub, 0) : d
}

describe('an Eldritch Knight in the builder', () => {
  const ek = { id: 'fighter-eldritch-knight', name: 'Eldritch Knight' }

  it('is a caster through its subclass, learning from the Wizard list', () => {
    const [c] = casters(fighter(3, ek), [fighterSource], [ELDRITCH_KNIGHT])
    expect(c).toMatchObject({ index: 0, name: 'Eldritch Knight', list: 'Wizard', maxRank: 1 })
    expect(c.caps).toMatchObject({ cantripCap: 2, spellsCap: 3 })
  })

  it('reaches second-level spells at 7 and a third cantrip at 10, by the third-caster table', () => {
    expect(casters(fighter(7, ek), [fighterSource], [ELDRITCH_KNIGHT])[0].maxRank).toBe(2)
    expect(casters(fighter(10, ek), [fighterSource], [ELDRITCH_KNIGHT])[0].caps.cantripCap).toBe(3)
  })

  // Found by the sweep: saved, the draft carries Intelligence, and the Fighter's
  // own (spell-less) table was read instead of the subclass's.
  it('stays a subclass caster once re-opened with its Intelligence saved', () => {
    const saved = fighter(10, ek)
    const reopened = { ...saved, classes: saved.classes.map(c => ({ ...c, spellcastingAbility: 'int' })) }
    const [c] = casters(reopened, [fighterSource], [ELDRITCH_KNIGHT])
    expect(c).toMatchObject({ name: 'Eldritch Knight', list: 'Wizard' })
    expect(c.caps.cantripCap).toBe(3)
  })

  it('is no caster without the subclass, or with one that does not cast', () => {
    expect(casters(fighter(3, null), [fighterSource], [null])).toEqual([])
    expect(casters(fighter(3, { id: 'fighter-champion', name: 'Champion' }), [fighterSource], [CHAMPION])).toEqual([])
  })

  it('is saved with Intelligence, so every reader of the json counts it as a caster', () => {
    const json = toVaultJson(fighter(3, ek), { classSources: [fighterSource], subclassFences: [ELDRITCH_KNIGHT], race: null })
    expect(json.classes?.[0]?.spellcastingAbility).toBe('int')
    const none = toVaultJson(fighter(3, ek), { classSources: [fighterSource], race: null })
    expect(none.classes?.[0]?.spellcastingAbility ?? null).toBeNull()
  })
})

describe('an Eldritch Knight on the sheet', () => {
  const json = {
    name: 'Brammand',
    classes: [
      { id: 'fighter', name: 'Fighter', level: 7, subclass: { id: 'fighter-eldritch-knight', name: 'Eldritch Knight' }, spellcastingAbility: 'int' },
    ],
  } as unknown as VaultCharacterJson

  it("reads its caps from the subclass's note", () => {
    const [caps] = casterCaps(json, new Map([['fighter', FIGHTER]]), new Map([['fighter-eldritch-knight', ELDRITCH_KNIGHT]]))
    expect(caps).toMatchObject({ cantripCap: 2, spellsCap: 5 })
    // Without the subclass's note it is the Fighter's table: nothing to count.
    expect(casterCaps(json, new Map([['fighter', FIGHTER]]))[0].cantripCap).toBe(Infinity)
  })

  it("takes its slot progression from the subclass's note", async () => {
    const catalogs = {
      classes: { detail: async (id: string) => (id === 'fighter' ? { fence: FIGHTER } : null) },
      subclasses: { detail: async (id: string) => (id === 'fighter-eldritch-knight' ? { fence: ELDRITCH_KNIGHT } : null) },
    } as unknown as BakeCatalogs
    expect(await casterEntries(json, catalogs)).toEqual([{ name: 'Fighter', level: 7, progression: '1/3' }])
  })
})

describe('extra cantrips from a picked option', () => {
  const CLERIC: ClassFence = {
    name: 'Cleric',
    source: 'XPHB',
    hit_die: 8,
    spellcasting_ability: 'wis',
    data: { classTableGroups: [{ colLabels: ['Cantrips', 'Prepared Spells'], rows: [[3, 4]] }] },
    features: [
      { name: 'Divine Order', level: 1, choices: { type: 'feature_option' } },
      { name: 'Protector', level: 1, data: { optionOf: 'Divine Order' } },
      { name: 'Thaumaturge', level: 1, data: { optionOf: 'Divine Order', effects: [{ type: 'bonus_cantrips', amount: 1 }] } },
    ],
  }
  const source = { row: row('cleric', 'Cleric'), fence: CLERIC }
  const rows = featureRows('cleric', CLERIC.features)
  const order = (name: string) => {
    const option = rows.find(r => r.name === name)!
    const d = withLevel(withClass(blankDraft(), source, 0), 1, CLERIC, 0)
    return withFeatureChoice(d, rows[0].id, { type: 'feature_option', optionId: option.id, optionName: name }) as unknown as BuilderDraft
  }

  it("counts Thaumaturge's cantrip in the Spells step's cap, and Protector's nothing", () => {
    expect(bonusCantrips(order('Thaumaturge'), source)).toBe(1)
    expect(casters(order('Thaumaturge'), [source])[0].caps.cantripCap).toBe(4)
    expect(bonusCantrips(order('Protector'), source)).toBe(0)
    expect(casters(order('Protector'), [source])[0].caps.cantripCap).toBe(3)
  })
})

describe("Magical Secrets' extra lists", () => {
  const BARD: ClassFence = {
    name: 'Bard',
    source: 'XPHB',
    hit_die: 8,
    spellcasting_ability: 'cha',
    data: {},
    features: [
      { name: 'Spellcasting', level: 1 },
      { name: 'Magical Secrets', level: 10, data: { effects: [{ type: 'spell_list_access', classes: ['Cleric', 'Druid', 'Wizard'] }] } },
    ],
  }
  const source = { row: row('bard', 'Bard'), fence: BARD }

  it('opens the Cleric, Druid and Wizard lists from Bard 10, and none before', () => {
    expect(spellListAccess(source, null, 9)).toEqual([])
    expect(spellListAccess(source, null, 10)).toEqual(['Cleric', 'Druid', 'Wizard'])
    const d = withLevel(withClass(blankDraft(), source, 0), 10, BARD, 0)
    expect(casters(d, [source])[0]).toMatchObject({ list: 'Bard', extraLists: ['Cleric', 'Druid', 'Wizard'] })
  })
})
