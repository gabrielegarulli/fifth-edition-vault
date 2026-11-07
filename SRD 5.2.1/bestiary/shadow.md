---
title: Shadow
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 1/2
xp: 100
type: undead
size: Medium
ac: 12
hp: 27
speed: 40
tags:
  - monster
  - undead
  - cr1-2
  - srd-5-2-1
aliases:
  - Shadow
export_hash: sha256-6fe00189099c
---

```statblock
columns: 2
forceColumns: true
name: Shadow
source: SRD 5.2.1
size: Medium
type: undead
alignment: Chaotic Evil
ac: 12
hp: 27
hit_dice: 5d8 + 5
speed: 40 ft.
initiative: "+2 (12)"
stats: [6, 14, 13, 6, 10, 8]
skillsaves:
  - stealth: 6
vulnerabilities: Radiant
resistances: Acid, Cold, Fire, Lightning, Thunder
immunities: Necrotic, Poison
condition_immunities: Exhaustion, Frightened, Grappled, Paralyzed, Petrified, Poisoned, Prone, Restrained, Unconscious
senses: Darkvision 60 ft.
passive: 10
cr: "1/2"
traits:
  - name: "Amorphous"
    desc: "The shadow can move through a space as narrow as 1 inch without expending extra movement to do so."
  - name: "Sunlight Weakness"
    desc: "While in sunlight, the shadow has Disadvantage on D20 Tests."
actions:
  - name: "Draining Swipe"
    desc: "*Melee Attack Roll:* +4, reach 5 ft. *Hit:* 5 (1d6 + 2) Necrotic damage, and the target's Strength score decreases by 1d4. The target dies if this reduces that score to 0. If a Humanoid is slain by this attack, a Shadow rises from the corpse 1d4 hours later."
bonus_actions:
  - name: "Shadow Stealth"
    desc: "While in Dim Light or Darkness, the shadow takes the Hide action."
```
