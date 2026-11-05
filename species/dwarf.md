---
title: Dwarf
source: SRD 5.2.1
edition: SRD 5.2.1
size: Medium
speed: 30 ft.
creature_type: humanoid
darkvision: 120
tags:
  - species
  - size/medium
  - srd-5-2-1
aliases:
  - Dwarf
export_hash: sha256-49f9a4c38400
---

# Dwarf

*Medium, 30 ft. | Source: SRD 5.2.1*

**Darkvision.** You have Darkvision with a range of 120 feet.

**Dwarven Resilience.** You have Resistance to Poison damage. You also have Advantage on saving throws you make to avoid or end the [[Poisoned]] condition.

**Dwarven Toughness.** Your Hit Point maximum increases by 1, and it increases by 1 again whenever you gain a level.

**Stonecunning.** As a Bonus Action, you gain Tremorsense with a range of 60 feet for 10 minutes. You must be on a stone surface or touching a stone surface to use this Tremorsense. The stone can be natural or worked.

You can use this Bonus Action a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.

```vault-species
traits:
  - key: darkvision
    name: Darkvision
    text: You have Darkvision with a range of 120 feet.
  - key: dwarven_resilience
    name: Dwarven Resilience
    text: You have Resistance to Poison damage. You also have Advantage on saving throws you make to avoid or end the Poisoned condition.
  - key: dwarven_toughness
    name: Dwarven Toughness
    text: Your Hit Point maximum increases by 1, and it increases by 1 again whenever you gain a level.
    effects:
      - type: hp_bonus_per_level
        amount: 1
  - key: stonecunning
    name: Stonecunning
    text: |-
      As a Bonus Action, you gain Tremorsense with a range of 60 feet for 10 minutes. You must be on a stone surface or touching a stone surface to use this Tremorsense. The stone can be natural or worked.

      You can use this Bonus Action a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.
```
