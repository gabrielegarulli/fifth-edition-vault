---
title: Adult Green Dragon
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 15
xp: 13000
xp_lair: 15000
type: dragon
subtype: chromatic
size: Huge
ac: 19
hp: 207
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
  - cr15
  - srd-5-2-1
aliases:
  - Adult Green Dragon
export_hash: sha256-52006a95f6e8
---

```statblock
columns: 2
forceColumns: true
name: Adult Green Dragon
source: SRD 5.2.1
size: Huge
type: dragon
subtype: chromatic
alignment: Lawful Evil
ac: 19
hp: 207
hit_dice: 18d12 + 90
speed: 40 ft., Fly 80 ft., Swim 40 ft.
initiative: "+11 (21)"
stats: [23, 12, 21, 18, 15, 18]
saves:
  - dexterity: 6
  - wisdom: 7
skillsaves:
  - deception: 9
  - perception: 12
  - persuasion: 9
  - stealth: 6
immunities: Poison
condition_immunities: Poisoned
senses: Blindsight 60 ft., Darkvision 120 ft.
passive: 22
languages: Common, Draconic
cr: "15"
traits:
  - name: "Amphibious"
    desc: "The dragon can breathe air and water."
  - name: "Legendary Resistance (3/Day, or 4/Day in Lair)"
    desc: "If the dragon fails a saving throw, it can choose to succeed instead."
actions:
  - name: "Multiattack"
    desc: "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast [[Mind Spike]] (level 3 version)."
  - name: "Rend"
    desc: "*Melee Attack Roll:* +11, reach 10 ft. *Hit:* 15 (2d8 + 6) Slashing damage plus 7 (2d6) Poison damage."
  - name: "Poison Breath (Recharge 5–6)"
    desc: "*Constitution Saving Throw:* DC 18, each creature in a 60-foot Cone. *Failure:* 56 (16d6) Poison damage. *Success:* Half damage."
  - name: "Spellcasting"
    desc: "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 17):\n- **At Will:** [[Detect Magic]], [[Mind Spike]] (level 3 version)\n- **1/Day:** [[Geas]]"
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the dragon can expend a use to take one of the following actions. The dragon regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Mind Invasion"
    desc: "The dragon uses Spellcasting to cast [[Mind Spike]] (level 3 version)."
  - name: "Noxious Miasma"
    desc: "*Constitution Saving Throw:* DC 17, each creature in a 20-foot-radius Sphere centered on a point the dragon can see within 90 feet. *Failure:* 7 (2d6) Poison damage, and the target takes a -2 penalty to AC until the end of its next turn. The dragon can't take this action again until the start of its next turn."
  - name: "Pounce"
    desc: "The dragon moves up to half its Speed, and it makes one Rend attack."
```
