---
title: Ancient Gold Dragon
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 24
xp: 62000
xp_lair: 75000
type: dragon
subtype: metallic
size: Gargantuan
ac: 22
hp: 546
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
  - cr24
  - srd-5-2-1
aliases:
  - Ancient Gold Dragon
export_hash: sha256-9c432426b888
---

```statblock
columns: 2
forceColumns: true
name: Ancient Gold Dragon
source: SRD 5.2.1
size: Gargantuan
type: dragon
subtype: metallic
alignment: Lawful Good
ac: 22
hp: 546
hit_dice: 28d20 + 252
speed: 40 ft., Fly 80 ft., Swim 40 ft.
initiative: "+16 (26)"
stats: [30, 14, 29, 18, 17, 28]
saves:
  - dexterity: 9
  - wisdom: 10
skillsaves:
  - insight: 10
  - perception: 17
  - persuasion: 16
  - stealth: 9
immunities: Fire
senses: Blindsight 60 ft., Darkvision 120 ft.
passive: 27
languages: Common, Draconic
cr: "24"
traits:
  - name: "Amphibious"
    desc: "The dragon can breathe air and water."
  - name: "Legendary Resistance (4/Day, or 5/Day in Lair)"
    desc: "If the dragon fails a saving throw, it can choose to succeed instead."
actions:
  - name: "Multiattack"
    desc: "The dragon makes three Rend attacks. It can replace one attack with a use of (A) Spellcasting to cast [[Guiding Bolt]] (level 4 version) or (B) Weakening Breath."
  - name: "Rend"
    desc: "*Melee Attack Roll:* +17 to hit, reach 15 ft. *Hit:* 19 (2d8 + 10) Slashing damage plus 9 (2d8) Fire damage."
  - name: "Fire Breath (Recharge 5–6)"
    desc: "*Dexterity Saving Throw:* DC 24, each creature in a 90-foot Cone. *Failure:* 71 (13d10) Fire damage. *Success:* Half damage."
  - name: "Weakening Breath"
    desc: "*Strength Saving Throw:* DC 24, each creature that isn't currently affected by this breath in a 90-foot Cone. *Failure:* The target has Disadvantage on Strength-based D20 Tests and subtracts 5 (1d10) from its damage rolls. It repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically."
  - name: "Spellcasting"
    desc: "The dragon casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 24, +16 to hit with spell attacks):\n- **At Will:** [[Detect Magic]], [[Guiding Bolt]] (level 4 version), [[Shapechange]] (Beast or Humanoid form only, no Temporary Hit Points gained from the spell, and no Concentration or Temporary Hit Points required to maintain the spell)\n- **1/Day Each:** [[Flame Strike]] (level 6 version), [[Word of Recall]], [[Zone of Truth]]"
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the dragon can expend a use to take one of the following actions. The dragon regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Banish"
    desc: "*Charisma Saving Throw:* DC 24, one creature the dragon can see within 120 feet. *Failure:* 24 (7d6) Force damage, and the target has the [[Incapacitated]] condition and is transported to a harmless demiplane until the start of the dragon's next turn, at which point it reappears in an unoccupied space of the dragon's choice within 120 feet of the dragon. The dragon can't take this action again until the start of its next turn."
  - name: "Guiding Light"
    desc: "The dragon uses Spellcasting to cast [[Guiding Bolt]] (level 4 version)."
  - name: "Pounce"
    desc: "The dragon moves up to half its Speed, and it makes one Rend attack."
```
