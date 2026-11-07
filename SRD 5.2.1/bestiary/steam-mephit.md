---
title: Steam Mephit
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 1/4
xp: 50
type: elemental
size: Small
ac: 10
hp: 17
speed: 30
moves:
  - fly
tags:
  - monster
  - elemental
  - cr1-4
  - srd-5-2-1
aliases:
  - Steam Mephit
export_hash: sha256-a17da7c07f9d
---

```statblock
columns: 2
forceColumns: true
name: Steam Mephit
source: SRD 5.2.1
size: Small
type: elemental
alignment: Neutral Evil
ac: 10
hp: 17
hit_dice: 5d6
speed: 30 ft., Fly 30 ft.
initiative: "+0 (10)"
stats: [5, 11, 10, 11, 10, 12]
skillsaves:
  - stealth: 2
immunities: Fire, Poison
condition_immunities: Exhaustion, Poisoned
senses: Darkvision 60 ft.
passive: 10
languages: Primordial (Aquan, Ignan)
cr: "1/4"
traits:
  - name: "Blurred Form"
    desc: "Attack rolls against the mephit are made with Disadvantage unless the mephit has the [[Incapacitated]] condition."
  - name: "Death Burst"
    desc: "The mephit explodes when it dies. *Dexterity Saving Throw:* DC 10, each creature in a 5-foot Emanation originating from the mephit. *Failure:* 5 (2d4) Fire damage. *Success:* Half damage."
actions:
  - name: "Claw"
    desc: "*Melee Attack Roll:* +2, reach 5 ft. *Hit:* 2 (1d4) Slashing damage plus 2 (1d4) Fire damage."
  - name: "Steam Breath (Recharge 6)"
    desc: "*Constitution Saving Throw:* DC 10, each creature in a 15-foot Cone. *Failure:* 5 (2d4) Fire damage, and the target's Speed decreases by 10 feet until the end of the mephit's next turn. *Success:* Half damage only. Being underwater doesn't grant Resistance to this Fire damage."
```
