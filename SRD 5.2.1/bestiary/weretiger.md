---
title: Weretiger
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 4
xp: 1100
type: monstrosity
subtype: lycanthrope
size: Small/Medium
ac: 12
hp: 120
speed: 30
tags:
  - monster
  - monstrosity
  - lycanthrope
  - cr4
  - srd-5-2-1
aliases:
  - Weretiger
export_hash: sha256-bf26c6baf930
---

```statblock
columns: 2
forceColumns: true
name: Weretiger
source: SRD 5.2.1
size: Small/Medium
type: monstrosity
subtype: lycanthrope
alignment: Neutral
ac: 12
hp: 120
hit_dice: 16d8 + 48
speed: 30 ft.
initiative: "+2 (12)"
stats: [17, 15, 16, 10, 13, 11]
skillsaves:
  - perception: 5
  - stealth: 4
gear: "Longbow"
senses: Darkvision 60 ft.
passive: 15
languages: Common (can't speak in tiger form)
cr: "4"
actions:
  - name: "Multiattack"
    desc: "The weretiger makes two attacks, using Scratch or Longbow in any combination. It can replace one attack with a Bite attack."
  - name: "Bite (Tiger or Hybrid Form Only)"
    desc: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 12 (2d8 + 3) Piercing damage. If the target is a Humanoid, it is subjected to the following effect. *Constitution Saving Throw:* DC 13. *Failure:* The target is cursed. If the cursed target drops to 0 Hit Points, it instead becomes a Weretiger under the GM's control and has 10 Hit Points. *Success:* The target is immune to this weretiger's curse for 24 hours."
  - name: "Scratch"
    desc: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 10 (2d6 + 3) Slashing damage."
  - name: "Longbow (Humanoid or Hybrid Form Only)"
    desc: "*Ranged Attack Roll:* +4, range 150/600 ft. *Hit:* 11 (2d8 + 2) Piercing damage."
bonus_actions:
  - name: "Prowl (Tiger or Hybrid Form Only)"
    desc: "The weretiger moves up to its Speed without provoking Opportunity Attacks. At the end of this movement, the weretiger can take the Hide action."
  - name: "Shape-Shift"
    desc: "The weretiger shape-shifts into a Large tiger-humanoid hybrid or a Large tiger, or it returns to its true humanoid form. Its game statistics, other than its size, are the same in each form. Any equipment it is wearing or carrying isn't transformed."
```
