---
title: Adult Brass Dragon
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 13
xp: 10000
xp_lair: 11500
type: dragon
subtype: metallic
size: Huge
ac: 18
hp: 172
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
  - cr13
  - srd-5-2-1
aliases:
  - Adult Brass Dragon
export_hash: sha256-8fe92fc2c74c
---

```statblock
columns: 2
forceColumns: true
name: Adult Brass Dragon
source: SRD 5.2.1
size: Huge
type: dragon
subtype: metallic
alignment: Chaotic Good
ac: 18
hp: 172
hit_dice: 15d12 + 75
speed: 40 ft., Burrow 30 ft., Fly 80 ft.
initiative: "+10 (20)"
stats: [23, 10, 21, 14, 13, 17]
saves:
  - dexterity: 5
  - wisdom: 6
skillsaves:
  - history: 7
  - perception: 11
  - persuasion: 8
  - stealth: 5
immunities: Fire
senses: Blindsight 60 ft., Darkvision 120 ft.
passive: 21
languages: Common, Draconic
cr: "13"
traits:
  - name: "Legendary Resistance (3/Day, or 4/Day in Lair)"
    desc: "If the dragon fails a saving throw, it can choose to succeed instead."
actions:
  - name: "Multiattack"
    desc: "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Sleep Breath or (B) Spellcasting to cast [[Scorching Ray]]."
  - name: "Rend"
    desc: "*Melee Attack Roll:* +11, reach 10 ft. *Hit:* 17 (2d10 + 6) Slashing damage plus 4 (1d8) Fire damage."
  - name: "Fire Breath (Recharge 5–6)"
    desc: "*Dexterity Saving Throw:* DC 18, each creature in a 60-foot-long, 5-foot-wide Line. *Failure:* 45 (10d8) Fire damage. *Success:* Half damage."
  - name: "Sleep Breath"
    desc: "*Constitution Saving Throw:* DC 18, each creature in a 60-foot Cone. *Failure:* The target has the [[Incapacitated]] condition until the end of its next turn, at which point it repeats the save. 2 The target has the [[Unconscious]] condition for 10 minutes. This effect ends for the target if it takes damage or a creature within 5 feet of it takes an action to wake it."
  - name: "Spellcasting"
    desc: "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 16):\n- **At Will:** [[Detect Magic]], [[Minor Illusion]], [[Scorching Ray]], [[Shapechange]] (Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell), [[Speak with Animals]]\n- **1/Day Each:** [[Detect Thoughts]], [[Control Weather]]"
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the dragon can expend a use to take one of the following actions. The dragon regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Blazing Light"
    desc: "The dragon uses Spellcasting to cast [[Scorching Ray]]."
  - name: "Pounce"
    desc: "The dragon moves up to half its Speed, and it makes one Rend attack."
  - name: "Scorching Sands"
    desc: "*Dexterity Saving Throw:* DC 16, one creature the dragon can see within 120 feet. *Failure:* 27 (6d8) Fire damage, and the target's Speed is halved until the end of its next turn. The dragon can't take this action again until the start of its next turn."
```
