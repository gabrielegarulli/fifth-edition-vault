---
title: Giant Frog
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 1/4
xp: 50
type: beast
size: Medium
ac: 11
hp: 18
speed: 30
moves:
  - swim
tags:
  - monster
  - beast
  - cr1-4
  - srd-5-2-1
aliases:
  - Giant Frog
export_hash: sha256-5b685edf28ae
---

```statblock
columns: 2
forceColumns: true
name: Giant Frog
source: SRD 5.2.1
size: Medium
type: beast
alignment: Unaligned
ac: 11
hp: 18
hit_dice: 4d8
speed: 30 ft., Swim 30 ft.
initiative: "+1 (11)"
stats: [12, 13, 11, 2, 10, 3]
skillsaves:
  - perception: 2
  - stealth: 3
senses: Darkvision 30 ft.
passive: 12
cr: "1/4"
traits:
  - name: "Amphibious"
    desc: "The frog can breathe air and water."
  - name: "Standing Leap"
    desc: "The frog's Long Jump is up to 20 feet and its High Jump is up to 10 feet with or without a running start."
actions:
  - name: "Bite"
    desc: "*Melee Attack Roll:* +3, reach 5 ft. *Hit:* 5 (1d6 + 2) Piercing damage. If the target is a Medium or smaller creature, it has the [[Grappled]] condition (escape DC 11)."
  - name: "Swallow"
    desc: "The frog swallows a Small or smaller target it is grappling. While swallowed, the target isn't [[Grappled]] but has the [[Blinded]] and [[Restrained]] conditions, and it has Total Cover against attacks and other effects outside the frog. While swallowing the target, the frog can't use Bite, and if the frog dies, the swallowed target is no longer [[Restrained]] and can escape from the corpse using 5 feet of movement, exiting with the [[Prone]] condition.\n\nAt the end of the frog's next turn, the swallowed target takes 5 (2d4) Acid damage. If that damage doesn't kill it, the frog disgorges it, causing it to exit [[Prone]]."
```
