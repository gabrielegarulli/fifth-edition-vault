---
title: Giant Constrictor Snake
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 2
xp: 450
type: beast
size: Huge
ac: 12
hp: 60
speed: 30
moves:
  - swim
tags:
  - monster
  - beast
  - cr2
  - srd-5-2-1
aliases:
  - Giant Constrictor Snake
export_hash: sha256-0c92955233ae
---

```statblock
columns: 2
forceColumns: true
name: Giant Constrictor Snake
source: SRD 5.2.1
size: Huge
type: beast
alignment: Unaligned
ac: 12
hp: 60
hit_dice: 8d12 + 8
speed: 30 ft., Swim 30 ft.
initiative: "+2 (12)"
stats: [19, 14, 12, 1, 10, 3]
skillsaves:
  - perception: 2
senses: Blindsight 10 ft.
passive: 12
cr: "2"
actions:
  - name: "Multiattack"
    desc: "The snake makes one Bite attack and uses Constrict."
  - name: "Bite"
    desc: "*Melee Attack Roll:* +6, reach 10 ft. *Hit:* 11 (2d6 + 4) Piercing damage."
  - name: "Constrict"
    desc: "*Strength Saving Throw:* DC 14, one Large or smaller creature the snake can see within 10 feet. *Failure:* 13 (2d8 + 4) Bludgeoning damage, and the target has the [[Grappled]] condition (escape DC 14)."
```
