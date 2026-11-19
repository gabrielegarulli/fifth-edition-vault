# Magic items

[Back to the index](index.md)

A magic item note lists on the Magic items page and in the shop, can be given
to a character, and, once worn or attuned, can put numbers on their sheet:
a bonus to Armor Class, to attacks, to a spell save DC, and charges to spend.
The card's facts are frontmatter; what the item **does** to a character is an
effect in the ` ```vault-magic-item ` fence.

## The smallest magic item that works

<!-- template: magic-item.minimal.md -->
````markdown
---
title: "Cloak of Kindled Embers"
source: "Homebrew"
rarity: "uncommon"
requires_attunement: true
tags:
  - "magic-item"
---

# Cloak of Kindled Embers

While you wear this cloak, you have Resistance to Cold damage.
````

- `rarity` is lower case: `"common"`, `"uncommon"`, `"rare"`, `"very rare"`,
  `"legendary"`, `"artifact"`.
- `requires_attunement` is `true` or `false`, unquoted.

This one is a description and nothing more: its Resistance to Cold is prose (see
the mistakes below).

## Every key the plugin reads

<!-- template: magic-item.full.md -->
````markdown
---
title: "Cloak of Kindled Embers"
source: "Homebrew"
edition: "5.5e"
item_type: "Wondrous Item"
wondrous: true
rarity: "uncommon"
requires_attunement: true
cursed: false
weight: 1
charges: 3
recharge: "dawn"
recharge_amount: "1d3"
bonus_ac: "+1"
casts:
  - "Ember Ward"
summary: "+1 AC and Resistance to Cold while worn; 3 charges to cast Ember Ward."
tags:
  - "magic-item"
  - "rarity/uncommon"
  - "attunement"
  - "homebrew"
aliases:
  - "Cloak of Kindled Embers"
---

# Cloak of Kindled Embers

*Wondrous Item, uncommon (requires attunement) | Source: Homebrew*

While you wear this cloak, you gain a +1 bonus to Armor Class and you have
Resistance to Cold damage.

The cloak has 3 charges. While wearing it, you can expend 1 charge to cast
*Ember Ward* from it. The cloak regains 1d3 expended charges daily at dawn.

```vault-magic-item
effects:
  - type: "ac_bonus"
    amount: 1
```
````

| Key | What it does |
| --- | --- |
| `item_type` | the card's category: `"Wondrous Item"`, `"Armor"`, `"Weapon"`, `"Ring"` |
| `wondrous`, `cursed` | `true` adds the fact to the card; leave either out for `false` |
| `weight` | pounds |
| `charges` | how many charges the item holds; the character sheet keeps count |
| `recharge` | when they come back: `"dawn"`, `"dusk"`, `"midnight"`, `"restShort"`, `"restLong"` |
| `recharge_amount` | how many come back: `"1d3"`, or a number |
| `casts` | the spells it casts, one line each, shown on the card and the sheet |
| `bonus_ac` | **a caption only**: the card shows it, the sheet does not add it |
| `bonus_spell_attack` | `"+2"`: shown on the card, **and** added to spell attacks while the item is worn |
| `summary` | one line for the card when it has nothing else to show |

**The fence is where the item works.** Its `effects` list is what the sheet
applies while the item is worn (and attuned, if it requires attunement). An
item understands these effect types:

| Type | Keys | Example |
| --- | --- | --- |
| `ac_bonus` | `amount` | a +1 cloak or ring |
| `attack_roll_bonus`, `damage_roll_bonus` | `amount` | a bonus to every attack |
| `weapon_attack_bonus`, `weapon_damage_bonus` | `amount` | a +1 weapon's own bonus |
| `weapon_extra_damage` | `damage`, with its `dice` and `type` | a flame tongue's extra fire |
| `spell_attack_bonus`, `spell_save_dc_bonus` | `amount` | a wand of the war mage |
| `ability_score_set` | `ability`, `score` | gauntlets that set Strength to 19 |
| `unarmed_strike_die` | `die` | wraps that harden a fist |

For the exact keys of one you have not written before, open a magic item in
your Magic items folder that does the same thing, and copy its block.

## Mistakes to avoid

- **`bonus_ac: "+1"` adds nothing to Armor Class.** It is a caption. The bonus
  is an `ac_bonus` effect in the fence, as in the full example. A magic weapon,
  armour or shield is the exception: a `+1` in its name (`Lantern Pole, +1`) is
  read as its bonus.
- **An item cannot grant a resistance, a skill or a sense.** None of those is an
  item effect type, so "Resistance to Cold while worn" stays prose: the table
  applies it, the sheet does not. The plugin says nothing about an effect it
  ignores.
- **`charges` without `recharge`** gives the item charges that never come back
  on their own.
