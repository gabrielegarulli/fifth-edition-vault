---
title: Guardian Naga
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 10
xp: 5900
type: celestial
size: Large
ac: 18
hp: 136
speed: 40
moves:
  - swim
  - climb
spellcasting: true
tags:
  - monster
  - celestial
  - cr10
  - srd-5-2-1
aliases:
  - Guardian Naga
export_hash: sha256-7214d7ab3c59
---

```statblock
columns: 2
forceColumns: true
name: Guardian Naga
source: SRD 5.2.1
size: Large
type: celestial
alignment: Lawful Good
ac: 18
hp: 136
hit_dice: 16d10 + 48
speed: 40 ft., Climb 40 ft., Swim 40 ft.
initiative: "+4 (14)"
stats: [19, 18, 16, 16, 19, 18]
saves:
  - dexterity: 8
  - constitution: 7
  - intelligence: 7
  - wisdom: 8
  - charisma: 8
skillsaves:
  - arcana: 11
  - history: 11
  - religion: 11
immunities: Poison
condition_immunities: Charmed, Paralyzed, Poisoned, Restrained
senses: Darkvision 60 ft.
passive: 14
languages: Celestial, Common
cr: "10"
traits:
  - name: "Celestial Restoration"
    desc: "If the naga dies, it returns to life in 1d6 days and regains all its Hit Points unless [[Dispel Evil and Good]] is cast on its remains."
actions:
  - name: "Multiattack"
    desc: "The naga makes two Bite attacks. It can replace any attack with a use of Poisonous Spittle."
  - name: "Bite"
    desc: "*Melee Attack Roll:* +8, reach 10 ft. *Hit:* 17 (2d12 + 4) Piercing damage plus 22 (4d10) Poison damage."
  - name: "Poisonous Spittle"
    desc: "*Constitution Saving Throw:* DC 16, one creature the naga can see within 60 feet. *Failure:* 31 (7d8) Poison damage, and the target has the [[Blinded]] condition until the start of the naga's next turn. *Success:* Half damage only."
  - name: "Spellcasting"
    desc: "The naga casts one of the following spells, requiring no Somatic or Material components and using Wisdom as the spellcasting ability (spell save DC 16):\n- **At Will:** [[Thaumaturgy]]\n- **1/Day Each:** [[Clairvoyance]], [[Cure Wounds]] (level 6 version), [[Flame Strike]] (level 6 version), [[Geas]], [[True Seeing]]"
```
