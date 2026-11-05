---
title: Otyugh
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 5
xp: 1800
type: aberration
size: Large
ac: 14
hp: 104
speed: 30
tags:
  - monster
  - aberration
  - cr5
  - srd-5-2-1
aliases:
  - Otyugh
export_hash: sha256-e01f02d27ca5
---

```statblock
columns: 2
forceColumns: true
name: Otyugh
source: SRD 5.2.1
size: Large
type: aberration
alignment: Neutral
ac: 14
hp: 104
hit_dice: 11d10 + 44
speed: 30 ft.
initiative: "+0 (10)"
stats: [16, 11, 19, 6, 13, 6]
saves:
  - constitution: 7
senses: Darkvision 120 ft.
passive: 11
languages: Otyugh; telepathy 120 ft. (doesn't allow the receiving creature to respond telepathically)
cr: "5"
actions:
  - name: "Multiattack"
    desc: "The otyugh makes one Bite attack and two Tentacle attacks."
  - name: "Bite"
    desc: "*Melee Attack Roll:* +6, reach 5 ft. *Hit:* 12 (2d8 + 3) Piercing damage, and the target has the [[Poisoned]] condition. Whenever the [[Poisoned]] target finishes a Long Rest, it is subjected to the following effect. *Constitution Saving Throw:* DC 15. *Failure:* The target's Hit Point maximum decreases by 5 (1d10) and doesn't return to normal until the [[Poisoned]] condition ends on the target. *Success:* The [[Poisoned]] condition ends."
  - name: "Tentacle"
    desc: "*Melee Attack Roll:* +6, reach 10 ft. *Hit:* 12 (2d8 + 3) Piercing damage. If the target is a Medium or smaller creature, it has the [[Grappled]] condition (escape DC 13) from one of two tentacles."
  - name: "Tentacle Slam"
    desc: "*Constitution Saving Throw:* DC 14, each creature [[Grappled]] by the otyugh. *Failure:* 16 (3d8 + 3) Bludgeoning damage, and the target has the [[Stunned]] condition until the start of the otyugh's next turn. *Success:* Half damage only."
```
