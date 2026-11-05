---
title: Ice Mephit
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 1/2
xp: 100
type: elemental
size: Small
ac: 11
hp: 21
speed: 30
moves:
  - fly
spellcasting: true
tags:
  - monster
  - elemental
  - cr1-2
  - srd-5-2-1
aliases:
  - Ice Mephit
export_hash: sha256-7d5a70366970
---

```statblock
columns: 2
forceColumns: true
name: Ice Mephit
source: SRD 5.2.1
size: Small
type: elemental
alignment: Neutral Evil
ac: 11
hp: 21
hit_dice: 6d6
speed: 30 ft., Fly 30 ft.
initiative: "+1 (11)"
stats: [7, 13, 10, 9, 11, 12]
skillsaves:
  - perception: 2
  - stealth: 3
vulnerabilities: Fire
immunities: Cold, Poison
condition_immunities: Exhaustion, Poisoned
senses: Darkvision 60 ft.
passive: 12
languages: Primordial (Aquan, Auran)
cr: "1/2"
traits:
  - name: "Death Burst"
    desc: "The mephit explodes when it dies. *Constitution Saving Throw:* DC 10, each creature in a 5-foot Emanation originating from the mephit. *Failure:* 5 (2d4) Cold damage. *Success:* Half damage."
actions:
  - name: "Claw"
    desc: "*Melee Attack Roll:* +3, reach 5 ft. *Hit:* 3 (1d4 + 1) Slashing damage plus 2 (1d4) Cold damage."
  - name: "Frost Breath (Recharge 6)"
    desc: "*Constitution Saving Throw:* DC 10, each creature in a 15-foot Cone. *Failure:* 7 (3d4) Cold damage. *Success:* Half damage."
  - name: "Fog Cloud (1/Day)"
    desc: "The mephit casts [[Fog Cloud]], requiring no spell components and using Charisma as the spellcasting ability.\n- **1/Day:** [[Fog Cloud]]"
```
