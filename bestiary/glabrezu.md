---
title: Glabrezu
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 9
xp: 5000
type: fiend
subtype: demon
size: Large
ac: 17
hp: 189
speed: 40
spellcasting: true
tags:
  - monster
  - fiend
  - demon
  - cr9
  - srd-5-2-1
aliases:
  - Glabrezu
export_hash: sha256-6231616b690b
---

```statblock
columns: 2
forceColumns: true
name: Glabrezu
source: SRD 5.2.1
size: Large
type: fiend
subtype: demon
alignment: Chaotic Evil
ac: 17
hp: 189
hit_dice: 18d10 + 90
speed: 40 ft.
initiative: "+6 (16)"
stats: [20, 15, 21, 19, 17, 16]
saves:
  - strength: 9
  - constitution: 9
  - wisdom: 7
  - charisma: 7
skillsaves:
  - deception: 7
  - perception: 7
resistances: Cold, Fire, Lightning
immunities: Poison
condition_immunities: Poisoned
senses: Truesight 120 ft.
passive: 17
languages: Abyssal; telepathy 120 ft.
cr: "9"
traits:
  - name: "Demonic Restoration"
    desc: "If the glabrezu dies outside the Abyss, its body dissolves into ichor, and it gains a new body instantly, reviving with all its Hit Points somewhere in the Abyss."
  - name: "Magic Resistance"
    desc: "The glabrezu has Advantage on saving throws against spells and other magical effects."
actions:
  - name: "Multiattack"
    desc: "The glabrezu makes two Pincer attacks and uses Pummel or Spellcasting."
  - name: "Pincer"
    desc: "*Melee Attack Roll:* +9, reach 10 ft. *Hit:* 16 (2d10 + 5) Slashing damage. If the target is a Medium or smaller creature, it has the [[Grappled]] condition (escape DC 15) from one of two pincers."
  - name: "Pummel"
    desc: "*Dexterity Saving Throw:* DC 17, one creature [[Grappled]] by the glabrezu. *Failure:* 15 (3d6 + 5) Bludgeoning damage. *Success:* Half damage."
  - name: "Spellcasting"
    desc: "The glabrezu casts one of the following spells, requiring no Material components and using Intelligence as the spellcasting ability (spell save DC 16):\n- **At Will:** [[Darkness]], [[Detect Magic]], [[Dispel Magic]]\n- **1/Day Each:** [[Confusion]], [[Fly]], [[Power Word Stun]]"
```
