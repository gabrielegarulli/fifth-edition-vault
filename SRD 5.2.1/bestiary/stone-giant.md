---
title: Stone Giant
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 7
xp: 2900
type: giant
size: Huge
ac: 17
hp: 126
speed: 40
tags:
  - monster
  - giant
  - cr7
  - srd-5-2-1
aliases:
  - Stone Giant
export_hash: sha256-80784f17bc6a
---

```statblock
columns: 2
forceColumns: true
name: Stone Giant
source: SRD 5.2.1
size: Huge
type: giant
alignment: Neutral
ac: 17
hp: 126
hit_dice: 11d12 + 55
speed: 40 ft.
initiative: "+5 (15)"
stats: [23, 15, 20, 10, 12, 9]
saves:
  - dexterity: 5
  - constitution: 8
  - wisdom: 4
skillsaves:
  - athletics: 12
  - perception: 4
  - stealth: 5
senses: Darkvision 60 ft.
passive: 14
languages: Giant
cr: "7"
actions:
  - name: "Multiattack"
    desc: "The giant makes two attacks, using Stone Club or Boulder in any combination."
  - name: "Stone Club"
    desc: "*Melee Attack Roll:* +9, reach 15 ft. *Hit:* 22 (3d10 + 6) Bludgeoning damage."
  - name: "Boulder"
    desc: "*Ranged Attack Roll:* +9, range 60/240 ft. *Hit:* 15 (2d8 + 6) Bludgeoning damage. If the target is a Large or smaller creature, it has the [[Prone]] condition."
reactions:
  - name: "Deflect Missile (Recharge 5–6)"
    desc: "*Trigger:* The giant is hit by a ranged attack roll and takes Bludgeoning, Piercing, or Slashing damage from it. *Response:* The giant reduces the damage it takes from the attack by 11 (1d10 + 6), and if that damage is reduced to 0, the giant can redirect some of the attack's force. *Dexterity Saving Throw:* DC 17, one creature the giant can see within 60 feet. *Failure:* 11 (1d10 + 6) Force damage."
```
