---
title: "Hearthguard"
class: "Fighter"
source: "Homebrew"
subclass_title: "Fighter Subclass"
tags:
  - "subclass"
  - "subclass/fighter"
  - "homebrew"
aliases:
  - "Hearthguard"
  - "Fighter: Hearthguard"
---

# Hearthguard

*Subclass for [[fighter|Fighter]] | Source: Homebrew*

Hearthguards stand watch over the places people gather, and carry a little of
the hearth's fire into every fight.

## Level 3: Keeper of the Flame

You gain proficiency in Wisdom saving throws, and you know the *Light* cantrip.

## Level 3: Ward the Hearth

As a Bonus Action, you can give each ally within 10 feet of you Temporary Hit
Points equal to your Fighter level. You can use this feature a number of times
equal to your Proficiency Bonus, and you regain all expended uses when you
finish a Long Rest.

## Level 7: Watchful Eye

You gain proficiency in one of the following skills of your choice: Insight,
Perception or Survival.

## Level 10: Unbowed

You have Resistance to Fire damage.

```vault-subclass
name: "Hearthguard"
short_name: "Hearthguard"
class_name: "Fighter"
class_source: "XPHB"
source: "Homebrew"
data:
  additionalSpells:
    - known:
        3:
          - "light#c"
features:
  - name: "Keeper of the Flame"
    level: 3
    description: "You gain proficiency in Wisdom saving throws, and you know the *Light* cantrip."
    data:
      effects:
        - type: "saving_throw_proficiency"
          ability: "wis"
  - name: "Ward the Hearth"
    level: 3
    description: "As a Bonus Action, you can give each ally within 10 feet of you Temporary Hit Points equal to your Fighter level. You can use this feature a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest."
    data:
      effects:
        - type: "feature_resource"
          key: "hearthguard_ward_the_hearth"
          name: "Ward the Hearth"
          uses:
            kind: "proficiency_bonus"
          resets: "long_rest"
  - name: "Watchful Eye"
    level: 7
    description: "You gain proficiency in one of the following skills of your choice: Insight, Perception or Survival."
    choices:
      type: "skill"
      count: 1
      options:
        - "insight"
        - "perception"
        - "survival"
  - name: "Unbowed"
    level: 10
    description: "You have Resistance to Fire damage."
    data:
      effects:
        - type: "resistance"
          value: "fire"
```
