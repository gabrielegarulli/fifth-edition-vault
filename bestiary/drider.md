---
title: Drider
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 6
xp: 2300
type: monstrosity
size: Large
ac: 19
hp: 123
speed: 30
moves:
  - climb
spellcasting: true
tags:
  - monster
  - monstrosity
  - cr6
  - srd-5-2-1
aliases:
  - Drider
export_hash: sha256-bc2ade54fdfc
---

```statblock
columns: 2
forceColumns: true
name: Drider
source: SRD 5.2.1
size: Large
type: monstrosity
alignment: Chaotic Evil
ac: 19
hp: 123
hit_dice: 13d10 + 52
speed: 30 ft., Climb 30 ft.
initiative: "+4 (14)"
stats: [16, 19, 18, 13, 16, 12]
skillsaves:
  - perception: 6
  - stealth: 10
senses: Darkvision 120 ft.
passive: 16
languages: Elvish, Undercommon
cr: "6"
traits:
  - name: "Spider Climb"
    desc: "The drider can climb difficult surfaces, including along ceilings, without needing to make an ability check."
  - name: "Sunlight Sensitivity"
    desc: "While in sunlight, the drider has Disadvantage on ability checks and attack rolls."
  - name: "Web Walker"
    desc: "The drider ignores movement restrictions caused by webs, and the drider knows the location of any other creature in contact with the same web."
actions:
  - name: "Multiattack"
    desc: "The drider makes three attacks, using Foreleg or Poison Burst in any combination."
  - name: "Foreleg"
    desc: "*Melee Attack Roll:* +7, reach 10 ft. *Hit:* 13 (2d8 + 4) Piercing damage."
  - name: "Poison Burst"
    desc: "*Ranged Attack Roll:* +6, range 120 ft. *Hit:* 13 (3d6 + 3) Poison damage."
bonus_actions:
  - name: "Magic of the Spider Queen (Recharge 5–6)"
    desc: "The drider casts [[Darkness]], [[Faerie Fire]], or [[Web]], requiring no Material components and using Wisdom as the spellcasting ability (spell save DC 14)."
```
