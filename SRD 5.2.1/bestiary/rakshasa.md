---
title: Rakshasa
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 13
xp: 10000
type: fiend
size: Medium
ac: 17
hp: 221
speed: 40
spellcasting: true
tags:
  - monster
  - fiend
  - cr13
  - srd-5-2-1
aliases:
  - Rakshasa
export_hash: sha256-a0f6a461f5bd
---

```statblock
columns: 2
forceColumns: true
name: Rakshasa
source: SRD 5.2.1
size: Medium
type: fiend
alignment: Lawful Evil
ac: 17
hp: 221
hit_dice: 26d8 + 104
speed: 40 ft.
initiative: "+8 (18)"
stats: [14, 17, 18, 13, 16, 20]
skillsaves:
  - deception: 10
  - insight: 8
  - perception: 8
vulnerabilities: Piercing damage from weapons wielded by creatures under the effect of a Bless spell
condition_immunities: Charmed, Frightened
senses: Truesight 60 ft.
passive: 18
languages: Common, Infernal
cr: "13"
traits:
  - name: "Greater Magic Resistance"
    desc: "The rakshasa automatically succeeds on saving throws against spells and other magical effects, and the attack rolls of spells automatically miss it. Without the rakshasa's permission, no spell can observe the rakshasa remotely or detect its thoughts, creature type, or alignment."
  - name: "Fiendish Restoration"
    desc: "If the rakshasa dies outside the Nine Hells, its body turns to ichor, and it gains a new body instantly, reviving with all its Hit Points somewhere in the Nine Hells."
actions:
  - name: "Multiattack"
    desc: "The rakshasa makes three Cursed Touch attacks."
  - name: "Cursed Touch"
    desc: "*Melee Attack Roll:* +10, reach 5 ft. *Hit:* 12 (2d6 + 5) Slashing damage plus 19 (3d12) Necrotic damage. If the target is a creature, it is cursed. While cursed, the target gains no benefit from finishing a Short or Long Rest."
  - name: "Baleful Command (Recharge 5–6)"
    desc: "*Wisdom Saving Throw:* DC 18, each enemy in a 30-foot Emanation originating from the rakshasa. *Failure:* 28 (8d6) Psychic damage, and the target has the [[Frightened]] and [[Incapacitated]] conditions until the start of the rakshasa's next turn."
  - name: "Spellcasting"
    desc: "The rakshasa casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 18):\n- **At Will:** [[Detect Magic]], [[Detect Thoughts]], [[Disguise Self]], [[Mage Hand]], [[Minor Illusion]]\n- **1/Day Each:** [[Fly]], [[Invisibility]], [[Major Image]], [[Plane Shift]]"
```
