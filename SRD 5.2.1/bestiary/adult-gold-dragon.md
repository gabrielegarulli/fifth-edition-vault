---
title: Adult Gold Dragon
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 17
xp: 18000
xp_lair: 20000
type: dragon
subtype: metallic
size: Huge
ac: 19
hp: 243
speed: 40
moves:
  - fly
  - swim
legendary: true
spellcasting: true
tags:
  - monster
  - dragon
  - metallic
  - cr17
  - srd-5-2-1
aliases:
  - Adult Gold Dragon
export_hash: sha256-a4fcf3bc46c6
---

```statblock
columns: 2
forceColumns: true
name: Adult Gold Dragon
source: SRD 5.2.1
size: Huge
type: dragon
subtype: metallic
alignment: Lawful Good
ac: 19
hp: 243
hit_dice: 18d12 + 126
speed: 40 ft., Fly 80 ft., Swim 40 ft.
initiative: "+14 (24)"
stats: [27, 14, 25, 16, 15, 24]
saves:
  - dexterity: 8
  - wisdom: 8
skillsaves:
  - insight: 8
  - perception: 14
  - persuasion: 13
  - stealth: 8
immunities: Fire
senses: Blindsight 60 ft., Darkvision 120 ft.
passive: 24
languages: Common, Draconic
cr: "17"
traits:
  - name: "Amphibious"
    desc: "The dragon can breathe air and water."
  - name: "Legendary Resistance (3/Day, or 4/Day in Lair)"
    desc: "If the dragon fails a saving throw, it can choose to succeed instead."
actions:
  - name: "Multiattack"
    desc: "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Spellcasting to cast [[Guiding Bolt]] (level 2 version) or (B) Weakening Breath."
  - name: "Rend"
    desc: "*Melee Attack Roll:* +14, reach 10 ft. *Hit:* 17 (2d8 + 8) Slashing damage plus 4 (1d8) Fire damage."
  - name: "Fire Breath (Recharge 5–6)"
    desc: "*Dexterity Saving Throw:* DC 21, each creature in a 60-foot Cone. *Failure:* 66 (12d10) Fire damage. *Success:* Half damage."
  - name: "Weakening Breath"
    desc: "*Strength Saving Throw:* DC 21, each creature that isn't currently affected by this breath in a 60-foot Cone. *Failure:* The target has Disadvantage on Strength-based D20 Tests and subtracts 3 (1d6) from its damage rolls. It repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically."
  - name: "Spellcasting"
    desc: "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 21, +13 to hit with spell attacks):\n- **At Will:** [[Detect Magic]], [[Guiding Bolt]] (level 2 version), [[Shapechange]] (Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell)\n- **1/Day Each:** [[Flame Strike]], [[Zone of Truth]]"
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the dragon can expend a use to take one of the following actions. The dragon regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Banish"
    desc: "*Charisma Saving Throw:* DC 21, one creature the dragon can see within 120 feet. *Failure:* 10 (3d6) Force damage, and the target has the [[Incapacitated]] condition and is transported to a harmless demiplane until the start of the dragon's next turn, at which point it reappears in an unoccupied space of the dragon's choice within 120 feet of the dragon. The dragon can't take this action again until the start of its next turn."
  - name: "Guiding Light"
    desc: "The dragon uses Spellcasting to cast [[Guiding Bolt]] (level 2 version)."
  - name: "Pounce"
    desc: "The dragon moves up to half its Speed, and it makes one Rend attack."
```
