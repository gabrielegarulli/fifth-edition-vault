import { describe, expect, it } from 'vitest'

import type { ClassFence } from '../../../compendium/model/classes'
import type { Sheet } from '../sheet/sheet'
import { emptyVitals, longRest, parseVitals, refundSlot, serialiseVitals, shortRest, spendSlot, spendUse } from '../vitals'
import { stringify } from 'yaml'
import type { VaultCharacterJson } from '../vaultCharacter/fence'
import { addSpell, casterCaps, characterSpells, removeSpell, setSpellPrepared } from './characterSpells'
import { classesOfSheet, pactOnlyRanksFor, shortRestPlan, slotMapFor, slotTable } from './slots'

/**
 * The spell system's rules (MYDND-36). The slot tables are `@vault/derive`'s and
 * tested there; what is tested here is which input each kind of character hands
 * them, and what the two writes — the json and the vitals fence — record.
 */

const sheet = (over: Partial<Sheet>): Sheet => ({
  version: 1,
  name: 'Test',
  ddb_id: '123',
  race: null,
  classes: '—',
  level: 1,
  proficiency_bonus: 2,
  ac: 10,
  hp: { current: 10, max: 10, temp: 0 },
  speed: 30,
  initiative: 0,
  hit_dice: [],
  abilities: [],
  saves: [],
  skills: [],
  passives: { perception: 10, insight: 10, investigation: 10 },
  spellcasting: null,
  attacks: [],
  feature_dice: [],
  spells: [],
  avatar: null,
  subclasses: [],
  ...over,
})

describe('slot maxima', () => {
  it('reads a single class off its own table', () => {
    expect(slotMapFor([{ name: 'Wizard', level: 5, progression: '1' }])).toEqual({ '1': 4, '2': 3, '3': 2 })
  })

  it('puts a pact caster on one rank', () => {
    expect(slotMapFor([{ name: 'Warlock', level: 5, progression: 'pact' }])).toEqual({ '3': 2 })
  })

  // The case a homebrew class is: a name no map knows, a progression its note
  // states. `combinedSlotMax` by name would give it nothing.
  it('trusts the progression, not the name', () => {
    expect(slotMapFor([{ name: 'Alchemist', level: 3, progression: '1/2' }])).toEqual({ '1': 3 })
  })

  it('refills on a short rest only when pact magic is the only source', () => {
    expect(pactOnlyRanksFor([{ name: 'Warlock', level: 5, progression: 'pact' }])).toEqual([3])
    expect(
      pactOnlyRanksFor([
        { name: 'Warlock', level: 5, progression: 'pact' },
        { name: 'Wizard', level: 1, progression: '1' },
      ]),
    ).toEqual([])
    expect(pactOnlyRanksFor([{ name: 'Wizard', level: 5, progression: '1' }])).toEqual([])
  })
})

describe('slotTable', () => {
  const wizard = { hit_dice: [{ label: 'Wizard', formula: '5d6' }] }

  it('reads the fence when it states slots, numbers or strings as keys', () => {
    const table = slotTable(sheet({ spell_slots: { 1: 4, '2': 3 } as unknown as Record<string, number> }))
    expect(table?.from).toBe('sheet')
    expect(table?.max.slice(0, 3)).toEqual([4, 3, 0])
  })

  it('reads `{}` as "no slots", not as "not projected"', () => {
    expect(slotTable(sheet({ ...wizard, spell_slots: {} }))?.max.every(n => n === 0)).toBe(true)
  })

  // A D&D Beyond note from before MYDND-36: the answer its next re-sync would
  // write, worked out from the hit dice, because both state class and level.
  it('works a D&D Beyond sheet out from its hit dice when the fence predates slots', () => {
    expect(classesOfSheet(sheet(wizard))).toEqual([{ name: 'Wizard', level: 5 }])
    const table = slotTable(sheet(wizard))
    expect(table?.from).toBe('classes')
    expect(table?.max.slice(0, 3)).toEqual([4, 3, 2])
  })

  // A Vault character's class may be homebrew, which the name map would answer
  // with nothing — and nothing reads as "no slots". So it asks for a rebuild.
  it('refuses to guess for a Vault character that predates slots', () => {
    expect(slotTable(sheet({ ...wizard, ddb_id: 'local:abc' }))).toBeNull()
  })
})

describe('shortRestPlan', () => {
  it('gives a D&D Beyond warlock its pact slots and a free cast its use', () => {
    const plan = shortRestPlan(
      sheet({
        hit_dice: [{ label: 'Warlock', formula: '5d8' }],
        free_cast_spells: [
          { key: 'a', label: 'Signature Spells', name: 'Fireball', id: null, level: 3, uses: 1, resets: 'short_rest' },
          { key: 'b', label: 'Mystic Arcanum', name: 'Eyebite', id: null, level: 6, uses: 1, resets: 'long_rest' },
        ],
      }),
    )
    expect(plan).toEqual({ slotRanks: [3], useKeys: ['a'], regain: {} })
  })

  // MYDND-47.
  it('restores a short-rest resource whole and hands back Rage’s one use', () => {
    const plan = shortRestPlan(
      sheet({
        short_rest_slot_ranks: [],
        class_resources: [
          { key: 'bardic_inspiration', name: 'Bardic Inspiration', uses: 5, resets: 'short_rest', roll: '1d10' },
          { key: 'rage', name: 'Rage', uses: 4, resets: 'long_rest', short_rest_regain: 1 },
          { key: 'luck_points', name: 'Luck Points', uses: 5, resets: 'long_rest' },
        ],
      }),
    )
    expect(plan).toEqual({ slotRanks: [], useKeys: ['bardic_inspiration'], regain: { rage: 1 } })

    const v = spendUse(spendUse(spendUse(emptyVitals(), 'rage', 4), 'rage', 4), 'bardic_inspiration', 5)
    expect(shortRest(v, plan).featureUsesUsed).toEqual({ rage: 1 })
    expect(shortRest(spendUse(emptyVitals(), 'rage', 4), plan).featureUsesUsed).toEqual({})
  })

  it('takes the fence at its word when it states the ranks', () => {
    expect(shortRestPlan(sheet({ short_rest_slot_ranks: [] , hit_dice: [{ label: 'Warlock', formula: '5d8' }] })).slotRanks).toEqual([])
  })
})

describe('the vitals fence', () => {
  it('spends up to the maximum and no further', () => {
    let v = emptyVitals()
    for (let i = 0; i < 4; i += 1) v = spendSlot(v, 1, 2)
    expect(v.spellSlotsUsed).toEqual({ '1': 2 })
  })

  // `3: 0` left in a note is noise somebody will hand-edit around.
  it('drops a rank from the fence when its last slot comes back', () => {
    const v = refundSlot(spendSlot(emptyVitals(), 3, 2), 3)
    expect(v.spellSlotsUsed).toEqual({})
    expect(serialiseVitals(v, 'now')).not.toHaveProperty('spell_slots_used')
  })

  it('round-trips through YAML', () => {
    const v = spendUse(spendSlot(spendSlot(emptyVitals(), 1, 4), 2, 3), 'freecast_x', 1)
    const back = parseVitals(stringify(serialiseVitals(v, 'now')))
    expect(back.spellSlotsUsed).toEqual({ '1': 1, '2': 1 })
    expect(back.featureUsesUsed).toEqual({ freecast_x: 1 })
  })

  it('refills only the planned ranks on a short rest, and everything on a long one', () => {
    const v = spendUse(spendSlot(spendSlot(emptyVitals(), 1, 4), 3, 2), 'a', 1)
    expect(shortRest(v, { slotRanks: [3] }).spellSlotsUsed).toEqual({ '1': 1 })
    expect(shortRest(v).spellSlotsUsed).toEqual({ '1': 1, '3': 1 })
    expect(shortRest(v, { useKeys: ['a'] }).featureUsesUsed).toEqual({})
    const rested = longRest(v)
    expect(rested.spellSlotsUsed).toEqual({})
    expect(rested.featureUsesUsed).toEqual({})
  })
})

describe('a Vault character’s spells', () => {
  const json = (): VaultCharacterJson => ({
    name: 'Ilse',
    classes: [{ id: 'wizard', name: 'Wizard', level: 3, spellcastingAbility: 'int' }],
    spells: { cantrips: [{ id: 'light', name: 'Light', source: 'XPHB' }], known: [], future_key: 'kept' },
  })

  // The level is what lets the synchronous projection file the spell under
  // "Level 2" instead of under "Level 1", where every builder pick sits.
  it('adds a levelled spell with its level, once', () => {
    const spell = { id: 'misty-step', name: 'Misty Step', source: 'XPHB', level: 2 }
    const once = addSpell(json(), spell)
    expect(characterSpells(once).known).toEqual([{ ...spell }])
    expect(addSpell(once, spell)).toBe(once)
  })

  it('files a level-0 spell as a cantrip', () => {
    const next = addSpell(json(), { id: 'mage-hand', name: 'Mage Hand', level: 0 })
    expect(characterSpells(next).cantrips.map(s => s.id)).toEqual(['light', 'mage-hand'])
  })

  // A key the builder may add later must not be deleted by an edit here.
  it('keeps keys of `spells` it does not model', () => {
    const next = addSpell(json(), { id: 'shield', name: 'Shield', level: 1 })
    expect((next.spells as Record<string, unknown>).future_key).toBe('kept')
  })

  it('unprepares a spell it removes', () => {
    let j = addSpell(json(), { id: 'shield', name: 'Shield', level: 1 })
    j = setSpellPrepared(j, 'shield', true)
    expect(characterSpells(j).prepared).toEqual(['shield'])
    j = removeSpell(j, 'known', 'shield')
    expect(characterSpells(j)).toMatchObject({ known: [], prepared: [] })
  })

  it('caps each class off its own table, and skips a class with no note', () => {
    const fence: ClassFence = {
      name: 'Wizard',
      source: 'XPHB',
      features: [],
      data: {
        casterProgression: '1',
        spellbook: { initial: 6, perLevel: 2, ritualAdept: true },
        classTableGroups: [
          {
            colLabels: ['{@filter Cantrips|spells|level=0|class=Wizard}', '{@filter Prepared Spells|spells|level=!0|class=Wizard}'],
            rows: [
              [3, 4],
              [3, 5],
              [3, 6],
            ],
          },
        ],
      },
    }
    const caps = casterCaps(json(), new Map([['wizard', fence]]))
    expect(caps).toEqual([
      expect.objectContaining({ name: 'Wizard', level: 3, cantripCap: 3, spellsCap: 6, spellbook: expect.objectContaining({ initial: 6 }) }),
    ])
    expect(casterCaps(json(), new Map())).toEqual([])
  })
})
