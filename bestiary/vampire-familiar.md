---
title: Vampire Familiar
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 3
xp: 700
type: humanoid
size: Small/Medium
ac: 15
hp: 65
speed: 30
moves:
  - climb
tags:
  - monster
  - humanoid
  - cr3
  - srd-5-2-1
aliases:
  - Vampire Familiar
export_hash: sha256-f488ec568726
---

```statblock
columns: 2
forceColumns: true
name: Vampire Familiar
source: SRD 5.2.1
size: Small/Medium
type: humanoid
alignment: Neutral Evil
ac: 15
hp: 65
hit_dice: 10d8 + 20
speed: 30 ft., Climb 30 ft.
initiative: "+5 (15)"
stats: [17, 16, 15, 10, 10, 14]
saves:
  - dexterity: 5
  - wisdom: 2
skillsaves:
  - perception: 4
  - persuasion: 4
  - stealth: 7
gear: "10 Daggers"
resistances: Necrotic
condition_immunities: Charmed (except from its vampire master)
senses: Darkvision 60 ft.
passive: 14
languages: Common plus one other language
cr: "3"
traits:
  - name: "Vampiric Connection"
    desc: "While the familiar and its vampire master are on the same plane of existence, the vampire can communicate with the familiar telepathically, and the vampire can perceive through the familiar's senses."
actions:
  - name: "Multiattack"
    desc: "The familiar makes two Umbral Dagger attacks."
  - name: "Umbral Dagger"
    desc: "*Melee Attack Roll or Ranged Attack Roll:* +5, reach 5 ft. or range 20/60 ft. *Hit:* 5 (1d4 + 3) Piercing damage plus 7 (3d4) Necrotic damage. If the target is reduced to 0 Hit Points by this attack, the target becomes Stable but has the [[Poisoned]] condition for 1 hour. While it has the [[Poisoned]] condition, the target has the [[Paralyzed]] condition."
bonus_actions:
  - name: "Deathless Agility"
    desc: "The familiar takes the Dash or Disengage action."
```
