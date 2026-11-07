---
title: Draconic Spirit
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: —
xp: 0
type: dragon
size: Large
speed: 30
moves:
  - fly
  - swim
tags:
  - monster
  - dragon
  - summon
  - srd-5-2-1
aliases:
  - Draconic Spirit
export_hash: sha256-963a5a79f54c
---

```statblock
columns: 2
forceColumns: true
name: Draconic Spirit
source: SRD 5.2.1
size: Large
type: dragon
alignment: Neutral
ac: "14 + the spell's level"
hp: "50 + 10 for each spell level above 5"
speed: 30 ft., Fly 60 ft., Swim 30 ft.
initiative: "+2 (12)"
stats: [19, 14, 17, 10, 14, 14]
resistances: Acid, Cold, Fire, Lightning, Poison
condition_immunities: Charmed, Frightened, Poisoned
senses: Blindsight 30 ft., Darkvision 60 ft.
passive: 12
languages: Draconic, understands the languages you know
cr: "—"
traits:
  - name: "Shared Resistances"
    desc: "When you summon the spirit, choose one of its Resistances. You have Resistance to the chosen damage type until the spell ends."
actions:
  - name: "Multiattack"
    desc: "The spirit makes a number of Rend attacks equal to half the spell's level (round down), and it uses Breath Weapon."
  - name: "Rend"
    desc: "*Melee Attack Roll:* Bonus equals your spell attack modifier, reach 10 feet. *Hit:* 1d6 + 4 + the spell's level Piercing damage."
  - name: "Breath Weapon"
    desc: "*Dexterity Saving Throw:* DC equals your spell save DC, each creature in a 30-foot Cone. *Failure:* 2d6 damage of a type this spirit has Resistance to (your choice when you cast the spell). *Success:* Half damage."
```
