---
title: Will-o'-Wisp
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 2
xp: 450
type: undead
size: Tiny
ac: 19
hp: 27
speed: 5
moves:
  - fly
tags:
  - monster
  - undead
  - cr2
  - srd-5-2-1
aliases:
  - Will-o'-Wisp
export_hash: sha256-424b78cbbf7e
---

```statblock
columns: 2
forceColumns: true
name: Will-o'-Wisp
source: SRD 5.2.1
size: Tiny
type: undead
alignment: Chaotic Evil
ac: 19
hp: 27
hit_dice: 11d4
speed: 5 ft., Fly 50 ft. (hover)
initiative: "+9 (19)"
stats: [1, 28, 10, 13, 14, 11]
resistances: Acid, Bludgeoning, Cold, Fire, Necrotic, Piercing, Slashing
immunities: Lightning, Poison
condition_immunities: Exhaustion, Grappled, Paralyzed, Petrified, Poisoned, Prone, Restrained, Unconscious
senses: Darkvision 120 ft.
passive: 12
languages: Common plus one other language
cr: "2"
traits:
  - name: "Ephemeral"
    desc: "The wisp can't wear or carry anything."
  - name: "Illumination"
    desc: "The wisp sheds Bright Light in a 20-foot radius and Dim Light for an additional 20 feet."
  - name: "Incorporeal Movement"
    desc: "The wisp can move through other creatures and objects as if they were Difficult Terrain. It takes 5 (1d10) Force damage if it ends its turn inside an object."
actions:
  - name: "Shock"
    desc: "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 11 (2d8 + 2) Lightning damage."
bonus_actions:
  - name: "Consume Life"
    desc: "*Constitution Saving Throw:* DC 10, one living creature the wisp can see within 5 feet that has 0 Hit Points. *Failure:* The target dies, and the wisp regains 10 (3d6) Hit Points."
  - name: "Vanish"
    desc: "The wisp and its light have the [[Invisible]] condition until the wisp's Concentration ends on this effect, which ends early immediately after the wisp makes an attack roll or uses Consume Life."
```
