---
title: Oni
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 7
xp: 2900
type: fiend
size: Large
ac: 17
hp: 119
speed: 30
moves:
  - fly
spellcasting: true
tags:
  - monster
  - fiend
  - cr7
  - srd-5-2-1
aliases:
  - Oni
export_hash: sha256-6bd18dfe921a
---

```statblock
columns: 2
forceColumns: true
name: Oni
source: SRD 5.2.1
size: Large
type: fiend
alignment: Lawful Evil
ac: 17
hp: 119
hit_dice: 14d10 + 42
speed: 30 ft., Fly 30 ft. (hover)
initiative: "+0 (10)"
stats: [19, 11, 16, 14, 12, 15]
saves:
  - dexterity: 3
  - constitution: 6
  - wisdom: 4
  - charisma: 5
skillsaves:
  - arcana: 5
  - deception: 8
  - perception: 4
resistances: Cold
senses: Darkvision 60 ft.
passive: 14
languages: Common, Giant
cr: "7"
traits:
  - name: "Regeneration"
    desc: "The oni regains 10 Hit Points at the start of each of its turns if it has at least 1 Hit Point."
actions:
  - name: "Multiattack"
    desc: "The oni makes two Claw or Nightmare Ray attacks. It can replace one attack with a use of Spellcasting."
  - name: "Claw"
    desc: "*Melee Attack Roll:* +7, reach 10 ft. *Hit:* 10 (1d12 + 4) Slashing damage plus 9 (2d8) Necrotic damage."
  - name: "Nightmare Ray"
    desc: "*Ranged Attack Roll:* +5, range 60 ft. *Hit:* 9 (2d6 + 2) Psychic damage, and the target has the [[Frightened]] condition until the start of the oni's next turn."
  - name: "Shape-Shift"
    desc: "The oni shape-shifts into a Small or Medium Humanoid or a Large Giant, or it returns to its true form. Other than its size, its game statistics are the same in each form. Any equipment it is wearing or carrying isn't transformed."
  - name: "Spellcasting"
    desc: "The oni casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 13):\n- **1/Day Each:** [[Charm Person]] (level 2 version), [[Darkness]], [[Gaseous Form]], [[Sleep]]"
bonus_actions:
  - name: "Invisibility"
    desc: "The oni casts [[Invisibility]] on itself, requiring no spell components and using the same spellcasting ability as Spellcasting.\n- **At Will:** [[Invisibility]]"
```
