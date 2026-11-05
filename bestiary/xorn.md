---
title: Xorn
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 5
xp: 1800
type: elemental
size: Medium
ac: 19
hp: 84
speed: 20
moves:
  - burrow
tags:
  - monster
  - elemental
  - cr5
  - srd-5-2-1
aliases:
  - Xorn
export_hash: sha256-7bd13fe04446
---

```statblock
columns: 2
forceColumns: true
name: Xorn
source: SRD 5.2.1
size: Medium
type: elemental
alignment: Neutral
ac: 19
hp: 84
hit_dice: 8d8 + 48
speed: 20 ft., Burrow 20 ft.
initiative: "+0 (10)"
stats: [17, 10, 22, 11, 10, 11]
skillsaves:
  - perception: 6
  - stealth: 6
immunities: Poison
condition_immunities: Paralyzed, Petrified, Poisoned
senses: Darkvision 60 ft., Tremorsense 60 ft.
passive: 16
languages: Primordial (Terran)
cr: "5"
traits:
  - name: "Earth Glide"
    desc: "The xorn can burrow through nonmagical, unworked earth and stone. While doing so, the xorn doesn't disturb the material it moves through."
  - name: "Treasure Sense"
    desc: "The xorn can pinpoint the location of precious metals and stones within 60 feet of itself."
actions:
  - name: "Multiattack"
    desc: "The xorn makes one Bite attack and three Claw attacks."
  - name: "Bite"
    desc: "*Melee Attack Roll:* +6, reach 5 ft. *Hit:* 17 (4d6 + 3) Piercing damage."
  - name: "Claw"
    desc: "*Melee Attack Roll:* +6, reach 5 ft. *Hit:* 8 (1d10 + 3) Slashing damage."
bonus_actions:
  - name: "Charge"
    desc: "The xorn moves up to its Speed or Burrow Speed straight toward an enemy it can sense."
```
