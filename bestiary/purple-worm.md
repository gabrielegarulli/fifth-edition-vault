---
title: Purple Worm
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 15
xp: 13000
type: monstrosity
size: Gargantuan
ac: 18
hp: 247
speed: 50
moves:
  - burrow
tags:
  - monster
  - monstrosity
  - cr15
  - srd-5-2-1
aliases:
  - Purple Worm
export_hash: sha256-63da7f2fa13b
---

```statblock
columns: 2
forceColumns: true
name: Purple Worm
source: SRD 5.2.1
size: Gargantuan
type: monstrosity
alignment: Unaligned
ac: 18
hp: 247
hit_dice: 15d20 + 90
speed: 50 ft., Burrow 50 ft.
initiative: "+3 (13)"
stats: [28, 7, 22, 1, 8, 4]
saves:
  - constitution: 11
  - wisdom: 4
senses: Blindsight 30 ft., Tremorsense 60 ft.
passive: 9
cr: "15"
traits:
  - name: "Tunneler"
    desc: "The worm can burrow through solid rock at half its Burrow Speed and leaves a 10-foot-diameter tunnel in its wake."
actions:
  - name: "Multiattack"
    desc: "The worm makes one Bite attack and one Tail Stinger attack."
  - name: "Bite"
    desc: "*Melee Attack Roll:* +14, reach 10 ft. *Hit:* 22 (3d8 + 9) Piercing damage. If the target is a Large or smaller creature, it has the [[Grappled]] condition (escape DC 19), and it has the [[Restrained]] condition until the grapple ends."
  - name: "Tail Stinger"
    desc: "*Melee Attack Roll:* +14, reach 10 ft. *Hit:* 16 (2d6 + 9) Piercing damage plus 35 (10d6) Poison damage."
bonus_actions:
  - name: "Swallow"
    desc: "*Strength Saving Throw:* DC 19, one Large or smaller creature [[Grappled]] by the worm (it can have up to three creatures swallowed at a time). *Failure:* The target is swallowed by the worm, and the [[Grappled]] condition ends. A swallowed creature has the [[Blinded]] and [[Restrained]] conditions, has Total Cover against attacks and other effects outside the worm, and takes 17 (5d6) Acid damage at the start of each of the worm's turns.\n\nIf the worm takes 30 damage or more on a single turn from a creature inside it, the worm must succeed on a DC 21 Constitution saving throw at the end of that turn or regurgitate all swallowed creatures, each of which falls in a space within 5 feet of the worm and has the [[Prone]] condition. If the worm dies, any swallowed creature no longer has the [[Restrained]] condition and can escape from the corpse using 20 feet of movement, exiting [[Prone]]."
```
