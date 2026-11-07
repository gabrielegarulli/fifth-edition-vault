---
title: Ancient Brass Dragon
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 20
xp: 25000
xp_lair: 33000
type: dragon
subtype: metallic
size: Gargantuan
ac: 20
hp: 332
speed: 40
moves:
  - fly
  - burrow
legendary: true
spellcasting: true
tags:
  - monster
  - dragon
  - metallic
  - cr20
  - srd-5-2-1
aliases:
  - Ancient Brass Dragon
export_hash: sha256-97da45a442ad
---

```statblock
columns: 2
forceColumns: true
name: Ancient Brass Dragon
source: SRD 5.2.1
size: Gargantuan
type: dragon
subtype: metallic
alignment: Chaotic Good
ac: 20
hp: 332
hit_dice: 19d20 + 133
speed: 40 ft., Burrow 40 ft., Fly 80 ft.
initiative: "+12 (22)"
stats: [27, 10, 25, 16, 15, 22]
saves:
  - dexterity: 6
  - wisdom: 8
skillsaves:
  - history: 9
  - perception: 14
  - persuasion: 12
  - stealth: 6
immunities: Fire
senses: Blindsight 60 ft., Darkvision 120 ft.
passive: 24
languages: Common, Draconic
cr: "20"
traits:
  - name: "Legendary Resistance (4/Day, or 5/Day in Lair)"
    desc: "If the dragon fails a saving throw, it can choose to succeed instead."
actions:
  - name: "Multiattack"
    desc: "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Sleep Breath or (B) Spellcasting to cast [[Scorching Ray]] (level 3 version)."
  - name: "Rend"
    desc: "*Melee Attack Roll:* +14, reach 15 ft. *Hit:* 19 (2d10 + 8) Slashing damage plus 7 (2d6) Fire damage."
  - name: "Fire Breath (Recharge 5–6)"
    desc: "*Dexterity Saving Throw:* DC 21, each creature in a 90-foot-long, 5-foot-wide Line. *Failure:* 58 (13d8) Fire damage. *Success:* Half damage."
  - name: "Sleep Breath"
    desc: "*Constitution Saving Throw:* DC 21, each creature in a 90-foot Cone. *Failure:* The target has the [[Incapacitated]] condition until the end of its next turn, at which point it repeats the save. 2 The target has the [[Unconscious]] condition for 10 minutes. This effect ends for the target if it takes damage or a creature within 5 feet of it takes an action to wake it."
  - name: "Spellcasting"
    desc: "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 20):\n- **At Will:** [[Detect Magic]], [[Minor Illusion]], [[Scorching Ray]] (level 3 version), [[Shapechange]] (Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell), [[Speak with Animals]]\n- **1/Day Each:** [[Control Weather]], [[Detect Thoughts]]"
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the dragon can expend a use to take one of the following actions. The dragon regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Blazing Light"
    desc: "The dragon uses Spellcasting to cast [[Scorching Ray]] (level 3 version)."
  - name: "Pounce"
    desc: "The dragon moves up to half its Speed, and it makes one Rend attack."
  - name: "Scorching Sands"
    desc: "*Dexterity Saving Throw:* DC 20, one creature the dragon can see within 120 feet. *Failure:* 36 (8d8) Fire damage, and the target's Speed is halved until the end of its next turn. The dragon can't take this action again until the start of its next turn."
```
