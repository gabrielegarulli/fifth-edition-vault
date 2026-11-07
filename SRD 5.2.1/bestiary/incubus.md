---
title: Incubus
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 4
xp: 1100
type: fiend
size: Medium
ac: 15
hp: 66
speed: 30
moves:
  - fly
spellcasting: true
tags:
  - monster
  - fiend
  - cr4
  - srd-5-2-1
aliases:
  - Incubus
export_hash: sha256-858488b1105b
---

```statblock
columns: 2
forceColumns: true
name: Incubus
source: SRD 5.2.1
size: Medium
type: fiend
alignment: Neutral Evil
ac: 15
hp: 66
hit_dice: 12d8 + 12
speed: 30 ft., Fly 60 ft.
initiative: "+3 (13)"
stats: [8, 17, 13, 15, 12, 20]
skillsaves:
  - deception: 9
  - insight: 5
  - perception: 5
  - persuasion: 9
  - stealth: 7
resistances: Cold, Fire, Poison, Psychic
senses: Darkvision 60 ft.
passive: 15
languages: Abyssal, Common, Infernal; telepathy 60 ft.
cr: "4"
traits:
  - name: "Succubus Form"
    desc: "When the incubus finishes a Long Rest, it can shape-shift into a Succubus, using that stat block instead of this one. Any equipment it's wearing or carrying isn't transformed."
actions:
  - name: "Multiattack"
    desc: "The incubus makes two Restless Touch attacks."
  - name: "Restless Touch"
    desc: "*Melee Attack Roll:* +7, reach 5 ft. *Hit:* 15 (3d6 + 5) Psychic damage, and the target is cursed for 24 hours or until the incubus dies. Until the curse ends, the target gains no benefit from finishing Short Rests."
  - name: "Spellcasting"
    desc: "The incubus casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 15):\n- **At Will:** [[Disguise Self]], [[Etherealness]]\n- **1/Day Each:** [[Dream]], [[Hypnotic Pattern]]"
bonus_actions:
  - name: "Nightmare (Recharge 6)"
    desc: "*Wisdom Saving Throw:* DC 15, one creature the incubus can see within 60 feet. *Failure:* If the target has 20 Hit Points or fewer, it has the [[Unconscious]] condition for 1 hour, until it takes damage, or until a creature within 5 feet of it takes an action to wake it. Otherwise, the target takes 18 (4d8) Psychic damage."
```
