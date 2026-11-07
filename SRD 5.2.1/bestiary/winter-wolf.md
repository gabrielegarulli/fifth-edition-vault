---
title: Winter Wolf
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 3
xp: 700
type: monstrosity
size: Large
ac: 13
hp: 75
speed: 50
tags:
  - monster
  - monstrosity
  - cr3
  - srd-5-2-1
aliases:
  - Winter Wolf
export_hash: sha256-dfa447041b6a
---

```statblock
columns: 2
forceColumns: true
name: Winter Wolf
source: SRD 5.2.1
size: Large
type: monstrosity
alignment: Neutral Evil
ac: 13
hp: 75
hit_dice: 10d10 + 20
speed: 50 ft.
initiative: "+1 (11)"
stats: [18, 13, 14, 7, 12, 8]
skillsaves:
  - perception: 5
  - stealth: 5
immunities: Cold
passive: 15
languages: Common, Giant
cr: "3"
traits:
  - name: "Pack Tactics"
    desc: "The wolf has Advantage on an attack roll against a creature if at least one of the wolf's allies is within 5 feet of the creature and the ally doesn't have the [[Incapacitated]] condition."
actions:
  - name: "Bite"
    desc: "*Melee Attack Roll:* +6, reach 5 ft. *Hit:* 11 (2d6 + 4) Piercing damage. If the target is a Large or smaller creature, it has the [[Prone]] condition."
  - name: "Cold Breath (Recharge 5–6)"
    desc: "*Constitution Saving Throw:* DC 12, each creature in a 15-foot Cone. *Failure:* 18 (4d8) Cold damage. *Success:* Half damage."
```
