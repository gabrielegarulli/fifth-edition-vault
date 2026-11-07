---
title: Bandit Captain
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 2
xp: 450
type: humanoid
size: Small/Medium
ac: 15
hp: 52
speed: 30
tags:
  - monster
  - humanoid
  - cr2
  - srd-5-2-1
aliases:
  - Bandit Captain
export_hash: sha256-2a87597aec7d
---

```statblock
columns: 2
forceColumns: true
name: Bandit Captain
source: SRD 5.2.1
size: Small/Medium
type: humanoid
alignment: Neutral
ac: 15
hp: 52
hit_dice: 8d8 + 16
speed: 30 ft.
initiative: "+3 (13)"
stats: [15, 16, 14, 14, 11, 14]
saves:
  - strength: 4
  - dexterity: 5
  - wisdom: 2
skillsaves:
  - athletics: 4
  - deception: 4
gear: "Pistol, Scimitar, Studded Leather Armor"
passive: 10
languages: Common, Thieves' cant
cr: "2"
actions:
  - name: "Multiattack"
    desc: "The bandit makes two attacks, using Scimitar and Pistol in any combination."
  - name: "Scimitar"
    desc: "*Melee Attack Roll:* +5, reach 5 ft. *Hit:* 6 (1d6 + 3) Slashing damage."
  - name: "Pistol"
    desc: "*Ranged Attack Roll:* +5, range 30/90 ft. *Hit:* 8 (1d10 + 3) Piercing damage."
reactions:
  - name: "Parry"
    desc: "*Trigger:* The bandit is hit by a melee attack roll while holding a weapon. *Response:* The bandit adds 2 to its AC against that attack, possibly causing it to miss."
```
