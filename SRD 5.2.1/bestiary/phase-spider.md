---
title: Phase Spider
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 3
xp: 700
type: monstrosity
size: Large
ac: 14
hp: 45
speed: 30
moves:
  - climb
tags:
  - monster
  - monstrosity
  - cr3
  - srd-5-2-1
aliases:
  - Phase Spider
export_hash: sha256-218ca813b261
---

```statblock
columns: 2
forceColumns: true
name: Phase Spider
source: SRD 5.2.1
size: Large
type: monstrosity
alignment: Unaligned
ac: 14
hp: 45
hit_dice: 7d10 + 7
speed: 30 ft., Climb 30 ft.
initiative: "+3 (13)"
stats: [15, 16, 12, 6, 10, 6]
skillsaves:
  - stealth: 7
senses: Darkvision 60 ft.
passive: 10
cr: "3"
traits:
  - name: "Ethereal Sight"
    desc: "The spider can see 60 feet into the Ethereal Plane while on the Material Plane and vice versa."
  - name: "Spider Climb"
    desc: "The spider can climb difficult surfaces, including along ceilings, without needing to make an ability check."
  - name: "Web Walker"
    desc: "The spider ignores movement restrictions caused by webs, and the spider knows the location of any other creature in contact with the same web."
actions:
  - name: "Multiattack"
    desc: "The spider makes two Bite attacks."
  - name: "Bite"
    desc: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 8 (1d10 + 3) Piercing damage plus 9 (2d8) Poison damage. If this damage reduces the target to 0 Hit Points, the target becomes Stable, and it has the [[Poisoned]] condition for 1 hour. While [[Poisoned]], the target also has the [[Paralyzed]] condition."
bonus_actions:
  - name: "Ethereal Jaunt"
    desc: "The spider teleports from the Material Plane to the Ethereal Plane or vice versa."
```
