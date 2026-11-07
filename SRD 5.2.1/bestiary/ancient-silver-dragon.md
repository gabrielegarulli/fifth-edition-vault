---
title: Ancient Silver Dragon
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 23
xp: 50000
xp_lair: 62000
type: dragon
subtype: metallic
size: Gargantuan
ac: 22
hp: 468
speed: 40
moves:
  - fly
legendary: true
spellcasting: true
tags:
  - monster
  - dragon
  - metallic
  - cr23
  - srd-5-2-1
aliases:
  - Ancient Silver Dragon
export_hash: sha256-91a3325db2f6
---

```statblock
columns: 2
forceColumns: true
name: Ancient Silver Dragon
source: SRD 5.2.1
size: Gargantuan
type: dragon
subtype: metallic
alignment: Lawful Good
ac: 22
hp: 468
hit_dice: 24d20 + 216
speed: 40 ft., Fly 80 ft.
initiative: "+14 (24)"
stats: [30, 10, 29, 18, 15, 26]
saves:
  - dexterity: 7
  - wisdom: 9
skillsaves:
  - history: 11
  - perception: 16
  - stealth: 7
immunities: Cold
senses: Blindsight 60 ft., Darkvision 120 ft.
passive: 26
languages: Common, Draconic
cr: "23"
traits:
  - name: "Legendary Resistance (4/Day, or 5/Day in Lair)"
    desc: "If the dragon fails a saving throw, it can choose to succeed instead."
actions:
  - name: "Multiattack"
    desc: "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Paralyzing Breath or (B) Spellcasting to cast [[Ice Knife]] (level 2 version)."
  - name: "Rend"
    desc: "*Melee Attack Roll:* +17, reach 15 ft. *Hit:* 19 (2d8 + 10) Slashing damage plus 9 (2d8) Cold damage."
  - name: "Cold Breath (Recharge 5–6)"
    desc: "*Constitution Saving Throw:* DC 24, each creature in a 90-foot Cone. *Failure:* 67 (15d8) Cold damage. *Success:* Half damage."
  - name: "Paralyzing Breath"
    desc: "*Constitution Saving Throw:* DC 24, each creature in a 90-foot Cone. 1 The target has the [[Incapacitated]] condition until the end of its next turn, when it repeats the save. 2 The target has the [[Paralyzed]] condition, and it repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically."
  - name: "Spellcasting"
    desc: "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 23, +15 to hit with spell attacks):\n- **At Will:** [[Detect Magic]], [[Hold Monster]], [[Ice Knife]] (level 2 version), [[Shapechange]] (Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell)\n- **1/Day Each:** [[Control Weather]], [[Ice Storm]] (level 7 version), [[Teleport]], [[Zone of Truth]]"
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the dragon can expend a use to take one of the following actions. The dragon regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Chill"
    desc: "The dragon uses Spellcasting to cast [[Hold Monster]]. The dragon can't take this action again until the start of its next turn."
  - name: "Cold Gale"
    desc: "*Dexterity Saving Throw:* DC 23, each creature in a 60-foot-long, 10-foot-wide Line. *Failure:* 14 (4d6) Cold damage, and the target is pushed up to 30 feet straight away from the dragon. *Success:* Half damage only. The dragon can't take this action again until the start of its next turn."
  - name: "Pounce"
    desc: "The dragon moves up to half its Speed, and it makes one Rend attack."
```
