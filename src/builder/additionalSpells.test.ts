import { describe, expect, it } from 'vitest'

import { withFeatureChoice } from '@vault/derive/builderDraft.js'

import type { ClassFence, ClassRow, SubclassFence } from '../content/classes'
import type { SpellRow } from '../content/spells'
import { levelItemsDue } from '../levelUp/levelUp'
import { buildVaultSheet, type BakeCatalogs } from '../vaultCharacter'
import { additionalSpellsKey } from '../vaultCharacter/additionalSpells'
import { bakeVaultCharacter } from '../vaultCharacter/bake'
import { choicePicks, itemComplete, levelItems, type ClassContext, type LevelItem } from './choices'
import { blankDraft, toVaultJson, withClass, withLevel, withSubclass, type BuilderDraft } from './draft'

/**
 * Spells outside the caps (MYDND-183): what `additionalSpells` grants and asks.
 *
 * The fences are trimmed from the exported notes — `subclasses/bard-college-of-lore.md`,
 * `wizard-abjurer.md`, `rogue-arcane-trickster.md`, `cleric-life-domain.md` and
 * `druid-circle-of-the-land.md` — keeping their `additionalSpells` as 5e.tools
 * writes them. The rules are derive's (`additionalSpells.js`); this pins the
 * plugin's half: the question, its answer's key, the bake and the sheet.
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

const caster = (name: string, ability: string, data: Record<string, unknown> = {}): ClassFence => ({
  name,
  source: 'XPHB',
  hit_die: 8,
  spellcasting_ability: ability,
  data: { casterProgression: 'full', ...data },
  features: [{ name: `${name} Subclass`, level: 3 }],
})

const subclass = (name: string, className: string, data: Record<string, unknown>, features: SubclassFence['features']): SubclassFence => ({
  name,
  class_name: className,
  class_source: 'XPHB',
  source: 'XPHB',
  data,
  features,
})

const BARD = caster('Bard', 'cha')
const WIZARD = caster('Wizard', 'int', { spellbook: { initial: 6, perLevel: 2 } })
const CLERIC = caster('Cleric', 'wis')
const DRUID = caster('Druid', 'wis')
const ROGUE: ClassFence = { name: 'Rogue', source: 'XPHB', hit_die: 8, data: {}, features: [{ name: 'Rogue Subclass', level: 3 }] }

const LORE = subclass(
  'College of Lore',
  'Bard',
  {
    additionalSpells: [
      { prepared: { 6: [{ choose: 'level=0;1;2;3|class=Cleric;Druid;Wizard' }, { choose: 'level=0;1;2;3|class=Cleric;Druid;Wizard' }] } },
    ],
  },
  [
    { name: 'College of Lore', level: 3, description: 'Bards of the College of Lore collect spells and secrets.' },
    { name: 'Cutting Words', level: 3, description: 'You learn to use your wit to distract.' },
    { name: 'Magical Discoveries', level: 6, description: 'You learn two spells of your choice.' },
  ],
)

const ABJURER = subclass(
  'Abjurer',
  'Wizard',
  {
    additionalSpells: [
      {
        prepared: { 10: ['counterspell|xphb', 'dispel magic|xphb'] },
        known: {
          3: [{ choose: 'level=0;1;2|class=Wizard|school=A' }, { choose: 'level=0;1;2|class=Wizard|school=A' }],
          5: [{ choose: 'level=0;1;2;3|class=Wizard|school=A' }],
        },
      },
    ],
  },
  [
    { name: 'Abjurer', level: 3, description: 'Your study of magic is focused on spells that block.' },
    { name: 'Abjuration Savant', level: 3, description: 'Choose two Wizard spells from the Abjuration school and add them to your spellbook.' },
    { name: 'Arcane Ward', level: 3, description: 'When you cast an Abjuration spell, you create a ward.' },
  ],
)

const ARCANE_TRICKSTER = subclass(
  'Arcane Trickster',
  'Rogue',
  { additionalSpells: [{ known: { 3: ['mage hand|xphb#c'] }, expanded: { 3: [{ all: 'level=0|class=Wizard' }] } }] },
  [{ name: 'Arcane Trickster', level: 3 }],
)

const LIFE = subclass(
  'Life Domain',
  'Cleric',
  { additionalSpells: [{ prepared: { 3: ['aid|xphb', 'bless|xphb', 'cure wounds|xphb', 'lesser restoration|xphb'], 5: ['mass healing word|xphb'] } }] },
  [{ name: 'Life Domain', level: 3 }],
)

const LAND = subclass(
  'Circle of the Land',
  'Druid',
  {
    additionalSpells: [
      { name: 'Arid Land', prepared: { 3: ['blur|xphb', 'burning hands|xphb', 'fire bolt|xphb'] } },
      { name: 'Polar Land', prepared: { 3: ['fog cloud|xphb', 'hold person|xphb', 'ray of frost|xphb'] } },
    ],
  },
  [
    { name: 'Circle of the Land', level: 3, description: 'The Circle of the Land comprises mystics and sages.' },
    { name: 'Circle of the Land Spells', level: 3, description: 'Whenever you finish a Long Rest, choose one type of land. You have the spells listed for it prepared.' },
  ],
)

const SOURCES = { bard: BARD, wizard: WIZARD, cleric: CLERIC, druid: DRUID, rogue: ROGUE } as const
const SUBCLASSES: Record<string, { cls: keyof typeof SOURCES; fence: SubclassFence }> = {
  'bard-college-of-lore': { cls: 'bard', fence: LORE },
  'wizard-abjurer': { cls: 'wizard', fence: ABJURER },
  'rogue-arcane-trickster': { cls: 'rogue', fence: ARCANE_TRICKSTER },
  'cleric-life-domain': { cls: 'cleric', fence: LIFE },
  'druid-circle-of-the-land': { cls: 'druid', fence: LAND },
}

const source = (id: keyof typeof SOURCES) => ({ row: row(id, SOURCES[id].name), fence: SOURCES[id] })

function built(subclassId: string, level: number): { draft: BuilderDraft; ctx: ClassContext[] } {
  const { cls, fence } = SUBCLASSES[subclassId]
  const d = withSubclass(withLevel(withClass(blankDraft(), source(cls), 0), level, SOURCES[cls], 0), { id: subclassId, name: fence.name }, 0)
  return { draft: d, ctx: [{ index: 0, source: source(cls), subclassId, subclassFence: fence }] }
}

const asked = (subclassId: string, level: number): LevelItem | undefined => {
  const { draft, ctx } = built(subclassId, level)
  return levelItems(draft, ctx).find(i => i.kind === 'additional_spells')
}

const complete = (item: LevelItem, draft: BuilderDraft, classLevel?: number) =>
  itemComplete(item, draft, { feats: [], masteryCount: 0, invocationCount: 0, classLevel })

const pick = (spellName: string, spellLevel: number) => ({ spellId: spellName.toLowerCase().replace(/ /g, '-'), spellName, spellLevel })

const answer = (draft: BuilderDraft, subclassId: string, value: unknown) =>
  withFeatureChoice(draft, additionalSpellsKey(subclassId), value) as unknown as BuilderDraft

const SPELLS: SpellRow[] = [
  { id: 'fire-bolt', name: 'Fire Bolt', level: 0, source: 'XPHB' },
  { id: 'blur', name: 'Blur', level: 2, source: 'XPHB' },
].map(s => ({ ...s, path: `spells/${s.id}.md` }) as unknown as SpellRow)

const catalogs = {
  feats: { byId: () => null, detail: async () => null },
  species: { byId: () => null, detail: async () => null },
  classes: {
    byId: (id: string) => (id in SOURCES ? row(id, SOURCES[id as keyof typeof SOURCES].name) : null),
    detail: async (id: string) => (id in SOURCES ? { fence: SOURCES[id as keyof typeof SOURCES] } : null),
  },
  subclasses: {
    byId: (id: string) => (SUBCLASSES[id] ? { id, name: SUBCLASSES[id].fence.name } : null),
    detail: async (id: string) => (SUBCLASSES[id] ? { fence: SUBCLASSES[id].fence } : null),
  },
  spells: { list: () => SPELLS },
} as unknown as BakeCatalogs

const jsonOf = (subclassId: string, draft: BuilderDraft) =>
  toVaultJson(draft, { classSources: [source(SUBCLASSES[subclassId].cls)], subclassFences: [SUBCLASSES[subclassId].fence], race: null })

const grants = async (subclassId: string, draft: BuilderDraft) =>
  ((await bakeVaultCharacter(jsonOf(subclassId, draft), catalogs)).effects as Array<Record<string, unknown>>).filter(
    e => e.type === 'spell_grant',
  )

describe("Lore's Magical Discoveries", () => {
  it('is asked at Bard 6, under its own name, and not before', () => {
    expect(asked('bard-college-of-lore', 5)).toBeUndefined()
    const item = asked('bard-college-of-lore', 6)!
    expect(item).toMatchObject({ level: 6, isSubclass: true, feature: { id: 'bard-college-of-lore:additional-spells', name: 'Magical Discoveries' } })
  })

  it('is answered by two spells, and baked as always prepared', async () => {
    const { draft } = built('bard-college-of-lore', 6)
    const item = asked('bard-college-of-lore', 6)!
    expect(complete(item, draft)).toBe(false)
    const one = answer(draft, 'bard-college-of-lore', { type: 'additional_spells', block: null, picks: { '6:prepared': [pick('Guiding Bolt', 1), null] } })
    expect(complete(item, one)).toBe(false)
    const both = answer(draft, 'bard-college-of-lore', {
      type: 'additional_spells',
      block: null,
      picks: { '6:prepared': [pick('Guiding Bolt', 1), pick('Guidance', 0)] },
    })
    expect(complete(item, both)).toBe(true)
    expect(choicePicks(both.featureChoices[item.feature.id])).toEqual(['Guiding Bolt', 'Guidance'])
    expect((await grants('bard-college-of-lore', both)).map(e => [e.spell, e.mode, e.source])).toEqual([
      ['Guiding Bolt', 'prepared', 'College of Lore'],
      ['Guidance', 'cantrip', 'College of Lore'],
    ])
  })
})

describe("a 2024 Savant's free spellbook spells", () => {
  it('asks two at 3 under Abjuration Savant, then re-asks at 5', () => {
    const item = asked('wizard-abjurer', 3)!
    expect(item.feature.name).toBe('Abjuration Savant')
    expect(item.level).toBe(3)
    expect(asked('wizard-abjurer', 5)!.level).toBe(5)
  })

  it('is due on the level up that brings a pick', () => {
    const before = built('wizard-abjurer', 4)
    const after = built('wizard-abjurer', 5)
    const at3 = answer(before.draft, 'wizard-abjurer', {
      type: 'additional_spells',
      block: null,
      picks: { '3:known': [pick('Shield', 1), pick('Alarm', 1)] },
    })
    const levelled = { ...after.draft, featureChoices: at3.featureChoices }
    expect(complete(asked('wizard-abjurer', 4)!, at3)).toBe(true)
    expect(levelItemsDue(at3, levelled, after.ctx, 0, []).map(i => i.kind)).toContain('additional_spells')
  })

  it('writes the picks into the book, not always prepared', async () => {
    const { draft } = built('wizard-abjurer', 3)
    const d = answer(draft, 'wizard-abjurer', { type: 'additional_spells', block: null, picks: { '3:known': [pick('Shield', 1), pick('Alarm', 1)] } })
    expect((await grants('wizard-abjurer', d)).map(e => [e.spell, e.mode])).toEqual([
      ['Shield', 'spellbook'],
      ['Alarm', 'spellbook'],
    ])
  })

  it('grants Spell Breaker\'s two at 10 outright', async () => {
    const { draft } = built('wizard-abjurer', 10)
    const fixed = (await grants('wizard-abjurer', draft)).filter(e => e.mode === 'prepared').map(e => e.spell)
    expect(fixed).toEqual(['Counterspell', 'Dispel Magic'])
  })
})

describe('fixed grants', () => {
  it("gives the Arcane Trickster Mage Hand at 3, asking nothing", async () => {
    expect(asked('rogue-arcane-trickster', 3)).toBeUndefined()
    const { draft } = built('rogue-arcane-trickster', 3)
    expect(await grants('rogue-arcane-trickster', draft)).toEqual([
      expect.objectContaining({ spell: 'Mage Hand', mode: 'cantrip', source: 'Arcane Trickster' }),
    ])
  })

  it("gives a Life Cleric its domain spells by level, onto the sheet", async () => {
    expect(asked('cleric-life-domain', 5)).toBeUndefined()
    const { draft } = built('cleric-life-domain', 5)
    const { sheet } = await buildVaultSheet(jsonOf('cleric-life-domain', draft), catalogs, 'local:life')
    expect(sheet.granted_spells?.filter(g => g.source === 'Life Domain').map(g => g.name)).toEqual([
      'Aid',
      'Bless',
      'Cure Wounds',
      'Lesser Restoration',
      'Mass Healing Word',
    ])
  })
})

describe("Circle of the Land's land", () => {
  it('asks which land, and grants nothing until it is answered', async () => {
    const item = asked('druid-circle-of-the-land', 3)!
    expect(item.feature.name).toBe('Circle of the Land Spells')
    const { draft } = built('druid-circle-of-the-land', 3)
    expect(complete(item, draft)).toBe(false)
    expect(await grants('druid-circle-of-the-land', draft)).toEqual([])

    const arid = answer(draft, 'druid-circle-of-the-land', { type: 'additional_spells', block: 'Arid Land', picks: {} })
    expect(complete(item, arid)).toBe(true)
    expect(choicePicks(arid.featureChoices[item.feature.id])).toEqual(['Arid Land'])
    // Fire Bolt is written `fire bolt|xphb`: only its note says it is a cantrip.
    expect((await grants('druid-circle-of-the-land', arid)).map(e => [e.spell, e.mode])).toEqual([
      ['Blur', 'prepared'],
      ['Burning Hands', 'prepared'],
      ['Fire Bolt', 'cantrip'],
    ])
  })
})
