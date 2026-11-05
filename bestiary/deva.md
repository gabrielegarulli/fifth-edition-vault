---
title: Deva
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 10
xp: 5900
type: celestial
subtype: angel
size: Medium
ac: 17
hp: 229
speed: 30
moves:
  - fly
spellcasting: true
tags:
  - monster
  - celestial
  - angel
  - cr10
  - srd-5-2-1
aliases:
  - Deva
export_hash: sha256-8ed01e79c82a
---

```statblock
columns: 2
forceColumns: true
name: Deva
source: SRD 5.2.1
size: Medium
type: celestial
subtype: angel
alignment: Lawful Good
ac: 17
hp: 229
hit_dice: 27d8 + 108
speed: 30 ft., Fly 90 ft. (hover)
initiative: "+4 (14)"
stats: [18, 18, 18, 17, 20, 20]
saves:
  - wisdom: 9
  - charisma: 9
skillsaves:
  - insight: 9
  - perception: 9
resistances: Radiant
condition_immunities: Charmed, Exhaustion, Frightened
senses: Darkvision 120 ft.
passive: 19
languages: all; telepathy 120 ft.
cr: "10"
traits:
  - name: "Exalted Restoration"
    desc: "If the deva dies outside Mount Celestia, its body disappears, and it gains a new body instantly, reviving with all its Hit Points somewhere in Mount Celestia."
  - name: "Magic Resistance"
    desc: "The deva has Advantage on saving throws against spells and other magical effects."
actions:
  - name: "Multiattack"
    desc: "The deva makes two Holy Mace attacks."
  - name: "Holy Mace"
    desc: "*Melee Attack Roll:* +8, reach 5 ft. *Hit:* 7 (1d6 + 4) Bludgeoning damage plus 18 (4d8) Radiant damage."
  - name: "Spellcasting"
    desc: "The deva casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 17):\n- **At Will:** [[Detect Evil and Good]], [[Shapechange]] (Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell)\n- **1/Day Each:** [[Commune]], [[Raise Dead]]"
bonus_actions:
  - name: "Divine Aid (2/Day)"
    desc: "The deva casts [[Cure Wounds]], [[Lesser Restoration]], or [[Remove Curse]], using the same spellcasting ability as Spellcasting.\n- **2/Day:** [[Cure Wounds]], [[Lesser Restoration]], [[Remove Curse]]"
```
