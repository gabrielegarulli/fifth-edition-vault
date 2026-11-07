---
title: Ancient Red Dragon
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 24
xp: 62000
xp_lair: 75000
type: dragon
subtype: chromatic
size: Gargantuan
ac: 22
hp: 507
speed: 40
moves:
  - fly
  - climb
legendary: true
spellcasting: true
tags:
  - monster
  - dragon
  - chromatic
  - cr24
  - srd-5-2-1
aliases:
  - Ancient Red Dragon
export_hash: sha256-8dd9d25217aa
---

```statblock
columns: 2
forceColumns: true
name: Ancient Red Dragon
source: SRD 5.2.1
size: Gargantuan
type: dragon
subtype: chromatic
alignment: Chaotic Evil
ac: 22
hp: 507
hit_dice: 26d20 + 234
speed: 40 ft., Climb 40 ft., Fly 80 ft.
initiative: "+14 (24)"
stats: [30, 10, 29, 18, 15, 27]
saves:
  - dexterity: 7
  - wisdom: 9
skillsaves:
  - perception: 16
  - stealth: 7
immunities: Fire
senses: Blindsight 60 ft., Darkvision 120 ft.
passive: 26
languages: Common, Draconic
cr: "24"
traits:
  - name: "Legendary Resistance (4/Day, or 5/Day in Lair)"
    desc: "If the dragon fails a saving throw, it can choose to succeed instead."
actions:
  - name: "Multiattack"
    desc: "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast [[Scorching Ray]] (level 3 version)."
  - name: "Rend"
    desc: "*Melee Attack Roll:* +17, reach 15 ft. *Hit:* 19 (2d8 + 10) Slashing damage plus 10 (3d6) Fire damage."
  - name: "Fire Breath (Recharge 5–6)"
    desc: "*Dexterity Saving Throw:* DC 24, each creature in a 90-foot Cone. *Failure:* 91 (26d6) Fire damage. *Success:* Half damage."
  - name: "Spellcasting"
    desc: "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 23, +15 to hit with spell attacks):\n- **At Will:** [[Command]] (level 2 version), [[Detect Magic]], [[Scorching Ray]] (level 3 version)\n- **1/Day Each:** [[Fireball]] (level 6 version), [[Scrying]]"
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the dragon can expend a use to take one of the following actions. The dragon regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Commanding Presence"
    desc: "The dragon uses Spellcasting to cast [[Command]] (level 2 version). The dragon can't take this action again until the start of its next turn."
  - name: "Fiery Rays"
    desc: "The dragon uses Spellcasting to cast [[Scorching Ray]] (level 3 version). The dragon can't take this action again until the start of its next turn."
  - name: "Pounce"
    desc: "The dragon moves up to half its Speed, and it makes one Rend attack."
```
