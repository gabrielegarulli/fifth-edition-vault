---
title: Salamander
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 5
xp: 1800
type: elemental
size: Large
ac: 15
hp: 90
speed: 30
moves:
  - climb
tags:
  - monster
  - elemental
  - cr5
  - srd-5-2-1
aliases:
  - Salamander
export_hash: sha256-7ff2c6a02891
---

```statblock
columns: 2
forceColumns: true
name: Salamander
source: SRD 5.2.1
size: Large
type: elemental
alignment: Neutral Evil
ac: 15
hp: 90
hit_dice: 12d10 + 24
speed: 30 ft., Climb 30 ft.
initiative: "+2 (12)"
stats: [18, 14, 15, 11, 10, 12]
vulnerabilities: Cold
immunities: Fire
senses: Darkvision 60 ft.
passive: 10
languages: Primordial (Ignan)
cr: "5"
traits:
  - name: "Fire Aura"
    desc: "At the end of each of the salamander's turns, each creature of the salamander's choice in a 5-foot Emanation originating from the salamander takes 7 (2d6) Fire damage."
actions:
  - name: "Multiattack"
    desc: "The salamander makes two Flame Spear attacks. It can replace one attack with a use of Constrict."
  - name: "Flame Spear"
    desc: "*Melee Attack Roll or Ranged Attack Roll:* +7, reach 5 ft. or range 20/60 ft. *Hit:* 13 (2d8 + 4) Piercing damage plus 7 (2d6) Fire damage. *Hit or Miss:* The spear magically returns to the salamander's hand immediately after a ranged attack."
  - name: "Constrict"
    desc: "*Strength Saving Throw:* DC 15, one Large or smaller creature the salamander can see within 10 feet. *Failure:* 11 (2d6 + 4) Bludgeoning damage plus 7 (2d6) Fire damage. The target has the [[Grappled]] condition (escape DC 14), and it has the [[Restrained]] condition until the grapple ends."
```
