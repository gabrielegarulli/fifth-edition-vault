---
title: Roc
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 11
xp: 7200
type: monstrosity
size: Gargantuan
ac: 15
hp: 248
speed: 20
moves:
  - fly
tags:
  - monster
  - monstrosity
  - cr11
  - srd-5-2-1
aliases:
  - Roc
export_hash: sha256-039bfbd420b4
---

```statblock
columns: 2
forceColumns: true
name: Roc
source: SRD 5.2.1
size: Gargantuan
type: monstrosity
alignment: Unaligned
ac: 15
hp: 248
hit_dice: 16d20 + 80
speed: 20 ft., Fly 120 ft.
initiative: "+8 (18)"
stats: [28, 10, 20, 3, 10, 9]
saves:
  - dexterity: 4
  - wisdom: 4
skillsaves:
  - perception: 8
passive: 18
cr: "11"
actions:
  - name: "Multiattack"
    desc: "The roc makes two Beak attacks. It can replace one attack with a Talons attack."
  - name: "Beak"
    desc: "*Melee Attack Roll:* +13, reach 10 ft. *Hit:* 28 (3d12 + 9) Piercing damage."
  - name: "Talons"
    desc: "*Melee Attack Roll:* +13, reach 5 ft. *Hit:* 23 (4d6 + 9) Slashing damage. If the target is a Huge or smaller creature, it has the [[Grappled]] condition (escape DC 19) from both talons, and it has the [[Restrained]] condition until the grapple ends."
bonus_actions:
  - name: "Swoop (Recharge 5–6)"
    desc: "If the roc has a creature [[Grappled]], the roc flies up to half its Fly Speed without provoking Opportunity Attacks and drops that creature."
```
