---
title: Crocodile
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 1/2
xp: 100
type: beast
size: Large
ac: 12
hp: 13
speed: 20
moves:
  - swim
tags:
  - monster
  - beast
  - cr1-2
  - srd-5-2-1
aliases:
  - Crocodile
export_hash: sha256-0dd088b9a393
---

```statblock
columns: 2
forceColumns: true
name: Crocodile
source: SRD 5.2.1
size: Large
type: beast
alignment: Unaligned
ac: 12
hp: 13
hit_dice: 2d10 + 2
speed: 20 ft., Swim 30 ft.
initiative: "+0 (10)"
stats: [15, 10, 13, 2, 10, 5]
saves:
  - constitution: 3
skillsaves:
  - stealth: 2
passive: 10
cr: "1/2"
traits:
  - name: "Hold Breath"
    desc: "The crocodile can hold its breath for 1 hour."
actions:
  - name: "Bite"
    desc: "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 6 (1d8 + 2) Piercing damage. If the target is a Medium or smaller creature, it has the [[Grappled]] condition (escape DC 12). While [[Grappled]], the target has the [[Restrained]] condition."
```
