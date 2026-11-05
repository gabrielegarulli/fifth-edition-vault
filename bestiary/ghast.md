---
title: Ghast
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 2
xp: 450
type: undead
size: Medium
ac: 13
hp: 36
speed: 30
tags:
  - monster
  - undead
  - cr2
  - srd-5-2-1
aliases:
  - Ghast
export_hash: sha256-dc3c55d0e9cd
---

```statblock
columns: 2
forceColumns: true
name: Ghast
source: SRD 5.2.1
size: Medium
type: undead
alignment: Chaotic Evil
ac: 13
hp: 36
hit_dice: 8d8
speed: 30 ft.
initiative: "+3 (13)"
stats: [16, 17, 10, 11, 10, 8]
saves:
  - wisdom: 2
resistances: Necrotic
immunities: Poison
condition_immunities: Charmed, Exhaustion, Poisoned
senses: Darkvision 60 ft.
passive: 10
languages: Common
cr: "2"
traits:
  - name: "Stench"
    desc: "*Constitution Saving Throw:* DC 10, any creature that starts its turn in a 5-foot Emanation originating from the ghast. *Failure:* The target has the [[Poisoned]] condition until the start of its next turn. *Success:* The target is immune to this ghast's Stench for 24 hours."
actions:
  - name: "Bite"
    desc: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 7 (1d8 + 3) Piercing damage plus 9 (2d8) Necrotic damage."
  - name: "Claw"
    desc: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 10 (2d6 + 3) Slashing damage. If the target is a non-Undead creature, it is subjected to the following effect. *Constitution Saving Throw:* DC 10. *Failure:* The target has the [[Paralyzed]] condition until the end of its next turn."
```
