---
title: Ancient Bronze Dragon
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 22
xp: 41000
xp_lair: 50000
type: dragon
subtype: metallic
size: Gargantuan
ac: 22
hp: 444
speed: 40
moves:
  - fly
  - swim
legendary: true
spellcasting: true
tags:
  - monster
  - dragon
  - metallic
  - cr22
  - srd-5-2-1
aliases:
  - Ancient Bronze Dragon
export_hash: sha256-8831d18cf1f8
---

```statblock
columns: 2
forceColumns: true
name: Ancient Bronze Dragon
source: SRD 5.2.1
size: Gargantuan
type: dragon
subtype: metallic
alignment: Lawful Good
ac: 22
hp: 444
hit_dice: 24d20 + 192
speed: 40 ft., Fly 80 ft., Swim 40 ft.
initiative: "+14 (24)"
stats: [29, 10, 27, 18, 17, 25]
saves:
  - dexterity: 7
  - wisdom: 10
skillsaves:
  - insight: 10
  - perception: 17
  - stealth: 7
immunities: Lightning
senses: Blindsight 60 ft., Darkvision 120 ft.
passive: 27
languages: Common, Draconic
cr: "22"
traits:
  - name: "Amphibious"
    desc: "The dragon can breathe air and water."
  - name: "Legendary Resistance (4/Day, or 5/Day in Lair)"
    desc: "If the dragon fails a saving throw, it can choose to succeed instead."
actions:
  - name: "Multiattack"
    desc: "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Repulsion Breath or (B) Spellcasting to cast [[Guiding Bolt]] (level 2 version)."
  - name: "Rend"
    desc: "*Melee Attack Roll:* +16, reach 15 ft. *Hit:* 18 (2d8 + 9) Slashing damage plus 9 (2d8) Lightning damage."
  - name: "Lightning Breath (Recharge 5–6)"
    desc: "*Dexterity Saving Throw:* DC 23, each creature in a 120-foot-long, 10-foot-wide Line. *Failure:* 82 (15d10) Lightning damage. *Success:* Half damage."
  - name: "Repulsion Breath"
    desc: "*Strength Saving Throw:* DC 23, each creature in a 30-foot Cone. *Failure:* The target is pushed up to 60 feet straight away from the dragon and has the [[Prone]] condition."
  - name: "Spellcasting"
    desc: "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 22, +14 to hit with spell attacks):\n- **At Will:** [[Detect Magic]], [[Guiding Bolt]] (level 2 version), [[Shapechange]] (Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell), [[Speak with Animals]], [[Thaumaturgy]]\n- **1/Day Each:** [[Detect Thoughts]], [[Control Water]], [[Scrying]], [[Water Breathing]]"
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the dragon can expend a use to take one of the following actions. The dragon regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Guiding Light"
    desc: "The dragon uses Spellcasting to cast [[Guiding Bolt]] (level 2 version)."
  - name: "Pounce"
    desc: "The dragon moves up to half its Speed, and it makes one Rend attack."
  - name: "Thunderclap"
    desc: "*Constitution Saving Throw:* DC 22, each creature in a 20-foot-radius Sphere centered on a point the dragon can see within 120 feet. *Failure:* 13 (3d8) Thunder damage, and the target has the [[Deafened]] condition until the end of its next turn."
```
