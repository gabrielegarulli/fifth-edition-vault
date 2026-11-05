---
title: Marilith
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 16
xp: 15000
type: fiend
subtype: demon
size: Large
ac: 16
hp: 220
speed: 40
moves:
  - climb
tags:
  - monster
  - fiend
  - demon
  - cr16
  - srd-5-2-1
aliases:
  - Marilith
export_hash: sha256-b3b0d5fe26e2
---

```statblock
columns: 2
forceColumns: true
name: Marilith
source: SRD 5.2.1
size: Large
type: fiend
subtype: demon
alignment: Chaotic Evil
ac: 16
hp: 220
hit_dice: 21d10 + 105
speed: 40 ft., Climb 40 ft.
initiative: "+10 (20)"
stats: [18, 20, 20, 18, 16, 20]
saves:
  - strength: 9
  - constitution: 10
  - wisdom: 8
  - charisma: 10
skillsaves:
  - perception: 8
resistances: Cold, Fire, Lightning
immunities: Poison
condition_immunities: Poisoned
senses: Truesight 120 ft.
passive: 18
languages: Abyssal; telepathy 120 ft.
cr: "16"
traits:
  - name: "Demonic Restoration"
    desc: "If the marilith dies outside the Abyss, its body dissolves into ichor, and it gains a new body instantly, reviving with all its Hit Points somewhere in the Abyss."
  - name: "Magic Resistance"
    desc: "The marilith has Advantage on saving throws against spells and other magical effects."
  - name: "Reactive"
    desc: "The marilith can take one Reaction on every turn of combat."
actions:
  - name: "Multiattack"
    desc: "The marilith makes six Pact Blade attacks and uses Constrict."
  - name: "Pact Blade"
    desc: "*Melee Attack Roll:* +10, reach 5 ft. *Hit:* 10 (1d10 + 5) Slashing damage plus 7 (2d6) Necrotic damage."
  - name: "Constrict"
    desc: "*Strength Saving Throw:* DC 17, one Medium or smaller creature the marilith can see within 5 feet. *Failure:* 15 (2d10 + 4) Bludgeoning damage. The target has the [[Grappled]] condition (escape DC 14), and it has the [[Restrained]] condition until the grapple ends."
bonus_actions:
  - name: "Teleport (Recharge 5–6)"
    desc: "The marilith teleports up to 120 feet to an unoccupied space it can see."
reactions:
  - name: "Parry"
    desc: "*Trigger:* The marilith is hit by a melee attack roll while holding a weapon. *Response:* The marilith adds 5 to its AC against that attack, possibly causing it to miss."
```
