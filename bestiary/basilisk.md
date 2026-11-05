---
title: Basilisk
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 3
xp: 700
type: monstrosity
size: Medium
ac: 15
hp: 52
speed: 20
tags:
  - monster
  - monstrosity
  - cr3
  - srd-5-2-1
aliases:
  - Basilisk
export_hash: sha256-f61046f62a68
---

```statblock
columns: 2
forceColumns: true
name: Basilisk
source: SRD 5.2.1
size: Medium
type: monstrosity
alignment: Unaligned
ac: 15
hp: 52
hit_dice: 8d8 + 16
speed: 20 ft.
initiative: "-1 (9)"
stats: [16, 8, 15, 2, 8, 7]
senses: Darkvision 60 ft.
passive: 9
cr: "3"
actions:
  - name: "Bite"
    desc: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 10 (2d6 + 3) Piercing damage plus 7 (2d6) Poison damage."
bonus_actions:
  - name: "Petrifying Gaze (Recharge 4–6)"
    desc: "*Constitution Saving Throw:* DC 12, each creature in a 30-foot Cone. If the basilisk sees its reflection within the Cone, the basilisk must make this save. 1 The target has the [[Restrained]] condition and repeats the save at the end of its next turn if it is still [[Restrained]], ending the effect on itself on a success. 2 The target has the [[Petrified]] condition instead of the [[Restrained]] condition."
```
