---
title: Wyvern
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 6
xp: 2300
type: dragon
size: Large
ac: 14
hp: 127
speed: 30
moves:
  - fly
tags:
  - monster
  - dragon
  - cr6
  - srd-5-2-1
aliases:
  - Wyvern
export_hash: sha256-d26927c51242
---

```statblock
columns: 2
forceColumns: true
name: Wyvern
source: SRD 5.2.1
size: Large
type: dragon
alignment: Unaligned
ac: 14
hp: 127
hit_dice: 15d10 + 45
speed: 30 ft., Fly 80 ft.
initiative: "+0 (10)"
stats: [19, 10, 16, 5, 12, 6]
skillsaves:
  - perception: 4
senses: Darkvision 120 ft.
passive: 14
cr: "6"
actions:
  - name: "Multiattack"
    desc: "The wyvern makes one Bite attack and one Sting attack."
  - name: "Bite"
    desc: "*Melee Attack Roll:* +7, reach 5 ft. *Hit:* 13 (2d8 + 4) Piercing damage."
  - name: "Sting"
    desc: "*Melee Attack Roll:* +7, reach 10 ft. *Hit:* 11 (2d6 + 4) Piercing damage plus 24 (7d6) Poison damage, and the target has the [[Poisoned]] condition until the start of the wyvern's next turn."
```
