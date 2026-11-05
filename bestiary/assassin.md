---
title: Assassin
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 8
xp: 3900
type: humanoid
size: Small/Medium
ac: 16
hp: 97
speed: 30
tags:
  - monster
  - humanoid
  - cr8
  - srd-5-2-1
aliases:
  - Assassin
export_hash: sha256-fdd13378294a
---

```statblock
columns: 2
forceColumns: true
name: Assassin
source: SRD 5.2.1
size: Small/Medium
type: humanoid
alignment: Neutral
ac: 16
hp: 97
hit_dice: 15d8 + 30
speed: 30 ft.
initiative: "+10 (20)"
stats: [11, 18, 14, 16, 11, 10]
saves:
  - dexterity: 7
  - intelligence: 6
skillsaves:
  - acrobatics: 7
  - perception: 6
  - stealth: 10
gear: "Light Crossbow, Shortsword, Studded Leather Armor"
resistances: Poison
passive: 16
languages: Common, Thieves' cant
cr: "8"
traits:
  - name: "Evasion"
    desc: "If the assassin is subjected to an effect that allows it to make a Dexterity saving throw to take only half damage, the assassin instead takes no damage if it succeeds on the save and only half damage if it fails. It can't use this trait if it has the [[Incapacitated]] condition."
actions:
  - name: "Multiattack"
    desc: "The assassin makes three attacks, using Shortsword or Light Crossbow in any combination."
  - name: "Shortsword"
    desc: "*Melee Attack Roll:* +7, reach 5 ft. *Hit:* 7 (1d6 + 4) Piercing damage plus 17 (5d6) Poison damage, and the target has the [[Poisoned]] condition until the start of the assassin's next turn."
  - name: "Light Crossbow"
    desc: "*Ranged Attack Roll:* +7, range 80/320 ft. *Hit:* 8 (1d8 + 4) Piercing damage plus 21 (6d6) Poison damage."
bonus_actions:
  - name: "Cunning Action"
    desc: "The assassin takes the Dash, Disengage, or Hide action."
```
