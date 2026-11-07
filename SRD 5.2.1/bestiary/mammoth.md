---
title: Mammoth
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 6
xp: 2300
type: beast
size: Huge
ac: 13
hp: 126
speed: 50
tags:
  - monster
  - beast
  - cr6
  - srd-5-2-1
aliases:
  - Mammoth
export_hash: sha256-c7ecc8139eaf
---

```statblock
columns: 2
forceColumns: true
name: Mammoth
source: SRD 5.2.1
size: Huge
type: beast
alignment: Unaligned
ac: 13
hp: 126
hit_dice: 11d12 + 55
speed: 50 ft.
initiative: "+2 (12)"
stats: [24, 9, 21, 3, 11, 6]
saves:
  - strength: 10
  - constitution: 8
passive: 10
cr: "6"
actions:
  - name: "Multiattack"
    desc: "The mammoth makes two Gore attacks."
  - name: "Gore"
    desc: "*Melee Attack Roll:* +10, reach 10 ft. *Hit:* 18 (2d10 + 7) Piercing damage. If the target is a Huge or smaller creature and the mammoth moved 20+ feet straight toward it immediately before the hit, the target has the [[Prone]] condition."
bonus_actions:
  - name: "Trample"
    desc: "*Dexterity Saving Throw:* DC 18, one creature within 5 feet that has the [[Prone]] condition. *Failure:* 29 (4d10 + 7) Bludgeoning damage. *Success:* Half damage."
```
