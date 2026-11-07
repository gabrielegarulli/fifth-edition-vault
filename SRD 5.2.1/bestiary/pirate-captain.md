---
title: Pirate Captain
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 6
xp: 2300
type: humanoid
size: Small/Medium
ac: 17
hp: 84
speed: 30
tags:
  - monster
  - humanoid
  - cr6
  - srd-5-2-1
aliases:
  - Pirate Captain
export_hash: sha256-e880d67b76b9
---

```statblock
columns: 2
forceColumns: true
name: Pirate Captain
source: SRD 5.2.1
size: Small/Medium
type: humanoid
alignment: Neutral
ac: 17
hp: 84
hit_dice: 13d8 + 26
speed: 30 ft.
initiative: "+7 (17)"
stats: [10, 18, 14, 10, 14, 17]
saves:
  - strength: 3
  - dexterity: 7
  - wisdom: 5
  - charisma: 6
skillsaves:
  - acrobatics: 7
  - perception: 5
gear: "Pistol, Rapier"
passive: 15
languages: Common plus one other language
cr: "6"
actions:
  - name: "Multiattack"
    desc: "The pirate makes three attacks, using Rapier or Pistol in any combination."
  - name: "Rapier"
    desc: "*Melee Attack Roll:* +7, reach 5 ft. *Hit:* 13 (2d8 + 4) Piercing damage, and the pirate has Advantage on the next attack roll it makes before the end of this turn."
  - name: "Pistol"
    desc: "*Ranged Attack Roll:* +7, range 30/90 ft. *Hit:* 15 (2d10 + 4) Piercing damage."
bonus_actions:
  - name: "Captain's Charm"
    desc: "*Wisdom Saving Throw:* DC 14, one creature the pirate can see within 30 feet. *Failure:* The target has the [[Charmed]] condition until the start of the pirate's next turn."
reactions:
  - name: "Riposte"
    desc: "*Trigger:* The pirate is hit by a melee attack roll while holding a weapon. *Response:* The pirate adds 3 to its AC against that attack, possibly causing it to miss. On a miss, the pirate makes one Rapier attack against the triggering creature if within range."
```
