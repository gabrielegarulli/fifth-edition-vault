---
title: Wereboar
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 4
xp: 1100
type: monstrosity
subtype: lycanthrope
size: Small/Medium
ac: 15
hp: 97
speed: 30
tags:
  - monster
  - monstrosity
  - lycanthrope
  - cr4
  - srd-5-2-1
aliases:
  - Wereboar
export_hash: sha256-e421a1f03645
---

```statblock
columns: 2
forceColumns: true
name: Wereboar
source: SRD 5.2.1
size: Small/Medium
type: monstrosity
subtype: lycanthrope
alignment: Neutral Evil
ac: 15
hp: 97
hit_dice: 15d8 + 30
speed: 30 ft.
initiative: "+2 (12)"
stats: [17, 10, 15, 10, 11, 8]
skillsaves:
  - perception: 2
gear: "6 Javelins"
passive: 12
languages: Common (can't speak in boar form)
cr: "4"
actions:
  - name: "Multiattack"
    desc: "The wereboar makes two attacks, using Javelin or Tusk in any combination. It can replace one attack with a Gore attack."
  - name: "Gore (Boar or Hybrid Form Only)"
    desc: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 12 (2d8 + 3) Piercing damage. If the target is a Humanoid, it is subjected to the following effect. *Constitution Saving Throw:* DC 12. *Failure:* The target is cursed. If the cursed target drops to 0 Hit Points, it instead becomes a Wereboar under the GM's control and has 10 Hit Points. *Success:* The target is immune to this wereboar's curse for 24 hours."
  - name: "Javelin (Humanoid or Hybrid Form Only)"
    desc: "*Melee Attack Roll or Ranged Attack Roll:* +5, reach 5 ft. or range 30/120 ft. *Hit:* 13 (3d6 + 3) Piercing damage."
  - name: "Tusk (Boar or Hybrid Form Only)"
    desc: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 10 (2d6 + 3) Piercing damage. If the target is a Medium or smaller creature and the wereboar moved 20+ feet straight toward it immediately before the hit, the target takes an extra 7 (2d6) Piercing damage and has the [[Prone]] condition."
bonus_actions:
  - name: "Shape-Shift"
    desc: "The wereboar shape-shifts into a Medium boar-humanoid hybrid or a Small boar, or it returns to its true humanoid form. Its game statistics, other than its size, are the same in each form. Any equipment it is wearing or carrying isn't transformed."
```
