---
title: Giant Octopus
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 1
xp: 200
type: beast
size: Large
ac: 11
hp: 45
speed: 10
moves:
  - swim
tags:
  - monster
  - beast
  - cr1
  - srd-5-2-1
aliases:
  - Giant Octopus
export_hash: sha256-17700afd6b48
---

```statblock
columns: 2
forceColumns: true
name: Giant Octopus
source: SRD 5.2.1
size: Large
type: beast
alignment: Unaligned
ac: 11
hp: 45
hit_dice: 7d10 + 7
speed: 10 ft., Swim 60 ft.
initiative: "+1 (11)"
stats: [17, 13, 13, 5, 10, 4]
skillsaves:
  - perception: 4
  - stealth: 5
senses: Darkvision 60 ft.
passive: 14
cr: "1"
traits:
  - name: "Water Breathing"
    desc: "The octopus can breathe only underwater. It can hold its breath for 1 hour outside water."
actions:
  - name: "Tentacles"
    desc: "*Melee Attack Roll:* +5, reach 10 ft. *Hit:* 10 (2d6 + 3) Bludgeoning damage. If the target is a Medium or smaller creature, it has the [[Grappled]] condition (escape DC 13) from all eight tentacles. While [[Grappled]], the target has the [[Restrained]] condition."
reactions:
  - name: "Ink Cloud (1/Day)"
    desc: "*Trigger:* The octopus takes damage while underwater. *Response:* The octopus releases ink that fills a 10-foot Cube centered on itself, and the octopus moves up to its Swim Speed. The Cube is Heavily Obscured for 1 minute or until a strong current or similar effect disperses the ink."
```
