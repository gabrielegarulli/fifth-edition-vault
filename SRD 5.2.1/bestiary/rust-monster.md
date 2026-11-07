---
title: Rust Monster
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 1/2
xp: 100
type: monstrosity
size: Medium
ac: 14
hp: 33
speed: 40
tags:
  - monster
  - monstrosity
  - cr1-2
  - srd-5-2-1
aliases:
  - Rust Monster
export_hash: sha256-e8f89df248f5
---

```statblock
columns: 2
forceColumns: true
name: Rust Monster
source: SRD 5.2.1
size: Medium
type: monstrosity
alignment: Unaligned
ac: 14
hp: 33
hit_dice: 6d8 + 6
speed: 40 ft.
initiative: "+1 (11)"
stats: [13, 12, 13, 2, 13, 6]
senses: Darkvision 60 ft.
passive: 11
cr: "1/2"
traits:
  - name: "Iron Scent"
    desc: "The rust monster can pinpoint the location of ferrous metal within 30 feet of itself."
actions:
  - name: "Multiattack"
    desc: "The rust monster makes one Bite attack and uses Antennae twice."
  - name: "Bite"
    desc: "*Melee Attack Roll:* +3, reach 5 ft. *Hit:* 5 (1d8 + 1) Piercing damage."
  - name: "Antennae"
    desc: "The rust monster targets one nonmagical metal object—armor or a weapon—worn or carried by a creature within 5 feet of itself. *Dexterity Saving Throw:* DC 11, the creature with the object. *Failure:* The object takes a -1 penalty to the AC it offers (armor) or to its attack rolls (weapon). Armor is destroyed if the penalty reduces its AC to 10, and a weapon is destroyed if its penalty reaches -5. The penalty can be removed by casting the [[Mending]] spell on the armor or weapon."
  - name: "Destroy Metal"
    desc: "The rust monster touches a nonmagical metal object within 5 feet of itself that isn't being worn or carried. The touch destroys a 1-foot Cube of the object."
reactions:
  - name: "Reflexive Antennae"
    desc: "*Trigger:* An attack roll hits the rust monster. *Response:* The rust monster uses Antennae."
```
