---
title: Djinni
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 11
xp: 7200
type: elemental
subtype: genie
size: Large
ac: 17
hp: 218
speed: 30
moves:
  - fly
spellcasting: true
tags:
  - monster
  - elemental
  - genie
  - cr11
  - srd-5-2-1
aliases:
  - Djinni
export_hash: sha256-e05c58801a09
---

```statblock
columns: 2
forceColumns: true
name: Djinni
source: SRD 5.2.1
size: Large
type: elemental
subtype: genie
alignment: Chaotic Good
ac: 17
hp: 218
hit_dice: 19d10 + 114
speed: 30 ft., Fly 90 ft. (hover)
initiative: "+2 (12)"
stats: [21, 15, 22, 15, 16, 20]
saves:
  - dexterity: 6
  - wisdom: 7
immunities: Lightning, Thunder
senses: Darkvision 120 ft.
passive: 13
languages: Primordial (Auran)
cr: "11"
traits:
  - name: "Elemental Restoration"
    desc: "If the djinni dies outside the Elemental Plane of Air, its body dissolves into mist, and it gains a new body in 1d4 days, reviving with all its Hit Points somewhere on the Plane of Air."
  - name: "Magic Resistance"
    desc: "The djinni has Advantage on saving throws against spells and other magical effects."
  - name: "Wishes"
    desc: "The djinni has a 30 percent chance of knowing the [[Wish]] spell. If the djinni knows it, the djinni can cast it only on behalf of a non-genie creature who communicates a wish in a way the djinni can understand. If the djinni casts the spell for the creature, the djinni suffers none of the spell's stress. Once the djinni has cast it three times, the djinni can't do so again for 365 days."
actions:
  - name: "Multiattack"
    desc: "The djinni makes three attacks, using Storm Blade or Storm Bolt in any combination."
  - name: "Storm Blade"
    desc: "*Melee Attack Roll:* +9, reach 5 feet. *Hit:* 12 (2d6 + 5) Slashing damage plus 7 (2d6) Lightning damage."
  - name: "Storm Bolt"
    desc: "*Ranged Attack Roll:* +9, range 120 feet. *Hit:* 13 (3d8) Thunder damage. If the target is a Large or smaller creature, it has the [[Prone]] condition."
  - name: "Create Whirlwind"
    desc: "The djinni conjures a whirlwind at a point it can see within 120 feet. The whirlwind fills a 20-foot-radius, 60-foot-high Cylinder centered on that point. The whirlwind lasts until the djinni's Concentration on it ends. The djinni can move the whirlwind up to 20 feet at the start of each of its turns.\n\nWhenever the whirlwind enters a creature's space or a creature enters the whirlwind, that creature is subjected to the following effect. *Strength Saving Throw:* DC 17 (a creature makes this save only once per turn, and the djinni is unaffected). *Failure:* While in the whirlwind, the target has the [[Restrained]] condition and moves with the whirlwind. At the start of each of its turns, the [[Restrained]] target takes 21 (6d6) Thunder damage. At the end of each of its turns, the target repeats the save, ending the effect on itself on a success."
  - name: "Spellcasting"
    desc: "The djinni casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 17):\n- **At Will:** [[Detect Evil and Good]], [[Detect Magic]]\n- **2/Day Each:** [[Create Food and Water]] (can create wine instead of water), [[Tongues]], [[Wind Walk]]\n- **1/Day Each:** [[Creation]], [[Gaseous Form]], [[Invisibility]], [[Major Image]], [[Plane Shift]]"
```
