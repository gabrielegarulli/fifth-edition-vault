---
title: Great Weapon Fighting
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
  - Great Weapon Fighting
export_hash: sha256-769e1ac8f374
---

# Great Weapon Fighting

*fighting style · Fighting Style feature | Source: SRD 5.2.1*

When you roll damage for an attack you make with a Melee weapon that you are holding with two hands, you can treat any 1 or 2 on a damage die as a 3. The weapon must have the Two-Handed or Versatile property to gain this benefit.

```vault-feat
benefits:
  - key: overview
    text: When you roll damage for an attack you make with a Melee weapon that you are holding with two hands, you can treat any 1 or 2 on a damage die as a 3. The weapon must have the Two-Handed or Versatile property to gain this benefit.
    effects:
      - on:
          - 1
          - 2
        to: 3
        mode: floor
        type: dice_intervention
        scope: damage
        weapon:
          grip: two-handed
          category: melee
```
