import { describe, expect, it, vi } from 'vitest'

import { toggleKeyOf, type ResolvedEffect } from '../content/featEffects'
import { applyOffer, describeOffer, diceToRethrow, interventionRecord, offersFor, type RollState } from './interventions'

/**
 * The three `dice_intervention` modes, over the real `rollEngine.js`.
 *
 * Nothing is stubbed out of the engine: `interventions`, `applyFloor`,
 * `applyReroll` and `applyTwice` are the submodule's own. What is tested here is
 * the adapter — the gate, the shapes, and the rule that a declined re-throw
 * leaves the roll alone instead of substituting RNG.
 */

const effect = (over: Record<string, unknown>): ResolvedEffect =>
  ({
    type: 'dice_intervention',
    source: 'Great Weapon Master',
    sourceKind: 'feat',
    // Load-bearing: `effectKey` is null without it, and `effectApplies` then
    // refuses every activated effect. `featEffects.ts` stamps the note slug.
    sourceFeatureId: 'great-weapon-master',
    benefitKey: 'gwm',
    benefitName: 'Heavy Weapon Mastery',
    ...over,
  }) as ResolvedEffect

/** A 2d6 damage roll of 1 and 5, plus 3. */
const damageRoll = (): RollState => ({
  dice: [{ count: 2, qty: 2, sides: 6, damageType: 'slashing', results: [1, 5] }],
  modifier: 3,
  total: 9,
})

describe('offersFor', () => {
  it('offers a floor, and says what the total would become', () => {
    const offers = offersFor(damageRoll(), [effect({ mode: 'floor', to: 3 })], { rollType: 'damage' })
    expect(offers).toHaveLength(1)
    expect(offers[0].mode).toBe('floor')
    expect(offers[0].to).toBe(3)
    // Only the 1 qualifies; a floor never lowers the 5.
    expect(offers[0].targets.map(t => t.face)).toEqual([1])
    expect(offers[0].total).toBe(9)
    expect(offers[0].nextTotal).toBe(11)
  })

  it('offers nothing when no die qualifies', () => {
    const roll: RollState = { dice: [{ count: 2, qty: 2, sides: 6, results: [5, 6] }], modifier: 0, total: 11 }
    expect(offersFor(roll, [effect({ mode: 'floor', to: 3 })], { rollType: 'damage' })).toEqual([])
  })

  it('refuses a scope it cannot evaluate', () => {
    // A damage-scoped effect asked about a roll whose type nobody recorded is a
    // question with no answer, and waving it through would put Great Weapon
    // Fighting on an Intelligence check.
    const effects = [effect({ mode: 'floor', to: 3, scope: 'damage' })]
    expect(offersFor(damageRoll(), effects, { rollType: null })).toEqual([])
    expect(offersFor(damageRoll(), effects, { rollType: 'check' })).toEqual([])
    expect(offersFor(damageRoll(), effects, { rollType: 'damage' })).toHaveLength(1)
  })

  it('refuses a floor with no target number', () => {
    // Not a weaker floor — an unauthored one.
    expect(offersFor(damageRoll(), [effect({ mode: 'floor' })], { rollType: 'damage' })).toEqual([])
  })

  it('takes only the worst die for a reroll', () => {
    // Piercer's "reroll one of the damage dice" — and the worst one is the die a
    // player would pick anyway, so there is no second prompt.
    const offers = offersFor(damageRoll(), [effect({ mode: 'reroll', source: 'Piercer' })], {
      rollType: 'damage',
    })
    expect(offers[0].targets.map(t => t.face)).toEqual([1])
  })

  it('narrows a reroll by damage type, and refuses a die with none recorded', () => {
    const piercing = [effect({ mode: 'reroll', damageType: 'piercing', source: 'Piercer' })]
    expect(offersFor(damageRoll(), piercing, { rollType: 'damage' })).toEqual([])

    const untyped: RollState = {
      dice: [{ count: 1, qty: 1, sides: 6, damageType: null, results: [2] }],
      modifier: 0,
      total: 2,
    }
    expect(offersFor(untyped, piercing, { rollType: 'damage' })).toEqual([])
  })

  it('gates an activated effect on its key being switched on', () => {
    // `applicableEffects` is the activation gate. Without it, every activated
    // effect would be permanently on.
    const activated = [effect({ mode: 'floor', to: 3, activation: 'activated' })]
    expect(offersFor(damageRoll(), activated, { rollType: 'damage' })).toEqual([])

    // The key is `<sourceKind>:<sourceFeatureId>:<benefitKey>`, built by the
    // engine's own `effectKey` rather than spelled out here.
    const key = toggleKeyOf(activated[0])
    expect(key).toBe('feat:great-weapon-master:gwm')
    expect(offersFor(damageRoll(), activated, { rollType: 'damage', activeKeys: [key!] })).toHaveLength(1)
  })

  it('refuses an activated effect that names no source, rather than always allowing it', () => {
    // The safe direction, and a content bug rather than a state. It is also the
    // failure mode `featEffects.ts` had before it stamped `sourceFeatureId`.
    const orphan = { ...effect({ mode: 'floor', to: 3, activation: 'activated' }) }
    delete (orphan as Record<string, unknown>).sourceFeatureId
    expect(toggleKeyOf(orphan as ResolvedEffect)).toBeNull()
    expect(offersFor(damageRoll(), [orphan as ResolvedEffect], { rollType: 'damage', activeKeys: ['anything'] })).toEqual(
      [],
    )
  })

  it('ignores every effect type but dice_intervention', () => {
    const others = [
      effect({ type: 'ability_score_choice', options: ['str'] }),
      effect({ type: 'speed', amount: 10 }),
    ]
    expect(offersFor(damageRoll(), others, { rollType: 'damage' })).toEqual([])
  })

  it('offers in the order the effects arrived, because the head is the one prompted', () => {
    const offers = offersFor(
      damageRoll(),
      [
        effect({ mode: 'reroll', source: 'Piercer' }),
        effect({ mode: 'floor', to: 3, source: 'Great Weapon Master' }),
      ],
      { rollType: 'damage' },
    )
    // Not ranked by gain — ranking would be the app choosing which of a
    // player's feats they use.
    expect(offers.map(o => o.mode)).toEqual(['reroll', 'floor'])
  })
})

describe('applyOffer', () => {
  it('applies a floor with no dice thrown at all', async () => {
    const roll = damageRoll()
    const offer = offersFor(roll, [effect({ mode: 'floor', to: 3 })], { rollType: 'damage' })[0]
    const rethrow = vi.fn(async () => null)

    const { roll: next, applied } = await applyOffer(roll, offer, rethrow)
    expect(applied).toBe(true)
    // Great Weapon Fighting's whole point: no new dice.
    expect(rethrow).not.toHaveBeenCalled()
    expect(next.dice[0].results).toEqual([3, 5])
    expect(next.total).toBe(11)
    // The original stays legible — `replaced`, never `dropped`.
    expect(next.dice[0].replaced).toEqual([{ index: 0, from: 1, to: 3 }])
  })

  it('rerolls through the roller it was given, so the die is really thrown', async () => {
    const roll = damageRoll()
    const offer = offersFor(roll, [effect({ mode: 'reroll' })], { rollType: 'damage' })[0]

    const groups = diceToRethrow(roll, offer)
    expect(groups).toEqual([{ qty: 1, sides: 6, damageType: 'slashing' }])

    const { roll: next, applied } = await applyOffer(roll, offer, async () => [{ results: [6] }])
    expect(applied).toBe(true)
    expect(next.dice[0].results).toEqual([6, 5])
    expect(next.total).toBe(14)
  })

  it('leaves the roll unchanged when the re-throw declines', async () => {
    // The roll has already happened. Substituting invented faces for the ones a
    // player asked to see again would be the log lying about where a number
    // came from — so this does not fall back to RNG.
    const roll = damageRoll()
    const offer = offersFor(roll, [effect({ mode: 'reroll' })], { rollType: 'damage' })[0]
    const { roll: next, applied } = await applyOffer(roll, offer, async () => null)
    expect(applied).toBe(false)
    expect(next).toBe(roll)
  })

  it('re-throws the whole bundle for twice, and keeps the second', async () => {
    const roll = damageRoll()
    const offer = offersFor(roll, [effect({ mode: 'twice', source: 'Savage Attacker' })], {
      rollType: 'damage',
    })[0]
    expect(diceToRethrow(roll, offer)).toEqual([{ qty: 2, sides: 6, damageType: 'slashing' }])

    const { roll: next } = await applyOffer(roll, offer, async () => [{ results: [4, 4] }])
    expect(next.dice[0].results).toEqual([4, 4])
    expect(next.total).toBe(11)
    // Both bundles stay in the record.
    expect(next.dice[0].replaced).toEqual([
      { index: 0, from: 1, to: 4 },
      { index: 1, from: 5, to: 4 },
    ])
  })

  it('keeps the modifier across every mode', async () => {
    for (const mode of ['floor', 'reroll', 'twice'] as const) {
      const roll = damageRoll()
      const e = mode === 'floor' ? effect({ mode, to: 3 }) : effect({ mode })
      const offer = offersFor(roll, [e], { rollType: 'damage' })[0]
      const { roll: next } = await applyOffer(roll, offer, async () => [{ results: [2, 2] }])
      expect(next.modifier).toBe(3)
    }
  })
})

describe('describeOffer', () => {
  it("prefers the effect's own prompt", () => {
    const roll = damageRoll()
    const offer = offersFor(roll, [effect({ mode: 'floor', to: 3, prompt: 'Hew?' })], {
      rollType: 'damage',
    })[0]
    expect(describeOffer(offer)).toBe('Hew?')
  })

  it('names the faces when there is no prompt', () => {
    const roll = damageRoll()
    const floor = offersFor(roll, [effect({ mode: 'floor', to: 3 })], { rollType: 'damage' })[0]
    expect(describeOffer(floor)).toBe('Treat the 1 as 3?')
    const reroll = offersFor(roll, [effect({ mode: 'reroll' })], { rollType: 'damage' })[0]
    expect(describeOffer(reroll)).toBe('Reroll the 1?')
  })
})

describe('interventionRecord', () => {
  it('records where the total came from and where it went', () => {
    const roll = damageRoll()
    const offer = offersFor(roll, [effect({ mode: 'floor', to: 3 })], { rollType: 'damage' })[0]
    const after: RollState = { ...roll, total: 11 }
    expect(interventionRecord(offer, roll, after)).toEqual({
      mode: 'floor',
      source: 'Great Weapon Master',
      from: 9,
      to: 11,
    })
  })
})
