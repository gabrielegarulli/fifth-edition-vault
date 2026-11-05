---
title: Werebear
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 5
xp: 1800
type: monstrosity
subtype: lycanthrope
size: Small/Medium
ac: 15
hp: 135
speed: 30
moves:
  - climb
tags:
  - monster
  - monstrosity
  - lycanthrope
  - cr5
  - srd-5-2-1
aliases:
  - Werebear
export_hash: sha256-64052a71ffd8
---

```statblock
columns: 2
forceColumns: true
name: Werebear
source: SRD 5.2.1
size: Small/Medium
type: monstrosity
subtype: lycanthrope
alignment: Neutral Good
ac: 15
hp: 135
hit_dice: 18d8 + 54
speed: 30 ft., Climb 30 ft. (bear form only)
initiative: "+3 (13)"
stats: [19, 10, 17, 11, 12, 12]
skillsaves:
  - perception: 7
gear: "4 Handaxes"
senses: Darkvision 60 ft.
passive: 17
languages: Common (can't speak in bear form)
cr: "5"
actions:
  - name: "Multiattack"
    desc: "The werebear makes two attacks, using Handaxe or Rend in any combination. It can replace one attack with a Bite attack."
  - name: "Bite (Bear or Hybrid Form Only)"
    desc: "*Melee Attack Roll:* +7, reach 5 ft. *Hit:* 17 (2d12 + 4) Piercing damage. If the target is a Humanoid, it is subjected to the following effect. *Constitution Saving Throw:* DC 14. *Failure:* The target is cursed. If the cursed target drops to 0 Hit Points, it instead becomes a Werebear under the GM's control and has 10 Hit Points. *Success:* The target is immune to this werebear's curse for 24 hours."
  - name: "Handaxe (Humanoid or Hybrid Form Only)"
    desc: "*Melee Attack Roll or Ranged Attack Roll:* +7, reach 5 ft or range 20/60 ft. *Hit:* 14 (3d6 + 4) Slashing damage."
  - name: "Rend (Bear or Hybrid Form Only)"
    desc: "*Melee Attack Roll:* +7, reach 5 ft. *Hit:* 13 (2d8 + 4) Slashing damage."
bonus_actions:
  - name: "Shape-Shift"
    desc: "The werebear shape-shifts into a Large bear-humanoid hybrid form or a Large bear, or it returns to its true humanoid form. Its game statistics, other than its size, are the same in each form. Any equipment it is wearing or carrying isn't transformed."
```
