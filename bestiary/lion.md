---
title: Lion
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 1
xp: 200
type: beast
size: Large
ac: 12
hp: 22
speed: 50
tags:
  - monster
  - beast
  - cr1
  - srd-5-2-1
aliases:
  - Lion
export_hash: sha256-0e8a78311730
---

```statblock
columns: 2
forceColumns: true
name: Lion
source: SRD 5.2.1
size: Large
type: beast
alignment: Unaligned
ac: 12
hp: 22
hit_dice: 4d10
speed: 50 ft.
initiative: "+2 (12)"
stats: [17, 15, 11, 3, 12, 8]
skillsaves:
  - perception: 3
  - stealth: 4
senses: Darkvision 60 ft.
passive: 13
cr: "1"
traits:
  - name: "Pack Tactics"
    desc: "The lion has Advantage on an attack roll against a creature if at least one of the lion's allies is within 5 feet of the creature and the ally doesn't have the [[Incapacitated]] condition."
  - name: "Running Leap"
    desc: "With a 10-foot running start, the lion can Long Jump up to 25 feet."
actions:
  - name: "Multiattack"
    desc: "The lion makes two Rend attacks. It can replace one attack with a use of Roar."
  - name: "Rend"
    desc: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 7 (1d8 + 3) Slashing damage."
  - name: "Roar"
    desc: "*Wisdom Saving Throw:* DC 11, one creature within 15 feet. *Failure:* The target has the [[Frightened]] condition until the start of the lion's next turn."
```
