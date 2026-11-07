---
title: Pit Fiend
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 20
xp: 25000
type: fiend
subtype: devil
size: Large
ac: 21
hp: 337
speed: 30
moves:
  - fly
spellcasting: true
tags:
  - monster
  - fiend
  - devil
  - cr20
  - srd-5-2-1
aliases:
  - Pit Fiend
export_hash: sha256-0c9080ffa1fc
---

```statblock
columns: 2
forceColumns: true
name: Pit Fiend
source: SRD 5.2.1
size: Large
type: fiend
subtype: devil
alignment: Lawful Evil
ac: 21
hp: 337
hit_dice: 27d10 + 189
speed: 30 ft., Fly 60 ft.
initiative: "+14 (24)"
stats: [26, 14, 24, 22, 18, 24]
saves:
  - dexterity: 8
  - wisdom: 10
skillsaves:
  - perception: 10
  - persuasion: 19
resistances: Cold
immunities: Fire, Poison
condition_immunities: Poisoned
senses: Truesight 120 ft.
passive: 20
languages: Infernal; telepathy 120 ft.
cr: "20"
traits:
  - name: "Diabolical Restoration"
    desc: "If the pit fiend dies outside the Nine Hells, its body disappears in sulfurous smoke, and it gains a new body instantly, reviving with all its Hit Points somewhere in the Nine Hells."
  - name: "Fear Aura"
    desc: "The pit fiend emanates an aura in a 20-foot Emanation while it doesn't have the [[Incapacitated]] condition. *Wisdom Saving Throw:* DC 21, any enemy that starts its turn in the aura. *Failure:* The target has the [[Frightened]] condition until the start of its next turn. *Success:* The target is immune to this pit fiend's aura for 24 hours."
  - name: "Legendary Resistance (4/Day)"
    desc: "If the pit fiend fails a saving throw, it can choose to succeed instead."
  - name: "Magic Resistance"
    desc: "The pit fiend has Advantage on saving throws against spells and other magical effects."
actions:
  - name: "Multiattack"
    desc: "The pit fiend makes one Bite attack, two Devilish Claw attacks, and one Fiery Mace attack."
  - name: "Bite"
    desc: "*Melee Attack Roll:* +14, reach 10 ft. *Hit:* 18 (3d6 + 8) Piercing damage. If the target is a creature, it must make the following saving throw. *Constitution Saving Throw:* DC 21. *Failure:* The target has the [[Poisoned]] condition. While [[Poisoned]], the target can't regain Hit Points and takes 21 (6d6) Poison damage at the start of each of its turns, and it repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically."
  - name: "Devilish Claw"
    desc: "*Melee Attack Roll:* +14, reach 10 ft. *Hit:* 26 (4d8 + 8) Necrotic damage."
  - name: "Fiery Mace"
    desc: "*Melee Attack Roll:* +14, reach 10 ft. *Hit:* 22 (4d6 + 8) Force damage plus 21 (6d6) Fire damage."
  - name: "Hellfire Spellcasting (Recharge 4–6)"
    desc: "The pit fiend casts [[Fireball]] (level 5 version) twice, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 21). It can replace one [[Fireball]] with [[Hold Monster]] (level 7 version) or [[Wall of Fire]]."
```
