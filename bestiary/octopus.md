---
title: Octopus
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 0
xp: 10
type: beast
size: Small
ac: 12
hp: 3
speed: 5
moves:
  - swim
tags:
  - monster
  - beast
  - cr0
  - srd-5-2-1
aliases:
  - Octopus
export_hash: sha256-288eb3936691
---

```statblock
columns: 2
forceColumns: true
name: Octopus
source: SRD 5.2.1
size: Small
type: beast
alignment: Unaligned
ac: 12
hp: 3
hit_dice: 1d6
speed: 5 ft., Swim 30 ft.
initiative: "+2 (12)"
stats: [4, 15, 11, 3, 10, 4]
skillsaves:
  - perception: 2
  - stealth: 6
senses: Darkvision 30 ft.
passive: 12
cr: "0"
traits:
  - name: "Compression"
    desc: "The octopus can move through a space as narrow as 1 inch without expending extra movement to do so."
  - name: "Water Breathing"
    desc: "The octopus can breathe only underwater."
actions:
  - name: "Tentacles"
    desc: "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 1 Bludgeoning damage."
reactions:
  - name: "Ink Cloud (1/Day)"
    desc: "*Trigger:* A creature ends its turn within 5 feet of the octopus while underwater. *Response:* The octopus releases ink that fills a 5-foot Cube centered on itself, and the octopus moves up to its Swim Speed. The Cube is Heavily Obscured for 1 minute or until a strong current or similar effect disperses the ink."
```
