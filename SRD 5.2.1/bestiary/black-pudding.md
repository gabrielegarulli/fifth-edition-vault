---
title: Black Pudding
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 4
xp: 1100
type: ooze
size: Large
ac: 7
hp: 68
speed: 20
moves:
  - climb
tags:
  - monster
  - ooze
  - cr4
  - srd-5-2-1
aliases:
  - Black Pudding
export_hash: sha256-a6abdd24f129
---

```statblock
columns: 2
forceColumns: true
name: Black Pudding
source: SRD 5.2.1
size: Large
type: ooze
alignment: Unaligned
ac: 7
hp: 68
hit_dice: 8d10 + 24
speed: 20 ft., Climb 20 ft.
initiative: "-3 (7)"
stats: [16, 5, 16, 1, 6, 1]
immunities: Acid, Cold, Lightning, Slashing
condition_immunities: Charmed, Deafened, Exhaustion, Frightened, Grappled, Prone, Restrained
senses: Blindsight 60 ft.
passive: 8
cr: "4"
traits:
  - name: "Amorphous"
    desc: "The pudding can move through a space as narrow as 1 inch without expending extra movement to do so."
  - name: "Corrosive Form"
    desc: "A creature that hits the pudding with a melee attack roll takes 4 (1d8) Acid damage. Nonmagical ammunition is destroyed immediately after hitting the pudding and dealing any damage. Any nonmagical weapon takes a cumulative -1 penalty to attack rolls immediately after dealing damage to the pudding and coming into contact with it. The weapon is destroyed if the penalty reaches -5. The penalty can be removed by casting the [[Mending]] spell on the weapon.\n\nIn 1 minute, the pudding can eat through 2 feet of nonmagical wood or metal."
  - name: "Spider Climb"
    desc: "The pudding can climb difficult surfaces, including along ceilings, without needing to make an ability check."
actions:
  - name: "Dissolving Pseudopod"
    desc: "*Melee Attack Roll:* +5, reach 10 ft. *Hit:* 17 (4d6 + 3) Acid damage. Nonmagical armor worn by the target takes a -1 penalty to the AC it offers. The armor is destroyed if the penalty reduces its AC to 10. The penalty can be removed by casting the [[Mending]] spell on the armor."
reactions:
  - name: "Split"
    desc: "*Trigger:* While the pudding is Large or Medium and has 10+ Hit Points, it becomes Bloodied or is subjected to Lightning or Slashing damage. *Response:* The pudding splits into two new Black Puddings. Each new pudding is one size smaller than the original pudding and acts on its Initiative. The original pudding's Hit Points are divided evenly between the new puddings (round down)."
```
