---
title: Homunculus
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 0
xp: 10
type: construct
size: Tiny
ac: 13
hp: 4
speed: 20
moves:
  - fly
tags:
  - monster
  - construct
  - cr0
  - srd-5-2-1
aliases:
  - Homunculus
export_hash: sha256-6cff608dac35
---

```statblock
columns: 2
forceColumns: true
name: Homunculus
source: SRD 5.2.1
size: Tiny
type: construct
alignment: Neutral
ac: 13
hp: 4
hit_dice: 1d4 + 2
speed: 20 ft., Fly 40 ft.
initiative: "+2 (12)"
stats: [4, 15, 14, 10, 10, 7]
saves:
  - wisdom: 2
  - charisma: 0
immunities: Poison
condition_immunities: Charmed, Poisoned
senses: Darkvision 60 ft.
passive: 10
languages: understands Common plus one other language but can't speak
cr: "0"
traits:
  - name: "Telepathic Bond"
    desc: "While the homunculus is on the same plane of existence as its master, the two of them can communicate telepathically with each other."
actions:
  - name: "Bite"
    desc: "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 1 Piercing damage, and the target is subjected to the following effect. *Constitution Saving Throw:* DC 12. *Failure:* The target has the [[Poisoned]] condition until the end of the homunculus's next turn. *Failure by 5 or More:* The target has the [[Poisoned]] condition for 1 minute. While [[Poisoned]], the target has the [[Unconscious]] condition, which ends early if the target takes any damage."
```
