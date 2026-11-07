---
title: Cloud Giant
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 9
xp: 5000
type: giant
size: Huge
ac: 14
hp: 200
speed: 40
moves:
  - fly
spellcasting: true
tags:
  - monster
  - giant
  - cr9
  - srd-5-2-1
aliases:
  - Cloud Giant
export_hash: sha256-1052c87e884e
---

```statblock
columns: 2
forceColumns: true
name: Cloud Giant
source: SRD 5.2.1
size: Huge
type: giant
alignment: Neutral
ac: 14
hp: 200
hit_dice: 16d12 + 96
speed: 40 ft., Fly 20 ft. (hover)
initiative: "+4 (14)"
stats: [27, 10, 22, 12, 16, 16]
saves:
  - constitution: 10
  - wisdom: 7
skillsaves:
  - insight: 7
  - perception: 11
passive: 21
languages: Common, Giant
cr: "9"
actions:
  - name: "Multiattack"
    desc: "The giant makes two attacks, using Thunderous Mace or Thundercloud in any combination. It can replace one attack with a use of Spellcasting to cast [[Fog Cloud]]."
  - name: "Thunderous Mace"
    desc: "*Melee Attack Roll:* +12, reach 10 ft. *Hit:* 21 (3d8 + 8) Bludgeoning damage plus 7 (2d6) Thunder damage."
  - name: "Thundercloud"
    desc: "*Ranged Attack Roll:* +12, range 240 ft. *Hit:* 18 (3d6 + 8) Thunder damage, and the target has the [[Incapacitated]] condition until the end of its next turn."
  - name: "Spellcasting"
    desc: "The giant casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 15):\n- **At Will:** [[Detect Magic]], [[Fog Cloud]], [[Light]]\n- **1/Day Each:** [[Control Weather]], [[Gaseous Form]], [[Telekinesis]]"
bonus_actions:
  - name: "Misty Step"
    desc: "The giant casts the [[Misty Step]] spell, using the same spellcasting ability as Spellcasting.\n- **At Will:** [[Misty Step]]"
```
