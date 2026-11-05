---
title: Storm Giant
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 13
xp: 10000
type: giant
size: Huge
ac: 16
hp: 230
speed: 50
moves:
  - fly
  - swim
spellcasting: true
tags:
  - monster
  - giant
  - cr13
  - srd-5-2-1
aliases:
  - Storm Giant
export_hash: sha256-d57d59bf9074
---

```statblock
columns: 2
forceColumns: true
name: Storm Giant
source: SRD 5.2.1
size: Huge
type: giant
alignment: Chaotic Good
ac: 16
hp: 230
hit_dice: 20d12 + 100
speed: 50 ft., Fly 25 ft. (hover), Swim 50 ft.
initiative: "+7 (17)"
stats: [29, 14, 20, 16, 20, 18]
saves:
  - strength: 14
  - constitution: 10
  - wisdom: 10
  - charisma: 9
skillsaves:
  - arcana: 8
  - athletics: 14
  - history: 8
  - perception: 10
resistances: Cold
immunities: Lightning, Thunder
senses: Darkvision 120 ft., Truesight 30 ft.
passive: 20
languages: Common, Giant
cr: "13"
traits:
  - name: "Amphibious"
    desc: "The giant can breathe air and water."
actions:
  - name: "Multiattack"
    desc: "The giant makes two attacks, using Storm Sword or Thunderbolt in any combination."
  - name: "Storm Sword"
    desc: "*Melee Attack Roll:* +14, reach 10 ft. *Hit:* 23 (4d6 + 9) Slashing damage plus 13 (3d8) Lightning damage."
  - name: "Thunderbolt"
    desc: "*Ranged Attack Roll:* +14, range 500 ft. *Hit:* 22 (2d12 + 9) Lightning damage, and the target has the [[Blinded]] and [[Deafened]] conditions until the start of the giant's next turn."
  - name: "Lightning Storm (Recharge 5–6)"
    desc: "*Dexterity Saving Throw:* DC 18, each creature in a 10-foot-radius, 40-foot-high Cylinder originating from a point the giant can see within 500 feet. *Failure:* 55 (10d10) Lightning damage. *Success:* Half damage."
  - name: "Spellcasting"
    desc: "The giant casts one of the following spells, requiring no Material components and using Wisdom as the spellcasting ability (spell save DC 18):\n- **At Will:** [[Detect Magic]], [[Light]]\n- **1/Day:** [[Control Weather]]"
```
