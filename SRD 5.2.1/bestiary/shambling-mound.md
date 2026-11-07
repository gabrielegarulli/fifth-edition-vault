---
title: Shambling Mound
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 5
xp: 1800
type: plant
size: Large
ac: 15
hp: 110
speed: 30
moves:
  - swim
tags:
  - monster
  - plant
  - cr5
  - srd-5-2-1
aliases:
  - Shambling Mound
export_hash: sha256-c9b7b418f131
---

```statblock
columns: 2
forceColumns: true
name: Shambling Mound
source: SRD 5.2.1
size: Large
type: plant
alignment: Unaligned
ac: 15
hp: 110
hit_dice: 13d10 + 39
speed: 30 ft., Swim 20 ft.
initiative: "-1 (9)"
stats: [18, 8, 16, 5, 10, 5]
skillsaves:
  - stealth: 3
resistances: Cold, Fire
immunities: Lightning
condition_immunities: Deafened, Exhaustion
senses: Blindsight 60 ft.
passive: 10
cr: "5"
traits:
  - name: "Lightning Absorption"
    desc: "Whenever the shambling mound is subjected to Lightning damage, it regains a number of Hit Points equal to the Lightning damage dealt."
actions:
  - name: "Multiattack"
    desc: "The shambling mound makes three Charged Tendril attacks. It can replace one attack with a use of Engulf."
  - name: "Charged Tendril"
    desc: "*Melee Attack Roll:* +7, reach 10 ft. *Hit:* 7 (1d6 + 4) Bludgeoning damage plus 5 (2d4) Lightning damage. If the target is a Medium or smaller creature, the shambling mound pulls the target 5 feet straight toward itself."
  - name: "Engulf"
    desc: "*Strength Saving Throw:* DC 15, one Medium or smaller creature within 5 feet. *Failure:* The target is pulled into the shambling mound's space and has the [[Grappled]] condition (escape DC 14). Until the grapple ends, the target has the [[Blinded]] and [[Restrained]] conditions, and it takes 10 (3d6) Lightning damage at the start of each of its turns. When the shambling mound moves, the [[Grappled]] target moves with it, costing it no extra movement. The shambling mound can have only one creature [[Grappled]] by this action at a time."
```
