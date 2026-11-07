---
title: Vampire Spawn
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 5
xp: 1800
type: undead
size: Small/Medium
ac: 16
hp: 90
speed: 30
tags:
  - monster
  - undead
  - cr5
  - srd-5-2-1
aliases:
  - Vampire Spawn
export_hash: sha256-151e56e1e0b0
---

```statblock
columns: 2
forceColumns: true
name: Vampire Spawn
source: SRD 5.2.1
size: Small/Medium
type: undead
alignment: Neutral Evil
ac: 16
hp: 90
hit_dice: 12d8 + 36
speed: 30 ft.
initiative: "+3 (13)"
stats: [16, 16, 16, 11, 10, 12]
saves:
  - dexterity: 6
  - wisdom: 3
skillsaves:
  - perception: 3
  - stealth: 6
resistances: Necrotic
senses: Darkvision 60 ft.
passive: 13
languages: Common plus one other language
cr: "5"
traits:
  - name: "Spider Climb"
    desc: "The vampire can climb difficult surfaces, including along ceilings, without needing to make an ability check."
  - name: "Vampire Weakness"
    desc: "The vampire has these weaknesses:\n\n- **Forbiddance:** The vampire can't enter a residence without an invitation from an occupant.\n- **Running Water:** The vampire takes 20 Acid damage if it ends its turn in running water.\n- **Stake to the Heart:** The vampire is destroyed if a weapon that deals Piercing damage is driven into the vampire's heart while the vampire has the [[Incapacitated]] condition.\n- **Sunlight:** The vampire takes 20 Radiant damage if it starts its turn in sunlight. While in sunlight, it has Disadvantage on attack rolls and ability checks."
actions:
  - name: "Multiattack"
    desc: "The vampire makes two Claw attacks and uses Bite."
  - name: "Claw"
    desc: "*Melee Attack Roll:* +6, reach 5 ft. *Hit:* 8 (2d4 + 3) Slashing damage. If the target is a Medium or smaller creature, it has the [[Grappled]] condition (escape DC 13) from one of two claws."
  - name: "Bite"
    desc: "*Constitution Saving Throw:* DC 14, one creature within 5 feet that is willing or that has the [[Grappled]], [[Incapacitated]], or [[Restrained]] condition. *Failure:* 5 (1d4 + 3) Piercing damage plus 10 (3d6) Necrotic damage. The target's Hit Point maximum decreases by an amount equal to the Necrotic damage taken, and the vampire regains Hit Points equal to that amount."
bonus_actions:
  - name: "Deathless Agility"
    desc: "The vampire takes the Dash or Disengage action."
```
