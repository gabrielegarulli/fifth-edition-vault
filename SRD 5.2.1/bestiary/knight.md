---
title: Knight
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 3
xp: 700
type: humanoid
size: Small/Medium
ac: 18
hp: 52
speed: 30
tags:
  - monster
  - humanoid
  - cr3
  - srd-5-2-1
aliases:
  - Knight
export_hash: sha256-6e196f1411ef
---

```statblock
columns: 2
forceColumns: true
name: Knight
source: SRD 5.2.1
size: Small/Medium
type: humanoid
alignment: Neutral
ac: 18
hp: 52
hit_dice: 8d8 + 16
speed: 30 ft.
initiative: "+0 (10)"
stats: [16, 11, 14, 11, 11, 15]
saves:
  - constitution: 4
  - wisdom: 2
gear: "Greatsword, Heavy Crossbow, Plate Armor"
condition_immunities: Frightened
passive: 10
languages: Common plus one other language
cr: "3"
actions:
  - name: "Multiattack"
    desc: "The knight makes two attacks, using Greatsword or Heavy Crossbow in any combination."
  - name: "Greatsword"
    desc: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 10 (2d6 + 3) Slashing damage plus 4 (1d8) Radiant damage."
  - name: "Heavy Crossbow"
    desc: "*Ranged Attack Roll:* +2, range 100/400 ft. *Hit:* 11 (2d10) Piercing damage plus 4 (1d8) Radiant damage."
reactions:
  - name: "Parry"
    desc: "*Trigger:* The knight is hit by a melee attack roll while holding a weapon. *Response:* The knight adds 2 to its AC against that attack, possibly causing it to miss."
```
