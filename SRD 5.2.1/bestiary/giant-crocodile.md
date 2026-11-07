---
title: Giant Crocodile
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 5
xp: 1800
type: beast
size: Huge
ac: 14
hp: 85
speed: 30
moves:
  - swim
tags:
  - monster
  - beast
  - cr5
  - srd-5-2-1
aliases:
  - Giant Crocodile
export_hash: sha256-aafe397d7763
---

```statblock
columns: 2
forceColumns: true
name: Giant Crocodile
source: SRD 5.2.1
size: Huge
type: beast
alignment: Unaligned
ac: 14
hp: 85
hit_dice: 9d12 + 27
speed: 30 ft., Swim 50 ft.
initiative: "-1 (9)"
stats: [21, 9, 17, 2, 10, 7]
skillsaves:
  - stealth: 5
passive: 10
cr: "5"
traits:
  - name: "Hold Breath"
    desc: "The crocodile can hold its breath for 1 hour."
actions:
  - name: "Multiattack"
    desc: "The crocodile makes one Bite attack and one Tail attack."
  - name: "Bite"
    desc: "*Melee Attack Roll:* +8, reach 5 ft. *Hit:* 21 (3d10 + 5) Piercing damage. If the target is a Large or smaller creature, it has the [[Grappled]] condition (escape DC 15). While [[Grappled]], the target has the [[Restrained]] condition and can't be targeted by the crocodile's Tail."
  - name: "Tail"
    desc: "*Melee Attack Roll:* +8, reach 10 ft. *Hit:* 18 (3d8 + 5) Bludgeoning damage. If the target is a Large or smaller creature, it has the [[Prone]] condition."
```
