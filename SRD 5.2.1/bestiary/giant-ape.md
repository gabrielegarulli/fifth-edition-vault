---
title: Giant Ape
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 7
xp: 2900
type: beast
size: Huge
ac: 12
hp: 168
speed: 40
moves:
  - climb
tags:
  - monster
  - beast
  - cr7
  - srd-5-2-1
aliases:
  - Giant Ape
export_hash: sha256-918cb7624ceb
---

```statblock
columns: 2
forceColumns: true
name: Giant Ape
source: SRD 5.2.1
size: Huge
type: beast
alignment: Unaligned
ac: 12
hp: 168
hit_dice: 16d12 + 64
speed: 40 ft., Climb 40 ft.
initiative: "+5 (15)"
stats: [23, 14, 18, 5, 12, 7]
skillsaves:
  - athletics: 9
  - perception: 4
  - survival: 4
passive: 14
cr: "7"
actions:
  - name: "Multiattack"
    desc: "The ape makes two Fist attacks."
  - name: "Fist"
    desc: "*Melee Attack Roll:* +9, reach 10 ft. *Hit:* 22 (3d10 + 6) Bludgeoning damage."
  - name: "Boulder Toss (Recharge 6)"
    desc: "The ape hurls a boulder at a point it can see within 90 feet. *Dexterity Saving Throw:* DC 17, each creature in a 5-foot-radius Sphere centered on that point. *Failure:* 24 (7d6) Bludgeoning damage. If the target is a Large or smaller creature, it has the [[Prone]] condition. *Success:* Half damage only."
bonus_actions:
  - name: "Leap"
    desc: "The ape jumps up to 30 feet by spending 10 feet of movement."
```
