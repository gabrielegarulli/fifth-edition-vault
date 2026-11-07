---
title: Ancient Copper Dragon
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 21
xp: 33000
xp_lair: 41000
type: dragon
subtype: metallic
size: Gargantuan
ac: 21
hp: 367
speed: 40
moves:
  - fly
  - climb
legendary: true
spellcasting: true
tags:
  - monster
  - dragon
  - metallic
  - cr21
  - srd-5-2-1
aliases:
  - Ancient Copper Dragon
export_hash: sha256-ad8ce2b7f3cc
---

```statblock
columns: 2
forceColumns: true
name: Ancient Copper Dragon
source: SRD 5.2.1
size: Gargantuan
type: dragon
subtype: metallic
alignment: Chaotic Good
ac: 21
hp: 367
hit_dice: 21d20 + 147
speed: 40 ft., Climb 40 ft., Fly 80 ft.
initiative: "+15 (25)"
stats: [27, 12, 25, 20, 17, 22]
saves:
  - dexterity: 8
  - wisdom: 10
skillsaves:
  - deception: 13
  - perception: 17
  - stealth: 8
immunities: Acid
senses: Blindsight 60 ft., Darkvision 120 ft.
passive: 27
languages: Common, Draconic
cr: "21"
traits:
  - name: "Legendary Resistance (4/Day, or 5/Day in Lair)"
    desc: "If the dragon fails a saving throw, it can choose to succeed instead."
actions:
  - name: "Multiattack"
    desc: "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Slowing Breath or (B) Spellcasting to cast [[Mind Spike]] (level 5 version)."
  - name: "Rend"
    desc: "*Melee Attack Roll:* +15, reach 15 ft. *Hit:* 19 (2d10 + 8) Slashing damage plus 9 (2d8) Acid damage."
  - name: "Acid Breath (Recharge 5–6)"
    desc: "*Dexterity Saving Throw:* DC 22, each creature in an 90-foot-long, 10-foot-wide Line. *Failure:* 63 (14d8) Acid damage. *Success:* Half damage."
  - name: "Slowing Breath"
    desc: "*Constitution Saving Throw:* DC 22, each creature in a 90-foot Cone. *Failure:* The target can't take Reactions; its Speed is halved; and it can take either an action or a Bonus Action on its turn, not both. This effect lasts until the end of its next turn."
  - name: "Spellcasting"
    desc: "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 21):\n- **At Will:** [[Detect Magic]], [[Mind Spike]] (level 5 version), [[Minor Illusion]], [[Shapechange]] (Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell)\n- **1/Day Each:** [[Greater Restoration]], [[Major Image]], [[Project Image]]"
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the dragon can expend a use to take one of the following actions. The dragon regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Giggling Magic"
    desc: "*Charisma Saving Throw:* DC 21, one creature the dragon can see within 120 feet. *Failure:* 31 (9d6) Psychic damage. Until the end of its next turn, the target rolls 1d8 whenever it makes an ability check or attack roll and subtracts the number rolled from the D20 Test. The dragon can't take this action again until the start of its next turn."
  - name: "Mind Jolt"
    desc: "The dragon uses Spellcasting to cast [[Mind Spike]] (level 5 version). The dragon can't take this action again until the start of its next turn."
  - name: "Pounce"
    desc: "The dragon moves up to half its Speed, and it makes one Rend attack."
```
