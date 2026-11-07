---
title: Adult Blue Dragon
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 16
xp: 15000
xp_lair: 18000
type: dragon
subtype: chromatic
size: Huge
ac: 19
hp: 212
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
  - cr16
  - srd-5-2-1
aliases:
  - Adult Blue Dragon
export_hash: sha256-f4978f792b86
---

```statblock
columns: 2
forceColumns: true
name: Adult Blue Dragon
source: SRD 5.2.1
size: Huge
type: dragon
subtype: chromatic
alignment: Lawful Evil
ac: 19
hp: 212
hit_dice: 17d12 + 102
speed: 40 ft., Burrow 30 ft., Fly 80 ft.
initiative: "+10 (20)"
stats: [25, 10, 23, 16, 15, 20]
saves:
  - dexterity: 5
  - wisdom: 7
skillsaves:
  - perception: 12
  - stealth: 5
immunities: Lightning
senses: Blindsight 60 ft., Darkvision 120 ft.
passive: 22
languages: Common, Draconic
cr: "16"
traits:
  - name: "Legendary Resistance (3/Day, or 4/Day in Lair)"
    desc: "If the dragon fails a saving throw, it can choose to succeed instead."
actions:
  - name: "Multiattack"
    desc: "The dragon makes three Rend attacks. It can replace one attack with a use of Spellcasting to cast [[Shatter]]."
  - name: "Rend"
    desc: "*Melee Attack Roll:* +12, reach 10 ft. *Hit:* 16 (2d8 + 7) Slashing damage plus 5 (1d10) Lightning damage."
  - name: "Lightning Breath (Recharge 5–6)"
    desc: "*Dexterity Saving Throw:* DC 19, each creature in a 90-foot-long, 5-foot-wide Line. *Failure:* 60 (11d10) Lightning damage. *Success:* Half damage."
  - name: "Spellcasting"
    desc: "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 18):\n- **At Will:** [[Detect Magic]], [[Invisibility]], [[Mage Hand]], [[Shatter]]\n- **1/Day Each:** [[Scrying]], [[Sending]]"
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the dragon can expend a use to take one of the following actions. The dragon regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Cloaked Flight"
    desc: "The dragon uses Spellcasting to cast [[Invisibility]] on itself, and it can fly up to half its Fly Speed. The dragon can't take this action again until the start of its next turn."
  - name: "Sonic Boom"
    desc: "The dragon uses Spellcasting to cast [[Shatter]]. The dragon can't take this action again until the start of its next turn."
  - name: "Tail Swipe"
    desc: "The dragon makes one Rend attack."
```
