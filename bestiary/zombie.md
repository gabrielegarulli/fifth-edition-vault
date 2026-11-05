---
title: Zombie
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 1/4
xp: 50
type: undead
size: Medium
ac: 8
hp: 15
speed: 20
tags:
  - monster
  - undead
  - cr1-4
  - srd-5-2-1
aliases:
  - Zombie
export_hash: sha256-9c6c0559831e
---

```statblock
columns: 2
forceColumns: true
name: Zombie
source: SRD 5.2.1
size: Medium
type: undead
alignment: Neutral Evil
ac: 8
hp: 15
hit_dice: 2d8 + 6
speed: 20 ft.
initiative: "-2 (8)"
stats: [13, 6, 16, 3, 6, 5]
saves:
  - wisdom: 0
immunities: Poison
condition_immunities: Exhaustion, Poisoned
senses: Darkvision 60 ft.
passive: 8
languages: understands Common plus one other language but can't speak
cr: "1/4"
traits:
  - name: "Undead Fortitude"
    desc: "If damage reduces the zombie to 0 Hit Points, it makes a Constitution saving throw (DC 5 plus the damage taken) unless the damage is Radiant or from a Critical Hit. On a successful save, the zombie drops to 1 Hit Point instead."
actions:
  - name: "Slam"
    desc: "*Melee Attack Roll:* +3, reach 5 ft. *Hit:* 5 (1d8 + 1) Bludgeoning damage."
```
