---
title: Balor
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 19
xp: 22000
type: fiend
subtype: demon
size: Huge
ac: 19
hp: 287
speed: 40
moves:
  - fly
tags:
  - monster
  - fiend
  - demon
  - cr19
  - srd-5-2-1
aliases:
  - Balor
export_hash: sha256-37648f2cac92
---

```statblock
columns: 2
forceColumns: true
name: Balor
source: SRD 5.2.1
size: Huge
type: fiend
subtype: demon
alignment: Chaotic Evil
ac: 19
hp: 287
hit_dice: 23d12 + 138
speed: 40 ft., Fly 80 ft.
initiative: "+14 (24)"
stats: [26, 15, 22, 20, 16, 22]
saves:
  - constitution: 12
  - wisdom: 9
skillsaves:
  - perception: 9
resistances: Cold, Lightning
immunities: Fire, Poison
condition_immunities: Charmed, Frightened, Poisoned
senses: Truesight 120 ft.
passive: 19
languages: Abyssal; telepathy 120 ft.
cr: "19"
traits:
  - name: "Death Throes"
    desc: "The balor explodes when it dies. *Dexterity Saving Throw:* DC 20, each creature in a 30-foot Emanation originating from the balor. *Failure:* 31 (9d6) Fire damage plus 31 (9d6) Force damage. *Success:* Half damage. If the balor dies outside the Abyss, it gains a new body instantly, reviving with all its Hit Points somewhere in the Abyss."
  - name: "Fire Aura"
    desc: "At the end of each of the balor's turns, each creature in a 5-foot Emanation originating from the balor takes 13 (3d8) Fire damage."
  - name: "Legendary Resistance (3/Day)"
    desc: "If the balor fails a saving throw, it can choose to succeed instead."
  - name: "Magic Resistance"
    desc: "The balor has Advantage on saving throws against spells and other magical effects."
actions:
  - name: "Multiattack"
    desc: "The balor makes one Flame Whip attack and one Lightning Blade attack."
  - name: "Flame Whip"
    desc: "*Melee Attack Roll:* +14, reach 30 ft. *Hit:* 18 (3d6 + 8) Force damage plus 17 (5d6) Fire damage. If the target is a Huge or smaller creature, the balor pulls the target up to 25 feet straight toward itself, and the target has the [[Prone]] condition."
  - name: "Lightning Blade"
    desc: "*Melee Attack Roll:* +14, reach 10 ft. *Hit:* 21 (3d8 + 8) Force damage plus 22 (4d10) Lightning damage, and the target can't take Reactions until the start of the balor's next turn."
bonus_actions:
  - name: "Teleport"
    desc: "The balor teleports itself or a willing demon within 10 feet of itself up to 60 feet to an unoccupied space the balor can see."
```
