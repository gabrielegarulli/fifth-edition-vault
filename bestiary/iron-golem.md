---
title: Iron Golem
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 16
xp: 15000
type: construct
size: Large
ac: 20
hp: 252
speed: 30
tags:
  - monster
  - construct
  - cr16
  - srd-5-2-1
aliases:
  - Iron Golem
export_hash: sha256-0c925cadb12f
---

```statblock
columns: 2
forceColumns: true
name: Iron Golem
source: SRD 5.2.1
size: Large
type: construct
alignment: Unaligned
ac: 20
hp: 252
hit_dice: 24d10 + 120
speed: 30 ft.
initiative: "+9 (19)"
stats: [24, 9, 20, 3, 11, 1]
immunities: Fire, Poison, Psychic
condition_immunities: Charmed, Exhaustion, Frightened, Paralyzed, Petrified, Poisoned
senses: Darkvision 120 ft.
passive: 10
languages: understands Common plus two other languages but can't speak
cr: "16"
traits:
  - name: "Fire Absorption"
    desc: "Whenever the golem is subjected to Fire damage, it regains a number of Hit Points equal to the Fire damage dealt."
  - name: "Immutable Form"
    desc: "The golem can't shape-shift."
  - name: "Magic Resistance"
    desc: "The golem has Advantage on saving throws against spells and other magical effects."
actions:
  - name: "Multiattack"
    desc: "The golem makes two attacks, using Bladed Arm or Fiery Bolt in any combination."
  - name: "Bladed Arm"
    desc: "*Melee Attack Roll:* +12, reach 10 ft. *Hit:* 20 (3d8 + 7) Slashing damage plus 10 (3d6) Fire damage."
  - name: "Fiery Bolt"
    desc: "*Ranged Attack Roll:* +10, range 120 ft. *Hit:* 36 (8d8) Fire damage."
  - name: "Poison Breath (Recharge 6)"
    desc: "*Constitution Saving Throw:* DC 18, each creature in a 60-foot Cone. *Failure:* 55 (10d10) Poison damage. *Success:* Half damage."
```
