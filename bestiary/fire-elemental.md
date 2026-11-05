---
title: Fire Elemental
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 5
xp: 1800
type: elemental
size: Large
ac: 13
hp: 93
speed: 50
tags:
  - monster
  - elemental
  - cr5
  - srd-5-2-1
aliases:
  - Fire Elemental
export_hash: sha256-bb4d60454225
---

```statblock
columns: 2
forceColumns: true
name: Fire Elemental
source: SRD 5.2.1
size: Large
type: elemental
alignment: Neutral
ac: 13
hp: 93
hit_dice: 11d10 + 33
speed: 50 ft.
initiative: "+3 (13)"
stats: [10, 17, 16, 6, 10, 7]
resistances: Bludgeoning, Piercing, Slashing
immunities: Fire, Poison
condition_immunities: Exhaustion, Grappled, Paralyzed, Petrified, Poisoned, Prone, Restrained, Unconscious
senses: Darkvision 60 ft.
passive: 10
languages: Primordial (Ignan)
cr: "5"
traits:
  - name: "Fire Aura"
    desc: "At the end of each of the elemental's turns, each creature in a 10-foot Emanation originating from the elemental takes 5 (1d10) Fire damage. Creatures and flammable objects in the Emanation start burning."
  - name: "Fire Form"
    desc: "The elemental can move through a space as narrow as 1 inch without expending extra movement to do so, and it can enter a creature's space and stop there. The first time it enters a creature's space on a turn, that creature takes 5 (1d10) Fire damage."
  - name: "Illumination"
    desc: "The elemental sheds Bright Light in a 30-foot radius and Dim Light for an additional 30 feet."
  - name: "Water Susceptibility"
    desc: "The elemental takes 3 (1d6) Cold damage for every 5 feet the elemental moves in water or for every gallon of water splashed on it."
actions:
  - name: "Multiattack"
    desc: "The elemental makes two Burn attacks."
  - name: "Burn"
    desc: "*Melee Attack Roll:* +6, reach 5 ft. *Hit:* 10 (2d6 + 3) Fire damage. If the target is a creature or a flammable object, it starts burning."
```
