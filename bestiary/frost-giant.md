---
title: Frost Giant
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 8
xp: 3900
type: giant
size: Huge
ac: 15
hp: 149
speed: 40
tags:
  - monster
  - giant
  - cr8
  - srd-5-2-1
aliases:
  - Frost Giant
export_hash: sha256-7d0272401020
---

```statblock
columns: 2
forceColumns: true
name: Frost Giant
source: SRD 5.2.1
size: Huge
type: giant
alignment: Neutral Evil
ac: 15
hp: 149
hit_dice: 13d12 + 65
speed: 40 ft.
initiative: "+2 (12)"
stats: [23, 9, 21, 9, 10, 12]
saves:
  - constitution: 8
  - wisdom: 3
  - charisma: 4
skillsaves:
  - athletics: 9
  - perception: 3
immunities: Cold
passive: 13
languages: Giant
cr: "8"
actions:
  - name: "Multiattack"
    desc: "The giant makes two attacks, using Frost Axe or Great Bow in any combination."
  - name: "Frost Axe"
    desc: "*Melee Attack Roll:* +9, reach 10 ft. *Hit:* 19 (2d12 + 6) Slashing damage plus 9 (2d8) Cold damage."
  - name: "Great Bow"
    desc: "*Ranged Attack Roll:* +9, range 150/600 ft. *Hit:* 17 (2d10 + 6) Piercing damage plus 7 (2d6) Cold damage, and the target's Speed decreases by 10 feet until the end of its next turn."
bonus_actions:
  - name: "War Cry (Recharge 5–6)"
    desc: "The giant or one creature of its choice that can see or hear it gains 16 (2d10 + 5) Temporary Hit Points and has Advantage on attack rolls until the start of the giant's next turn."
```
