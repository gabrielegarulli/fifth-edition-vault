---
title: Gladiator
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 5
xp: 1800
type: humanoid
size: Small/Medium
ac: 16
hp: 112
speed: 30
tags:
  - monster
  - humanoid
  - cr5
  - srd-5-2-1
aliases:
  - Gladiator
export_hash: sha256-2b24b550f8d0
---

```statblock
columns: 2
forceColumns: true
name: Gladiator
source: SRD 5.2.1
size: Small/Medium
type: humanoid
alignment: Neutral
ac: 16
hp: 112
hit_dice: 15d8 + 45
speed: 30 ft.
initiative: "+5 (15)"
stats: [18, 15, 16, 10, 12, 15]
saves:
  - strength: 7
  - dexterity: 5
  - constitution: 6
  - wisdom: 4
skillsaves:
  - athletics: 10
  - performance: 5
gear: "Shield, 3 Spears, Studded Leather Armor"
passive: 11
languages: Common
cr: "5"
actions:
  - name: "Multiattack"
    desc: "The gladiator makes three Spear attacks. It can replace one attack with a use of Shield Bash."
  - name: "Spear"
    desc: "*Melee Attack Roll or Ranged Attack Roll:* +7, reach 5 ft. or range 20/60 ft. *Hit:* 11 (2d6 + 4) Piercing damage."
  - name: "Shield Bash"
    desc: "*Strength Saving Throw:* DC 15, one creature within 5 feet that the gladiator can see. *Failure:* 9 (2d4 + 4) Bludgeoning damage. If the target is a Medium or smaller creature, it has the [[Prone]] condition."
reactions:
  - name: "Parry"
    desc: "*Trigger:* The gladiator is hit by a melee attack roll while holding a weapon. *Response:* The gladiator adds 3 to its AC against that attack, possibly causing it to miss."
```
