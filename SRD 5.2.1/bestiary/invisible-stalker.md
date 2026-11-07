---
title: Invisible Stalker
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 6
xp: 2300
type: elemental
size: Large
ac: 14
hp: 97
speed: 50
moves:
  - fly
tags:
  - monster
  - elemental
  - cr6
  - srd-5-2-1
aliases:
  - Invisible Stalker
export_hash: sha256-eecc6d79f6ef
---

```statblock
columns: 2
forceColumns: true
name: Invisible Stalker
source: SRD 5.2.1
size: Large
type: elemental
alignment: Neutral
ac: 14
hp: 97
hit_dice: 13d10 + 26
speed: 50 ft., Fly 50 ft. (hover)
initiative: "+7 (17)"
stats: [16, 19, 14, 10, 15, 11]
skillsaves:
  - perception: 8
  - stealth: 10
resistances: Bludgeoning, Piercing, Slashing
immunities: Poison
condition_immunities: Exhaustion, Grappled, Paralyzed, Petrified, Poisoned, Prone, Restrained, Unconscious
senses: Darkvision 60 ft.
passive: 18
languages: Common, Primordial (Auran)
cr: "6"
traits:
  - name: "Air Form"
    desc: "The stalker can enter an enemy's space and stop there. It can move through a space as narrow as 1 inch without expending extra movement to do so."
  - name: "Invisibility"
    desc: "The stalker has the [[Invisible]] condition."
actions:
  - name: "Multiattack"
    desc: "The stalker makes three Wind Swipe attacks. It can replace one attack with a use of Vortex."
  - name: "Wind Swipe"
    desc: "*Melee Attack Roll:* +7, reach 5 ft. *Hit:* 11 (2d6 + 4) Force damage."
  - name: "Vortex"
    desc: "*Constitution Saving Throw:* DC 14, one Large or smaller creature in the stalker's space. *Failure:* 7 (1d8 + 3) Thunder damage, and the target has the [[Grappled]] condition (escape DC 13). Until the grapple ends, the target can't cast spells with a Verbal component and takes 7 (2d6) Thunder damage at the start of each of the stalker's turns."
```
