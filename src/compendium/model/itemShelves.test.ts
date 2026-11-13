import { describe, expect, it } from 'vitest'

import type { MagicItemRow } from './items'
import {
  bonusLine,
  categoryOf,
  chargeLadder,
  chargesChip,
  effectLine,
  itemFlagsOf,
  iconOf,
  itemValueCp,
  kindLabel,
  parseCast,
  rechargeLine,
  rechargeTile,
  rowFlags,
  saveDcOf,
  shelfOf,
  itemShelfWhen,
  shelveItems,
  shortRestriction,
  UNKNOWN,
  VARIES,
  weightLabel,
} from './itemShelves'

/** A row as the reader makes it, with every key `export:items` writes since MYDND-76. */
function item(over: Partial<MagicItemRow>): MagicItemRow {
  return {
    id: 'x',
    path: 'magic-items/x.md',
    name: 'X',
    source: 'XDMG',
    itemType: null,
    rarity: 'rare',
    requiresAttunement: false,
    attunementRestriction: null,
    valueCp: null,
    loadoutSlot: null,
    bearingCost: null,
    bearingBonus: null,
    cursed: false,
    setName: null,
    tags: [],
    craftComponent: null,
    craftCreatureType: null,
    baseItemType: null,
    image: null,
    wondrous: false,
    staff: false,
    sentient: false,
    weight: null,
    charges: null,
    recharge: null,
    rechargeAmount: null,
    bonusAc: null,
    bonusWeapon: null,
    bonusSavingThrow: null,
    bonusSpellAttack: null,
    casts: [],
    summary: null,
    ...over,
  }
}

const WAND = item({
  name: 'Wand of Fireballs',
  itemType: 'Wand',
  requiresAttunement: true,
  attunementRestriction: 'by a spellcaster',
  weight: 1,
  charges: 7,
  recharge: 'dawn',
  rechargeAmount: '1d6 + 1',
  casts: ['Fireball (1 charge)'],
})

const WAND_PROSE =
  "This wand has 7 charges. While holding it, you can expend no more than 3 charges to cast Fireball (save DC 15) from it. For 1 charge, you cast the level 3 version of the spell. You can increase the spell's level by 1 for each additional charge you expend."

describe('shelves', () => {
  it('shelves by rarity, common first, then Varies and Unknown, any capitalisation', () => {
    const rows = [
      item({ id: 'a', name: 'B', rarity: 'Rare' }),
      item({ id: 'b', name: 'A', rarity: 'rare' }),
      item({ id: 'c', rarity: 'common' }),
      item({ id: 'd', rarity: 'varies' }),
      item({ id: 'e', rarity: 'unknown (magic)' }),
      item({ id: 'f', rarity: null }),
    ]
    const shelves = shelveItems(rows)
    expect(shelves.map(s => s.shelf.label)).toEqual(['Common', 'Uncommon', 'Rare', 'Very rare', 'Legendary', 'Artifact', 'Varies', 'Unknown'])
    expect(shelves[2].rows.map(r => r.name)).toEqual(['A', 'B'])
    expect(shelves[7].rows.map(r => r.id)).toEqual(['e', 'f'])
    expect(shelfOf('very rare').tone).toBe('veryrare')
  })

  it('says a shelf’s price and the level it suits', () => {
    expect(itemShelfWhen(shelfOf('rare'), 3, 500000)).toBe('≈5,000 GP · level 5+')
    expect(itemShelfWhen(shelfOf('common'), 3, 10000)).toBe('≈100 GP · any level')
    expect(itemShelfWhen(shelfOf('artifact'), 3, null)).toBe('priceless · one of a kind')
    expect(itemShelfWhen(VARIES, 3, null)).toBe('tier depends on the version')
    expect(itemShelfWhen(UNKNOWN, 1, null)).toBe('1 item')
    // A 0% campaign prices the band at nothing: the level still stands.
    expect(itemShelfWhen(shelfOf('rare'), 3, 0)).toBe('level 5+')
  })

  it('prices from the band, scaled, and never scales a hand-written price', () => {
    expect(itemValueCp({ rarity: 'very rare', valueCp: null }, 100)).toBe(2500000)
    expect(itemValueCp({ rarity: 'very rare', valueCp: null }, 50)).toBe(1250000)
    expect(itemValueCp({ rarity: 'rare', valueCp: 500000 }, 50)).toBe(500000)
    expect(itemValueCp({ rarity: 'artifact', valueCp: null }, 100)).toBeNull()
  })
})

describe('what an item is', () => {
  it('asks the staff and wondrous flags before the type', () => {
    expect(categoryOf(item({ itemType: 'Melee Weapon', staff: true }))).toBe('Staff')
    expect(categoryOf(item({ itemType: null, wondrous: true }))).toBe('Wondrous')
    expect(categoryOf(item({ itemType: 'Heavy Armor' }))).toBe('Armor')
    expect(categoryOf(item({ itemType: 'Generic Variant' }))).toBe('Variant')
    // The exporter's leaked code is no category.
    expect(categoryOf(item({ itemType: 'PR:M' }))).toBe('Other')
    expect(kindLabel(item({ itemType: 'PR:M' }))).toBe('Magic item')
  })

  it('labels the kind as the canvas does', () => {
    expect(kindLabel(item({ wondrous: true }))).toBe('Wondrous item')
    expect(kindLabel(item({ itemType: 'Melee Weapon', staff: true }))).toBe('Staff · quarterstaff')
    expect(kindLabel(item({ itemType: 'Melee Weapon' }))).toBe('Melee weapon')
    expect(kindLabel(WAND)).toBe('Wand')
  })

  it('draws a wondrous item as its namesake, anything else as its category', () => {
    expect(iconOf(item({ wondrous: true, name: 'Cloak of Displacement' }))).toBe('cloak')
    expect(iconOf(item({ wondrous: true, name: 'Bag of Holding' }))).toBe('bag')
    expect(iconOf(item({ wondrous: true, name: 'Sending Stones' }))).toBe('stones')
    expect(iconOf(item({ wondrous: true, name: 'Driftglobe' }))).toBe('gem')
    expect(iconOf(WAND)).toBe('wand')
    // A variant is drawn as what it is stamped onto.
    expect(iconOf(item({ itemType: 'Generic Variant', name: '+1 Shield' }))).toBe('shield')
    expect(iconOf(item({ itemType: 'Generic Variant', name: 'Armor of Gleaming' }))).toBe('armor')
    expect(iconOf(item({ itemType: 'Generic Variant', name: 'Vorpal Sword' }))).toBe('sword')
    // A cloak that is armour is armour.
    expect(iconOf(item({ itemType: 'Light Armor', name: 'Cloak Armor' }))).toBe('armor')
  })
})

describe('what an item does', () => {
  it('reads a cast and its cost back from the exporter’s string', () => {
    expect(parseCast('Fireball (1 charge)')).toEqual({ name: 'Fireball', cost: '1 charge', charges: 1 })
    expect(parseCast('Cone of Cold (5 charges)')).toEqual({ name: 'Cone of Cold', cost: '5 charges', charges: 5 })
    expect(parseCast('Fly (1/day)')).toEqual({ name: 'Fly', cost: '1/day', charges: null })
    expect(parseCast('Light')).toEqual({ name: 'Light', cost: null, charges: null })
  })

  it('says one bonus to AC and saves once, as the ring is drawn', () => {
    expect(bonusLine(item({ bonusAc: '+1', bonusSavingThrow: '+1' }))).toBe('+1 AC and saving throws')
    expect(bonusLine(item({ bonusWeapon: '+2', bonusAc: '+2', bonusSavingThrow: '+2', bonusSpellAttack: '+2' }))).toBe(
      '+2 attack & damage · +2 AC and saving throws · +2 spell attacks',
    )
    expect(bonusLine(item({ bonusSavingThrow: '+1' }))).toBe('+1 saves')
    expect(bonusLine(item({}))).toBeNull()
  })

  it('makes the card’s line from what it casts and its bonuses, or nothing', () => {
    expect(effectLine(WAND)).toBe('Cast Fireball')
    expect(effectLine(item({ casts: ['Sending (1/day)'] }))).toBe('Cast Sending · 1/day')
    expect(effectLine(item({ casts: ['A (1 charge)', 'B (2 charges)', 'C (5 charges)'] }))).toBe('Casts 3 spells')
    expect(effectLine(item({}))).toBeNull()
  })

  it('says when and how much comes back, and reads homebrew’s amount-for-a-period', () => {
    expect(rechargeLine(WAND)).toBe('+1d6+1 at dawn')
    expect(rechargeLine(item({ recharge: 'dawn', rechargeAmount: 'all' }))).toBe('all at dawn')
    expect(rechargeLine(item({ recharge: 'restLong' }))).toBe('on a long rest')
    expect(rechargeLine(item({ recharge: '1d4' }))).toBe('+1d4')
    expect(rechargeLine(item({ recharge: 'special' }))).toBeNull()
    expect(rechargeTile(WAND)).toEqual({ label: 'AT DAWN', value: '+1d6+1' })
    expect(rechargeTile(item({ recharge: 'special' }))).toEqual({ label: 'RECHARGE', value: 'See text' })
  })

  it('counts charges left, warning when they run low', () => {
    expect(chargesChip(7, 0)).toEqual({ tone: 'fits', text: '7 of 7 charges' })
    expect(chargesChip(7, 3)).toEqual({ tone: 'fits', text: '4 of 7 charges' })
    expect(chargesChip(7, 5)).toEqual({ tone: 'over', text: '2 of 7 charges left' })
    expect(chargesChip(7, 6)).toEqual({ tone: 'over', text: 'Last charge' })
    expect(chargesChip(7, 9)).toEqual({ tone: 'over', text: 'No charges left' })
  })

  it('weighs in pounds, with a half as drawn', () => {
    expect(weightLabel(0.5)).toBe('½ lb')
    expect(weightLabel(5)).toBe('5 lb')
    expect(weightLabel(null)).toBeNull()
    expect(weightLabel(0)).toBeNull()
  })

  it('shortens a restriction for a card and keeps it whole for its title', () => {
    expect(shortRestriction('by a spellcaster')).toBe('spellcaster')
    expect(shortRestriction('by a sorcerer, warlock, or wizard')).toBe('3 classes')
    expect(shortRestriction('by a creature of good alignment')).toBe('restricted')
    const [attune] = itemFlagsOf(WAND)
    expect(attune).toEqual({ text: 'Attune · spellcaster', tone: 'attune', title: 'Requires attunement by a spellcaster' })
  })

  it('flags charges, consumables, curses and sentience', () => {
    expect(itemFlagsOf(WAND).map(f => f.text)).toEqual(['Attune · spellcaster', '7 charges'])
    expect(itemFlagsOf(item({ itemType: 'Potion' })).map(f => f.text)).toEqual(['Consumable'])
    expect(itemFlagsOf(item({ cursed: true, sentient: true })).map(f => f.text)).toEqual(['Cursed', 'Sentient'])
    expect(rowFlags(item({ requiresAttunement: true, cursed: true }))).toBe('ATT CURSE')
  })
})

describe('the open item', () => {
  const fireball = (level: number) => `${level + 5}d6`

  it('reads "Charges per cast" from an XDMG wand’s prose', () => {
    const ladder = chargeLadder(WAND_PROSE, parseCast('Fireball (1 charge)'), fireball)
    expect(ladder).toEqual([
      { label: '1 CHARGE', dice: 'L3 · 8d6', base: true },
      { label: '2 CHARGES', dice: 'L4 · 9d6', base: false },
      { label: '3 CHARGES', dice: 'L5 · 10d6', base: false },
    ])
  })

  it('draws no ladder unless the prose says all three things', () => {
    expect(chargeLadder(WAND_PROSE.replace('no more than 3 charges', 'charges'), parseCast('Fireball (1 charge)'), fireball)).toBeNull()
    // A wand that casts at one level only: "no more than" and "level 3", no growth.
    expect(
      chargeLadder(WAND_PROSE.replace(/ You can increase[^.]*\./, ''), parseCast('Fireball (1 charge)'), fireball),
    ).toBeNull()
    expect(chargeLadder(WAND_PROSE, parseCast('Fireball (2 charges)'), fireball)).toBeNull()
    expect(chargeLadder(WAND_PROSE, null, fireball)).toBeNull()
    // No spell note to read dice from: the levels alone.
    expect(chargeLadder(WAND_PROSE, parseCast('Fireball (1 charge)'), () => null)?.[0].dice).toBe('L3')
  })

  it('reads the save DC the text states', () => {
    expect(saveDcOf(WAND_PROSE)).toBe('Save DC 15')
    expect(saveDcOf('No save at all.')).toBeNull()
  })
})
