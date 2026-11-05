---
title: Adult Red Dragon
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 17
xp: 18000
xp_lair: 20000
type: dragon
subtype: chromatic
size: Huge
ac: 19
hp: 256
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
  - cr17
  - srd-5-2-1
aliases:
  - Adult Red Dragon
export_hash: sha256-3e1e99597596
---

```statblock
columns: 2
forceColumns: true
name: Adult Red Dragon
source: SRD 5.2.1
size: Huge
type: dragon
subtype: chromatic
alignment: Chaotic Evil
ac: 19
hp: 256
hit_dice: 19d12 + 133
speed: 40 ft., Climb 40 ft., Fly 80 ft.
initiative: "+12 (22)"
stats: [27, 10, 25, 16, 13, 23]
saves:
  - dexterity: 6
  - wisdom: 7
skillsaves:
  - perception: 13
  - stealth: 6
immunities: Fire
senses: Blindsight 60 ft., Darkvision 120 ft.
passive: 23
languages: Common, Draconic
cr: "17"
traits:
  - name: "Legendary Resistance (3/Day, or 4/Day in Lair)"
    desc: "If the dragon fails a saving throw, it can choose to succeed instead."
actions:
  - name: "Multiattack"
    desc: "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast [[Scorching Ray]]."
  - name: "Rend"
    desc: "*Melee Attack Roll:* +14, reach 10 ft. *Hit:* 13 (1d10 + 8) Slashing damage plus 5 (2d4) Fire damage."
  - name: "Fire Breath (Recharge 5–6)"
    desc: "*Dexterity Saving Throw:* DC 21, each creature in a 60-foot Cone. *Failure:* 59 (17d6) Fire damage. *Success:* Half damage."
  - name: "Spellcasting"
    desc: "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 20, +12 to hit with spell attacks):\n- **At Will:** [[Command]] (level 2 version), [[Detect Magic]], [[Scorching Ray]]\n- **1/Day:** [[Fireball]]"
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the dragon can expend a use to take one of the following actions. The dragon regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Commanding Presence"
    desc: "The dragon uses Spellcasting to cast [[Command]] (level 2 version). The dragon can't take this action again until the start of its next turn."
  - name: "Fiery Rays"
    desc: "The dragon uses Spellcasting to cast [[Scorching Ray]]. The dragon can't take this action again until the start of its next turn."
  - name: "Pounce"
    desc: "The dragon moves up to half its Speed, and it makes one Rend attack."
```
