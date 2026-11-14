import { stringify } from 'yaml'
import { describe, expect, it } from 'vitest'

import { applyVitalsToSheet, projectVitals } from './vitalsProjection'
import type { Sheet } from './sheet/sheet'
import {
  addXp,
  EMPTY_VITALS,
  extractVitalsFromNote,
  heal,
  hitDicePool,
  longRest,
  parseVitals,
  recordDeathSave,
  serialiseVitals,
  setTemp,
  shortRest,
  seedFromSheet,
  spendHitDie,
  takeDamage,
  castSpell,
  clearDefense,
  concentrationDc,
  endConcentration,
  setDefense,
  hurtFamiliar,
  revertShape,
  setInspiration,
  shapeInto,
  toggleCondition,
  toggleEffect,
  VITALS_FENCE,
  writeVitalsToNote,
  type Vitals,
} from './vitals'

/**
 * Vitals as they are *after* the handover — `present: true`, which is what every
 * rule below operates on. The pre-handover case has its own tests.
 */
const fresh = (over: Partial<Vitals> = {}): Vitals => ({
  ...EMPTY_VITALS,
  present: true,
  hitDiceSpent: {},
  deathSaves: { successes: 0, failures: 0 },
  activeEffects: [],
  feats: [],
  effects: [],
  conditions: [],
  ...over,
})

const sheet = (over: Partial<Sheet> = {}): Sheet =>
  ({
    version: 1,
    name: 'Gibbs',
    ddb_id: '1',
    race: null,
    classes: 'Rogue 5',
    level: 5,
    proficiency_bonus: 3,
    ac: 15,
    hp: { current: 40, max: 40, temp: 0 },
    speed: 30,
    initiative: 4,
    hit_dice: [{ label: 'Rogue', formula: '5d8' }],
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

describe('parseVitals', () => {
  it('degrades to empty on YAML it cannot read, rather than throwing', () => {
    // A reader degrades, a writer refuses (ADR 0003). A fence somebody broke by
    // hand must not take out the sheet.
    expect(parseVitals('hp: [unclosed').damage).toBe(0)
    expect(parseVitals('just a string').damage).toBe(0)
    expect(parseVitals('- a\n- list').temp).toBe(0)
    expect(parseVitals(null).xp).toBeNull()
  })

  it('reads every key, and clamps death saves to three', () => {
    const v = parseVitals(`
hp:
  damage: 12
  temp: 5
hit_dice_spent:
  Rogue: 2
death_saves:
  successes: 9
  failures: 1
xp: 6500
active_effects: [feat:piercer:pierce]
feats: [Piercer, Great Weapon Master]
conditions: [prone]
updated_at: "2026-10-07T10:00:00.000Z"
`)
    expect(v.damage).toBe(12)
    expect(v.temp).toBe(5)
    expect(v.hitDiceSpent).toEqual({ Rogue: 2 })
    expect(v.deathSaves).toEqual({ successes: 3, failures: 1 })
    expect(v.xp).toBe(6500)
    expect(v.feats).toEqual(['Piercer', 'Great Weapon Master'])
    expect(v.conditions).toEqual(['prone'])
  })

  it('distinguishes "no XP tracked" from zero XP', () => {
    // `null` and `0` are different statements: one table does not use XP, the
    // other has a level-1 character who has earned none.
    expect(parseVitals('hp: {damage: 0}').xp).toBeNull()
    expect(parseVitals('xp: 0').xp).toBe(0)
  })

  it('refuses a negative damage or temp', () => {
    const v = parseVitals('hp: {damage: -5, temp: -2}')
    expect(v.damage).toBe(0)
    expect(v.temp).toBe(0)
  })
})

describe('serialiseVitals', () => {
  it('omits empty collections rather than emitting an empty key', () => {
    // MYDND-4 learned this the other way round: a key emitted with nothing under
    // it parses back as `null`, not as an empty list.
    const out = serialiseVitals(fresh(), '2026-10-07T00:00:00.000Z')
    expect(out).toEqual({ hp: { damage: 0, temp: 0 }, updated_at: '2026-10-07T00:00:00.000Z' })
    expect('hit_dice_spent' in out).toBe(false)
    expect('feats' in out).toBe(false)
  })

  it('round-trips through the fence', () => {
    const before = fresh({
      damage: 7,
      temp: 3,
      hitDiceSpent: { Rogue: 1 },
      deathSaves: { successes: 1, failures: 2 },
      xp: 900,
      feats: ['Piercer'],
      conditions: ['prone'],
      activeEffects: ['k'],
    })
    const note = writeVitalsToNote('', before, '2026-10-07T00:00:00.000Z')
    const after = extractVitalsFromNote(note)
    expect(after).toEqual({ ...before, updatedAt: '2026-10-07T00:00:00.000Z' })
  })
})

describe('writeVitalsToNote', () => {
  it('leaves the charsheet fence and the prose alone', () => {
    const note = [
      '---',
      'vc_ddb_id: "123"',
      '---',
      '',
      '<!-- vault-characters:begin — managed, replaced on re-sync -->',
      '```charsheet',
      'name: Gibbs',
      '```',
      '<!-- vault-characters:end -->',
      '',
      '## Notes',
      '',
      'He owes the harbourmaster money.',
    ].join('\n')

    const out = writeVitalsToNote(note, fresh({ damage: 4 }), '2026-10-07T00:00:00.000Z')

    expect(out).toContain('```charsheet')
    expect(out).toContain('name: Gibbs')
    expect(out).toContain('He owes the harbourmaster money.')
    expect(out).toContain('vc_ddb_id')
    expect(extractVitalsFromNote(out).damage).toBe(4)
  })

  it('puts the fence after the managed region, so a re-sync cannot eat it', () => {
    // This is the whole reason vitals are not in the charsheet fence:
    // `renderNote` replaces everything between the markers.
    const note = [
      '<!-- vault-characters:begin — managed, replaced on re-sync -->',
      '```charsheet',
      'name: Gibbs',
      '```',
      '<!-- vault-characters:end -->',
    ].join('\n')

    const out = writeVitalsToNote(note, fresh({ damage: 4 }), 'now')
    expect(out.indexOf('```' + VITALS_FENCE)).toBeGreaterThan(out.indexOf('vault-characters:end'))
  })

  it('replaces in place on a second write, rather than stacking fences', () => {
    const once = writeVitalsToNote('', fresh({ damage: 4 }), 'a')
    const twice = writeVitalsToNote(once, fresh({ damage: 9 }), 'b')
    expect(twice.match(/```vault-vitals/g)).toHaveLength(1)
    expect(extractVitalsFromNote(twice).damage).toBe(9)
  })
})

describe('takeDamage', () => {
  it('spends temporary hit points before the character takes any', () => {
    const v = takeDamage(fresh({ temp: 5 }), 40, 3)
    expect(v.temp).toBe(2)
    // Recording 3 against `damage` here would make the temp pool decorative.
    expect(v.damage).toBe(0)
  })

  it('passes the remainder through once temp is gone', () => {
    const v = takeDamage(fresh({ temp: 5 }), 40, 8)
    expect(v.temp).toBe(0)
    expect(v.damage).toBe(3)
  })

  it('discards overkill rather than accumulating it', () => {
    // A stored damage of 400 against a max of 40 would make every subsequent
    // heal look like it did nothing.
    const v = takeDamage(fresh({ damage: 35 }), 40, 400)
    expect(v.damage).toBe(40)
    expect(projectVitals(sheet(), v).hp.current).toBe(0)
  })

  it('ignores a zero or negative amount', () => {
    const before = fresh({ damage: 4 })
    expect(takeDamage(before, 40, 0)).toBe(before)
    expect(takeDamage(before, 40, -3)).toBe(before)
  })
})

describe('heal', () => {
  it('caps at the maximum, which is damage reaching zero', () => {
    expect(heal(fresh({ damage: 4 }), 10).damage).toBe(0)
  })

  it('does not top up temporary hit points', () => {
    // A separate pool with its own duration. A cure that raised it would be
    // inventing a rule.
    expect(heal(fresh({ damage: 10, temp: 2 }), 5).temp).toBe(2)
  })
})

describe('setTemp', () => {
  it('does not stack — the higher pool wins', () => {
    expect(setTemp(fresh({ temp: 8 }), 5).temp).toBe(8)
    expect(setTemp(fresh({ temp: 3 }), 5).temp).toBe(5)
  })

  it('accepts a lower value when it is explicit', () => {
    expect(setTemp(fresh({ temp: 8 }), 2, true).temp).toBe(2)
  })
})

describe('death saves', () => {
  it('stops counting at three of either', () => {
    let v = fresh()
    for (let i = 0; i < 5; i += 1) v = recordDeathSave(v, 'failure')
    expect(v.deathSaves.failures).toBe(3)
    expect(projectVitals(sheet(), v).dead).toBe(true)
  })

  it('reports stable at three successes, still at zero hit points', () => {
    let v = takeDamage(fresh(), 40, 40)
    for (let i = 0; i < 3; i += 1) v = recordDeathSave(v, 'success')
    const p = projectVitals(sheet(), v)
    expect(p.stable).toBe(true)
    expect(p.down).toBe(true)
    expect(p.hp.current).toBe(0)
  })
})

describe('hit dice', () => {
  it('reads a total out of the sheet and subtracts what is spent', () => {
    const pool = hitDicePool(sheet(), fresh({ hitDiceSpent: { Rogue: 2 } }))
    expect(pool).toEqual([{ label: 'Rogue', sides: 8, total: 5, spent: 2, remaining: 3 }])
  })

  it('reports a total of zero for a formula it cannot read', () => {
    // Visibly unspendable beats quietly infinite.
    const pool = hitDicePool(sheet({ hit_dice: [{ label: 'Odd', formula: 'some dice' }] }), fresh())
    expect(pool[0]).toEqual({ label: 'Odd', sides: 0, total: 0, spent: 0, remaining: 0 })
  })

  it('refuses to spend a die that is not there, and heals nothing for it', () => {
    const spent = fresh({ hitDiceSpent: { Rogue: 5 }, damage: 10 })
    expect(spendHitDie(spent, sheet(), 'Rogue', 7)).toBe(spent)
    expect(spendHitDie(fresh({ damage: 10 }), sheet(), 'Nobody', 7)).toEqual(fresh({ damage: 10 }))
  })

  it('spends the die and heals by what it rolled, in one transform (MYDND-155)', () => {
    const after = spendHitDie(fresh({ damage: 10 }), sheet(), 'Rogue', 7)
    expect(after.hitDiceSpent).toEqual({ Rogue: 1 })
    expect(after.damage).toBe(3)
  })

  it('heals at least 1, whatever the die and Constitution came to (MYDND-155)', () => {
    // XPHB, Short Rest: "(minimum of 1 Hit Point)". A 1 on the die at CON -2 is -1.
    expect(spendHitDie(fresh({ damage: 10 }), sheet(), 'Rogue', -1).damage).toBe(9)
  })

  it('still spends the die at full hit points, where it heals nothing', () => {
    const after = spendHitDie(fresh(), sheet(), 'Rogue', 7)
    expect(after.hitDiceSpent).toEqual({ Rogue: 1 })
    expect(after.damage).toBe(0)
  })
})

describe('rests', () => {
  it('a short rest heals nothing, and clears temp and activations', () => {
    // A short rest is an *opportunity* to spend hit dice, not a heal. This is
    // the first thing that looks like a bug and is not one.
    const v = shortRest(fresh({ damage: 12, temp: 5, activeEffects: ['k'], hitDiceSpent: { Rogue: 2 } }))
    expect(v.damage).toBe(12)
    expect(v.temp).toBe(0)
    expect(v.activeEffects).toEqual([])
    expect(v.hitDiceSpent).toEqual({ Rogue: 2 })
  })

  it('a long rest fills hit points and clears death saves', () => {
    const v = longRest(fresh({ damage: 30, temp: 4, deathSaves: { successes: 1, failures: 2 } }))
    expect(v.damage).toBe(0)
    expect(v.temp).toBe(0)
    expect(v.deathSaves).toEqual({ successes: 0, failures: 0 })
  })

  it('a long rest returns every spent hit die', () => {
    // 5d8 with all five spent: the 2014 rule's half would leave three spent.
    const v = longRest(fresh({ hitDiceSpent: { Rogue: 5 } }))
    expect(v.hitDiceSpent).toEqual({})
    expect(hitDicePool(sheet(), v)[0].remaining).toBe(5)
  })

  it('returns every pool for a multiclass character', () => {
    const multi = sheet({
      hit_dice: [
        { label: 'Rogue', formula: '6d8' },
        { label: 'Fighter', formula: '4d10' },
      ],
    })
    const v = longRest(fresh({ hitDiceSpent: { Rogue: 6, Fighter: 4 } }))
    expect(hitDicePool(multi, v).map(l => l.remaining)).toEqual([6, 4])
  })
})

describe('xp', () => {
  it('turns a null into a number the first time it is awarded', () => {
    expect(addXp(fresh(), 300).xp).toBe(300)
    expect(addXp(fresh({ xp: 300 }), -100).xp).toBe(200)
    expect(addXp(fresh({ xp: 50 }), -500).xp).toBe(0)
  })
})

describe('toggles', () => {
  it('switches an effect on and off without duplicating it', () => {
    let v = toggleEffect(fresh(), 'k')
    v = toggleEffect(v, 'k', true)
    expect(v.activeEffects).toEqual(['k'])
    expect(toggleEffect(v, 'k').activeEffects).toEqual([])
  })

  it('ignores a blank condition', () => {
    expect(toggleCondition(fresh(), '   ').conditions).toEqual([])
  })

  // MYDND-45.
  it('keeps Heroic Inspiration through both rests, and writes it only when held', () => {
    const inspired = setInspiration(fresh(), true)
    expect(shortRest(inspired).heroicInspiration).toBe(true)
    expect(longRest(inspired).heroicInspiration).toBe(true)

    expect(serialiseVitals(inspired, 'now').heroic_inspiration).toBe(true)
    expect('heroic_inspiration' in serialiseVitals(fresh(), 'now')).toBe(false)
    expect(parseVitals('heroic_inspiration: true').heroicInspiration).toBe(true)
    // A hand-typed "no" is a string, not a reroll.
    expect(parseVitals('heroic_inspiration: no').heroicInspiration).toBe(false)
  })

  // MYDND-46.
  it('casts in one write: spends the slot and starts concentrating', () => {
    const v = castSpell(fresh(), { slot: { rank: 3, max: 2 }, concentration: 'Haste' })
    expect(v.spellSlotsUsed).toEqual({ '3': 1 })
    expect(v.concentration).toBe('Haste')
    // A second concentration spell replaces the first — the rule.
    expect(castSpell(v, { slot: { rank: 3, max: 2 }, concentration: 'Fly' }).concentration).toBe('Fly')
  })

  it('does not cast what it cannot pay for', () => {
    const spent = fresh({ spellSlotsUsed: { '1': 2 } })
    expect(castSpell(spent, { slot: { rank: 1, max: 2 }, concentration: 'Bless' })).toBe(spent)
    const used = fresh({ featureUsesUsed: { arcanum: 1 } })
    expect(castSpell(used, { use: { key: 'arcanum', max: 1 } })).toBe(used)
  })

  it('ends concentration at 0 hit points and on a long rest, not on a short one', () => {
    const c = fresh({ concentration: 'Haste' })
    expect(takeDamage(c, 40, 10).concentration).toBe('Haste')
    expect(takeDamage(c, 40, 40).concentration).toBeNull()
    expect(shortRest(c).concentration).toBe('Haste')
    expect(longRest(c).concentration).toBeNull()
    expect(endConcentration(c).concentration).toBeNull()
  })

  it('round-trips concentration through the fence', () => {
    const out = serialiseVitals(fresh({ concentration: 'Haste' }), 'now')
    expect(out.concentration).toBe('Haste')
    expect(parseVitals('concentration: Haste').concentration).toBe('Haste')
    expect('concentration' in serialiseVitals(fresh(), 'now')).toBe(false)
  })

  it('sets the concentration DC at 10 or half the damage, to 30', () => {
    expect(concentrationDc(7)).toBe(10)
    expect(concentrationDc(27)).toBe(13)
    expect(concentrationDc(100)).toBe(30)
  })

  // MYDND-48.
  it('stores one hand-set defence per value, and reads back only real ones', () => {
    let v = setDefense(fresh({ defenses: [] }), 'Fire', 'resistance')
    v = setDefense(v, 'fire', 'immunity')
    expect(v.defenses).toEqual([{ type: 'immunity', value: 'fire' }])
    expect(clearDefense(v, 'fire').defenses).toEqual([])

    const back = parseVitals('defenses:\n  - { type: resistance, value: cold }\n  - { type: nonsense, value: x }\n  - oops')
    expect(back.defenses).toEqual([{ type: 'resistance', value: 'cold' }])
    expect(serialiseVitals(v, 'now').defenses).toEqual([{ type: 'immunity', value: 'fire' }])
    expect('defenses' in serialiseVitals(fresh({ defenses: [] }), 'now')).toBe(false)
  })

  // MYDND-51.
  const wolf = { id: 'wolf', name: 'Wolf', cr: 0.25, ac: 12, walkSpeed: 40 }

  it('takes a form in one write: the form, temp HP that does not stack, and a use', () => {
    const v = shapeInto(fresh({ temp: 2, familiarDamage: {} }), wolf, { tempHp: 5, uses: 2 })
    expect(v.wildShape).toEqual(wolf)
    expect(v.temp).toBe(5)
    expect(v.featureUsesUsed).toEqual({ wild_shape: 1 })
    // Higher temp HP already held is kept.
    expect(shapeInto(fresh({ temp: 9, familiarDamage: {} }), wolf, { tempHp: 5, uses: null }).temp).toBe(9)
  })

  it('refuses a form with no uses left, and a long rest ends one', () => {
    const spent = fresh({ featureUsesUsed: { wild_shape: 2 }, familiarDamage: {} })
    expect(shapeInto(spent, wolf, { tempHp: 5, uses: 2 })).toBe(spent)
    const shaped = fresh({ wildShape: wolf, familiarDamage: {} })
    expect(revertShape(shaped).wildShape).toBeNull()
    expect(shortRest(shaped).wildShape).toEqual(wolf)
    expect(longRest(shaped).wildShape).toBeNull()
  })

  it('round-trips the form and familiar damage through the fence', () => {
    const v = hurtFamiliar(fresh({ wildShape: wolf, familiarDamage: {} }), 'tamer-bond', 4, 7)
    const back = parseVitals(stringify(serialiseVitals(v, 'now')))
    expect(back.wildShape).toEqual(wolf)
    expect(back.familiarDamage).toEqual({ 'tamer-bond': 4 })
  })

  it('keeps a familiar between 0 damage and its maximum', () => {
    const base = fresh({ familiarDamage: {} })
    expect(hurtFamiliar(base, 'f', 20, 7).familiarDamage).toEqual({ f: 7 })
    expect(hurtFamiliar(hurtFamiliar(base, 'f', 3, 7), 'f', -10, 7).familiarDamage).toEqual({})
  })
})

describe('projectVitals', () => {
  it('derives current hit points from the maximum and the damage', () => {
    expect(projectVitals(sheet(), fresh({ damage: 7 })).hp).toEqual({ current: 33, max: 40, temp: 0 })
  })

  it('keeps the damage underneath when a maximum is lowered and raised back', () => {
    // Clamped on read, not corrected in the file. A GM who halves a maximum
    // temporarily should not lose the damage under it.
    const vitals = fresh({ damage: 30 })
    const halved = sheet({ hp: { current: 20, max: 20, temp: 0 } })
    expect(projectVitals(halved, vitals).hp.current).toBe(0)
    expect(projectVitals(sheet(), vitals).hp.current).toBe(10)
  })

  it('heals the right amount when a level-up raises the maximum', () => {
    // The whole argument for storing damage rather than current. A stored
    // `current: 33` against a new max of 48 would have cost eight points.
    const vitals = fresh({ damage: 7 })
    const levelled = sheet({ hp: { current: 48, max: 48, temp: 0 } })
    expect(projectVitals(levelled, vitals).hp.current).toBe(41)
  })
})

describe('the handover from the imported sheet', () => {
  const imported = sheet({ hp: { current: 94, max: 101, temp: 3 } })
  const untouched = (): Vitals => parseVitals(null)

  it('reports what D&D Beyond said until a fence exists', () => {
    // Projecting `max - damage` here would show a character at full health who
    // walked out of a fight on 94 of 101 — the actual bug this flag fixes, and
    // the one `characters.test.tsx` caught.
    expect(untouched().present).toBe(false)
    expect(projectVitals(imported, untouched()).hp).toEqual({ current: 94, max: 101, temp: 3 })
  })

  it('seeds the damage from the sheet on the first write, so nothing jumps', () => {
    const seeded = seedFromSheet(untouched(), imported)
    expect(seeded.present).toBe(true)
    expect(seeded.damage).toBe(7)
    expect(seeded.temp).toBe(3)
    expect(projectVitals(imported, seeded).hp.current).toBe(94)
  })

  it('is idempotent, so it can sit in front of every transform', () => {
    const once = seedFromSheet(untouched(), imported)
    const twice = seedFromSheet(once, sheet({ hp: { current: 1, max: 101, temp: 0 } }))
    expect(twice).toBe(once)
  })

  it('leaves the fence governing once it exists, even after a re-sync', () => {
    // Two files that both believe they own current HP is worse than one that
    // does, and the one being played in wins.
    const played = fresh({ damage: 20 })
    const resynced = sheet({ hp: { current: 94, max: 101, temp: 0 } })
    expect(projectVitals(resynced, played).hp.current).toBe(81)
  })

  it('does not touch a sheet that has no fence behind it', () => {
    const s = sheet({ hp: { current: 94, max: 101, temp: 3 } })
    expect(applyVitalsToSheet(s, untouched()).hp).toEqual({ current: 94, max: 101, temp: 3 })
    expect(applyVitalsToSheet(s, fresh({ damage: 7 })).hp).toEqual({ current: 94, max: 101, temp: 0 })
  })
})
