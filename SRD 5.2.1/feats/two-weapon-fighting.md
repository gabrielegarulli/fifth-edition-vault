---
title: Two-Weapon Fighting
source: SRD 5.2.1
edition: SRD 5.2.1
kind: fighting_style
prerequisite: Fighting Style feature
benefit_count: 1
modelled_count: 1
tags:
  - feat
  - feat/fighting-style
  - srd-5-2-1
aliases:
  - Two-Weapon Fighting
export_hash: sha256-316c613da265
---

# Two-Weapon Fighting

*fighting style · Fighting Style feature | Source: SRD 5.2.1*

When you make an extra attack as a result of using a weapon that has the Light property, you can add your ability modifier to the damage of that attack if you aren't already adding it to the damage.

```vault-feat
benefits:
  - key: overview
    text: When you make an extra attack as a result of using a weapon that has the Light property, you can add your ability modifier to the damage of that attack if you aren't already adding it to the damage.
    effects:
      - type: damage_roll_bonus
        amount:
          kind: ability_modifier
          ability: attack
        weapon:
          offHand: true
```
