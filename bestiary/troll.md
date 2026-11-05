---
title: Troll
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 5
xp: 1800
type: giant
size: Large
ac: 15
hp: 94
speed: 30
tags:
  - monster
  - giant
  - cr5
  - srd-5-2-1
aliases:
  - Troll
export_hash: sha256-d9384efac200
---

```statblock
columns: 2
forceColumns: true
name: Troll
source: SRD 5.2.1
size: Large
type: giant
alignment: Chaotic Evil
ac: 15
hp: 94
hit_dice: 9d10 + 45
speed: 30 ft.
initiative: "+1 (11)"
stats: [18, 13, 20, 7, 9, 7]
skillsaves:
  - perception: 5
senses: Darkvision 60 ft.
passive: 15
languages: Giant
cr: "5"
traits:
  - name: "Loathsome Limbs (4/Day)"
    desc: "If the troll ends any turn Bloodied and took 15+ Slashing damage during that turn, one of the troll's limbs is severed, falls into the troll's space, and becomes a Troll Limb. The limb acts immediately after the troll's turn. The troll has 1 [[Exhaustion]] level for each missing limb, and it grows replacement limbs the next time it regains Hit Points."
  - name: "Regeneration"
    desc: "The troll regains 15 Hit Points at the start of each of its turns. If the troll takes Acid or Fire damage, this trait doesn't function on the troll's next turn. The troll dies only if it starts its turn with 0 Hit Points and doesn't regenerate."
actions:
  - name: "Multiattack"
    desc: "The troll makes three Rend attacks."
  - name: "Rend"
    desc: "*Melee Attack Roll:* +7, reach 10 ft. *Hit:* 11 (2d6 + 4) Slashing damage."
bonus_actions:
  - name: "Charge"
    desc: "The troll moves up to half its Speed straight toward an enemy it can see."
```
