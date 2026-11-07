---
title: Tyrannosaurus Rex
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 8
xp: 3900
type: beast
subtype: dinosaur
size: Huge
ac: 13
hp: 136
speed: 50
tags:
  - monster
  - beast
  - dinosaur
  - cr8
  - srd-5-2-1
aliases:
  - Tyrannosaurus Rex
export_hash: sha256-299b85547c72
---

```statblock
columns: 2
forceColumns: true
name: Tyrannosaurus Rex
source: SRD 5.2.1
size: Huge
type: beast
subtype: dinosaur
alignment: Unaligned
ac: 13
hp: 136
hit_dice: 13d12 + 52
speed: 50 ft.
initiative: "+3 (13)"
stats: [25, 10, 19, 2, 12, 9]
saves:
  - strength: 10
  - wisdom: 4
skillsaves:
  - perception: 4
passive: 14
cr: "8"
actions:
  - name: "Multiattack"
    desc: "The tyrannosaurus makes one Bite attack and one Tail attack."
  - name: "Bite"
    desc: "*Melee Attack Roll:* +10, reach 10 ft. *Hit:* 33 (4d12 + 7) Piercing damage. If the target is a Large or smaller creature, it has the [[Grappled]] condition (escape DC 17). While [[Grappled]], the target has the [[Restrained]] condition and can't be targeted by the tyrannosaurus's Tail."
  - name: "Tail"
    desc: "*Melee Attack Roll:* +10, reach 15 ft. *Hit:* 25 (4d8 + 7) Bludgeoning damage. If the target is a Huge or smaller creature, it has the [[Prone]] condition."
```
