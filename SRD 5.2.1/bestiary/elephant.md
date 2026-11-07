---
title: Elephant
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 4
xp: 1100
type: beast
size: Huge
ac: 12
hp: 76
speed: 40
tags:
  - monster
  - beast
  - cr4
  - srd-5-2-1
aliases:
  - Elephant
export_hash: sha256-e2efbb898e62
---

```statblock
columns: 2
forceColumns: true
name: Elephant
source: SRD 5.2.1
size: Huge
type: beast
alignment: Unaligned
ac: 12
hp: 76
hit_dice: 8d12 + 24
speed: 40 ft.
initiative: "-1 (9)"
stats: [22, 9, 17, 3, 11, 6]
passive: 10
cr: "4"
actions:
  - name: "Multiattack"
    desc: "The elephant makes two Gore attacks."
  - name: "Gore"
    desc: "*Melee Attack Roll:* +8, reach 5 ft. *Hit:* 15 (2d8 + 6) Piercing damage. If the target is a Huge or smaller creature and the elephant moved 20+ feet straight toward it immediately before the hit, the target has the [[Prone]] condition."
bonus_actions:
  - name: "Trample"
    desc: "*Dexterity Saving Throw:* DC 16, one creature within 5 feet that has the [[Prone]] condition. *Failure:* 17 (2d10 + 6) Bludgeoning damage. *Success:* Half damage."
```
