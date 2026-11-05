---
title: Mummy Lord
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 15
xp: 13000
xp_lair: 15000
type: undead
subtype: cleric
size: Small/Medium
ac: 17
hp: 187
speed: 30
legendary: true
spellcasting: true
tags:
  - monster
  - undead
  - cleric
  - cr15
  - srd-5-2-1
aliases:
  - Mummy Lord
export_hash: sha256-91b6a7ab9f3a
---

```statblock
columns: 2
forceColumns: true
name: Mummy Lord
source: SRD 5.2.1
size: Small/Medium
type: undead
subtype: cleric
alignment: Lawful Evil
ac: 17
hp: 187
hit_dice: 25d8 + 75
speed: 30 ft.
initiative: "+10 (20)"
stats: [18, 10, 17, 11, 19, 16]
saves:
  - intelligence: 5
  - wisdom: 9
skillsaves:
  - history: 5
  - perception: 9
  - religion: 5
vulnerabilities: Fire
immunities: Necrotic, Poison
condition_immunities: Charmed, Exhaustion, Frightened, Paralyzed, Poisoned
senses: Truesight 60 ft.
passive: 19
languages: Common plus three other languages
cr: "15"
traits:
  - name: "Legendary Resistance (3/Day, or 4/Day in Lair)"
    desc: "If the mummy fails a saving throw, it can choose to succeed instead."
  - name: "Magic Resistance"
    desc: "The mummy has Advantage on saving throws against spells and other magical effects."
  - name: "Undead Restoration"
    desc: "If destroyed, the mummy gains a new body in 24 hours if its heart is intact, reviving with all its Hit Points. The new body appears in an unoccupied space within the mummy's lair. The heart is a Tiny object that has AC 17, HP 10, and Immunity to all damage except Fire."
actions:
  - name: "Multiattack"
    desc: "The mummy makes one Rotting Fist or Channel Negative Energy attack, and it uses Dreadful Glare."
  - name: "Rotting Fist"
    desc: "*Melee Attack Roll:* +9, reach 5 ft. *Hit:* 15 (2d10 + 4) Bludgeoning damage plus 10 (3d6) Necrotic damage. If the target is a creature, it is cursed. While cursed, the target can't regain Hit Points, it gains no benefit from finishing a Long Rest, and its Hit Point maximum decreases by 10 (3d6) every 24 hours that elapse. A creature dies and turns to dust if reduced to 0 Hit Points by this attack."
  - name: "Channel Negative Energy"
    desc: "*Ranged Attack Roll:* +9, range 60 ft. *Hit:* 25 (6d6 + 4) Necrotic damage."
  - name: "Dreadful Glare"
    desc: "*Wisdom Saving Throw:* DC 17, one creature the mummy can see within 60 feet. *Failure:* 25 (6d6 + 4) Psychic damage, and the target has the [[Paralyzed]] condition until the end of the mummy's next turn."
  - name: "Spellcasting"
    desc: "The mummy casts one of the following spells, requiring no Material components and using Wisdom as the spellcasting ability (spell save DC 17, +9 to hit with spell attacks):\n- **At Will:** [[Dispel Magic]], [[Thaumaturgy]]\n- **1/Day Each:** [[Animate Dead]], [[Harm]], [[Insect Plague]] (level 7 version)"
reactions:
  - name: "Whirlwind of Sand"
    desc: "*Trigger:* The mummy is hit by an attack roll. *Response:* The mummy adds 2 to its AC against the attack, possibly causing the attack to miss, and the mummy teleports up to 60 feet to an unoccupied space it can see. Each creature of its choice that it can see within 5 feet of its destination space has the [[Blinded]] condition until the end of the mummy's next turn."
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the creature can expend a use to take one of the following actions. The creature regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Glare"
    desc: "The mummy uses Dreadful Glare. The mummy can't take this action again until the start of its next turn."
  - name: "Necrotic Strike"
    desc: "The mummy makes one Rotting Fist or Channel Negative Energy attack."
```
