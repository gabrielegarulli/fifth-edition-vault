---
title: Wight
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 3
xp: 700
type: undead
size: Medium
ac: 14
hp: 82
speed: 30
tags:
  - monster
  - undead
  - cr3
  - srd-5-2-1
aliases:
  - Wight
export_hash: sha256-8674301a372d
---

```statblock
columns: 2
forceColumns: true
name: Wight
source: SRD 5.2.1
size: Medium
type: undead
alignment: Neutral Evil
ac: 14
hp: 82
hit_dice: 11d8 + 33
speed: 30 ft.
initiative: "+4 (14)"
stats: [15, 14, 16, 10, 13, 15]
skillsaves:
  - perception: 3
  - stealth: 4
gear: "Studded Leather Armor"
resistances: Necrotic
immunities: Poison
condition_immunities: Exhaustion, Poisoned
senses: Darkvision 60 ft.
passive: 13
languages: Common plus one other language
cr: "3"
traits:
  - name: "Sunlight Sensitivity"
    desc: "While in sunlight, the wight has Disadvantage on ability checks and attack rolls."
actions:
  - name: "Multiattack"
    desc: "The wight makes two attacks, using Necrotic Sword or Necrotic Bow in any combination. It can replace one attack with a use of Life Drain."
  - name: "Necrotic Sword"
    desc: "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 6 (1d8 + 2) Slashing damage plus 4 (1d8) Necrotic damage."
  - name: "Necrotic Bow"
    desc: "*Ranged Attack Roll:* +4, range 150/600 ft. *Hit:* 6 (1d8 + 2) Piercing damage plus 4 (1d8) Necrotic damage."
  - name: "Life Drain"
    desc: "*Constitution Saving Throw:* DC 13, one creature within 5 feet. *Failure:* 6 (1d8 + 2) Necrotic damage, and the target's Hit Point maximum decreases by an amount equal to the damage taken.\n\nA Humanoid slain by this attack rises 24 hours later as a Zombie under the wight's control, unless the Humanoid is restored to life or its body is destroyed. The wight can have no more than twelve zombies under its control at a time."
```
