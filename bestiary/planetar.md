---
title: Planetar
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 16
xp: 15000
type: celestial
subtype: angel
size: Large
ac: 19
hp: 262
speed: 40
moves:
  - fly
spellcasting: true
tags:
  - monster
  - celestial
  - angel
  - cr16
  - srd-5-2-1
aliases:
  - Planetar
export_hash: sha256-aa67db70212d
---

```statblock
columns: 2
forceColumns: true
name: Planetar
source: SRD 5.2.1
size: Large
type: celestial
subtype: angel
alignment: Lawful Good
ac: 19
hp: 262
hit_dice: 21d10 + 147
speed: 40 ft., Fly 120 ft. (hover)
initiative: "+10 (20)"
stats: [24, 20, 24, 19, 22, 25]
saves:
  - strength: 12
  - constitution: 12
  - wisdom: 11
  - charisma: 12
skillsaves:
  - perception: 11
resistances: Radiant
condition_immunities: Charmed, Exhaustion, Frightened
senses: Truesight 120 ft.
passive: 21
languages: all; telepathy 120 ft.
cr: "16"
traits:
  - name: "Divine Awareness"
    desc: "The planetar knows if it hears a lie."
  - name: "Exalted Restoration"
    desc: "If the planetar dies outside Mount Celestia, its body disappears, and it gains a new body instantly, reviving with all its Hit Points somewhere in Mount Celestia."
  - name: "Magic Resistance"
    desc: "The planetar has Advantage on saving throws against spells and other magical effects."
actions:
  - name: "Multiattack"
    desc: "The planetar makes three Radiant Sword attacks or uses Holy Burst twice."
  - name: "Radiant Sword"
    desc: "*Melee Attack Roll:* +12, reach 10 ft. *Hit:* 14 (2d6 + 7) Slashing damage plus 18 (4d8) Radiant damage."
  - name: "Holy Burst"
    desc: "*Dexterity Saving Throw:* DC 20, each enemy in a 20-foot-radius Sphere centered on a point the planetar can see within 120 feet. *Failure:* 24 (7d6) Radiant damage. *Success:* Half damage."
  - name: "Spellcasting"
    desc: "The planetar casts one of the following spells, requiring no Material components and using Charisma as spellcasting ability (spell save DC 20):\n- **At Will:** [[Detect Evil and Good]]\n- **1/Day Each:** [[Commune]], [[Control Weather]], [[Dispel Evil and Good]], [[Raise Dead]]"
bonus_actions:
  - name: "Divine Aid (2/Day)"
    desc: "The planetar casts [[Cure Wounds]], [[Invisibility]], [[Lesser Restoration]], or [[Remove Curse]], using the same spellcasting ability as Spellcasting.\n- **2/Day:** [[Cure Wounds]], [[Invisibility]], [[Lesser Restoration]], [[Remove Curse]]"
```
