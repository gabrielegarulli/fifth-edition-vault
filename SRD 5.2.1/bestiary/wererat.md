---
title: Wererat
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 2
xp: 450
type: monstrosity
subtype: lycanthrope
size: Small/Medium
ac: 13
hp: 60
speed: 30
moves:
  - climb
tags:
  - monster
  - monstrosity
  - lycanthrope
  - cr2
  - srd-5-2-1
aliases:
  - Wererat
export_hash: sha256-1eaec76641e7
---

```statblock
columns: 2
forceColumns: true
name: Wererat
source: SRD 5.2.1
size: Small/Medium
type: monstrosity
subtype: lycanthrope
alignment: Lawful Evil
ac: 13
hp: 60
hit_dice: 11d8 + 11
speed: 30 ft., Climb 30 ft.
initiative: "+3 (13)"
stats: [10, 16, 12, 11, 10, 8]
skillsaves:
  - perception: 4
  - stealth: 5
gear: "Hand Crossbow"
senses: Darkvision 60 ft.
passive: 14
languages: Common (can't speak in rat form)
cr: "2"
actions:
  - name: "Multiattack"
    desc: "The wererat makes two attacks, using Scratch or Hand Crossbow in any combination. It can replace one attack with a Bite attack."
  - name: "Bite (Rat or Hybrid Form Only)"
    desc: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 8 (2d4 + 3) Piercing damage. If the target is a Humanoid, it is subjected to the following effect. *Constitution Saving Throw:* DC 11. *Failure:* The target is cursed. If the cursed target drops to 0 Hit Points, it instead becomes a Wererat under the GM's control and has 10 Hit Points. *Success:* The target is immune to this wererat's curse for 24 hours."
  - name: "Scratch"
    desc: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 6 (1d6 + 3) Slashing damage."
  - name: "Hand Crossbow (Humanoid or Hybrid Form Only)"
    desc: "*Ranged Attack Roll:* +5, range 30/120 ft. *Hit:* 6 (1d6 + 3) Piercing damage."
bonus_actions:
  - name: "Shape-Shift"
    desc: "The wererat shape-shifts into a Medium rat-humanoid hybrid or a Small rat, or it returns to its true humanoid form. Its game statistics, other than its size, are the same in each form. Any equipment it is wearing or carrying isn't transformed."
```
