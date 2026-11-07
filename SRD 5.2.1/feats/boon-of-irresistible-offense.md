---
title: Boon of Irresistible Offense
source: SRD 5.2.1
edition: SRD 5.2.1
kind: epic_boon
prerequisite: Level 19+
abilities:
  - dex
  - str
benefit_count: 3
modelled_count: 1
tags:
  - feat
  - feat/epic-boon
  - srd-5-2-1
aliases:
  - Boon of Irresistible Offense
export_hash: sha256-b0f4de25378a
---

# Boon of Irresistible Offense

*epic boon · Level 19+ | Source: SRD 5.2.1*

You gain the following benefits.

**Overcome Defenses.** The Bludgeoning, Piercing, and Slashing damage you deal always ignores Resistance.

**Overwhelming Strike.** When you roll a 20 on the d20 for an attack roll, you can deal extra damage to the target equal to the ability score increased by this feat. The extra damage's type is the same as the attack's type.

```vault-feat
benefits:
  - key: ability_score_increase
    name: Ability Score Increase
    text: Increase your Strength or Dexterity score by 1, to a maximum of 30.
    effects:
      - type: ability_score_choice
        options:
          - str
          - dex
        amount: 1
        max: 30
  - key: overview
    text: You gain the following benefits.
  - key: overcome_defenses
    name: Overcome Defenses
    text: The Bludgeoning, Piercing, and Slashing damage you deal always ignores Resistance.
  - key: overwhelming_strike
    name: Overwhelming Strike
    text: When you roll a 20 on the d20 for an attack roll, you can deal extra damage to the target equal to the ability score increased by this feat. The extra damage's type is the same as the attack's type.
```
