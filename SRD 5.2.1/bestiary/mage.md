---
title: Mage
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 6
xp: 2300
type: humanoid
subtype: wizard
size: Small/Medium
ac: 15
hp: 81
speed: 30
spellcasting: true
tags:
  - monster
  - humanoid
  - wizard
  - cr6
  - srd-5-2-1
aliases:
  - Mage
export_hash: sha256-b8c851903e57
---

```statblock
columns: 2
forceColumns: true
name: Mage
source: SRD 5.2.1
size: Small/Medium
type: humanoid
subtype: wizard
alignment: Neutral
ac: 15
hp: 81
hit_dice: 18d8
speed: 30 ft.
initiative: "+2 (12)"
stats: [9, 14, 11, 17, 12, 11]
saves:
  - intelligence: 6
  - wisdom: 4
skillsaves:
  - arcana: 6
  - history: 6
  - perception: 4
gear: "Wand"
passive: 14
languages: Common plus three other languages
cr: "6"
actions:
  - name: "Multiattack"
    desc: "The mage makes three Arcane Burst attacks."
  - name: "Arcane Burst"
    desc: "*Melee Attack Roll or Ranged Attack Roll:* +6, reach 5 ft. or range 120 ft. *Hit:* 16 (3d8 + 3) Force damage."
  - name: "Spellcasting"
    desc: "The mage casts one of the following spells, using Intelligence as the spellcasting ability (spell save DC 14):\n- **At Will:** [[Detect Magic]], [[Light]], [[Mage Armor]] (included in AC), [[Mage Hand]], [[Prestidigitation]]\n- **2/Day Each:** [[Fireball]] (level 4 version), [[Invisibility]]\n- **1/Day Each:** [[Cone of Cold]], [[Fly]]"
bonus_actions:
  - name: "Misty Step (3/Day)"
    desc: "The mage casts [[Misty Step]], using the same spellcasting ability as Spellcasting.\n- **3/Day:** [[Misty Step]]"
reactions:
  - name: "Protective Magic (3/Day)"
    desc: "The mage casts [[Counterspell]] or [[Shield]] in response to the spell's trigger, using the same spellcasting ability as Spellcasting.\n- **3/Day:** [[Counterspell]], [[Shield]]"
```
