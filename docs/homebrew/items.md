# Items

[Back to the index](index.md)

An item note is mundane equipment: gear, tools, weapons and armour. It lists on
the Items page and in the GM's shop, goes into a character's inventory, and a
weapon gets an attack on the sheet. Its list keys are in the frontmatter; a
weapon's attack also reads the ` ```vault-item ` fence.

For anything magical, see [Magic items](magic-items.md).

## The smallest item that works

<!-- template: item.minimal.md -->
````markdown
---
title: "Lantern Pole"
source: "Homebrew"
item_type: "Adventuring Gear"
cost_cp: 50
tags:
  - "item"
---

# Lantern Pole

A 10-foot pole with an iron hook at one end for hanging a lantern.
````

- `item_type` is the item's category as the books name it: `"Adventuring Gear"`,
  `"Melee Weapon"`, `"Ranged Weapon"`, `"Light Armor"`, `"Tool"`.
- `cost_cp` is the price **in copper pieces**: 50 is 5 silver, 1500 is 15 gold.
  The shop sells at it.

## Every key the plugin reads, for a weapon

<!-- template: item.full.md -->
````markdown
---
title: "Lantern Pole"
source: "Homebrew"
edition: "5.5e"
item_type: "Melee Weapon"
weapon_category: "simple"
cost_cp: 50
weight: 6
damage: "1d6"
damage_type: "Bludgeoning"
versatile_damage: "1d8"
properties:
  - "Reach"
  - "Versatile"
mastery: "Topple"
tags:
  - "item"
  - "item/melee-weapon"
  - "weapon/simple"
  - "homebrew"
aliases:
  - "Lantern Pole"
---

# Lantern Pole

*Melee Weapon, simple | Source: Homebrew*

A 10-foot pole with an iron hook at one end. A lantern hung from the hook sheds
its light from the pole's tip, and the pole still serves as a weapon.

```vault-item
damage: "1d6"
damage_type: "Bludgeoning"
versatile_damage: "1d8"
properties:
  - "Reach"
  - "Versatile"
mastery: "Topple"
weight: 6
```
````

| Key | What it does |
| --- | --- |
| `weapon_category` | `"simple"` or `"martial"`; decides whether a character is proficient |
| `damage`, `damage_type` | the attack's dice and type |
| `versatile_damage` | the two-handed dice, for a Versatile weapon |
| `properties` | the weapon's properties, as the books name them |
| `range` | a ranged or thrown weapon's range, such as `"80/320"` |
| `mastery` | the weapon's mastery property |
| `weight` | pounds; counted toward what a character carries |

**The fence repeats the weapon's numbers, and the character sheet reads the
fence.** The frontmatter is the Items page's copy, for listing and comparing.
The sheet takes `damage`, `damage_type`, `versatile_damage`, `range`,
`properties`, `mastery` and `weight` from the ` ```vault-item ` block. Write
them in both places, and keep the two in agreement.

Armour works the same way, with three keys of its own, in both places: `ac`
(the base Armor Class), `strength` (the Strength score it needs) and
`stealth_disadvantage: true`. A pack can list what is in it in frontmatter, as
`pack_contents`, one `"<quantity> <name>"` line each. For any other key, open an
item in your Items folder that is like yours and copy what it carries.

## Mistakes to avoid

- **`cost_cp` is copper, not gold.** A 15 gp item is `cost_cp: 1500`.
- **A weapon or armour with no fence** lists and sells, but the character sheet
  sees none of its numbers: no damage, no mastery, no Armor Class.
- **Quote dice**: `damage: "1d6"`. Unquoted, YAML still reads it as text, but
  a quoted value cannot be misread.
