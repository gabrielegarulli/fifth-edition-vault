---
title: Lamia
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 4
xp: 1100
type: fiend
size: Large
ac: 13
hp: 97
speed: 40
spellcasting: true
tags:
  - monster
  - fiend
  - cr4
  - srd-5-2-1
aliases:
  - Lamia
export_hash: sha256-346fb58fb902
---

```statblock
columns: 2
forceColumns: true
name: Lamia
source: SRD 5.2.1
size: Large
type: fiend
alignment: Chaotic Evil
ac: 13
hp: 97
hit_dice: 13d10 + 26
speed: 40 ft.
initiative: "+1 (11)"
stats: [16, 13, 15, 14, 15, 16]
skillsaves:
  - deception: 7
  - insight: 4
  - stealth: 5
senses: Darkvision 60 ft.
passive: 12
languages: Abyssal, Common
cr: "4"
actions:
  - name: "Multiattack"
    desc: "The lamia makes two Claw attacks. It can replace one attack with a use of Corrupting Touch."
  - name: "Claw"
    desc: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 7 (1d8 + 3) Slashing damage plus 7 (2d6) Psychic damage."
  - name: "Corrupting Touch"
    desc: "*Wisdom Saving Throw:* DC 13, one creature the lamia can see within 5 feet. *Failure:* 13 (3d8) Psychic damage, and the target is cursed for 1 hour. Until the curse ends, the target has the [[Charmed]] and [[Poisoned]] conditions."
  - name: "Spellcasting"
    desc: "The lamia casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 13):\n- **At Will:** [[Disguise Self]] (can appear as a Large or Medium biped), [[Minor Illusion]]\n- **1/Day Each:** [[Geas]], [[Major Image]], [[Scrying]]"
bonus_actions:
  - name: "Leap"
    desc: "The lamia jumps up to 30 feet by spending 10 feet of movement."
```
