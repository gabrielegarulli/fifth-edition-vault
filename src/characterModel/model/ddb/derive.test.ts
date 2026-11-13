import { describe, expect, it } from 'vitest'

import {
  buildDdbCurrency,
  buildDdbItems,
  abilityMod,
  buildActionAttacks,
  buildAttacks,
  buildClassResources,
  buildFeatureDice,
  buildFeats,
  buildSheet,
  buildSpellcasting,
  buildSpells,
  deriveAc,
  deriveHp,
  fmtMod,
  getAbilityScore,
  getPassives,
  getSaves,
  getSkills,
  getSpeed,
} from './derive'
import { modifierBuckets } from './modifiers'
import type { DdbItem, DdbItemDefinition, DdbModifier, DdbPayload } from './payload'

/**
 * Ported from `obsidian-vault-characters`' synthetic suites (MYDND-7).
 *
 * **Every expected value here is hand-derived, not transcribed from output.**
 * The arithmetic is spelled out in a comment above each fixture, because a
 * number copied from a failing run is a test that asserts the bug.
 *
 * The payloads are synthetic on purpose, and the reason is a real bug: these
 * assertions once ran against a live D&D Beyond character and broke within
 * hours, because DDB stopped reporting both Psychic Blades entries once they
 * were no longer manifested while leaving the other 17 actions untouched.
 * **State the player can toggle must not be asserted against a live source**,
 * so the shapes below were copied field-for-field from the real payload while
 * it still had them. The live checks are in `src/__verify__/realDdb.test.ts`,
 * and assert only what a player cannot change.
 */

const abilities = (str: number, dex: number, con = 10, int = 10, wis = 10, cha = 10) => [
  { id: 1, value: str },
  { id: 2, value: dex },
  { id: 3, value: con },
  { id: 4, value: int },
  { id: 5, value: wis },
  { id: 6, value: cha },
]

describe('abilityMod', () => {
  it('is the one piece of D&D maths that never changes', () => {
    expect(abilityMod(10)).toBe(0)
    expect(abilityMod(11)).toBe(0)
    expect(abilityMod(12)).toBe(1)
    expect(abilityMod(8)).toBe(-1)
    expect(abilityMod(1)).toBe(-5)
    expect(abilityMod(20)).toBe(5)
  })

  it('defaults a missing score to 10', () => {
    expect(abilityMod(null)).toBe(0)
    expect(abilityMod(undefined)).toBe(0)
  })
})

describe('fmtMod', () => {
  it('always signs', () => {
    expect(fmtMod(3)).toBe('+3')
    expect(fmtMod(0)).toBe('+0')
    expect(fmtMod(-1)).toBe('-1')
  })
})

/**
 * Neither real test character carries a weapon — a Bard with a wand and a
 * Soulknife with psychic blades — so the inventory path has no live coverage at
 * all. These are hand-built items with hand-computed answers.
 */
describe('buildAttacks, from the inventory', () => {
  const weapon = (name: string, extra: Partial<DdbItemDefinition> = {}): DdbItem => ({
    equipped: true,
    definition: {
      name,
      filterType: 'Weapon',
      attackType: 1,
      damage: { diceString: '1d8' },
      damageType: 'Slashing',
      properties: [],
      grantedModifiers: [],
      ...extra,
    },
  })

  // STR 10 (+0), DEX 18 (+4), level 5 → proficiency +3.
  const payload: DdbPayload = {
    level: 5,
    stats: abilities(10, 18, 12),
    inventory: [
      weapon('Longsword'),
      weapon('Rapier', {
        damage: { diceString: '1d8' },
        damageType: 'Piercing',
        properties: [{ name: 'Finesse' }],
      }),
      weapon('Shortbow', { attackType: 2, damage: { diceString: '1d6' }, damageType: 'Piercing' }),
      weapon('Longsword, +2', { grantedModifiers: [{ type: 'bonus', subType: 'magic', value: 2 }] }),
      { equipped: false, definition: weapon('Handaxe').definition },
      // Not a weapon: no dice, no attack type. Must not appear.
      {
        equipped: true,
        definition: { name: 'Backpack', filterType: 'Other Gear', damage: null, attackType: null },
      },
    ],
  }

  const attacks = buildAttacks(payload)
  const byName = new Map(attacks.map(a => [a.name, a]))
  const got = (name: string) => {
    const a = byName.get(name)
    if (!a) throw new Error(`no attack named ${name} — got ${[...byName.keys()].join(', ')}`)
    return a
  }

  it('lists only weapons', () => {
    expect(attacks).toHaveLength(5)
    expect(byName.has('Backpack')).toBe(false)
    expect(attacks.every(a => a.source === 'item')).toBe(true)
  })

  it('uses Strength and proficiency for a plain melee weapon', () => {
    // +0 ability, +3 proficiency.
    expect(got('Longsword').attack).toBe(3)
  })

  it('omits a zero damage modifier rather than printing +0', () => {
    expect(got('Longsword').damage).toBe('1d8')
  })

  it('takes the better of Strength and Dexterity for finesse', () => {
    // DEX +4 beats STR +0, so 4 + 3 = 7.
    expect(got('Rapier').attack).toBe(7)
    expect(got('Rapier').damage).toBe('1d8+4')
  })

  it('uses Dexterity for a ranged weapon', () => {
    expect(got('Shortbow').attack).toBe(7)
    expect(got('Shortbow').damage).toBe('1d6+4')
  })

  it('marks range', () => {
    expect(got('Shortbow').range).toBe('ranged')
    expect(got('Longsword').range).toBe('melee')
  })

  it('applies a magic bonus to both the attack and the damage', () => {
    // A `+1 Longsword` carries its bonus as a granted modifier, not in its name.
    // STR +0, proficiency +3, magic +2 = 5; damage gets the +2 alone.
    expect(got('Longsword, +2').attack).toBe(5)
    expect(got('Longsword, +2').damage).toBe('1d8+2')
  })

  it('keeps the damage type when DDB gives a string', () => {
    expect(got('Rapier').damageType).toBe('Piercing')
  })

  it('reports properties', () => {
    expect(got('Rapier').properties).toEqual(['Finesse'])
  })

  it('sorts equipped weapons first', () => {
    // The ones in hand are the ones rolled.
    expect(attacks[attacks.length - 1].name).toBe('Handaxe')
    expect(got('Handaxe').equipped).toBe(false)
  })

  it('counts a magic weapon filed as something else', () => {
    // `filterType === 'Weapon'` is the clean signal, but magic weapons sometimes
    // arrive filed elsewhere — dice plus an attack type is enough.
    const odd = buildAttacks({
      level: 1,
      stats: abilities(10, 10),
      inventory: [
        {
          equipped: true,
          definition: {
            name: 'Mystery Blade',
            filterType: 'Wondrous Item',
            attackType: 1,
            damage: { diceString: '1d6' },
          },
        },
      ],
    })
    expect(odd.map(a => a.name)).toEqual(['Mystery Blade'])
  })
})

/**
 * These assertions used to run against a live payload and broke within hours.
 * The shape is pinned here instead — copied field for field from the real
 * payload while it still had the entries.
 */
describe('buildActionAttacks and buildFeatureDice, from features', () => {
  const blade = (diceValue: number, activationType: number) => ({
    name: 'Psychic Blades',
    abilityModifierStatId: 2,
    attackTypeRange: 1,
    isProficient: true,
    displayAsAttack: true,
    fixedToHit: null,
    dice: { diceString: `1d${diceValue}`, fixedValue: null },
    range: { range: 60 },
    activation: { activationType },
  })

  // DEX 14 (+2), level 14 → proficiency +5.
  const payload: DdbPayload = {
    level: 14,
    stats: abilities(8, 14, 15, 15, 8, 8),
    actions: {
      class: [
        blade(6, 1),
        blade(4, 3),
        // Damage-only features. All three carry `displayAsAttack: true` and none
        // is an attack — this is the exact trap the real payload sets.
        {
          name: 'Sneak Attack',
          displayAsAttack: true,
          dice: { diceString: '7d6' },
          activation: { activationType: 8 },
        },
        {
          name: 'Psionic Energy',
          displayAsAttack: true,
          dice: { diceString: '1d10' },
          activation: { activationType: 1 },
        },
        // A reaction with dice, to pin the third activation label.
        { name: 'Cutting Words', dice: { diceString: '1d10' }, activation: { activationType: 4 } },
        // No dice at all: neither an attack nor feature dice.
        { name: 'Cunning Action', activation: { activationType: 3 } },
      ],
      race: null,
      item: null,
    },
  }

  const attacks = buildActionAttacks(payload)

  it('treats only the two blades as attacks', () => {
    expect(attacks).toHaveLength(2)
    expect(attacks.every(a => a.source === 'feature')).toBe(true)
  })

  it('never makes an attack out of displayAsAttack alone', () => {
    // It is true on Sneak Attack and on every Psionic Power entry, none of which
    // has an attack roll. A real attack states both a range and its ability.
    expect(attacks.some(a => a.name === 'Sneak Attack')).toBe(false)
    expect(attacks.some(a => a.name === 'Psionic Energy')).toBe(false)
  })

  it('uses a stated proficiency rather than an assumed one', () => {
    // DEX +2 plus a *stated* +5 — not assumed, as it must be for inventory items.
    expect(attacks.map(a => a.attack)).toEqual([7, 7])
  })

  it('labels each blade with the action it costs', () => {
    // What distinguishes the two entries is the action, so an unlabelled pair
    // would read as a duplicate.
    expect([attacks[0].damage, attacks[0].activation]).toEqual(['1d6+2', 'action'])
    expect([attacks[1].damage, attacks[1].activation]).toEqual(['1d4+2', 'bonus action'])
  })

  it('carries the range through', () => {
    expect(attacks.every(a => a.range === '60 ft')).toBe(true)
  })

  it('invents no damage type from damageTypeId', () => {
    // The payload carries a `damageTypeId` and no lookup for it. A wrong damage
    // type at the table is worse than a blank one.
    expect(attacks.every(a => a.damageType === null)).toBe(true)
  })

  it('lets fixedToHit win over the computed bonus', () => {
    const fixed = buildActionAttacks({
      ...payload,
      actions: { class: [{ ...blade(6, 1), fixedToHit: 11 }] },
    })
    expect(fixed[0].attack).toBe(11)
  })

  it('omits the proficiency bonus when the feature is not proficient', () => {
    const unskilled = buildActionAttacks({
      ...payload,
      actions: { class: [{ ...blade(6, 1), isProficient: false }] },
    })
    expect(unskilled[0].attack).toBe(2)
  })

  describe('feature dice', () => {
    const dice = buildFeatureDice(payload)
    const byName = new Map(dice.map(d => [d.name, d]))

    it('collects the features with dice and no attack roll', () => {
      expect(dice).toHaveLength(3)
    })

    it('makes Sneak Attack feature dice, not an attack', () => {
      expect(byName.get('Sneak Attack')?.formula).toBe('7d6')
    })

    it('leaves an unmapped activation type blank rather than guessing', () => {
      // `2` and `8` are seen on Sneak Attack and its riders, and are deliberately
      // not guessed — an unlabelled action beats one labelled wrongly.
      expect(byName.get('Sneak Attack')?.activation).toBeNull()
    })

    it('maps the three confirmed activation types', () => {
      expect(byName.get('Psionic Energy')?.activation).toBe('action')
      expect(byName.get('Cutting Words')?.activation).toBe('reaction')
    })

    it('does not list a feature with no dice', () => {
      expect(byName.has('Cunning Action')).toBe(false)
    })

    it('de-duplicates by name and formula', () => {
      const twice = buildFeatureDice({
        actions: { class: [payload.actions?.class?.[2], payload.actions?.class?.[2]] },
      } as DdbPayload)
      expect(twice).toHaveLength(1)
    })
  })
})

describe('getAbilityScore', () => {
  it('takes the higher value for a `set` modifier rather than overwriting', () => {
    // Headband of Intellect: INT 10 on paper, 19 once the item applies. The
    // single most breakable line of the derivation.
    const sheet = buildSheet(
      {
        level: 1,
        stats: abilities(10, 10, 10, 10),
        modifiers: { item: [{ type: 'set', subType: 'intelligence-score', value: 19 }] },
      },
      '1',
    )
    expect(sheet.abilities.find(a => a.label === 'INT')?.score).toBe(19)
  })

  it('ignores a Headband of Intellect that is not attuned (MYDND-53)', () => {
    // INT 10 stays 10: the item's modifier is in the payload regardless.
    const sheet = buildSheet(
      {
        level: 1,
        stats: abilities(10, 10, 10, 10),
        inventory: [{ equipped: true, isAttuned: false, definition: { id: 4652, name: 'Headband of Intellect' } }],
        modifiers: {
          item: [{ type: 'set', subType: 'intelligence-score', value: 19, requiresAttunement: true, componentId: 4652 }],
        },
      },
      '1',
    )
    expect(sheet.abilities.find(a => a.label === 'INT')?.score).toBe(10)
  })

  it('does not let a `set` lower a higher score', () => {
    const sheet = buildSheet(
      {
        level: 1,
        stats: abilities(10, 10, 10, 20),
        modifiers: { item: [{ type: 'set', subType: 'intelligence-score', value: 19 }] },
      },
      '1',
    )
    expect(sheet.abilities.find(a => a.label === 'INT')?.score).toBe(20)
  })

  it('adds a bonus modifier', () => {
    const sheet = buildSheet(
      {
        level: 1,
        stats: abilities(10, 10),
        modifiers: { race: [{ type: 'bonus', subType: 'strength-score', value: 2 }] },
      },
      '1',
    )
    expect(sheet.abilities.find(a => a.label === 'STR')?.score).toBe(12)
  })

  it('lets a manual override win outright', () => {
    const sheet = buildSheet(
      {
        level: 1,
        stats: abilities(10, 10),
        modifiers: { race: [{ type: 'bonus', subType: 'strength-score', value: 2 }] },
        overrideStats: [{ id: 1, value: 7 }],
      },
      '1',
    )
    expect(sheet.abilities.find(a => a.label === 'STR')?.score).toBe(7)
  })

  it('reads modifiers from every bucket, not just one', () => {
    // `payload.modifiers` is an object of arrays keyed by source, not a flat list.
    const sheet = buildSheet(
      {
        level: 1,
        stats: abilities(10, 10),
        modifiers: {
          race: [{ type: 'bonus', subType: 'strength-score', value: 1 }],
          feat: [{ type: 'bonus', subType: 'strength-score', value: 1 }],
        },
      },
      '1',
    )
    expect(sheet.abilities.find(a => a.label === 'STR')?.score).toBe(12)
  })

  // MYDND-110, every number measured against D&D Beyond's own sheet 2026-10-26.
  describe('a `set` is a floor under every bonus', () => {
    it('applies the floor after the bonuses, wherever it sits in the list', () => {
      // Fyrath: STR 15, Belt of Fire Giant Strength (set 25) listed first,
      // then +1 and +2 from feats. In list order it read 28; D&D Beyond, 25.
      const fyrath: DdbPayload = {
        stats: abilities(15, 10),
        modifiers: {
          item: [{ type: 'set', subType: 'strength-score', value: 25 }],
          feat: [
            { type: 'bonus', subType: 'strength-score', value: 1 },
            { type: 'bonus', subType: 'strength-score', value: 2 },
          ],
        },
      }
      expect(getAbilityScore(fyrath, 1)).toBe(25)
    })

    it('adds a `stacking-bonus` on top of the floor', () => {
      // Shade: STR 14, +4 from feats, the same belt, and a Hammer of
      // Thunderbolts' `stacking-bonus` +4. D&D Beyond: 25 + 4 = 29. Read in
      // list order without the stacking bonus it was also 29 (25, then +4).
      const shade: DdbPayload = {
        stats: abilities(14, 10),
        modifiers: {
          item: [
            { type: 'set', subType: 'strength-score', value: 25 },
            { type: 'stacking-bonus', subType: 'strength-score', value: 4 },
          ],
          feat: [
            { type: 'bonus', subType: 'strength-score', value: 1 },
            { type: 'bonus', subType: 'strength-score', value: 1 },
            { type: 'bonus', subType: 'strength-score', value: 2 },
          ],
        },
      }
      expect(getAbilityScore(shade, 1)).toBe(29)
    })
  })

  describe("a species' starting increases, beside a background's", () => {
    // Fen Moonguard: an Elf (2024) with the optional "Ability Score Increases"
    // trait, option +1/+1/+1, and the Guide background's own increases. D&D
    // Beyond lists both and applies only the background's.
    const ASI = [{ tagName: '__INITIAL_ASI' }]
    const fen = (backgroundAsi: boolean): DdbPayload => ({
      stats: abilities(12, 14, 14, 10, 14, 8),
      classes: [{ level: 3, definition: { name: 'Ranger', hitDice: 10 } }],
      baseHitPoints: 22,
      race: {
        fullName: 'Elf',
        racialTraits: [
          { definition: { id: 13856110, categories: [] } },
          { definition: { id: 13856115, categories: ASI } },
        ],
      },
      choices: {
        race: [
          { componentId: 13856110, type: 3, optionValue: 3727513 },
          { componentId: 13856115, type: 8, optionValue: 3727524 },
        ],
      },
      feats: [
        { definition: { id: 1789164, name: 'Magic Initiate (Druid)', categories: [] } },
        ...(backgroundAsi
          ? [{ definition: { id: 1789151, name: 'Guide Ability Score Improvements', categories: ASI } }]
          : []),
      ],
      modifiers: {
        race: [
          { type: 'bonus', subType: 'dexterity-score', value: 1, componentId: 3727524 },
          { type: 'bonus', subType: 'wisdom-score', value: 1, componentId: 3727524 },
          { type: 'bonus', subType: 'constitution-score', value: 1, componentId: 3727524 },
          { type: 'set-base', subType: 'darkvision', value: 60, componentId: 13856109 },
        ],
        feat: backgroundAsi
          ? [
              { type: 'bonus', subType: 'dexterity-score', value: 2, componentId: 1789151 },
              { type: 'bonus', subType: 'constitution-score', value: 1, componentId: 1789151 },
            ]
          : [],
      },
    })

    it("applies only the background's, as D&D Beyond does", () => {
      expect([2, 3, 5].map(s => getAbilityScore(fen(true), s))).toEqual([16, 15, 14])
    })

    it('so the hit point maximum is the one D&D Beyond shows', () => {
      // Ranger 3: 22 from the dice, + CON 15's +2 × 3 = 28. CON 16 made it
      // +3 × 3, 31, the number the card was cut for.
      expect(deriveHp(fen(true)).max).toBe(28)
    })

    it("keeps the species' when there is no background increase", () => {
      expect([2, 3, 5].map(s => getAbilityScore(fen(false), s))).toEqual([15, 15, 15])
    })

    it("drops only the trait's increases, not the rest of the race bucket", () => {
      const race = modifierBuckets(fen(true)).find(([b]) => b === 'race')?.[1]
      expect(race?.map(m => m.subType)).toEqual(['darkvision'])
    })
  })
})

describe('deriveHp', () => {
  it('adds Constitution per level, because baseHitPoints excludes it', () => {
    // The bug this encodes: `baseHitPoints` is the hit-dice total only, so
    // reading it as the maximum under-reports every character by CON × level —
    // 26 points on the level 13 character it was found on.
    // CON 14 (+2) × level 13 = +26 on top of 80.
    const hp = deriveHp({ level: 13, stats: abilities(10, 10, 14), baseHitPoints: 80 })
    expect(hp.max).toBe(106)
  })

  it('does not add Constitution on top of a player-typed maximum', () => {
    // `overrideHitPoints` already includes everything.
    const hp = deriveHp({
      level: 13,
      stats: abilities(10, 10, 14),
      baseHitPoints: 80,
      overrideHitPoints: 100,
    })
    expect(hp.max).toBe(100)
  })

  it('reads the hand-set maximum as overrideHitPoints, and nothing per level on top', () => {
    // MYDND-106: this read `overriddenHitPoints`, which no payload carries, so
    // Farthas's 178 imported as 147. Tough is in the override already.
    const hp = deriveHp({
      stats: abilities(10, 10, 14),
      classes: [{ level: 13, definition: { name: 'Fighter', hitDice: 10 } }],
      baseHitPoints: 82,
      overrideHitPoints: 178,
      removedHitPoints: 13,
      modifiers: { feat: [{ type: 'bonus', subType: 'hit-points-per-level', value: 2 }] },
    })
    expect(hp).toEqual({ current: 165, max: 178, temp: 0 })
  })
  it('subtracts damage taken to get the current total', () => {
    const hp = deriveHp({
      level: 13,
      stats: abilities(10, 10, 14),
      baseHitPoints: 80,
      removedHitPoints: 6,
    })
    expect(hp.current).toBe(100)
    expect(hp.max).toBe(106)
  })

  it('never reports negative current hit points', () => {
    const hp = deriveHp({ level: 1, stats: abilities(10, 10, 10), baseHitPoints: 8, removedHitPoints: 99 })
    expect(hp.current).toBe(0)
  })

  it('carries temporary hit points separately', () => {
    const hp = deriveHp({
      level: 1,
      stats: abilities(10, 10, 10),
      baseHitPoints: 8,
      temporaryHitPoints: 5,
    })
    expect(hp.temp).toBe(5)
    expect(hp.max).toBe(8)
  })

  it('adds bonus hit points', () => {
    const hp = deriveHp({
      level: 1,
      stats: abilities(10, 10, 10),
      baseHitPoints: 8,
      bonusHitPoints: 3,
    })
    expect(hp.max).toBe(11)
  })
})

describe('deriveHp: hit points per level (MYDND-106)', () => {
  // A level 16 Fighter 6 / Cleric 10, CON 14 (+2): 90 + 2 × 16 = 122 before
  // any per-level bonus. Brammand Halffist's shape, with round numbers.
  const multiclass = (modifiers: DdbPayload['modifiers'], over: Partial<DdbPayload> = {}): DdbPayload => ({
    stats: abilities(10, 10, 14),
    classes: [
      { level: 6, definition: { name: 'Fighter', hitDice: 10 }, classFeatures: [{ definition: { id: 11, name: 'Second Wind' } }] },
      { level: 10, definition: { name: 'Cleric', hitDice: 8 }, classFeatures: [{ definition: { id: 22, name: 'Divine Resilience' } }] },
    ],
    baseHitPoints: 90,
    modifiers,
    ...over,
  })
  const perLevel = (value: number, extra: Partial<DdbModifier> = {}): DdbModifier =>
    ({ type: 'bonus', subType: 'hit-points-per-level', value, ...extra })

  it('adds a species bonus once per character level: Dwarven Toughness, 122 + 1 × 16 = 138', () => {
    expect(deriveHp(multiclass({ race: [perLevel(1)] })).max).toBe(138)
  })

  it('adds a feat bonus once per character level: Tough, 122 + 2 × 16 = 154', () => {
    expect(deriveHp(multiclass({ feat: [perLevel(2)] })).max).toBe(154)
  })

  it("scales a class feature's bonus by that class's level: 122 + 1 × Cleric 10 = 132", () => {
    // Draconic Resilience on a Paladin 8 / Sorcerer 5 reads +5 on D&D Beyond.
    expect(deriveHp(multiclass({ class: [perLevel(1, { componentId: 22 })] })).max).toBe(132)
  })

  it('counts the total level for a class bonus no class row owns: 122 + 16 = 138', () => {
    expect(deriveHp(multiclass({ class: [perLevel(1, { componentId: 99 })] })).max).toBe(138)
  })

  it('adds them together: Tough 32 + Dwarf 16 + Cleric 10 = 122 + 58 = 180', () => {
    const hp = deriveHp(multiclass({ race: [perLevel(1)], feat: [perLevel(2)], class: [perLevel(1, { componentId: 22 })] }))
    expect(hp.max).toBe(180)
  })

  it("does not count a stowed item's bonus: 122, and 122 + 16 = 138 once it is equipped", () => {
    const amulet = (equipped: boolean): Partial<DdbPayload> => ({
      inventory: [{ equipped, quantity: 1, definition: { id: 500, name: 'Amulet of Toughness' } }],
    })
    const mods = { item: [perLevel(1, { componentId: 500 })] }
    expect(deriveHp(multiclass(mods, amulet(false))).max).toBe(122)
    expect(deriveHp(multiclass(mods, amulet(true))).max).toBe(138)
  })

  it('ignores a modifier of another type or without a number', () => {
    const hp = deriveHp(multiclass({
      race: [{ type: 'set', subType: 'hit-points-per-level', value: 5 }, perLevel(null as unknown as number)],
      item: [{ type: 'bonus', subType: 'hit-points', value: null }],
    }))
    expect(hp.max).toBe(122)
  })
})

describe('deriveAc', () => {
  it('prefers an explicit override', () => {
    expect(deriveAc({ overrideArmorClass: 21, armorClass: 15 })).toBe(21)
  })

  it('prefers anything DDB computed over the gear', () => {
    expect(deriveAc({ armorClass: 17 })).toBe(17)
    expect(deriveAc({ calculatedStats: { totalArmorClass: 18 } })).toBe(18)
  })

  it('is 10 + Dex unarmoured', () => {
    // DEX 18 → +4.
    expect(deriveAc({ stats: abilities(10, 18) })).toBe(14)
  })

  it('adds a second ability for Unarmored Defense', () => {
    // Barbarian CON / Monk WIS, through an `unarmored-armor-class` modifier that
    // names its stat. DEX 14 (+2) + CON 16 (+3) + 10 = 15.
    expect(
      deriveAc({
        stats: abilities(10, 14, 16),
        modifiers: { class: [{ type: 'bonus', subType: 'unarmored-armor-class', statId: 3 }] },
      }),
    ).toBe(15)
  })

  it('caps the Dex bonus by armour type', () => {
    const withArmour = (armorTypeId: number, armorClass: number) =>
      deriveAc({
        stats: abilities(10, 18),
        inventory: [{ equipped: true, definition: { name: 'Armour', armorTypeId, armorClass } }],
      })
    // Light: full Dex. 11 + 4.
    expect(withArmour(1, 11)).toBe(15)
    // Medium: Dex capped at 2. 14 + 2.
    expect(withArmour(2, 14)).toBe(16)
    // Heavy: no Dex at all.
    expect(withArmour(3, 18)).toBe(18)
  })

  it('adds a shield', () => {
    expect(
      deriveAc({
        stats: abilities(10, 14),
        inventory: [{ equipped: true, definition: { name: 'Shield', armorTypeId: 4, armorClass: 2 } }],
      }),
    ).toBe(14)
  })

  it('adds a bare armor-class bonus, such as a Ring of Protection', () => {
    expect(
      deriveAc({
        stats: abilities(10, 10),
        modifiers: { item: [{ type: 'bonus', subType: 'armor-class', value: 1 }] },
      }),
    ).toBe(11)
  })

  it('ignores unequipped armour', () => {
    expect(
      deriveAc({
        stats: abilities(10, 10),
        inventory: [{ equipped: false, definition: { name: 'Plate', armorTypeId: 3, armorClass: 18 } }],
      }),
    ).toBe(10)
  })
})

describe('getSpeed', () => {
  it('reads race.weightSpeeds.normal.walk, which is where DDB puts it', () => {
    // Reading only `payload.speed` showed no speed at all on every real payload.
    expect(getSpeed({ race: { weightSpeeds: { normal: { walk: 30 } } } })).toBe(30)
  })

  it('accepts the other shapes the unofficial schema might use', () => {
    expect(getSpeed({ speed: 25 })).toBe(25)
    expect(getSpeed({ movement: { walk: 35 } })).toBe(35)
    expect(getSpeed({ calculatedStats: { walkSpeed: 40 } })).toBe(40)
  })

  it('is null when nothing says', () => {
    expect(getSpeed({})).toBeNull()
  })
})

describe('getSaves and getSkills', () => {
  // Level 5 → proficiency +3. DEX 18 (+4).
  const payload: DdbPayload = {
    level: 5,
    stats: abilities(10, 18, 10, 10, 10, 14),
    modifiers: {
      class: [
        { type: 'proficiency', subType: 'dexterity-saving-throws' },
        { type: 'proficiency', subType: 'stealth' },
        { type: 'expertise', subType: 'persuasion' },
      ],
    },
  }

  it('gives all six saves', () => {
    expect(getSaves(payload)).toHaveLength(6)
  })

  it('adds proficiency to a proficient save only', () => {
    const saves = new Map(getSaves(payload).map(s => [s.label, s]))
    expect(saves.get('DEX')).toMatchObject({ proficient: true, total: 7 })
    expect(saves.get('STR')).toMatchObject({ proficient: false, total: 0 })
  })

  it('gives all eighteen skills', () => {
    expect(getSkills(payload)).toHaveLength(18)
  })

  it('doubles proficiency for expertise', () => {
    const skills = new Map(getSkills(payload).map(s => [s.name, s]))
    // CHA 14 (+2) + 2 × 3 = 8.
    expect(skills.get('Persuasion')).toMatchObject({ proficient: true, expertise: true, total: 8 })
    // DEX +4 + 3 = 7, proficient but not expert.
    expect(skills.get('Stealth')).toMatchObject({ proficient: true, expertise: false, total: 7 })
    // Untrained: the ability modifier alone.
    expect(skills.get('Athletics')).toMatchObject({ proficient: false, total: 0 })
  })

  it('names the governing ability', () => {
    const skills = new Map(getSkills(payload).map(s => [s.name, s]))
    expect(skills.get('Arcana')?.ability).toBe('INT')
    expect(skills.get('Athletics')?.ability).toBe('STR')
    expect(skills.get('Stealth')?.ability).toBe('DEX')
  })

  it('keeps a negative total', () => {
    const weak = getSkills({ level: 1, stats: abilities(8, 8, 8, 8, 8, 8) })
    expect(weak.find(s => s.name === 'Athletics')?.total).toBe(-1)
  })

  it('treats half-proficiency as proficiency', () => {
    const jack = getSkills({
      level: 5,
      stats: abilities(10, 10),
      modifiers: { class: [{ type: 'half-proficiency', subType: 'arcana' }] },
    })
    expect(jack.find(s => s.name === 'Arcana')).toMatchObject({ proficient: true, total: 3 })
  })
})

describe('getPassives', () => {
  it('is 10 plus the skill total', () => {
    const payload: DdbPayload = {
      level: 5,
      stats: abilities(10, 10, 10, 10, 16),
      modifiers: { class: [{ type: 'expertise', subType: 'perception' }] },
    }
    // WIS 16 (+3) + 2 × 3 = 9, so passive 19.
    expect(getPassives(payload).perception).toBe(19)
    // Insight is WIS +3 untrained → 13.
    expect(getPassives(payload).insight).toBe(13)
  })

  it('can be below 10', () => {
    expect(getPassives({ level: 1, stats: abilities(10, 10, 10, 8, 8, 10) }).investigation).toBe(9)
  })
})

describe('buildSpellcasting', () => {
  it('derives attack and DC from the class ability', () => {
    // Bard → CHA. CHA 18 (+4), level 13 → proficiency +5.
    const sc = buildSpellcasting({
      level: 13,
      stats: abilities(10, 10, 10, 10, 10, 18),
      classes: [{ level: 13, definition: { name: 'Bard' } }],
    })
    expect(sc).toEqual({ ability: 'CHA', mod: 4, attack: 9, dc: 17 })
  })

  it('is null for a non-caster', () => {
    expect(
      buildSpellcasting({ level: 5, stats: abilities(10, 10), classes: [{ level: 5, definition: { name: 'Rogue' } }] }),
    ).toBeNull()
  })

  // MYDND-53. Gabriela's payload, 2026-10-14: a Wand of the War Mage, +3 and a
  // Rhythm-Maker's Drum, +1, both equipped and attuned. The wand's bonus is the
  // generic `spell-attacks`; the drum's names the class.
  const wand = { id: 5219, name: 'Wand of the War Mage, +3' }
  const drum = { id: 2405721, name: "Rhythm-Maker's Drum, +1" }
  const bard = (inventory: DdbItem[], item: unknown[]) =>
    ({
      level: 13,
      stats: abilities(10, 10, 10, 10, 10, 20),
      classes: [{ level: 13, definition: { name: 'Bard' } }],
      inventory,
      modifiers: { item },
    }) as DdbPayload
  const wandBonus = { type: 'bonus', subType: 'spell-attacks', value: 3, requiresAttunement: true, componentId: 5219 }
  const drumBonuses = [
    { type: 'bonus', subType: 'bard-spell-save-dc', value: 1, requiresAttunement: true, componentId: 2405721 },
    { type: 'bonus', subType: 'bard-spell-attacks', value: 1, requiresAttunement: true, componentId: 2405721 },
  ]

  it('adds the spell attack and save DC bonuses of attuned, equipped items', () => {
    // CHA 20 (+5), level 13 → proficiency +5: attack +10, DC 18. The wand adds
    // 3 to attacks and the drum 1 to both: +14, DC 19.
    const sc = buildSpellcasting(
      bard(
        [
          { equipped: true, isAttuned: true, definition: wand },
          { equipped: true, isAttuned: true, definition: drum },
        ],
        [wandBonus, ...drumBonuses],
      ),
    )
    expect(sc).toEqual({ ability: 'CHA', mod: 5, attack: 14, dc: 19 })
  })

  it("ignores a bonus that names another class's spells", () => {
    const sc = buildSpellcasting(
      bard(
        [{ equipped: true, isAttuned: true, definition: drum }],
        [{ ...drumBonuses[1], subType: 'wizard-spell-attacks' }],
      ),
    )
    expect(sc?.attack).toBe(10)
  })

  it('ignores the wand while it is unattuned, and while it is in the bag', () => {
    // `modifiers.item` lists every item's modifiers whatever its state — the
    // payload carried the potions' resistances with `equipped: false`.
    const unattuned = buildSpellcasting(bard([{ equipped: true, isAttuned: false, definition: wand }], [wandBonus]))
    const stowed = buildSpellcasting(bard([{ equipped: false, isAttuned: true, definition: wand }], [wandBonus]))
    expect(unattuned?.attack).toBe(10)
    expect(stowed?.attack).toBe(10)
  })
})

// MYDND-36. Not read from the payload — `spellSlots.available` reads 0 — but
// worked out from the class levels, as the web app's DDB panel does.
describe('spell slots on the sheet', () => {
  it("works a caster's slots out from its class levels", () => {
    const sheet = buildSheet({ level: 5, stats: abilities(10, 10), classes: [{ level: 5, definition: { name: 'Wizard' } }] }, 1)
    expect(sheet.spell_slots).toEqual({ '1': 4, '2': 3, '3': 2 })
    expect(sheet.short_rest_slot_ranks).toEqual([])
  })

  it("refills a lone warlock's pact slots on a short rest", () => {
    const sheet = buildSheet({ level: 5, stats: abilities(10, 10), classes: [{ level: 5, definition: { name: 'Warlock' } }] }, 1)
    expect(sheet.spell_slots).toEqual({ '3': 2 })
    expect(sheet.short_rest_slot_ranks).toEqual([3])
  })

  it('writes an empty map for a class with no slots', () => {
    const sheet = buildSheet({ level: 5, stats: abilities(10, 10), classes: [{ level: 5, definition: { name: 'Rogue' } }] }, 1)
    expect(sheet.spell_slots).toEqual({})
  })

  // MYDND-139, in the shape of the two real Eldritch Knights: the class row
  // says it cannot cast, the subclass says it can and names Intelligence.
  const ek = (level: number) => ({
    level,
    definition: { name: 'Fighter', canCastSpells: false },
    subclassDefinition: { name: 'Eldritch Knight', canCastSpells: true, spellCastingAbilityId: 4 },
  })

  it("gives an Eldritch Knight the third-caster table, and INT to cast with (Zamar, 16)", () => {
    const sheet = buildSheet({ level: 16, stats: abilities(10, 10, 10, 18), classes: [ek(16)] }, 1)
    expect(sheet.spell_slots).toEqual({ '1': 4, '2': 3, '3': 3 })
    expect(sheet.spellcasting).toEqual({ ability: 'INT', mod: 4, attack: 9, dc: 17 })
  })

  it('adds a third of its levels to a multiclass, and casts with the full class (Brammand, EK 6 / Cleric 10)', () => {
    const sheet = buildSheet(
      {
        level: 16,
        stats: abilities(10, 10, 10, 18, 16),
        classes: [ek(6), { level: 10, definition: { name: 'Cleric', canCastSpells: true } }],
      },
      1,
    )
    // 10 + ⌊6/3⌋ = 12 on the full-caster table.
    expect(sheet.spell_slots).toEqual({ '1': 4, '2': 3, '3': 3, '4': 3, '5': 2, '6': 1 })
    // The Cleric is listed second and still wins: WIS, not the EK's INT.
    expect(sheet.spellcasting?.ability).toBe('WIS')
  })

  it("does not take a Soulknife's Rogue row for an Arcane Trickster (Gibbs)", () => {
    // The real row carries the Arcane Trickster's divisor of 3 anyway; only
    // the subclass flag decides.
    const sheet = buildSheet(
      {
        level: 14,
        stats: abilities(10, 10),
        classes: [
          {
            level: 14,
            definition: { name: 'Rogue', canCastSpells: false },
            subclassDefinition: { name: 'Soulknife', canCastSpells: false, spellCastingAbilityId: null },
          },
        ],
      },
      1,
    )
    expect(sheet.spell_slots).toEqual({})
    expect(sheet.spellcasting).toBeNull()
  })
})

describe('weapon proficiency and versatile dice (MYDND-139)', () => {
  const item = (name: string, def: Partial<DdbItemDefinition>): DdbItem => ({
    equipped: true,
    definition: { name, filterType: 'Weapon', attackType: 1, damage: { diceString: '1d8' }, properties: [], grantedModifiers: [], ...def },
  })
  // STR 16 (+3), level 5 → PB +3. A Wizard's list: simple weapons only.
  const wizard = (inventory: DdbItem[], extra: string[] = []): DdbPayload => ({
    level: 5,
    stats: abilities(16, 10),
    classes: [{ level: 5, definition: { name: 'Wizard' } }],
    modifiers: { class: ['simple-weapons', ...extra].map(subType => ({ type: 'proficiency', subType })) },
    inventory,
  })
  const hit = (p: DdbPayload, name: string) => buildAttacks(p).find(a => a.name === name)?.attack

  it('adds the proficiency bonus for a simple weapon and leaves it off a martial one', () => {
    const p = wizard([item('Quarterstaff', { categoryId: 1, type: 'Quarterstaff' }), item('Longsword', { categoryId: 2, type: 'Longsword' })])
    expect(hit(p, 'Quarterstaff')).toBe(6)
    expect(hit(p, 'Longsword')).toBe(3)
  })

  it("takes a single weapon's own proficiency, spelled as D&D Beyond slugs it", () => {
    const p = wizard([item('Hand Crossbow', { categoryId: 2, type: 'Crossbow, Hand', attackType: 2 })], ['crossbow-hand'])
    expect(hit(p, 'Hand Crossbow')).toBe(3) // DEX +0, PB +3
  })

  it('still assumes proficiency where the payload states none', () => {
    const p: DdbPayload = { level: 5, stats: abilities(16, 10), inventory: [item('Longsword', { categoryId: 2, type: 'Longsword' })] }
    expect(hit(p, 'Longsword')).toBe(6)
  })

  it('draws a Versatile weapon a second line for two hands, from the property notes', () => {
    const p = wizard([
      item('Quarterstaff', { categoryId: 1, type: 'Quarterstaff', damage: { diceString: '1d6' }, properties: [{ name: 'Versatile', notes: '1d8' }] }),
    ])
    const lines = buildAttacks(p).map(a => [a.name, a.attack, a.damage])
    expect(lines).toEqual([
      ['Quarterstaff', 6, '1d6+3'],
      ['Quarterstaff (two-handed)', 6, '1d8+3'],
    ])
  })

  it('ignores notes that are not dice', () => {
    const p = wizard([item('Odd Staff', { categoryId: 1, properties: [{ name: 'Versatile', notes: 'see text' }] })])
    expect(buildAttacks(p).map(a => a.name)).toEqual(['Odd Staff'])
  })
})

describe('buildSpells', () => {
  const spell = (name: string, level: number) => ({ definition: { name, level } })

  it('groups by level, sorted, with cantrips first', () => {
    const groups = buildSpells({
      classSpells: [{ spells: [spell('Fireball', 3), spell('Light', 0), spell('Mage Hand', 0)] }],
    })
    expect(groups.map(g => g.level)).toEqual([0, 3])
    expect(groups[0].spells).toEqual(['Light', 'Mage Hand'])
  })

  it('merges every source bucket and de-duplicates by name', () => {
    const groups = buildSpells({
      classSpells: [{ spells: [spell('Light', 0)] }],
      spells: { race: [spell('light', 0)], item: [spell('Shield', 1)] },
    })
    expect(groups[0].spells).toEqual(['Light'])
    expect(groups[1].spells).toEqual(['Shield'])
  })

  it('is empty for a non-caster', () => {
    expect(buildSpells({})).toEqual([])
  })
})

describe('buildFeats', () => {
  it('reads the names, and only the names', () => {
    expect(
      buildFeats({
        feats: [
          { definition: { name: 'Weapon Mastery', id: 1789214 }, componentId: 16346 },
          { definition: { name: 'Dark Bargain', id: 2048517 }, componentId: 54570 },
        ],
      }),
    ).toEqual(['Dark Bargain', 'Weapon Mastery'])
  })

  it('sorts, so a re-sync does not show as a diff in a note', () => {
    expect(buildFeats({ feats: [{ definition: { name: 'Lucky' } }, { definition: { name: 'Chef' } }] })).toEqual([
      'Chef',
      'Lucky',
    ])
  })

  it('dedupes case-insensitively', () => {
    // DDB has been observed repeating an entry across its own buckets.
    expect(
      buildFeats({ feats: [{ definition: { name: 'Lucky' } }, { definition: { name: 'lucky' } }] }),
    ).toEqual(['Lucky'])
  })

  it('skips an entry with no usable name', () => {
    expect(
      buildFeats({ feats: [null, { definition: null }, { definition: { name: '  ' } }, { definition: { name: ' Chef ' } }] }),
    ).toEqual(['Chef'])
  })

  it('is empty, not undefined, for a character with no feats', () => {
    expect(buildFeats({})).toEqual([])
  })

  it('does not read an ability score off a feat, because DDB already applied it', () => {
    // **The whole ruling, as an assertion** (MYDND-15). Measured on a real
    // payload: the `feat` modifier bucket carries `+1 charisma-score` and
    // `+1 dexterity-score`, and `getAbilityScore` sums every `bonus` across ALL
    // buckets — so the score below is 19, not 20. The catalog *also* models an
    // `ability_score_choice` for such a feat, and adding it would make 20.
    const withFeatAsi: DdbPayload = {
      stats: abilities(10, 10, 10, 10, 10, 18),
      feats: [{ definition: { name: 'Inspiring Leader' }, componentId: 1789092 }],
      modifiers: {
        feat: [{ type: 'bonus', subType: 'charisma-score', value: 1 }],
      },
    }
    expect(getAbilityScore(withFeatAsi, 6)).toBe(19)
    expect(buildFeats(withFeatAsi)).toEqual(['Inspiring Leader'])
  })
})

describe('buildSheet', () => {
  const payload: DdbPayload = {
    name: 'Test Character',
    level: 13,
    stats: abilities(10, 14, 14, 10, 10, 18),
    baseHitPoints: 80,
    classes: [
      { level: 13, definition: { name: 'Bard', hitDice: 8 }, subclassDefinition: { name: 'College of Lore' } },
    ],
    race: { fullName: 'Human' },
    decorations: { avatarUrl: 'https://example.invalid/portrait.jpeg' },
  }

  const sheet = buildSheet(payload, 147438576)

  it('stringifies the id, because identity is a string everywhere else', () => {
    expect(sheet.ddb_id).toBe('147438576')
    expect(typeof sheet.ddb_id).toBe('string')
  })

  it('formats the class line with its subclass and level', () => {
    expect(sheet.classes).toBe('Bard (College of Lore) 13')
    expect(sheet.subclasses).toEqual(['College of Lore'])
  })

  it('puts the feats on the sheet, which is what makes them resolvable', () => {
    // **Ungated on purpose.** Dropping `feats: buildFeats(payload)` from
    // `buildSheet` was only caught by `realDdb.test.ts`, which skips without a
    // payload — so in CI the whole feature could have been removed silently.
    // `useVitals` reads exactly this key; without it the effects pipeline sees
    // nothing but hand-typed names, which is the state MYDND-15 found.
    expect(buildSheet({ ...payload, feats: [{ definition: { name: 'Lucky' } }] }, '1').feats).toEqual(['Lucky'])
    expect(sheet.feats).toEqual([])
  })

  it('formats a multiclass line', () => {
    expect(
      buildSheet(
        {
          ...payload,
          level: 0,
          classes: [
            { level: 9, definition: { name: 'Rogue', hitDice: 8 }, subclassDefinition: { name: 'Soulknife' } },
            { level: 4, definition: { name: 'Fighter', hitDice: 10 } },
          ],
        },
        '1',
      ).classes,
    ).toBe('Rogue (Soulknife) 9 / Fighter 4')
  })

  it('sums class levels when the top-level level is absent', () => {
    expect(
      buildSheet(
        { ...payload, level: undefined, classes: [{ level: 9, definition: { name: 'Rogue' } }, { level: 4, definition: { name: 'Fighter' } }] },
        '1',
      ).level,
    ).toBe(13)
  })

  it('derives the proficiency bonus from the level when DDB omits it', () => {
    // Level 13 → ceil(13 / 4) + 1 = 5.
    expect(sheet.proficiency_bonus).toBe(5)
  })

  it('builds hit dice per class', () => {
    expect(sheet.hit_dice).toEqual([{ label: 'Bard', formula: '13d8' }])
  })

  it('puts inventory attacks before feature attacks', () => {
    // A weapon in hand is what a player looks for; a Soulknife has only features.
    const mixed = buildSheet(
      {
        ...payload,
        inventory: [
          {
            equipped: true,
            definition: { name: 'Dagger', filterType: 'Weapon', attackType: 1, damage: { diceString: '1d4' } },
          },
        ],
        actions: {
          class: [
            {
              name: 'Psychic Blades',
              abilityModifierStatId: 2,
              attackTypeRange: 1,
              isProficient: true,
              dice: { diceString: '1d6' },
            },
          ],
        },
      },
      '1',
    )
    expect(mixed.attacks.map(a => a.source)).toEqual(['item', 'feature'])
  })

  it('carries the avatar and the class line', () => {
    expect(sheet.avatar).toBe('https://example.invalid/portrait.jpeg')
    expect(sheet.race).toBe('Human')
  })

  it('writes the sheet version, which is a published format', () => {
    expect(sheet.version).toBe(1)
  })

  it('tolerates an almost empty payload rather than throwing', () => {
    // Every reader is defensive because the schema is unofficial and
    // state-dependent. A payload missing a bucket must degrade, not crash.
    const bare = buildSheet({}, '1')
    expect(bare.name).toBe('Unknown')
    expect(bare.level).toBe(1)
    expect(bare.classes).toBe('—')
    expect(bare.abilities).toHaveLength(6)
    expect(bare.skills).toHaveLength(18)
    expect(bare.attacks).toEqual([])
    expect(bare.hp.max).toBe(10)
  })

  it('never writes notePath into the sheet it builds', () => {
    // It is attached after reading and must not reach the file — a note
    // recording its own path is wrong the moment it is renamed.
    expect(sheet.notePath).toBeUndefined()
  })
})

// MYDND-37. Shapes copied from two real payloads (131273842, 147438576),
// fetched 2026-10-13 — including the zero-quantity potion and the Shield whose
// `type` is the empty string.
describe('the D&D Beyond inventory and purse', () => {
  const item = (quantity: number | undefined, definition: DdbItemDefinition & Record<string, unknown>, extra = {}): DdbItem =>
    ({ quantity, equipped: false, isAttuned: false, definition, ...extra }) as DdbItem

  it('carries every named item, read-only, with magic and attunement', () => {
    const payload: DdbPayload = {
      inventory: [
        item(1, { name: 'Wand of the War Mage, +3', type: 'Wand', filterType: 'Wand', rarity: 'Very Rare', magic: true }, { equipped: true, isAttuned: true }),
        item(5, { name: 'Oil', type: 'Gear', filterType: 'Other Gear', rarity: 'Common', magic: false }),
        item(1, { name: 'Shield', type: '', filterType: 'Armor', rarity: 'Common', magic: false }, { equipped: true }),
        item(0, { name: 'Potion of Force Resistance', type: 'Potion', rarity: 'Uncommon', magic: true }),
        item(1, { name: '  ' }),
        null as unknown as DdbItem,
      ],
    }
    expect(buildDdbItems(payload)).toEqual([
      { name: 'Wand of the War Mage, +3', quantity: 1, type: 'Wand', rarity: 'very rare', magic: true, equipped: true, attuned: true },
      // Mundane gear says `Common` on D&D Beyond; that is not a rarity worth a badge.
      { name: 'Oil', quantity: 5, type: 'Gear', rarity: null, magic: false, equipped: false, attuned: false },
      // An empty `type` falls through to `filterType`.
      { name: 'Shield', quantity: 1, type: 'Armor', rarity: null, magic: false, equipped: true, attuned: false },
    ])
  })

  it('reads a missing quantity as one, and an absent inventory as nothing', () => {
    expect(buildDdbItems({ inventory: [item(undefined, { name: 'Rope' })] })[0].quantity).toBe(1)
    expect(buildDdbItems({})).toEqual([])
  })

  it('keeps the purse, electrum included, floored at zero', () => {
    expect(buildDdbCurrency({ currencies: { cp: 3, sp: 0, gp: 73655, ep: 2, pp: -1 } })).toEqual({ pp: 0, gp: 73655, ep: 2, sp: 0, cp: 3 })
    expect(buildDdbCurrency({})).toEqual({ pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 })
  })

  it('lands on the sheet, where a re-sync replaces it', () => {
    const sheet = buildSheet({ inventory: [item(2, { name: 'Dagger', type: 'Weapon' })], currencies: { gp: 8 } }, '1')
    expect(sheet.ddb_items).toHaveLength(1)
    expect(sheet.ddb_currency?.gp).toBe(8)
  })
})

// MYDND-47. Shapes copied field-for-field from Gabriela's and Gibbs's payloads
// (2026-10-14); the counts are worked by hand below.
describe('buildClassResources', () => {
  const lu = (over: Record<string, unknown>) => ({
    maxUses: 0,
    numberUsed: 0,
    resetType: 2,
    statModifierUsesId: null,
    useProficiencyBonus: false,
    proficiencyBonusOperator: 1,
    ...over,
  })
  // Bard 13: PB 5. Charisma 20, so +5.
  const payload = {
    proficiencyBonus: 5,
    stats: abilities(8, 15, 14, 19, 12, 20),
    actions: {
      class: [
        // The base feature, long rest — and Font of Inspiration's short-rest copy.
        { name: 'Bardic Inspiration', dice: { diceString: '1d10' }, limitedUse: lu({ statModifierUsesId: 6 }) },
        { name: 'Bardic Inspiration', dice: { diceString: '1d10' }, limitedUse: lu({ statModifierUsesId: 6, resetType: 1 }) },
        { name: 'Psychic Veil', limitedUse: lu({ maxUses: 1 }) },
        { name: 'Cunning Action' },
      ],
      feat: [
        { name: 'Luck Points', limitedUse: lu({ useProficiencyBonus: true }) },
        // maxUses 1 multiplied by PB (operator 2): 5.
        { name: 'Gain Heroic Inspiration', limitedUse: lu({ maxUses: 1, useProficiencyBonus: true, proficiencyBonusOperator: 2, resetType: 1 }) },
      ],
    },
  } as unknown as DdbPayload
  const out = buildClassResources(payload)
  const byKey = new Map(out.map(r => [r.key, r]))

  it('counts a Charisma pool, and keeps the short-rest copy of a duplicate', () => {
    expect(byKey.get('bardic_inspiration')).toEqual({
      key: 'bardic_inspiration',
      name: 'Bardic Inspiration',
      uses: 5,
      resets: 'short_rest',
      roll: '1d10',
    })
  })

  it('adds or multiplies the proficiency bonus as the operator says', () => {
    expect(byKey.get('luck_points')?.uses).toBe(5)
    expect(byKey.get('gain_heroic_inspiration')?.uses).toBe(5)
  })

  it('reads a fixed count, and skips an action with no limit', () => {
    expect(byKey.get('psychic_veil')).toMatchObject({ uses: 1, resets: 'long_rest', roll: null })
    expect(byKey.has('cunning_action')).toBe(false)
    expect(out).toHaveLength(4)
  })

  it('is on the sheet', () => {
    expect(buildSheet(payload, '1').class_resources).toEqual(out)
  })
})
