---
title: Unicorn
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 5
xp: 1800
type: celestial
size: Large
ac: 12
hp: 97
speed: 50
legendary: true
spellcasting: true
tags:
  - monster
  - celestial
  - cr5
  - srd-5-2-1
aliases:
  - Unicorn
export_hash: sha256-3a0cae4eb402
---

```statblock
columns: 2
forceColumns: true
name: Unicorn
source: SRD 5.2.1
size: Large
type: celestial
alignment: Lawful Good
ac: 12
hp: 97
hit_dice: 13d10 + 26
speed: 50 ft.
initiative: "+8 (18)"
stats: [18, 14, 15, 11, 17, 16]
immunities: Poison
condition_immunities: Charmed, Paralyzed, Poisoned
senses: Darkvision 60 ft.
passive: 13
languages: Celestial, Elvish, Sylvan; telepathy 120 ft.
cr: "5"
traits:
  - name: "Legendary Resistance (3/Day)"
    desc: "If the unicorn fails a saving throw, it can choose to succeed instead."
  - name: "Magic Resistance"
    desc: "The unicorn has Advantage on saving throws against spells and other magical effects."
actions:
  - name: "Multiattack"
    desc: "The unicorn makes one Hooves attack and one Radiant Horn attack."
  - name: "Hooves"
    desc: "*Melee Attack Roll:* +7, reach 5 ft. *Hit:* 11 (2d6 + 4) Bludgeoning damage."
  - name: "Radiant Horn"
    desc: "*Melee Attack Roll:* +7, reach 5 ft. *Hit:* 9 (1d10 + 4) Radiant damage."
  - name: "Spellcasting"
    desc: "The unicorn casts one of the following spells, requiring no spell components and using Charisma as the spellcasting ability (spell save DC 14):\n- **At Will:** [[Detect Evil and Good]], [[Druidcraft]]\n- **1/Day Each:** [[Calm Emotions]], [[Dispel Evil and Good]], [[Entangle]], [[Pass without Trace]], [[Word of Recall]]"
bonus_actions:
  - name: "Unicorn's Blessing (3/Day)"
    desc: "The unicorn touches another creature with its horn and casts [[Cure Wounds]] or [[Lesser Restoration]] on that creature, using the same spellcasting ability as Spellcasting.\n- **3/Day:** [[Cure Wounds]], [[Lesser Restoration]]"
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3. Immediately after another creature's turn, the creature can expend a use to take one of the following actions. The creature regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Charging Horn"
    desc: "The unicorn moves up to half its Speed without provoking Opportunity Attacks, and it makes one Radiant Horn attack."
  - name: "Shimmering Shield"
    desc: "The unicorn targets itself or one creature it can see within 60 feet of itself. The target gains 10 (3d6) Temporary Hit Points, and its AC increases by 2 until the end of the unicorn's next turn. The unicorn can't take this action again until the start of its next turn."
```
