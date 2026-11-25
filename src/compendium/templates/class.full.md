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
