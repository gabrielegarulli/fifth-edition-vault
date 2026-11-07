---
title: Dust Mephit
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 1/2
xp: 100
type: elemental
size: Small
ac: 12
hp: 17
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
  - Dust Mephit
export_hash: sha256-97d2c2f6dfc7
---

```statblock
columns: 2
forceColumns: true
name: Dust Mephit
source: SRD 5.2.1
size: Small
type: elemental
alignment: Neutral Evil
ac: 12
hp: 17
hit_dice: 5d6
speed: 30 ft., Fly 30 ft.
initiative: "+2 (12)"
stats: [5, 14, 10, 9, 11, 10]
skillsaves:
  - perception: 2
  - stealth: 4
vulnerabilities: Fire
immunities: Poison
condition_immunities: Exhaustion, Poisoned
senses: Darkvision 60 ft.
passive: 12
languages: Primordial (Auran, Terran)
cr: "1/2"
traits:
  - name: "Death Burst"
    desc: "The mephit explodes when it dies. *Dexterity Saving Throw:* DC 10, each creature in a 5-foot Emanation originating from the mephit. *Failure:* 5 (2d4) Bludgeoning damage. *Success:* Half damage."
actions:
  - name: "Claw"
    desc: "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 4 (1d4 + 2) Slashing damage."
  - name: "Blinding Breath (Recharge 6)"
    desc: "*Dexterity Saving Throw:* DC 10, each creature in a 15-foot Cone. *Failure:* The target has the [[Blinded]] condition until the end of the mephit's next turn."
  - name: "Sleep (1/Day)"
    desc: "The mephit casts the [[Sleep]] spell, requiring no spell components and using Charisma as the spellcasting ability (spell save DC 10).\n- **1/Day:** [[Sleep]]"
```
