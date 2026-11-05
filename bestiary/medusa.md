---
title: Medusa
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 6
xp: 2300
type: monstrosity
size: Medium
ac: 15
hp: 127
speed: 30
tags:
  - monster
  - monstrosity
  - cr6
  - srd-5-2-1
aliases:
  - Medusa
export_hash: sha256-205559a059ef
---

```statblock
columns: 2
forceColumns: true
name: Medusa
source: SRD 5.2.1
size: Medium
type: monstrosity
alignment: Lawful Evil
ac: 15
hp: 127
hit_dice: 17d8 + 51
speed: 30 ft.
initiative: "+6 (16)"
stats: [10, 17, 16, 12, 13, 15]
saves:
  - wisdom: 4
skillsaves:
  - deception: 5
  - perception: 4
  - stealth: 6
senses: Darkvision 150 ft.
passive: 14
languages: Common plus one other language
cr: "6"
actions:
  - name: "Multiattack"
    desc: "The medusa makes two Claw attacks and one Snake Hair attack, or it makes three Poison Ray attacks."
  - name: "Claw"
    desc: "*Melee Attack Roll:* +6, reach 5 ft. *Hit:* 10 (2d6 + 3) Slashing damage."
  - name: "Snake Hair"
    desc: "*Melee Attack Roll:* +6, reach 5 ft. *Hit:* 5 (1d4 + 3) Piercing damage plus 14 (4d6) Poison damage."
  - name: "Poison Ray"
    desc: "*Ranged Attack Roll:* +5, range 150 ft. *Hit:* 11 (2d8 + 2) Poison damage."
bonus_actions:
  - name: "Petrifying Gaze (Recharge 5–6)"
    desc: "*Constitution Saving Throw:* DC 13, each creature in a 30-foot Cone. If the medusa sees its reflection in the Cone, the medusa must make this save. 1 The target has the [[Restrained]] condition and repeats the save at the end of its next turn if it is still [[Restrained]], ending the effect on itself on a success. 2 The target has the [[Petrified]] condition instead of the [[Restrained]] condition."
```
