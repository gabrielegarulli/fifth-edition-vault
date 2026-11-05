---
title: Warrior Veteran
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 3
xp: 700
type: humanoid
size: Small/Medium
ac: 17
hp: 65
speed: 30
tags:
  - monster
  - humanoid
  - cr3
  - srd-5-2-1
aliases:
  - Warrior Veteran
export_hash: sha256-a0e22b16493d
---

```statblock
columns: 2
forceColumns: true
name: Warrior Veteran
source: SRD 5.2.1
size: Small/Medium
type: humanoid
alignment: Neutral
ac: 17
hp: 65
hit_dice: 10d8 + 20
speed: 30 ft.
initiative: "+3 (13)"
stats: [16, 13, 14, 10, 11, 10]
skillsaves:
  - athletics: 5
  - perception: 2
gear: "Greatsword, Heavy Crossbow, Splint Armor"
passive: 12
languages: Common plus one other language
cr: "3"
actions:
  - name: "Multiattack"
    desc: "The warrior makes two Greatsword or Heavy Crossbow attacks."
  - name: "Greatsword"
    desc: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 10 (2d6 + 3) Slashing damage."
  - name: "Heavy Crossbow"
    desc: "*Ranged Attack Roll:* +3, range 100/400 ft. *Hit:* 12 (2d10 + 1) Piercing damage."
reactions:
  - name: "Parry"
    desc: "*Trigger:* The warrior is hit by a melee attack roll while holding a weapon. *Response:* The warrior adds 2 to its AC against that attack, possibly causing it to miss."
```
