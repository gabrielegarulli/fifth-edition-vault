---
title: Ancient Green Dragon
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 22
xp: 41000
xp_lair: 50000
type: dragon
subtype: chromatic
size: Gargantuan
ac: 21
hp: 402
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
  - cr22
  - srd-5-2-1
aliases:
  - Ancient Green Dragon
export_hash: sha256-4c66bf79cf4f
---

```statblock
columns: 2
forceColumns: true
name: Ancient Green Dragon
source: SRD 5.2.1
size: Gargantuan
type: dragon
subtype: chromatic
alignment: Lawful Evil
ac: 21
hp: 402
hit_dice: 23d20 + 161
speed: 40 ft., Fly 80 ft., Swim 40 ft.
initiative: "+15 (25)"
stats: [27, 12, 25, 20, 17, 22]
saves:
  - dexterity: 8
  - wisdom: 10
skillsaves:
  - deception: 13
  - perception: 17
  - persuasion: 13
  - stealth: 8
immunities: Poison
condition_immunities: Poisoned
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
    desc: "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast [[Mind Spike]] (level 5 version)."
  - name: "Rend"
    desc: "*Melee Attack Roll:* +15, reach 15 ft. *Hit:* 17 (2d8 + 8) Slashing damage plus 10 (3d6) Poison damage."
  - name: "Poison Breath (Recharge 5–6)"
    desc: "*Constitution Saving Throw:* DC 22, each creature in a 90-foot Cone. *Failure:* 77 (22d6) Poison damage. *Success:* Half damage."
  - name: "Spellcasting"
    desc: "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 21):\n- **At Will:** [[Detect Magic]], [[Mind Spike]] (level 5 version)\n- **1/Day Each:** [[Geas]], [[Modify Memory]]"
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the dragon can expend a use to take one of the following actions. The dragon regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Mind Invasion"
    desc: "The dragon uses Spellcasting to cast [[Mind Spike]] (level 5 version)."
  - name: "Noxious Miasma"
    desc: "*Constitution Saving Throw:* DC 21, each creature in a 30-foot-radius Sphere centered on a point the dragon can see within 90 feet. *Failure:* 17 (5d6) Poison damage, and the target takes a -2 penalty to AC until the end of its next turn. The dragon can't take this action again until the start of its next turn."
  - name: "Pounce"
    desc: "The dragon moves up to half its Speed, and it makes one Rend attack."
```
