---
title: Water Elemental
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 5
xp: 1800
type: elemental
size: Large
ac: 14
hp: 114
speed: 30
moves:
  - swim
tags:
  - monster
  - elemental
  - cr5
  - srd-5-2-1
aliases:
  - Water Elemental
export_hash: sha256-ce9b2aecc74d
---

```statblock
columns: 2
forceColumns: true
name: Water Elemental
source: SRD 5.2.1
size: Large
type: elemental
alignment: Neutral
ac: 14
hp: 114
hit_dice: 12d10 + 48
speed: 30 ft., Swim 90 ft.
initiative: "+2 (12)"
stats: [18, 14, 18, 5, 10, 8]
resistances: Acid, Fire
immunities: Poison
condition_immunities: Exhaustion, Grappled, Paralyzed, Petrified, Poisoned, Prone, Restrained, Unconscious
senses: Darkvision 60 ft.
passive: 10
languages: Primordial (Aquan)
cr: "5"
traits:
  - name: "Freeze"
    desc: "If the elemental takes Cold damage, its Speed decreases by 20 feet until the end of its next turn."
  - name: "Water Form"
    desc: "The elemental can enter an enemy's space and stop there. It can move through a space as narrow as 1 inch without expending extra movement to do so."
actions:
  - name: "Multiattack"
    desc: "The elemental makes two Slam attacks."
  - name: "Slam"
    desc: "*Melee Attack Roll:* +7, reach 5 ft. *Hit:* 13 (2d8 + 4) Bludgeoning damage. If the target is a Medium or smaller creature, it has the [[Prone]] condition."
  - name: "Whelm (Recharge 4–6)"
    desc: "*Strength Saving Throw:* DC 15, each creature in the elemental's space. *Failure:* 22 (4d8 + 4) Bludgeoning damage. If the target is a Large or smaller creature, it has the [[Grappled]] condition (escape DC 14). Until the grapple ends, the target has the [[Restrained]] condition, is suffocating unless it can breathe water, and takes 9 (2d8) Bludgeoning damage at the start of each of the elemental's turns. The elemental can grapple one Large creature or up to two Medium or smaller creatures at a time with Whelm. As an action, a creature within 5 feet of the elemental can pull a creature out of it by succeeding on a DC 14 Strength (Athletics) check. *Success:* Half damage only."
```
