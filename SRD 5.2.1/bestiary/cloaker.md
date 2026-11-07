---
title: Cloaker
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 8
xp: 3900
type: aberration
size: Large
ac: 14
hp: 91
speed: 10
moves:
  - fly
spellcasting: true
tags:
  - monster
  - aberration
  - cr8
  - srd-5-2-1
aliases:
  - Cloaker
export_hash: sha256-d765c7cbfd92
---

```statblock
columns: 2
forceColumns: true
name: Cloaker
source: SRD 5.2.1
size: Large
type: aberration
alignment: Chaotic Neutral
ac: 14
hp: 91
hit_dice: 14d10 + 14
speed: 10 ft., Fly 40 ft.
initiative: "+5 (15)"
stats: [17, 15, 12, 13, 14, 7]
skillsaves:
  - stealth: 5
condition_immunities: Frightened
senses: Darkvision 120 ft.
passive: 12
languages: Deep Speech, Undercommon
cr: "8"
traits:
  - name: "Light Sensitivity"
    desc: "While in Bright Light, the cloaker has Disadvantage on attack rolls."
actions:
  - name: "Multiattack"
    desc: "The cloaker makes one Attach attack and two Tail attacks."
  - name: "Attach"
    desc: "*Melee Attack Roll:* +6, reach 5 ft. *Hit:* 13 (3d6 + 3) Piercing damage. If the target is a Large or smaller creature, the cloaker attaches to it. While the cloaker is attached, the target has the [[Blinded]] condition, and the cloaker can't make Attach attacks against other targets. In addition, the cloaker halves the damage it takes (round down), and the target takes the same amount of damage.\n\nThe cloaker can detach itself by spending 5 feet of movement. The target or a creature within 5 feet of it can take an action to try to detach the cloaker, doing so by succeeding on a DC 14 Strength (Athletics) check."
  - name: "Tail"
    desc: "*Melee Attack Roll:* +6, reach 10 ft. *Hit:* 8 (1d10 + 3) Slashing damage."
bonus_actions:
  - name: "Moan"
    desc: "*Wisdom Saving Throw:* DC 13, each creature in a 60-foot Emanation originating from the cloaker. *Failure:* The target has the [[Frightened]] condition until the end of the cloaker's next turn. *Success:* The target is immune to this cloaker's Moan for the next 24 hours."
  - name: "Phantasms (Recharge after a Short or Long Rest)"
    desc: "The cloaker casts the [[Mirror Image]] spell, requiring no spell components and using Wisdom as the spellcasting ability. The spell ends early if the cloaker starts or ends its turn in Bright Light.\n- **At Will:** [[Mirror Image]]"
```
