---
title: Bulette
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 5
xp: 1800
type: monstrosity
size: Large
ac: 17
hp: 94
speed: 40
moves:
  - burrow
tags:
  - monster
  - monstrosity
  - cr5
  - srd-5-2-1
aliases:
  - Bulette
export_hash: sha256-7079e91af8d2
---

```statblock
columns: 2
forceColumns: true
name: Bulette
source: SRD 5.2.1
size: Large
type: monstrosity
alignment: Unaligned
ac: 17
hp: 94
hit_dice: 9d10 + 45
speed: 40 ft., Burrow 40 ft.
initiative: "+0 (10)"
stats: [19, 11, 21, 2, 10, 5]
skillsaves:
  - perception: 6
senses: Darkvision 60 ft., Tremorsense 120 ft.
passive: 16
cr: "5"
actions:
  - name: "Multiattack"
    desc: "The bulette makes two Bite attacks."
  - name: "Bite"
    desc: "*Melee Attack Roll:* +7, reach 5 ft. *Hit:* 17 (2d12 + 4) Piercing damage."
  - name: "Deadly Leap"
    desc: "The bulette spends 5 feet of movement to jump to a space within 15 feet that contains one or more Large or smaller creatures. *Dexterity Saving Throw:* DC 15, each creature in the bulette's destination space. *Failure:* 19 (3d12) Bludgeoning damage, and the target has the [[Prone]] condition. *Success:* Half damage, and the target is pushed 5 feet straight away from the bulette."
bonus_actions:
  - name: "Leap"
    desc: "The bulette jumps up to 30 feet by spending 10 feet of movement."
```
