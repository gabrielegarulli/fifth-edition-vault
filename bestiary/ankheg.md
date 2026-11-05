---
title: Ankheg
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 2
xp: 450
type: monstrosity
size: Large
ac: 14
hp: 45
speed: 30
moves:
  - burrow
tags:
  - monster
  - monstrosity
  - cr2
  - srd-5-2-1
aliases:
  - Ankheg
export_hash: sha256-83cd1cfdd081
---

```statblock
columns: 2
forceColumns: true
name: Ankheg
source: SRD 5.2.1
size: Large
type: monstrosity
alignment: Unaligned
ac: 14
hp: 45
hit_dice: 6d10 + 12
speed: 30 ft., Burrow 10 ft.
initiative: "+0 (10)"
stats: [17, 11, 14, 1, 13, 6]
senses: Darkvision 60 ft., Tremorsense 60 ft.
passive: 11
cr: "2"
traits:
  - name: "Tunneler"
    desc: "The ankheg can burrow through solid rock at half its Burrow Speed and leaves a 10-foot-diameter tunnel in its wake."
actions:
  - name: "Bite"
    desc: "*Melee Attack Roll:* +5 (with Advantage if the target is [[Grappled]] by the ankheg), reach 5 ft. *Hit:* 10 (2d6 + 3) Slashing damage plus 3 (1d6) Acid damage. If the target is a Large or smaller creature, it has the [[Grappled]] condition (escape DC 13)."
  - name: "Acid Spray (Recharge 6)"
    desc: "*Dexterity Saving Throw:* DC 12, each creature in a 30-foot-long, 5-foot-wide Line. *Failure:* 14 (4d6) Acid damage. *Success:* Half damage."
```
