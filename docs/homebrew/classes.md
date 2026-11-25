# Classes

[Back to the index](index.md)

A class note lists on the Classes page and is offered in the Character
Builder's class step. Its hit die is frontmatter; everything the class *gives*
(saving throws, skills, armour and weapon training, spell slots, features, the
level its subclass arrives at) is in the ` ```vault-class ` fence. A class is the
biggest note there is, so start from the minimal one and add to it.

## The smallest class that works

<!-- template: class.minimal.md -->
````markdown
---
title: "Lanternkeeper"
source: "Homebrew"
hit_die: "d8"
tags:
  - "class"
---

# Lanternkeeper

```vault-class
name: "Lanternkeeper"
source: "Homebrew"
hit_die: 8
data:
  saveProficiencies:
    - "wis"
    - "cha"
features:
  - name: "Guiding Light"
    level: 1
    description: "You always know which way is north, and you can't become lost by nonmagical means."
  - name: "Lanternkeeper Subclass"
    level: 3
    description: "You gain a Lanternkeeper subclass of your choice."
```
````

- `hit_die` is `"d8"` in frontmatter and the number `8` in the fence; both are
  read.
- `data.saveProficiencies` are the two saving throws, lower case.
- `features` is a list, as on a [subclass](subclasses.md): `name`, `level`,
  `description`, and any `effects` under `data`.
- **The feature named `<Class> Subclass`** (here `Lanternkeeper Subclass`) sets
  the level at which the builder asks for a subclass. Without it, that level is
  3.

This class can be built and levelled: hit points, saving throws, and its two
features. It grants no skills, no armour or weapon training and no spell slots,
and it never asks for an Ability Score Improvement.

## Every key the plugin reads

<!-- template: class.full.md -->
````markdown
---
title: "Lanternkeeper"
source: "Homebrew"
edition: "5.5e"
type: "class"
hit_die: "d8"
primary_ability: "WIS"
spellcasting_ability: "WIS"
saving_throws:
  - "WIS"
  - "CHA"
tags:
  - "class"
  - "hit-die/d8"
  - "homebrew"
aliases:
  - "Lanternkeeper"
---

# Lanternkeeper

*Class | Source: Homebrew*

Lanternkeepers guide travellers through dark places, and the light they carry
answers to their will.

| Level | PB | Features | Lantern Flares |
| :---: | :---: | :--- | :---: |
| 1st | +2 | Guiding Light, Lantern Flare, Spellcasting | 2 |
| 2nd | +2 | Steady Hands | 2 |
| 3rd | +2 | Lanternkeeper Subclass | 3 |
| 4th | +2 | Ability Score Improvement | 3 |

```vault-class
name: "Lanternkeeper"
source: "Homebrew"
edition: "5.5e"
hit_die: 8
spellcasting_ability: "wis"
data:
  primaryAbility:
    - wis: true
  saveProficiencies:
    - "wis"
    - "cha"
  skillChoices:
    count: 2
    options:
      - "insight"
      - "medicine"
      - "perception"
      - "survival"
  startingProficiencies:
    armor:
      - "light armor"
      - "medium armor"
    weapons:
      - "simple weapons"
  multiclassProficiencies:
    armor:
      - "light armor"
  subclassTitle: "Lanternkeeper Subclass"
  spellcastingAbility: "wis"
  casterProgression: "1/2-2024"
  preparedSpellsChange: "restLong"
features:
  - name: "Guiding Light"
    level: 1
    description: "You always know which way is north, and you can't become lost by nonmagical means."
  - name: "Lantern Flare"
    level: 1
    description: "As a Bonus Action, you make your light flare. Each creature of your choice within 10 feet of you has Disadvantage on its next attack roll before the start of your next turn. You can use this feature twice, and you regain all expended uses when you finish a Short or Long Rest."
    data:
      effects:
        - type: "feature_resource"
          key: "lanternkeeper_lantern_flare"
          name: "Lantern Flare"
          uses: 2
          resets: "short_rest"
  - name: "Spellcasting"
    level: 1
    description: "You prepare spells from the Lanternkeeper spell list, using Wisdom as your spellcasting ability."
  - name: "Steady Hands"
    level: 2
    description: "You gain proficiency in the Sleight of Hand skill."
    data:
      effects:
        - type: "skill_proficiency"
          skill: "sleight_of_hand"
  - name: "Lanternkeeper Subclass"
    level: 3
    description: "You gain a Lanternkeeper subclass of your choice."
  - name: "Ability Score Improvement"
    level: 4
    description: "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
    choices:
      type: "asi"
```
````

The fence's `data` block, part by part:

| Key | What it does |
| --- | --- |
| `primaryAbility` | the class's main ability, as a map: `wis: true` |
| `skillChoices` | the skills a new character picks: a `count` and the `options`, with underscores (`sleight_of_hand`) |
| `startingProficiencies` | `armor` and `weapons` the class is trained in at level 1 |
| `multiclassProficiencies` | what a character gains taking this class second |
| `subclassTitle` | the class's word for its subclasses, and the name of the feature above |
| `spellcastingAbility` | lower case: `"wis"` |
| `casterProgression` | which spell slot table it uses (below) |
| `preparedSpellsChange` | when a caster may change prepared spells: `"restLong"` |

`casterProgression` is one of:

| Value | Slots |
| --- | --- |
| `"1"` | a full caster, from level 1 |
| `"1/2-2024"` | a half caster, from level 1 |
| `"1/2"` | a half caster, from level 2 |
| `"1/3"` | a third caster, from level 3 |
| `"pact"` | pact magic: few slots, all of one level, back on a Short Rest |

Match the table to the level your Spellcasting feature arrives at. The
example's arrives at level 1, so it writes `"1/2-2024"`; `"1/2"` would leave it
with no slots until level 2.

Two features show the rest:

- **Lantern Flare** gives the character a use counter with `feature_resource`.
- **Ability Score Improvement** carries `choices: {type: "asi"}`, which is what
  makes the builder ask for two +1s or a feat at that level. The feature's name
  alone does nothing.

In frontmatter, `primary_ability`, `spellcasting_ability` and `saving_throws`
are the Classes page's copies of the fence's values, in capitals; keep the two
in agreement.

## Mistakes to avoid

- **No `choices: {type: "asi"}`, no Ability Score Improvement.** Add a feature
  with it at every level the class gets one (4, 8, 12, 16 and 19 for most).
- **Skills use underscores** in `skillChoices` and in effects:
  `"sleight_of_hand"`. A space grants nothing.
- **A spell list is the spells' business.** A class has no list of its own: a
  spell joins it by naming the class in its `classes` (see [Spells](spells.md)).
- **A new class has no subclasses** until you write one that names it in
  `class`.
