---
title: Ancient Black Dragon
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 21
xp: 33000
xp_lair: 41000
type: dragon
subtype: chromatic
size: Gargantuan
ac: 22
hp: 367
speed: 40
moves:
  - fly
  - swim
legendary: true
spellcasting: true
tags:
  - monster
  - dragon
  - chromatic
  - cr21
  - srd-5-2-1
aliases:
  - Ancient Black Dragon
export_hash: sha256-42317fdb94ff
---

```statblock
columns: 2
forceColumns: true
name: Ancient Black Dragon
source: SRD 5.2.1
size: Gargantuan
type: dragon
subtype: chromatic
alignment: Chaotic Evil
ac: 22
hp: 367
hit_dice: 21d20 + 147
speed: 40 ft., Fly 80 ft., Swim 40 ft.
initiative: "+16 (26)"
stats: [27, 14, 25, 16, 15, 22]
saves:
  - dexterity: 9
  - wisdom: 9
skillsaves:
  - perception: 16
  - stealth: 9
immunities: Acid
senses: Blindsight 60 ft., Darkvision 120 ft.
passive: 26
languages: Common, Draconic
cr: "21"
traits:
  - name: "Amphibious"
    desc: "The dragon can breathe air and water."
  - name: "Legendary Resistance (4/Day, or 5/Day in Lair)"
    desc: "If the dragon fails a saving throw, it can choose to succeed instead."
actions:
  - name: "Multiattack"
    desc: "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast [[Acid Arrow]] (level 4 version)."
  - name: "Rend"
    desc: "*Melee Attack Roll:* +15, reach 15 ft. *Hit:* 17 (2d8 + 8) Slashing damage plus 9 (2d8) Acid damage."
  - name: "Acid Breath (Recharge 5–6)"
    desc: "*Dexterity Saving Throw:* DC 22, each creature in a 90-foot-long, 10-foot-wide Line. *Failure:* 67 (15d8) Acid damage. *Success:* Half damage."
  - name: "Spellcasting"
    desc: "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 21, +13 to hit with spell attacks):\n- **At Will:** [[Detect Magic]], [[Fear]], [[Acid Arrow]] (level 4 version)\n- **1/Day Each:** [[Create Undead]], [[Speak with Dead]], [[Vitriolic Sphere]] (level 5 version)"
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the dragon can expend a use to take one of the following actions. The dragon regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Cloud of Insects"
    desc: "*Dexterity Saving Throw:* DC 21, one creature the dragon can see within 120 feet. *Failure:* 33 (6d10) Poison damage, and the target has Disadvantage on saving throws to maintain Concentration until the end of its next turn. The dragon can't take this action again until the start of its next turn."
  - name: "Frightful Presence"
    desc: "The dragon uses Spellcasting to cast [[Fear]]. The dragon can't take this action again until the start of its next turn."
  - name: "Pounce"
    desc: "The dragon moves up to half its Speed, and it makes one Rend attack."
```
