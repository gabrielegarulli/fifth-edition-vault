import { emptyEffect, type EffectForm } from '../effects'
import { emptyForm, type BuilderForm, type FeatForm } from '../forms'
import type { BuilderKind } from '../kinds'

/**
 * Every builder's form, every field filled in (MYDND-233): what the builder
 * suite reads back, and what the edit suite round-trips (MYDND-272).
 */

export const effect = (type: EffectForm['type'], over: Partial<EffectForm> = {}): EffectForm => ({ ...emptyEffect(type), ...over })

/** Hearthbound Resolve, as a GM fills the feat builder in: the full feat template's feat. */
export function hearthbound(): FeatForm {
  return {
    ...emptyForm('feat', 'Homebrew'),
    name: 'Hearthbound Resolve',
    featKind: 'general',
    prerequisite: 'Level 4+',
    description: 'You carry the warmth of home with you. You gain the following benefits.',
    benefits: [
      {
        name: 'Ability Score Increase',
        text: 'Increase your Constitution or Wisdom score by 1, to a maximum of 20.',
        effects: [effect('ability_score_choice', { options: ['con', 'wis'] })],
      },
      { name: 'Steady Flame', text: 'You have Resistance to Fire damage.', effects: [effect('resistance', { damageType: 'fire' })] },
      {
        name: "Hearth's Rest",
        text: 'When you finish a Short Rest, you can regain one spent Hit Point Die.',
        effects: [effect('feature_resource', { name: "Hearth's Rest", uses: '1', resets: 'long_rest' })],
      },
    ],
  }
}

/** Every field of every kind filled in. */
export const FULL: Record<BuilderKind, () => BuilderForm> = {
  spell: () => ({
    ...emptyForm('spell', 'Homebrew'),
    name: 'Ember Ward',
    level: '1',
    school: 'Abjuration',
    castingTime: 'Bonus Action',
    range: 'Self',
    components: 'V, S, M (a pinch of ash)',
    duration: 'Concentration, up to 1 minute',
    concentration: true,
    classes: ['Sorcerer', 'Wizard'],
    damageDice: '1d6',
    damageType: 'fire',
    upcastDice: '1d6',
    upcastEvery: '2',
    description: 'A ring of low embers circles you for the duration.',
  }),
  condition: () => ({ ...emptyForm('condition', 'Homebrew'), name: 'Smouldering', description: '**Embers.** You take 1d4 Fire damage.' }),
  item: () => ({
    ...emptyForm('item', 'Lantern Codex'),
    name: 'Lantern Pole',
    itemType: 'Melee Weapon',
    costGp: '0.5',
    weight: '6',
    weaponCategory: 'simple',
    damage: '1d6',
    damageType: 'bludgeoning',
    versatileDamage: '1d8',
    properties: ['Reach', 'Versatile'],
    mastery: 'Topple',
    description: 'A 10-foot pole with an iron hook at one end.',
  }),
  'magic-item': () => ({
    ...emptyForm('magic-item', 'Homebrew'),
    name: 'Cloak of Kindled Embers',
    itemType: 'Wondrous Item',
    rarity: 'uncommon',
    requiresAttunement: true,
    attunementRestriction: 'a Lanternkeeper',
    weight: '1',
    charges: '3',
    recharge: 'dawn',
    rechargeAmount: '1d3',
    casts: ['Ember Ward'],
    effects: [effect('ac_bonus', { amount: '1' }), effect('resistance', { damageType: 'cold' })],
    description: 'While you wear this cloak, you gain a +1 bonus to Armor Class.',
  }),
  feat: hearthbound,
}
