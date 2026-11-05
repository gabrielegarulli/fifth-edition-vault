---
title: Roper
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 5
xp: 1800
type: aberration
size: Large
ac: 20
hp: 93
speed: 10
moves:
  - climb
tags:
  - monster
  - aberration
  - cr5
  - srd-5-2-1
aliases:
  - Roper
export_hash: sha256-5f62f4ab930e
---

```statblock
columns: 2
forceColumns: true
name: Roper
source: SRD 5.2.1
size: Large
type: aberration
alignment: Neutral Evil
ac: 20
hp: 93
hit_dice: 11d10 + 33
speed: 10 ft., Climb 20 ft.
initiative: "+5 (15)"
stats: [18, 8, 17, 7, 16, 6]
skillsaves:
  - perception: 6
  - stealth: 5
senses: Darkvision 60 ft.
passive: 16
cr: "5"
traits:
  - name: "Spider Climb"
    desc: "The roper can climb difficult surfaces, including along ceilings, without needing to make an ability check."
actions:
  - name: "Multiattack"
    desc: "The roper makes two Tentacle attacks, uses Reel, and makes two Bite attacks."
  - name: "Bite"
    desc: "*Melee Attack Roll:* +7, reach 5 ft. *Hit:* 17 (3d8 + 4) Piercing damage."
  - name: "Tentacle"
    desc: "*Melee Attack Roll:* +7, reach 60 ft. *Hit:* The target has the [[Grappled]] condition (escape DC 14) from one of six tentacles, and the target has the [[Poisoned]] condition until the grapple ends.\n\nThe tentacle can be damaged, freeing a creature it has [[Grappled]] when destroyed (AC 20, HP 10, Immunity to Poison and Psychic damage). Damaging the tentacle deals no damage to the roper, and a destroyed tentacle regrows at the start of the roper's next turn."
  - name: "Reel"
    desc: "The roper pulls each creature [[Grappled]] by it up to 30 feet straight toward it."
```
