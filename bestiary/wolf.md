---
title: Wolf
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 1/4
xp: 50
type: beast
size: Medium
ac: 12
hp: 11
speed: 40
tags:
  - monster
  - beast
  - cr1-4
  - srd-5-2-1
aliases:
  - Wolf
export_hash: sha256-8a2bf8af2afe
---

```statblock
columns: 2
forceColumns: true
name: Wolf
source: SRD 5.2.1
size: Medium
type: beast
alignment: Unaligned
ac: 12
hp: 11
hit_dice: 2d8 + 2
speed: 40 ft.
initiative: "+2 (12)"
stats: [14, 15, 12, 3, 12, 6]
skillsaves:
  - perception: 5
  - stealth: 4
senses: Darkvision 60 ft.
passive: 15
cr: "1/4"
traits:
  - name: "Pack Tactics"
    desc: "The wolf has Advantage on attack rolls against a creature if at least one of the wolf's allies is within 5 feet of the creature and the ally doesn't have the [[Incapacitated]] condition."
actions:
  - name: "Bite"
    desc: "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 5 (1d6 + 2) Piercing damage. If the target is a Medium or smaller creature, it has the [[Prone]] condition."
```
