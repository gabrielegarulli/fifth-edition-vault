---
title: Priest Acolyte
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 1/4
xp: 50
type: humanoid
subtype: cleric
size: Small/Medium
ac: 13
hp: 11
speed: 30
spellcasting: true
tags:
  - monster
  - humanoid
  - cleric
  - cr1-4
  - srd-5-2-1
aliases:
  - Priest Acolyte
export_hash: sha256-e4d6ab2edc62
---

```statblock
columns: 2
forceColumns: true
name: Priest Acolyte
source: SRD 5.2.1
size: Small/Medium
type: humanoid
subtype: cleric
alignment: Neutral
ac: 13
hp: 11
hit_dice: 2d8 + 2
speed: 30 ft.
initiative: "+0 (10)"
stats: [14, 10, 12, 10, 14, 11]
skillsaves:
  - medicine: 4
  - religion: 2
gear: "Chain Shirt, Holy Symbol, Mace"
passive: 12
languages: Common
cr: "1/4"
actions:
  - name: "Mace"
    desc: "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 5 (1d6 + 2) Bludgeoning damage plus 2 (1d4) Radiant damage."
  - name: "Radiant Flame"
    desc: "*Ranged Attack Roll:* +4, range 60 ft. *Hit:* 7 (2d6) Radiant damage."
  - name: "Spellcasting"
    desc: "The priest casts one of the following spells, using Wisdom as the spellcasting ability:\n- **At Will:** [[Light]], [[Thaumaturgy]]"
bonus_actions:
  - name: "Divine Aid (1/Day)"
    desc: "The priest casts [[Bless]], [[Healing Word]], or [[Sanctuary]], using the same spellcasting ability as Spellcasting.\n- **1/Day:** [[Bless]], [[Healing Word]], [[Sanctuary]]"
```
