---
title: Air Elemental
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 5
xp: 1800
type: elemental
size: Large
ac: 15
hp: 90
speed: 10
moves:
  - fly
tags:
  - monster
  - elemental
  - cr5
  - srd-5-2-1
aliases:
  - Air Elemental
export_hash: sha256-46e88c2ea70c
---

```statblock
columns: 2
forceColumns: true
name: Air Elemental
source: SRD 5.2.1
size: Large
type: elemental
alignment: Neutral
ac: 15
hp: 90
hit_dice: 12d10 + 24
speed: 10 ft., Fly 90 ft. (hover)
initiative: "+5 (15)"
stats: [14, 20, 14, 6, 10, 6]
resistances: Bludgeoning, Lightning, Piercing, Slashing
immunities: Poison, Thunder
condition_immunities: Exhaustion, Grappled, Paralyzed, Petrified, Poisoned, Prone, Restrained, Unconscious
senses: Darkvision 60 ft.
passive: 10
languages: Primordial (Auran)
cr: "5"
traits:
  - name: "Air Form"
    desc: "The elemental can enter a creature's space and stop there. It can move through a space as narrow as 1 inch without expending extra movement to do so."
actions:
  - name: "Multiattack"
    desc: "The elemental makes two Thunderous Slam attacks."
  - name: "Thunderous Slam"
    desc: "*Melee Attack Roll:* +8, reach 10 ft. *Hit:* 14 (2d8 + 5) Thunder damage."
  - name: "Whirlwind (Recharge 4–6)"
    desc: "*Strength Saving Throw:* DC 13, one Medium or smaller creature in the elemental's space. *Failure:* 24 (4d10 + 2) Thunder damage, and the target is pushed up to 20 feet straight away from the elemental and has the [[Prone]] condition. *Success:* Half damage only."
```
