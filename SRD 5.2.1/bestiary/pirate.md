---
title: Pirate
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 1
xp: 200
type: humanoid
size: Small/Medium
ac: 14
hp: 33
speed: 30
tags:
  - monster
  - humanoid
  - cr1
  - srd-5-2-1
aliases:
  - Pirate
export_hash: sha256-0900255dc78f
---

```statblock
columns: 2
forceColumns: true
name: Pirate
source: SRD 5.2.1
size: Small/Medium
type: humanoid
alignment: Neutral
ac: 14
hp: 33
hit_dice: 6d8 + 6
speed: 30 ft.
initiative: "+5 (15)"
stats: [10, 16, 12, 8, 12, 14]
saves:
  - dexterity: 5
  - charisma: 4
gear: "6 Daggers, Leather Armor"
passive: 11
languages: Common plus one other language
cr: "1"
actions:
  - name: "Multiattack"
    desc: "The pirate makes two Dagger attacks. It can replace one attack with a use of Enthralling Panache."
  - name: "Dagger"
    desc: "*Melee Attack Roll or Ranged Attack Roll:* +5, reach 5 ft. or range 20/60 ft. *Hit:* 5 (1d4 + 3) Piercing damage."
  - name: "Enthralling Panache"
    desc: "*Wisdom Saving Throw:* DC 12, one creature the pirate can see within 30 feet. *Failure:* The target has the [[Charmed]] condition until the start of the pirate's next turn."
```
