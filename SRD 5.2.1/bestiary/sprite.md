---
title: Sprite
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 1/4
xp: 50
type: fey
size: Tiny
ac: 15
hp: 10
speed: 10
moves:
  - fly
spellcasting: true
tags:
  - monster
  - fey
  - cr1-4
  - srd-5-2-1
aliases:
  - Sprite
export_hash: sha256-39dbe00773af
---

```statblock
columns: 2
forceColumns: true
name: Sprite
source: SRD 5.2.1
size: Tiny
type: fey
alignment: Neutral Good
ac: 15
hp: 10
hit_dice: 4d4
speed: 10 ft., Fly 40 ft.
initiative: "+4 (14)"
stats: [3, 18, 10, 14, 13, 11]
skillsaves:
  - perception: 3
  - stealth: 8
passive: 13
languages: Common, Elvish, Sylvan
cr: "1/4"
actions:
  - name: "Needle Sword"
    desc: "*Melee Attack Roll:* +6, reach 5 ft. *Hit:* 6 (1d4 + 4) Piercing damage."
  - name: "Enchanting Bow"
    desc: "*Ranged Attack Roll:* +6, range 40/160 ft. *Hit:* 1 Piercing damage, and the target has the [[Charmed]] condition until the start of the sprite's next turn."
  - name: "Heart Sight"
    desc: "*Charisma Saving Throw:* DC 10, one creature within 5 feet the sprite can see (Celestials, Fiends, and Undead automatically fail the save). *Failure:* The sprite knows the target's emotions and alignment."
  - name: "Invisibility"
    desc: "The sprite casts [[Invisibility]] on itself, requiring no spell components and using Charisma as the spellcasting ability.\n- **At Will:** [[Invisibility]]"
```
