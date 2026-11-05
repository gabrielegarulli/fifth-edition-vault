---
title: Mimic
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 2
xp: 450
type: monstrosity
size: Medium
ac: 12
hp: 58
speed: 20
tags:
  - monster
  - monstrosity
  - cr2
  - srd-5-2-1
aliases:
  - Mimic
export_hash: sha256-c32c92a3426e
---

```statblock
columns: 2
forceColumns: true
name: Mimic
source: SRD 5.2.1
size: Medium
type: monstrosity
alignment: Neutral
ac: 12
hp: 58
hit_dice: 9d8 + 18
speed: 20 ft.
initiative: "+3 (13)"
stats: [17, 12, 15, 5, 13, 8]
skillsaves:
  - stealth: 5
immunities: Acid
condition_immunities: Prone
senses: Darkvision 60 ft.
passive: 11
cr: "2"
traits:
  - name: "Adhesive (Object Form Only)"
    desc: "The mimic adheres to anything that touches it. A Huge or smaller creature adhered to the mimic has the [[Grappled]] condition (escape DC 13). Ability checks made to escape this grapple have Disadvantage."
actions:
  - name: "Bite"
    desc: "*Melee Attack Roll:* +5 (with Advantage if the target is [[Grappled]] by the mimic), reach 5 ft. *Hit:* 7 (1d8 + 3) Piercing damage—or 12 (2d8 + 3) Piercing damage if the target is [[Grappled]] by the mimic—plus 4 (1d8) Acid damage."
  - name: "Pseudopod"
    desc: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 7 (1d8 + 3) Bludgeoning damage plus 4 (1d8) Acid damage. If the target is a Large or smaller creature, it has the [[Grappled]] condition (escape DC 13). Ability checks made to escape this grapple have Disadvantage."
bonus_actions:
  - name: "Shape-Shift"
    desc: "The mimic shape-shifts to resemble a Medium or Small object while retaining its game statistics, or it returns to its true blob form. Any equipment it is wearing or carrying isn't transformed."
```
