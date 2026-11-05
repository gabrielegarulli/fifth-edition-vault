---
title: Archmage
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 12
xp: 8400
type: humanoid
subtype: wizard
size: Small/Medium
ac: 17
hp: 170
speed: 30
spellcasting: true
tags:
  - monster
  - humanoid
  - wizard
  - cr12
  - srd-5-2-1
aliases:
  - Archmage
export_hash: sha256-9f0446e56651
---

```statblock
columns: 2
forceColumns: true
name: Archmage
source: SRD 5.2.1
size: Small/Medium
type: humanoid
subtype: wizard
alignment: Neutral
ac: 17
hp: 170
hit_dice: 31d8 + 31
speed: 30 ft.
initiative: "+6 (16)"
stats: [10, 14, 12, 20, 15, 16]
saves:
  - intelligence: 9
  - wisdom: 6
skillsaves:
  - arcana: 13
  - history: 9
  - perception: 6
gear: "Wand"
immunities: Psychic
condition_immunities: Charmed (with Mind Blank)
passive: 16
languages: Common plus five other languages
cr: "12"
traits:
  - name: "Magic Resistance"
    desc: "The archmage has Advantage on saving throws against spells and other magical effects."
actions:
  - name: "Multiattack"
    desc: "The archmage makes four Arcane Burst attacks."
  - name: "Arcane Burst"
    desc: "*Melee Attack Roll or Ranged Attack Roll:* +9, reach 5 ft. or range 150 ft. *Hit:* 27 (4d10 + 5) Force damage."
  - name: "Spellcasting"
    desc: "The archmage casts one of the following spells, using Intelligence as the spellcasting ability (spell save DC 17):\n- **At Will:** [[Detect Magic]], [[Detect Thoughts]], [[Disguise Self]], [[Invisibility]], [[Light]], [[Mage Armor]] (included in AC), [[Mage Hand]], [[Prestidigitation]]\n- **2/Day Each:** [[Fly]], [[Lightning Bolt]] (level 7 version)\n- **1/Day Each:** [[Cone of Cold]] (level 9 version), [[Mind Blank]] (cast before combat), [[Scrying]], [[Teleport]]"
bonus_actions:
  - name: "Misty Step (3/Day)"
    desc: "The mage casts [[Misty Step]], using the same spellcasting ability as Spellcasting.\n- **3/Day:** [[Misty Step]]"
reactions:
  - name: "Protective Magic (3/Day)"
    desc: "The archmage casts [[Counterspell]] or [[Shield]] in response to the spell's trigger, using the same spellcasting ability as Spellcasting.\n- **3/Day:** [[Counterspell]], [[Shield]]"
```
