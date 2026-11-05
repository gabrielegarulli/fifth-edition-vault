---
title: Adult Black Dragon
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 14
xp: 11500
xp_lair: 13000
type: dragon
subtype: chromatic
size: Huge
ac: 19
hp: 195
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
  - cr14
  - srd-5-2-1
aliases:
  - Adult Black Dragon
export_hash: sha256-230529bd8599
---

```statblock
columns: 2
forceColumns: true
name: Adult Black Dragon
source: SRD 5.2.1
size: Huge
type: dragon
subtype: chromatic
alignment: Chaotic Evil
ac: 19
hp: 195
hit_dice: 17d12 + 85
speed: 40 ft., Fly 80 ft., Swim 40 ft.
initiative: "+12 (22)"
stats: [23, 14, 21, 14, 13, 19]
saves:
  - dexterity: 7
  - wisdom: 6
skillsaves:
  - perception: 11
  - stealth: 7
immunities: Acid
senses: Blindsight 60 ft., Darkvision 120 ft.
passive: 21
languages: Common, Draconic
cr: "14"
traits:
  - name: "Amphibious"
    desc: "The dragon can breathe air and water."
  - name: "Legendary Resistance (3/Day, or 4/Day in Lair)"
    desc: "If the dragon fails a saving throw, it can choose to succeed instead."
actions:
  - name: "Multiattack"
    desc: "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast [[Acid Arrow]] (level 3 version)."
  - name: "Rend"
    desc: "*Melee Attack Roll:* +11, reach 10 ft. *Hit:* 13 (2d6 + 6) Slashing damage plus 4 (1d8) Acid damage."
  - name: "Acid Breath (Recharge 5–6)"
    desc: "*Dexterity Saving Throw:* DC 18, each creature in a 60-foot-long, 5-foot-wide Line. *Failure:* 54 (12d8) Acid damage. *Success:* Half damage."
  - name: "Spellcasting"
    desc: "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 17, +9 to hit with spell attacks):\n- **At Will:** [[Detect Magic]], [[Fear]], [[Acid Arrow]] (level 3 version)\n- **1/Day Each:** [[Speak with Dead]], [[Vitriolic Sphere]]"
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the dragon can expend a use to take one of the following actions. The dragon regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Cloud of Insects"
    desc: "*Dexterity Saving Throw:* DC 17, one creature the dragon can see within 120 feet. *Failure:* 22 (4d10) Poison damage, and the target has Disadvantage on saving throws to maintain Concentration until the end of its next turn. The dragon can't take this action again until the start of its next turn."
  - name: "Frightful Presence"
    desc: "The dragon uses Spellcasting to cast [[Fear]]. The dragon can't take this action again until the start of its next turn."
  - name: "Pounce"
    desc: "The dragon can move up to half its Speed, and it makes one Rend attack."
```
