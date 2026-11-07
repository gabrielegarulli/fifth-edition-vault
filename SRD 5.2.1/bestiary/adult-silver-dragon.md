---
title: Adult Silver Dragon
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 16
xp: 15000
xp_lair: 18000
type: dragon
subtype: metallic
size: Huge
ac: 19
hp: 216
speed: 40
moves:
  - fly
legendary: true
spellcasting: true
tags:
  - monster
  - dragon
  - metallic
  - cr16
  - srd-5-2-1
aliases:
  - Adult Silver Dragon
export_hash: sha256-000717a3aaa9
---

```statblock
columns: 2
forceColumns: true
name: Adult Silver Dragon
source: SRD 5.2.1
size: Huge
type: dragon
subtype: metallic
alignment: Lawful Good
ac: 19
hp: 216
hit_dice: 16d12 + 112
speed: 40 ft., Fly 80 ft.
initiative: "+10 (20)"
stats: [27, 10, 25, 16, 13, 22]
saves:
  - dexterity: 5
  - wisdom: 6
skillsaves:
  - history: 8
  - perception: 11
  - stealth: 5
immunities: Cold
senses: Blindsight 60 ft., Darkvision 120 ft.
passive: 21
languages: Common, Draconic
cr: "16"
traits:
  - name: "Legendary Resistance (3/Day, or 4/Day in Lair)"
    desc: "If the dragon fails a saving throw, it can choose to succeed instead."
actions:
  - name: "Multiattack"
    desc: "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Paralyzing Breath or (B) Spellcasting to cast [[Ice Knife]]."
  - name: "Rend"
    desc: "*Melee Attack Roll:* +13, reach 10 ft. *Hit:* 17 (2d8 + 8) Slashing damage plus 4 (1d8) Cold damage."
  - name: "Cold Breath (Recharge 5–6)"
    desc: "*Constitution Saving Throw:* DC 20, each creature in a 60-foot Cone. *Failure:* 54 (12d8) Cold damage. *Success:* Half damage."
  - name: "Paralyzing Breath"
    desc: "*Constitution Saving Throw:* DC 20, each creature in a 60-foot Cone. 1 The target has the [[Incapacitated]] condition until the end of its next turn, when it repeats the save. 2 The target has the [[Paralyzed]] condition, and it repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically."
  - name: "Spellcasting"
    desc: "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 19, +11 to hit with spell attacks):\n- **At Will:** [[Detect Magic]], [[Hold Monster]], [[Ice Knife]], [[Shapechange]] (Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell)\n- **1/Day Each:** [[Ice Storm]] (level 5 version), [[Zone of Truth]]"
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the dragon can expend a use to take one of the following actions. The dragon regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Chill"
    desc: "The dragon uses Spellcasting to cast [[Hold Monster]]. The dragon can't take this action again until the start of its next turn."
  - name: "Cold Gale"
    desc: "*Dexterity Saving Throw:* DC 19, each creature in a 60-foot-long, 10-foot-wide Line. *Failure:* 14 (4d6) Cold damage, and the target is pushed up to 30 feet straight away from the dragon. *Success:* Half damage only. The dragon can't take this action again until the start of its next turn."
  - name: "Pounce"
    desc: "The dragon moves up to half its Speed, and it makes one Rend attack."
```
