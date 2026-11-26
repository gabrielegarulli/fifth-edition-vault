---
title: Eyes of Minute Seeing
source: SRD 5.2.1
edition: SRD 5.2.1
rarity: uncommon
requires_attunement: false
cursed: false
wondrous: true
summary: These crystal lenses fit over the eyes.
tags:
  - magic-item
  - rarity/uncommon
  - srd-5-2-1
aliases:
  - Eyes of Minute Seeing
export_hash: sha256-c9f5685258b6
---

# Eyes of Minute Seeing

*uncommon | Source: SRD 5.2.1*

These crystal lenses fit over the eyes. While wearing them, your vision improves significantly out to a range of 1 foot, granting you Darkvision within that range and Advantage on Intelligence (Investigation) checks made to examine something within that range.

```vault-magic-item
effects:
  - type: ability_check_advantage
    ability: int
    skill: investigation
    trigger: within 1 foot
```
