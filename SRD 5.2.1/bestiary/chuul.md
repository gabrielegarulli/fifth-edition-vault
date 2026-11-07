---
title: Chuul
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 4
xp: 1100
type: aberration
size: Large
ac: 16
hp: 76
speed: 30
moves:
  - swim
tags:
  - monster
  - aberration
  - cr4
  - srd-5-2-1
aliases:
  - Chuul
export_hash: sha256-e406db53e8f5
---

```statblock
columns: 2
forceColumns: true
name: Chuul
source: SRD 5.2.1
size: Large
type: aberration
alignment: Chaotic Evil
ac: 16
hp: 76
hit_dice: 9d10 + 27
speed: 30 ft., Swim 30 ft.
initiative: "+0 (10)"
stats: [19, 10, 16, 5, 11, 5]
skillsaves:
  - perception: 4
immunities: Poison
condition_immunities: Poisoned
senses: Darkvision 60 ft.
passive: 14
languages: understands Deep Speech but can't speak
cr: "4"
traits:
  - name: "Amphibious"
    desc: "The chuul can breathe air and water."
  - name: "Sense Magic"
    desc: "The chuul senses magic within 120 feet of itself. This trait otherwise works like the [[Detect Magic]] spell but isn't itself magical."
actions:
  - name: "Multiattack"
    desc: "The chuul makes two Pincer attacks and uses Paralyzing Tentacles."
  - name: "Pincer"
    desc: "*Melee Attack Roll:* +6, reach 10 ft. *Hit:* 9 (1d10 + 4) Bludgeoning damage. If the target is a Large or smaller creature, it has the [[Grappled]] condition (escape DC 14) from one of two pincers."
  - name: "Paralyzing Tentacles"
    desc: "*Constitution Saving Throw:* DC 13, one creature [[Grappled]] by the chuul. *Failure:* The target has the [[Poisoned]] condition and repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically. While [[Poisoned]], the target has the [[Paralyzed]] condition."
```
