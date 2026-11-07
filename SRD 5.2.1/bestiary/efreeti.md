---
title: Efreeti
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 11
xp: 7200
type: elemental
subtype: genie
size: Large
ac: 17
hp: 212
speed: 40
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
  - Efreeti
export_hash: sha256-7a1b40a0866e
---

```statblock
columns: 2
forceColumns: true
name: Efreeti
source: SRD 5.2.1
size: Large
type: elemental
subtype: genie
alignment: Neutral
ac: 17
hp: 212
hit_dice: 17d10 + 119
speed: 40 ft., Fly 60 ft. (hover)
initiative: "+1 (11)"
stats: [22, 12, 24, 16, 15, 19]
saves:
  - wisdom: 6
  - charisma: 8
immunities: Fire
senses: Darkvision 120 ft.
passive: 12
languages: Primordial (Ignan)
cr: "11"
traits:
  - name: "Elemental Restoration"
    desc: "If the efreeti dies outside the Elemental Plane of Fire, its body dissolves into ash, and it gains a new body in 1d4 days, reviving with all its Hit Points somewhere on the Plane of Fire."
  - name: "Magic Resistance"
    desc: "The efreeti has Advantage on saving throws against spells and other magical effects."
  - name: "Wishes"
    desc: "The efreeti has a 30 percent chance of knowing the [[Wish]] spell. If the efreeti knows it, the efreeti can cast it only on behalf of a non-genie creature who communicates a wish in a way the efreeti can understand. If the efreeti casts the spell for the creature, the efreeti suffers none of the spell's stress. Once the efreeti has cast it three times, the efreeti can't do so again for 365 days."
actions:
  - name: "Multiattack"
    desc: "The efreeti makes three attacks, using Heated Blade or Hurl Flame in any combination."
  - name: "Heated Blade"
    desc: "*Melee Attack Roll:* +10, reach 5 ft. *Hit:* 13 (2d6 + 6) Slashing damage plus 13 (2d12) Fire damage."
  - name: "Hurl Flame"
    desc: "*Ranged Attack Roll:* +8, range 120 ft. *Hit:* 24 (7d6) Fire damage."
  - name: "Spellcasting"
    desc: "The efreeti casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 16):\n- **At Will:** [[Detect Magic]], [[Elementalism]]\n- **1/Day Each:** [[Gaseous Form]], [[Invisibility]], [[Major Image]], [[Plane Shift]], [[Tongues]], [[Wall of Fire]] (level 7 version)"
```
