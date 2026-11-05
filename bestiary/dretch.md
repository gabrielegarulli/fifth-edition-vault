---
title: Dretch
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 1/4
xp: 50
type: fiend
subtype: demon
size: Small
ac: 11
hp: 18
speed: 20
tags:
  - monster
  - fiend
  - demon
  - cr1-4
  - srd-5-2-1
aliases:
  - Dretch
export_hash: sha256-60558def3d52
---

```statblock
columns: 2
forceColumns: true
name: Dretch
source: SRD 5.2.1
size: Small
type: fiend
subtype: demon
alignment: Chaotic Evil
ac: 11
hp: 18
hit_dice: 4d6 + 4
speed: 20 ft.
initiative: "+0 (10)"
stats: [12, 11, 12, 5, 8, 3]
resistances: Cold, Fire, Lightning
immunities: Poison
condition_immunities: Poisoned
senses: Darkvision 60 ft.
passive: 9
languages: Abyssal; telepathy 60 ft. (works only with creatures that understand Abyssal)
cr: "1/4"
actions:
  - name: "Rend"
    desc: "*Melee Attack Roll:* +3, reach 5 ft. *Hit:* 4 (1d6 + 1) Slashing damage."
  - name: "Fetid Cloud (1/Day)"
    desc: "*Constitution Saving Throw:* DC 11, each creature in a 10-foot Emanation originating from the dretch. *Failure:* The target has the [[Poisoned]] condition until the end of its next turn. While [[Poisoned]], the creature can take either an action or a Bonus Action on its turn, not both, and it can't take Reactions."
```
