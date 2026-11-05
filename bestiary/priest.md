---
title: Priest
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 2
xp: 450
type: humanoid
subtype: cleric
size: Small/Medium
ac: 13
hp: 38
speed: 30
spellcasting: true
tags:
  - monster
  - humanoid
  - cleric
  - cr2
  - srd-5-2-1
aliases:
  - Priest
export_hash: sha256-75e6a947f56c
---

```statblock
columns: 2
forceColumns: true
name: Priest
source: SRD 5.2.1
size: Small/Medium
type: humanoid
subtype: cleric
alignment: Neutral
ac: 13
hp: 38
hit_dice: 7d8 + 7
speed: 30 ft.
initiative: "+0 (10)"
stats: [16, 10, 12, 13, 16, 13]
skillsaves:
  - medicine: 7
  - perception: 5
  - religion: 5
gear: "Chain Shirt, Holy Symbol, Mace"
passive: 15
languages: Common plus one other language
cr: "2"
actions:
  - name: "Multiattack"
    desc: "The priest makes two attacks, using Mace or Radiant Flame in any combination."
  - name: "Mace"
    desc: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 6 (1d6 + 3) Bludgeoning damage plus 5 (2d4) Radiant damage."
  - name: "Radiant Flame"
    desc: "*Ranged Attack Roll:* +5, range 60 ft. *Hit:* 11 (2d10) Radiant damage."
  - name: "Spellcasting"
    desc: "The priest casts one of the following spells, using Wisdom as the spellcasting ability:\n- **At Will:** [[Light]], [[Thaumaturgy]]\n- **1/Day:** [[Spirit Guardians]]"
bonus_actions:
  - name: "Divine Aid (3/Day)"
    desc: "The priest casts [[Bless]], [[Dispel Magic]], [[Healing Word]], or [[Lesser Restoration]], using the same spellcasting ability as Spellcasting.\n- **3/Day:** [[Bless]], [[Dispel Magic]], [[Healing Word]], [[Lesser Restoration]]"
```
