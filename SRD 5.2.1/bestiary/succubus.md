---
title: Succubus
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 4
xp: 1100
type: fiend
size: Medium
ac: 15
hp: 71
speed: 30
moves:
  - fly
tags:
  - monster
  - fiend
  - cr4
  - srd-5-2-1
aliases:
  - Succubus
export_hash: sha256-73f470da1824
---

```statblock
columns: 2
forceColumns: true
name: Succubus
source: SRD 5.2.1
size: Medium
type: fiend
alignment: Neutral Evil
ac: 15
hp: 71
hit_dice: 13d8 + 13
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
  - name: "Incubus Form"
    desc: "When the succubus finishes a Long Rest, it can shape-shift into an Incubus, using that stat block instead of this one."
actions:
  - name: "Multiattack"
    desc: "The succubus makes one Fiendish Touch attack and uses Charm or Draining Kiss."
  - name: "Fiendish Touch"
    desc: "*Melee Attack Roll:* +7, reach 5 ft. *Hit:* 16 (2d10 + 5) Psychic damage."
  - name: "Charm"
    desc: "The succubus casts [[Dominate Person]] (level 8 version), requiring no spell components and using Charisma as the spellcasting ability (spell save DC 15)."
  - name: "Draining Kiss"
    desc: "*Constitution Saving Throw:* DC 15, one creature [[Charmed]] by the succubus within 5 feet. *Failure:* 13 (3d8) Psychic damage. *Success:* Half damage. The target's Hit Point maximum decreases by an amount equal to the damage taken."
bonus_actions:
  - name: "Shape-Shift"
    desc: "The succubus shape-shifts to resemble a Medium or Small Humanoid or back into its true form. Its game statistics are the same in each form, except its Fly Speed is available only in its true form. Any equipment it's wearing or carrying isn't transformed."
```
