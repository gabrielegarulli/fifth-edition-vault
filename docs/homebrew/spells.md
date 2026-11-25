# Spells

[Back to the index](index.md)

A spell note puts a spell on the Spells page, on the spell lists of the classes
you name, and, if you give it dice, behind a Cast button that rolls them.
There is no fence: everything a spell needs is in its frontmatter, and its
description is the note's body.

## The smallest spell that works

<!-- template: spell.minimal.md -->
````markdown
---
title: "Ember Ward"
source: "Homebrew"
level: 1
school: "Abjuration"
classes:
  - "Wizard"
tags:
  - "spell"
---

# Ember Ward

A ring of low embers circles you. Until the start of your next turn, a creature
that ends its turn within 5 feet of you takes 1d6 Fire damage.
````

- `title` is the name the lists show.
- `level` is the spell's level, `0` for a cantrip. Without it the spell reads as
  level −1 and sorts ahead of every cantrip.
- `classes` names the classes whose lists hold it, each **as its class note
  titles it** (`"Wizard"`, or `"Lanternkeeper"` for a homebrew class). Without
  it no class can prepare the spell.
- `school` is optional, but the Spells page filters on it.

## Every key the plugin reads

<!-- template: spell.full.md -->
````markdown
---
title: "Ember Ward"
source: "Homebrew"
edition: "5.5e"
level: 1
school: "Abjuration"
casting_time: "Bonus Action"
range: "Self"
components: "V, S, M (a pinch of ash)"
duration: "Concentration, up to 1 minute"
concentration: true
ritual: false
classes:
  - "Lanternkeeper"
  - "Sorcerer"
  - "Wizard"
damage_types:
  - "fire"
damage_dice: "1d6"
upcast_dice: "1d6"
upcast_every: 1
tags:
  - "spell"
  - "spell/level-1"
  - "homebrew"
aliases:
  - "Ember Ward"
---

# Ember Ward

*Level 1 Abjuration*

A ring of low embers circles you for the duration. A creature that ends its
turn within 5 feet of you takes 1d6 Fire damage.

**Using a Higher-Level Spell Slot.** The damage increases by 1d6 for each spell
slot level above 1.
````

What the extra keys add:

| Key | What it does |
| --- | --- |
| `casting_time`, `range`, `components`, `duration` | shown on the spell's card, as written |
| `concentration`, `ritual` | `true` or `false`; the Spells page filters on both |
| `damage_types` | lower-case damage types; the Spells page filters on them |
| `damage_dice` | what Cast rolls, such as `"1d6"` or `"8d6"` |
| `upcast_dice` | what each slot level above the spell's own adds to `damage_dice` |
| `upcast_every` | how many slot levels each `upcast_dice` takes: `2` for "for every two slot levels above". Leave it out, or `1`, for every level |
| `edition` | `"5.5e"` or `"5e"`, shown with the spell |
| `aliases` | other names Obsidian links and search find it by |

Three more dice keys are read, for spells that need them:

- `heal_dice` instead of `damage_dice` for a healing spell, with `heal_mod: true`
  when the healing adds the caster's spellcasting modifier;
- `cantrip_dice` for a damage cantrip: a list of four dice, for character levels
  1, 5, 11 and 17 (`["1d10", "2d10", "3d10", "4d10"]`).

The `spell/level-1` tag is for your own searches; the plugin reads `level`.

## Mistakes to avoid

- **A spell with no dice keys rolls nothing.** The description can say "8d6
  Fire damage" as often as it likes; Cast reads `damage_dice`.
- **A class name that does not match a class note** puts the spell on no list.
  `"wizard"` and `"Wizard"` both work; `"Wizards"` does not.
- **Write `true` and `false` for `concentration` and `ritual`**, unquoted.
  `yes` is read as text by Obsidian's YAML; the plugin accepts it, but `true`
  means the same thing everywhere.
