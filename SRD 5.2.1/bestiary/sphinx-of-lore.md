---
title: Sphinx of Lore
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 11
xp: 7200
xp_lair: 8400
type: celestial
size: Large
ac: 17
hp: 170
speed: 40
moves:
  - fly
legendary: true
spellcasting: true
tags:
  - monster
  - celestial
  - cr11
  - srd-5-2-1
aliases:
  - Sphinx of Lore
export_hash: sha256-8205d0a9d394
---

```statblock
columns: 2
forceColumns: true
name: Sphinx of Lore
source: SRD 5.2.1
size: Large
type: celestial
alignment: Lawful Neutral
ac: 17
hp: 170
hit_dice: 20d10 + 60
speed: 40 ft., Fly 60 ft.
initiative: "+10 (20)"
stats: [18, 15, 16, 18, 18, 18]
skillsaves:
  - arcana: 12
  - history: 12
  - perception: 8
  - religion: 12
resistances: Necrotic, Radiant
immunities: Psychic
condition_immunities: Charmed, Frightened
senses: Truesight 120 ft.
passive: 18
languages: Celestial, Common
cr: "11"
traits:
  - name: "Inscrutable"
    desc: "No magic can observe the sphinx remotely or detect its thoughts without its permission. Wisdom (Insight) checks made to ascertain its intentions or sincerity are made with Disadvantage."
  - name: "Legendary Resistance (3/Day, or 4/Day in Lair)"
    desc: "If the sphinx fails a saving throw, it can choose to succeed instead."
actions:
  - name: "Multiattack"
    desc: "The sphinx makes three Claw attacks."
  - name: "Claw"
    desc: "*Melee Attack Roll:* +8, reach 5 ft. *Hit:* 14 (3d6 + 4) Slashing damage."
  - name: "Mind-Rending Roar (Recharge 5–6)"
    desc: "*Wisdom Saving Throw:* DC 16, each enemy in a 300-foot Emanation originating from the sphinx. *Failure:* 35 (10d6) Psychic damage, and the target has the [[Incapacitated]] condition until the start of the sphinx's next turn."
  - name: "Spellcasting"
    desc: "The sphinx casts one of the following spells, requiring no Material components and using Intelligence as the spellcasting ability (spell save DC 16):\n- **At Will:** [[Detect Magic]], [[Identify]], [[Mage Hand]], [[Minor Illusion]], [[Prestidigitation]]\n- **1/Day Each:** [[Dispel Magic]], [[Legend Lore]], [[Locate Object]], [[Plane Shift]], [[Remove Curse]], [[Tongues]]"
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the creature can expend a use to take one of the following actions. The creature regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Arcane Prowl"
    desc: "The sphinx can teleport up to 30 feet to an unoccupied space it can see, and it makes one Claw attack."
  - name: "Weight of Years"
    desc: "*Constitution Saving Throw:* DC 16, one creature the sphinx can see within 120 feet. *Failure:* The target gains 1 [[Exhaustion]] level. While the target has any [[Exhaustion]] levels, it appears 3d10 years older. The sphinx can't take this action again until the start of its next turn."
```
