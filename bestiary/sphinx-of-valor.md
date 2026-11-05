---
title: Sphinx of Valor
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 17
xp: 18000
xp_lair: 20000
type: celestial
size: Large
ac: 17
hp: 199
speed: 40
moves:
  - fly
legendary: true
spellcasting: true
tags:
  - monster
  - celestial
  - cr17
  - srd-5-2-1
aliases:
  - Sphinx of Valor
export_hash: sha256-f7d455945d0d
---

```statblock
columns: 2
forceColumns: true
name: Sphinx of Valor
source: SRD 5.2.1
size: Large
type: celestial
alignment: Lawful Neutral
ac: 17
hp: 199
hit_dice: 19d10 + 95
speed: 40 ft., Fly 60 ft.
initiative: "+12 (22)"
stats: [22, 10, 20, 16, 23, 18]
saves:
  - dexterity: 6
  - constitution: 11
  - intelligence: 9
  - wisdom: 12
skillsaves:
  - arcana: 9
  - perception: 12
  - religion: 15
resistances: Necrotic, Radiant
immunities: Psychic
condition_immunities: Charmed, Frightened
senses: Truesight 120 ft.
passive: 22
languages: Celestial, Common
cr: "17"
traits:
  - name: "Inscrutable"
    desc: "No magic can observe the sphinx remotely or detect its thoughts without its permission. Wisdom (Insight) checks made to ascertain its intentions or sincerity are made with Disadvantage."
  - name: "Legendary Resistance (3/Day, or 4/Day in Lair)"
    desc: "If the sphinx fails a saving throw, it can choose to succeed instead."
actions:
  - name: "Multiattack"
    desc: "The sphinx makes two Claw attacks and uses Roar."
  - name: "Claw"
    desc: "*Melee Attack Roll:* +12, reach 5 ft. *Hit:* 20 (4d6 + 6) Slashing damage."
  - name: "Roar (3/Day)"
    desc: "The sphinx emits a magical roar. Whenever it roars, the roar has a different effect, as detailed below (the sequence resets when it takes a Long Rest):\n\n- **First Roar:** *Wisdom Saving Throw:* DC 20, each enemy in a 500-foot Emanation originating from the sphinx. *Failure:* The target has the [[Frightened]] condition for 1 minute.\n- **Second Roar:** *Wisdom Saving Throw:* DC 20, each enemy in a 500-foot Emanation originating from the sphinx. *Failure:* The target has the [[Paralyzed]] condition, and it repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically.\n- **Third Roar:** *Constitution Saving Throw:* DC 20, each enemy in a 500-foot Emanation originating from the sphinx. *Failure:* 44 (8d10) Thunder damage, and the target has the [[Prone]] condition. *Success:* Half damage only."
  - name: "Spellcasting"
    desc: "The sphinx casts one of the following spells, requiring no Material components and using Wisdom as the spellcasting ability (spell save DC 20):\n- **At Will:** [[Detect Evil and Good]], [[Thaumaturgy]]\n- **1/Day Each:** [[Detect Magic]], [[Dispel Magic]], [[Greater Restoration]], [[Heroes' Feast]], [[Zone of Truth]]"
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the creature can expend a use to take one of the following actions. The creature regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Arcane Prowl"
    desc: "The sphinx can teleport up to 30 feet to an unoccupied space it can see, and it makes one Claw attack."
  - name: "Weight of Years"
    desc: "*Constitution Saving Throw:* DC 16, one creature the sphinx can see within 120 feet. *Failure:* The target gains 1 [[Exhaustion]] level. While the target has any [[Exhaustion]] levels, it appears 3d10 years older. The sphinx can't take this action again until the start of its next turn."
```
