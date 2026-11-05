---
title: Half-Dragon
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 5
xp: 1800
type: dragon
size: Medium
ac: 18
hp: 105
speed: 40
tags:
  - monster
  - dragon
  - cr5
  - srd-5-2-1
aliases:
  - Half-Dragon
export_hash: sha256-32d4ea27ec9d
---

```statblock
columns: 2
forceColumns: true
name: Half-Dragon
source: SRD 5.2.1
size: Medium
type: dragon
alignment: Neutral
ac: 18
hp: 105
hit_dice: 14d8 + 42
speed: 40 ft.
initiative: "+5 (15)"
stats: [19, 14, 16, 10, 15, 14]
saves:
  - dexterity: 5
  - wisdom: 5
skillsaves:
  - athletics: 7
  - perception: 5
  - stealth: 5
resistances: Damage type chosen for the Draconic Origin trait below
senses: Blindsight 10 ft., Darkvision 60 ft.
passive: 15
languages: Common, Draconic
cr: "5"
traits:
  - name: "Draconic Origin"
    desc: "The half-dragon is related to a type of dragon associated with one of the following damage types (GM's choice): Acid, Cold, Fire, Lightning, or Poison. This choice affects other aspects of the stat block."
actions:
  - name: "Multiattack"
    desc: "The half-dragon makes two Claw attacks."
  - name: "Claw"
    desc: "*Melee Attack Roll:* +7, reach 10 ft. *Hit:* 6 (1d4 + 4) Slashing damage plus 7 (2d6) damage of the type chosen for the Draconic Origin trait."
  - name: "Dragon's Breath (Recharge 5–6)"
    desc: "*Dexterity Saving Throw:* DC 14, each creature in a 30-foot Cone. *Failure:* 28 (8d6) damage of the type chosen for the Draconic Origin trait. *Success:* Half damage."
bonus_actions:
  - name: "Leap"
    desc: "The half-dragon jumps up to 30 feet by spending 10 feet of movement."
```
