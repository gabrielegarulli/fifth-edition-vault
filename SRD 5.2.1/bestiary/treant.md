---
title: Treant
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 9
xp: 5000
type: plant
size: Huge
ac: 16
hp: 138
speed: 30
tags:
  - monster
  - plant
  - cr9
  - srd-5-2-1
aliases:
  - Treant
export_hash: sha256-8bdc62c14ced
---

```statblock
columns: 2
forceColumns: true
name: Treant
source: SRD 5.2.1
size: Huge
type: plant
alignment: Chaotic Good
ac: 16
hp: 138
hit_dice: 12d12 + 60
speed: 30 ft.
initiative: "+3 (13)"
stats: [23, 8, 21, 12, 16, 12]
vulnerabilities: Fire
resistances: Bludgeoning, Piercing
passive: 13
languages: Common, Druidic, Elvish, Sylvan
cr: "9"
traits:
  - name: "Siege Monster"
    desc: "The treant deals double damage to objects and structures."
actions:
  - name: "Multiattack"
    desc: "The treant makes two Slam attacks."
  - name: "Slam"
    desc: "*Melee Attack Roll:* +10, reach 5 ft. *Hit:* 16 (3d6 + 6) Bludgeoning damage."
  - name: "Hail of Bark"
    desc: "*Ranged Attack Roll:* +10, range 180 ft. *Hit:* 28 (4d10 + 6) Piercing damage."
  - name: "Animate Trees (1/Day)"
    desc: "The treant magically animates up to two trees it can see within 60 feet of itself. Each tree uses the Treant stat block, except it has Intelligence and Charisma scores of 1, it can't speak, and it lacks this action. The tree takes its turn immediately after the treant on the same Initiative count, and it obeys the treant. A tree remains animate for 1 day or until it dies, the treant dies, or it is more than 120 feet from the treant. The tree then takes root if possible."
```
