---
title: Ghoul
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
tags:
  - monster
  - undead
  - cr1
  - srd-5-2-1
aliases:
  - Ghoul
export_hash: sha256-22064852ee77
---

```statblock
columns: 2
forceColumns: true
name: Ghoul
source: SRD 5.2.1
size: Medium
type: undead
alignment: Chaotic Evil
ac: 12
hp: 22
hit_dice: 5d8
speed: 30 ft.
initiative: "+2 (12)"
stats: [13, 15, 10, 7, 10, 6]
immunities: Poison
condition_immunities: Charmed, Exhaustion, Poisoned
senses: Darkvision 60 ft.
passive: 10
languages: Common
cr: "1"
actions:
  - name: "Multiattack"
    desc: "The ghoul makes two Bite attacks."
  - name: "Bite"
    desc: "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 5 (1d6 + 2) Piercing damage plus 3 (1d6) Necrotic damage."
  - name: "Claw"
    desc: "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 4 (1d4 + 2) Slashing damage. If the target is a creature that isn't an Undead or elf, it is subjected to the following effect. *Constitution Saving Throw:* DC 10. *Failure:* The target has the [[Paralyzed]] condition until the end of its next turn."
```
