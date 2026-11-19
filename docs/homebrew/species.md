# Species

[Back to the index](index.md)

A species note is offered in the Character Builder's species step. Its size,
speed and darkvision are frontmatter; its traits are a list in the
` ```vault-species ` fence, and a trait with [effects](effects.md) puts them on
the character sheet.

## The smallest species that works

<!-- template: species.minimal.md -->
````markdown
---
title: "Mossborn"
source: "Homebrew"
size: "Medium"
speed: 30
tags:
  - "species"
---

# Mossborn

```vault-species
traits:
  - key: "mossy_hide"
    name: "Mossy Hide"
    text: "You have Resistance to Poison damage."
    effects:
      - type: "resistance"
        value: "poison"
```
````

- `size` and `speed` (walking speed in feet, a number) are shown in the
  builder's species list.
- `traits` is a list. Each trait has a `key` (lower case, unique within the
  species), the `name` and `text` the sheet shows, and any `effects`.

## Every key the plugin reads

<!-- template: species.full.md -->
````markdown
---
title: "Mossborn"
source: "Homebrew"
edition: "5.5e"
creature_type: "Humanoid"
size: "Small or Medium"
speed: 30
darkvision: 60
tags:
  - "species"
  - "size/small"
  - "size/medium"
  - "homebrew"
aliases:
  - "Mossborn"
---

# Mossborn

*Species | Source: Homebrew*

Mossborn grow up in the damp hollows under old forests, and their skin carries
a soft green moss from birth.

```vault-species
traits:
  - key: "overview"
    text: "Mossborn are patient folk of the deep woods."
  - key: "creature_type"
    name: "Creature Type"
    text: "You are a Humanoid."
  - key: "size"
    name: "Size"
    text: "You are Small or Medium (chosen when you select this species)."
  - key: "speed"
    name: "Speed"
    text: "Your walking Speed is 30 feet."
  - key: "darkvision"
    name: "Darkvision"
    text: "You have Darkvision with a range of 60 feet."
  - key: "mossy_hide"
    name: "Mossy Hide"
    text: "You have Resistance to Poison damage."
    effects:
      - type: "resistance"
        value: "poison"
  - key: "forest_sense"
    name: "Forest Sense"
    text: "You have proficiency in the Survival skill."
    effects:
      - type: "skill_proficiency"
        skill: "survival"
  - key: "deep_roots"
    name: "Deep Roots"
    text: "Your Hit Point maximum increases by 1, and it increases by 1 again whenever you gain a level."
    effects:
      - type: "hp_bonus_per_level"
        amount: 1
  - key: "woodland_tongue"
    name: "Woodland Tongue"
    text: "You can speak, read, and write Common and one other language of your choice."
proficiencies:
  - kind: "language"
    fixed:
      - "Common"
  - kind: "language"
    key: "language"
    count: 1
```
````

- **`darkvision`** is the range in feet, in **frontmatter**. The plugin turns it
  into the character's Darkvision; a Darkvision trait in the fence is the
  description only.
- **`size: "Small or Medium"`** is how a species that lets the player choose
  says so, as the books do.
- **`creature_type`** is for you and your searches; the plugin does not read it.
- The `overview` trait, with no name and no effects, is the sentence that opens
  the species' description. The size, speed and creature type traits are
  description too: the numbers come from frontmatter.
- **Deep Roots** uses `hp_bonus_per_level`, an effect outside the
  [short list](effects.md): `amount: 1` adds 1 hit point at each level.
- **`proficiencies`** lists the skills, tools, languages and weapons the
  species grants. Each entry has a `kind` (`skill`, `tool`, `language` or
  `weapon`) and either `fixed`, what the character simply has, or a choice the
  builder asks: a `key` (unique within the species, `language`, `skill_2`), a
  `count`, and optionally `from`, the list to choose from. With no `from`, any
  of that kind is offered; `category: "standard"` narrows a language to the
  Standard Languages, and `artisan`, `instrument` or `gaming` narrows a tool.
  Skills are snake_case (`sleight_of_hand`) and tools kebab-case
  (`smiths-tools`); languages and weapons are names.
- **`feat`**, which Mossborn does not have, is a feat of the player's choice,
  asked on the Species step as the Human's Versatile is: `feat: { count: 1,
  kinds: ["origin"] }`. `kinds` is the feat notes' own `kind`; without it the
  builder offers Origin and General feats.

## Mistakes to avoid

- **Darkvision in the fence alone gives no darkvision.** Put the range in
  frontmatter.
- **A trait with no `effects` is text only.** The sheet shows it; nothing on
  the sheet changes because of it.
- **The sheet credits an effect to the species, not to the trait.** A player
  who asks where their Poison resistance came from is told "Mossborn". That is
  expected.
