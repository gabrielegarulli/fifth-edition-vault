---
title: Stone Golem
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 10
xp: 5900
type: construct
size: Large
ac: 18
hp: 220
speed: 30
spellcasting: true
tags:
  - monster
  - construct
  - cr10
  - srd-5-2-1
aliases:
  - Stone Golem
export_hash: sha256-ee8a44eb8f38
---

```statblock
columns: 2
forceColumns: true
name: Stone Golem
source: SRD 5.2.1
size: Large
type: construct
alignment: Unaligned
ac: 18
hp: 220
hit_dice: 21d10 + 105
speed: 30 ft.
initiative: "+3 (13)"
stats: [22, 9, 20, 3, 11, 1]
immunities: Poison, Psychic
condition_immunities: Charmed, Exhaustion, Frightened, Paralyzed, Petrified, Poisoned
senses: Darkvision 120 ft.
passive: 10
languages: understands Common plus two other languages but can't speak
cr: "10"
traits:
  - name: "Immutable Form"
    desc: "The golem can't shape-shift."
  - name: "Magic Resistance"
    desc: "The golem has Advantage on saving throws against spells and other magical effects."
actions:
  - name: "Multiattack"
    desc: "The golem makes two attacks, using Slam or Force Bolt in any combination."
  - name: "Slam"
    desc: "*Melee Attack Roll:* +10, reach 5 ft. *Hit:* 15 (2d8 + 6) Bludgeoning damage plus 9 (2d8) Force damage."
  - name: "Force Bolt"
    desc: "*Ranged Attack Roll:* +9, range 120 ft. *Hit:* 22 (4d10) Force damage."
bonus_actions:
  - name: "Slow (Recharge 5–6)"
    desc: "The golem casts the [[Slow]] spell, requiring no spell components and using Constitution as the spellcasting ability (spell save DC 17)."
```
