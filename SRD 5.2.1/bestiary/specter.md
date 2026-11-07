---
title: Specter
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 1
xp: 200
type: undead
size: Medium
ac: 12
hp: 22
speed: 30
moves:
  - fly
tags:
  - monster
  - undead
  - cr1
  - srd-5-2-1
aliases:
  - Specter
export_hash: sha256-fdb22fa2e34c
---

```statblock
columns: 2
forceColumns: true
name: Specter
source: SRD 5.2.1
size: Medium
type: undead
alignment: Chaotic Evil
ac: 12
hp: 22
hit_dice: 5d8
speed: 30 ft., Fly 50 ft. (hover)
initiative: "+2 (12)"
stats: [1, 14, 11, 10, 10, 11]
resistances: Acid, Bludgeoning, Cold, Fire, Lightning, Piercing, Slashing, Thunder
immunities: Necrotic, Poison
condition_immunities: Charmed, Exhaustion, Grappled, Paralyzed, Petrified, Poisoned, Prone, Restrained, Unconscious
senses: Darkvision 60 ft.
passive: 10
languages: understands Common plus one other language but can't speak
cr: "1"
traits:
  - name: "Incorporeal Movement"
    desc: "The specter can move through other creatures and objects as if they were Difficult Terrain. It takes 5 (1d10) Force damage if it ends its turn inside an object."
  - name: "Sunlight Sensitivity"
    desc: "While in sunlight, the specter has Disadvantage on ability checks and attack rolls."
actions:
  - name: "Life Drain"
    desc: "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 7 (2d6) Necrotic damage. If the target is a creature, its Hit Point maximum decreases by an amount equal to the damage taken."
```
