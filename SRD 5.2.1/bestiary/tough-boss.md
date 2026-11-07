---
title: Tough Boss
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 4
xp: 1100
type: humanoid
size: Small/Medium
ac: 16
hp: 82
speed: 30
tags:
  - monster
  - humanoid
  - cr4
  - srd-5-2-1
aliases:
  - Tough Boss
export_hash: sha256-eecd0bbcaf49
---

```statblock
columns: 2
forceColumns: true
name: Tough Boss
source: SRD 5.2.1
size: Small/Medium
type: humanoid
alignment: Neutral
ac: 16
hp: 82
hit_dice: 11d8 + 33
speed: 30 ft.
initiative: "+2 (12)"
stats: [17, 14, 16, 11, 10, 11]
saves:
  - strength: 5
  - constitution: 5
  - charisma: 2
gear: "Chain Mail, Heavy Crossbow, Warhammer"
passive: 10
languages: Common plus one other language
cr: "4"
traits:
  - name: "Pack Tactics"
    desc: "The tough has Advantage on an attack roll against a creature if at least one of the tough's allies is within 5 feet of the creature and the ally doesn't have the [[Incapacitated]] condition."
actions:
  - name: "Multiattack"
    desc: "The tough makes two attacks, using Warhammer or Heavy Crossbow in any combination."
  - name: "Warhammer"
    desc: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 12 (2d8 + 3) Bludgeoning damage. If the target is a Large or smaller creature, the tough pushes the target up to 10 feet straight away from itself."
  - name: "Heavy Crossbow"
    desc: "*Ranged Attack Roll:* +4, range 100/400 ft. *Hit:* 13 (2d10 + 2) Piercing damage."
```
