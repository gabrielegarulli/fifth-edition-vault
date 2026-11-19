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
