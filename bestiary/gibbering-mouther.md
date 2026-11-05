---
title: Gibbering Mouther
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 2
xp: 450
type: aberration
size: Medium
ac: 9
hp: 52
speed: 20
moves:
  - swim
tags:
  - monster
  - aberration
  - cr2
  - srd-5-2-1
aliases:
  - Gibbering Mouther
export_hash: sha256-c83ac9274f58
---

```statblock
columns: 2
forceColumns: true
name: Gibbering Mouther
source: SRD 5.2.1
size: Medium
type: aberration
alignment: Chaotic Neutral
ac: 9
hp: 52
hit_dice: 7d8 + 21
speed: 20 ft., Swim 20 ft.
initiative: "-1 (9)"
stats: [10, 8, 16, 3, 10, 6]
condition_immunities: Prone
senses: Darkvision 60 ft.
passive: 10
cr: "2"
traits:
  - name: "Aberrant Ground"
    desc: "The ground in a 10-foot Emanation originating from the mouther is Difficult Terrain."
  - name: "Gibbering"
    desc: "The mouther babbles incoherently while it doesn't have the [[Incapacitated]] condition. *Wisdom Saving Throw:* DC 10, any creature that starts its turn within 20 feet of the mouther while it is babbling. *Failure:* The target rolls 1d8 to determine what it does during the current turn:\n\n- **1-4:** The target does nothing.\n- **5-6:** The target takes no action or Bonus Action and uses all its movement to move in a random direction.\n- **7-8:** The target makes a melee attack against a randomly determined creature within its reach or does nothing if it can't make such an attack."
actions:
  - name: "Bite"
    desc: "*Melee Attack Roll:* +2, reach 5 ft. *Hit:* 7 (2d6) Piercing damage. If the target is a Medium or smaller creature, it has the [[Prone]] condition. The target dies if it is reduced to 0 Hit Points by this attack. Its body is then absorbed into the mouther, leaving only equipment behind."
  - name: "Blinding Spittle (Recharge 5–6)"
    desc: "*Dexterity Saving Throw:* DC 10, each creature in a 10-foot-radius Sphere centered on a point within 30 feet. *Failure:* 7 (2d6) Radiant damage, and the target has the [[Blinded]] condition until the end of the mouther's next turn."
```
