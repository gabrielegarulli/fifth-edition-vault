---
title: Constrictor Snake
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 1/4
xp: 50
type: beast
size: Large
ac: 13
hp: 13
speed: 30
moves:
  - swim
tags:
  - monster
  - beast
  - cr1-4
  - srd-5-2-1
aliases:
  - Constrictor Snake
export_hash: sha256-b6b194826ab8
---

```statblock
columns: 2
forceColumns: true
name: Constrictor Snake
source: SRD 5.2.1
size: Large
type: beast
alignment: Unaligned
ac: 13
hp: 13
hit_dice: 2d10 + 2
speed: 30 ft., Swim 30 ft.
initiative: "+2 (12)"
stats: [15, 14, 12, 1, 10, 3]
skillsaves:
  - perception: 2
  - stealth: 4
senses: Blindsight 10 ft.
passive: 12
cr: "1/4"
actions:
  - name: "Bite"
    desc: "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 6 (1d8 + 2) Piercing damage."
  - name: "Constrict"
    desc: "*Strength Saving Throw:* DC 12, one Medium or smaller creature the snake can see within 5 feet. *Failure:* 7 (3d4) Bludgeoning damage, and the target has the [[Grappled]] condition (escape DC 12)."
```
