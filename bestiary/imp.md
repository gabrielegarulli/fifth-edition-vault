---
title: Imp
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 1
xp: 200
type: fiend
subtype: devil
size: Tiny
ac: 13
hp: 21
speed: 20
moves:
  - fly
spellcasting: true
tags:
  - monster
  - fiend
  - devil
  - cr1
  - srd-5-2-1
aliases:
  - Imp
export_hash: sha256-acea0de480ec
---

```statblock
columns: 2
forceColumns: true
name: Imp
source: SRD 5.2.1
size: Tiny
type: fiend
subtype: devil
alignment: Lawful Evil
ac: 13
hp: 21
hit_dice: 6d4 + 6
speed: 20 ft., Fly 40 ft.
initiative: "+3 (13)"
stats: [6, 17, 13, 11, 12, 14]
skillsaves:
  - deception: 4
  - insight: 3
  - stealth: 5
resistances: Cold
immunities: Fire, Poison
condition_immunities: Poisoned
senses: Darkvision 120 ft. (unimpeded by magical Darkness)
passive: 11
languages: Common, Infernal
cr: "1"
traits:
  - name: "Magic Resistance"
    desc: "The imp has Advantage on saving throws against spells and other magical effects."
actions:
  - name: "Sting"
    desc: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 6 (1d6 + 3) Piercing damage plus 7 (2d6) Poison damage."
  - name: "Shape-Shift"
    desc: "The imp shape-shifts to resemble a rat (Speed 20 ft.), a raven (20 ft., Fly 60 ft.), or a spider (20 ft., Climb 20 ft.), or it returns to its true form. Its statistics are the same in each form, except for its Speed. Any equipment it is wearing or carrying isn't transformed."
  - name: "Invisibility"
    desc: "The imp casts [[Invisibility]] on itself, requiring no spell components and using Charisma as the spellcasting ability.\n- **At Will:** [[Invisibility]]"
```
