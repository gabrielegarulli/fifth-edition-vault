---
title: Nalfeshnee
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 13
xp: 10000
type: fiend
subtype: demon
size: Large
ac: 18
hp: 184
speed: 20
moves:
  - fly
tags:
  - monster
  - fiend
  - demon
  - cr13
  - srd-5-2-1
aliases:
  - Nalfeshnee
export_hash: sha256-fdb5e7eb49f8
---

```statblock
columns: 2
forceColumns: true
name: Nalfeshnee
source: SRD 5.2.1
size: Large
type: fiend
subtype: demon
alignment: Chaotic Evil
ac: 18
hp: 184
hit_dice: 16d10 + 96
speed: 20 ft., Fly 30 ft.
initiative: "+5 (15)"
stats: [21, 10, 22, 19, 12, 15]
saves:
  - constitution: 11
  - intelligence: 9
  - wisdom: 6
  - charisma: 7
resistances: Cold, Fire, Lightning
immunities: Poison
condition_immunities: Frightened, Poisoned
senses: Truesight 120 ft.
passive: 11
languages: Abyssal; telepathy 120 ft.
cr: "13"
traits:
  - name: "Demonic Restoration"
    desc: "If the nalfeshnee dies outside the Abyss, its body dissolves into ichor, and it gains a new body instantly, reviving with all its Hit Points somewhere in the Abyss."
  - name: "Magic Resistance"
    desc: "The nalfeshnee has Advantage on saving throws against spells and other magical effects."
actions:
  - name: "Multiattack"
    desc: "The nalfeshnee makes three Rend attacks."
  - name: "Rend"
    desc: "*Melee Attack Roll:* +10, reach 10 ft. *Hit:* 16 (2d10 + 5) Slashing damage plus 11 (2d10) Force damage."
  - name: "Teleport"
    desc: "The nalfeshnee teleports up to 120 feet to an unoccupied space it can see."
bonus_actions:
  - name: "Horror Nimbus (Recharge 5–6)"
    desc: "*Wisdom Saving Throw:* DC 15, each creature in a 15-foot Emanation originating from the nalfeshnee. *Failure:* 28 (8d6) Psychic damage, and the target has the [[Frightened]] condition for 1 minute, until it takes damage, or until it ends its turn with the nalfeshnee out of line of sight. *Success:* The target is immune to this nalfeshnee's Horror Nimbus for 24 hours."
reactions:
  - name: "Pursuit"
    desc: "*Trigger:* Another creature the nalfeshnee can see ends its move within 120 feet of the nalfeshnee. *Response:* The nalfeshnee uses Teleport, but its destination space must be within 10 feet of the triggering creature."
```
