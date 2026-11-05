---
title: Vrock
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 6
xp: 2300
type: fiend
subtype: demon
size: Large
ac: 15
hp: 152
speed: 40
moves:
  - fly
tags:
  - monster
  - fiend
  - demon
  - cr6
  - srd-5-2-1
aliases:
  - Vrock
export_hash: sha256-1ba328a8fcd8
---

```statblock
columns: 2
forceColumns: true
name: Vrock
source: SRD 5.2.1
size: Large
type: fiend
subtype: demon
alignment: Chaotic Evil
ac: 15
hp: 152
hit_dice: 16d10 + 64
speed: 40 ft., Fly 60 ft.
initiative: "+2 (12)"
stats: [17, 15, 18, 8, 13, 8]
saves:
  - dexterity: 5
  - wisdom: 4
  - charisma: 2
resistances: Cold, Fire, Lightning
immunities: Poison
condition_immunities: Poisoned
senses: Darkvision 120 ft.
passive: 11
languages: Abyssal; telepathy 120 ft.
cr: "6"
traits:
  - name: "Demonic Restoration"
    desc: "If the vrock dies outside the Abyss, its body dissolves into ichor, and it gains a new body instantly, reviving with all its Hit Points somewhere in the Abyss."
  - name: "Magic Resistance"
    desc: "The vrock has Advantage on saving throws against spells and other magical effects."
actions:
  - name: "Multiattack"
    desc: "The vrock makes two Shred attacks."
  - name: "Shred"
    desc: "*Melee Attack Roll:* +6, reach 5 ft. *Hit:* 10 (2d6 + 3) Piercing damage plus 10 (3d6) Poison damage."
  - name: "Spores (Recharge 6)"
    desc: "*Constitution Saving Throw:* DC 15, each creature in a 20-foot Emanation originating from the vrock. *Failure:* The target has the [[Poisoned]] condition and repeats the save at the end of each of its turns, ending the effect on itself on a success. While [[Poisoned]], the target takes 5 (1d10) Poison damage at the start of each of its turns. Emptying a flask of Holy Water on the target ends the effect early."
  - name: "Stunning Screech (1/Day)"
    desc: "*Constitution Saving Throw:* DC 15, each creature in a 20-foot Emanation originating from the vrock (demons succeed automatically). *Failure:* 10 (3d6) Thunder damage, and the target has the [[Stunned]] condition until the end of the vrock's next turn."
```
