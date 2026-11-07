---
title: Hezrou
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 8
xp: 3900
type: fiend
subtype: demon
size: Large
ac: 18
hp: 157
speed: 30
tags:
  - monster
  - fiend
  - demon
  - cr8
  - srd-5-2-1
aliases:
  - Hezrou
export_hash: sha256-c9d45d8f4e1f
---

```statblock
columns: 2
forceColumns: true
name: Hezrou
source: SRD 5.2.1
size: Large
type: fiend
subtype: demon
alignment: Chaotic Evil
ac: 18
hp: 157
hit_dice: 15d10 + 75
speed: 30 ft.
initiative: "+6 (16)"
stats: [19, 17, 20, 5, 12, 13]
saves:
  - strength: 7
  - constitution: 8
  - wisdom: 4
resistances: Cold, Fire, Lightning
immunities: Poison
condition_immunities: Poisoned
senses: Darkvision 120 ft.
passive: 11
languages: Abyssal; telepathy 120 ft.
cr: "8"
traits:
  - name: "Demonic Restoration"
    desc: "If the hezrou dies outside the Abyss, its body dissolves into ichor, and it gains a new body instantly, reviving with all its Hit Points somewhere in the Abyss."
  - name: "Magic Resistance"
    desc: "The hezrou has Advantage on saving throws against spells and other magical effects."
  - name: "Stench"
    desc: "*Constitution Saving Throw:* DC 16, any creature that starts its turn in a 10-foot Emanation originating from the hezrou. *Failure:* The target has the [[Poisoned]] condition until the start of its next turn."
actions:
  - name: "Multiattack"
    desc: "The hezrou makes three Rend attacks."
  - name: "Rend"
    desc: "*Melee Attack Roll:* +7, reach 5 ft. *Hit:* 6 (1d4 + 4) Slashing damage plus 9 (2d8) Poison damage."
bonus_actions:
  - name: "Leap"
    desc: "The hezrou jumps up to 30 feet by spending 10 feet of movement."
```
