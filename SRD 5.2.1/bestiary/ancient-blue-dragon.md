---
title: Ancient Blue Dragon
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 23
xp: 50000
xp_lair: 62000
type: dragon
subtype: chromatic
size: Gargantuan
ac: 22
hp: 481
speed: 40
moves:
  - fly
  - burrow
legendary: true
spellcasting: true
tags:
  - monster
  - dragon
  - chromatic
  - cr23
  - srd-5-2-1
aliases:
  - Ancient Blue Dragon
export_hash: sha256-7f22c34d3871
---

```statblock
columns: 2
forceColumns: true
name: Ancient Blue Dragon
source: SRD 5.2.1
size: Gargantuan
type: dragon
subtype: chromatic
alignment: Lawful Evil
ac: 22
hp: 481
hit_dice: 26d20 + 208
speed: 40 ft., Burrow 40 ft., Fly 80 ft.
initiative: "+14 (24)"
stats: [29, 10, 27, 18, 17, 25]
saves:
  - dexterity: 7
  - wisdom: 10
skillsaves:
  - perception: 17
  - stealth: 7
immunities: Lightning
senses: Blindsight 60 ft., Darkvision 120 ft.
passive: 27
languages: Common, Draconic
cr: "23"
traits:
  - name: "Legendary Resistance (4/Day, or 5/Day in Lair)"
    desc: "If the dragon fails a saving throw, it can choose to succeed instead."
actions:
  - name: "Multiattack"
    desc: "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast [[Shatter]] (level 3 version)."
  - name: "Rend"
    desc: "*Melee Attack Roll:* +16, reach 15 ft. *Hit:* 18 (2d8 + 9) Slashing damage plus 11 (2d10) Lightning damage."
  - name: "Lightning Breath (Recharge 5–6)"
    desc: "*Dexterity Saving Throw:* DC 23, each creature in a 120-foot-long, 10-foot-wide Line. *Failure:* 88 (16d10) Lightning damage. *Success:* Half damage."
  - name: "Spellcasting"
    desc: "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 22):\n- **At Will:** [[Detect Magic]], [[Invisibility]], [[Mage Hand]], [[Shatter]] (level 3 version)\n- **1/Day Each:** [[Scrying]], [[Sending]]"
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the dragon can expend a use to take one of the following actions. The dragon regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Cloaked Flight"
    desc: "The dragon uses Spellcasting to cast [[Invisibility]] on itself, and it can fly up to half its Fly Speed. The dragon can't take this action again until the start of its next turn."
  - name: "Sonic Boom"
    desc: "The dragon uses Spellcasting to cast [[Shatter]] (level 3 version). The dragon can't take this action again until the start of its next turn."
  - name: "Tail Swipe"
    desc: "The dragon makes one Rend attack."
```
