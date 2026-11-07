---
title: Solar
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 21
xp: 33000
type: celestial
subtype: angel
size: Large
ac: 21
hp: 297
speed: 50
moves:
  - fly
legendary: true
spellcasting: true
tags:
  - monster
  - celestial
  - angel
  - cr21
  - srd-5-2-1
aliases:
  - Solar
export_hash: sha256-ac4469ac636e
---

```statblock
columns: 2
forceColumns: true
name: Solar
source: SRD 5.2.1
size: Large
type: celestial
subtype: angel
alignment: Lawful Good
ac: 21
hp: 297
hit_dice: 22d10 + 176
speed: 50 ft., Fly 150 ft. (hover)
initiative: "+20 (30)"
stats: [26, 22, 26, 25, 25, 30]
skillsaves:
  - perception: 14
immunities: Poison, Radiant
condition_immunities: Charmed, Exhaustion, Frightened, Poisoned
senses: Truesight 120 ft.
passive: 24
languages: all; telepathy 120 ft.
cr: "21"
traits:
  - name: "Divine Awareness"
    desc: "The solar knows if it hears a lie."
  - name: "Exalted Restoration"
    desc: "If the solar dies outside Mount Celestia, its body disappears, and it gains a new body instantly, reviving with all its Hit Points somewhere in Mount Celestia."
  - name: "Legendary Resistance (4/Day)"
    desc: "If the solar fails a saving throw, it can choose to succeed instead."
  - name: "Magic Resistance"
    desc: "The solar has Advantage on saving throws against spells and other magical effects."
actions:
  - name: "Multiattack"
    desc: "The solar makes two Flying Sword attacks. It can replace one attack with a use of Slaying Bow."
  - name: "Flying Sword"
    desc: "*Melee Attack Roll or Ranged Attack Roll:* +15, reach 10 ft. or range 120 ft. *Hit:* 22 (4d6 + 8) Slashing damage plus 36 (8d8) Radiant damage. *Hit or Miss:* The sword magically returns to the solar's hand or hovers within 5 feet of the solar immediately after a ranged attack."
  - name: "Slaying Bow"
    desc: "*Dexterity Saving Throw:* DC 21, one creature the solar can see within 600 feet. *Failure:* If the creature has 100 Hit Points or fewer, it dies. It otherwise takes 24 (4d8 + 6) Piercing damage plus 36 (8d8) Radiant damage."
  - name: "Spellcasting"
    desc: "The solar casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 25):\n- **At Will:** [[Detect Evil and Good]]\n- **1/Day Each:** [[Commune]], [[Control Weather]], [[Dispel Evil and Good]], [[Resurrection]]"
bonus_actions:
  - name: "Divine Aid (3/Day)"
    desc: "The solar casts [[Cure Wounds]] (level 2 version), [[Lesser Restoration]], or [[Remove Curse]], using the same spellcasting ability as Spellcasting.\n- **3/Day:** [[Cure Wounds]] (level 2 version), [[Lesser Restoration]], [[Remove Curse]]"
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3. Immediately after another creature's turn, the creature can expend a use to take one of the following actions. The creature regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Blinding Gaze"
    desc: "*Constitution Saving Throw:* DC 25, one creature the solar can see within 120 feet. *Failure:* The target has the [[Blinded]] condition for 1 minute. The solar can't take this action again until the start of its next turn."
  - name: "Radiant Teleport"
    desc: "The solar teleports up to 60 feet to an unoccupied space it can see. *Dexterity Saving Throw:* DC 25, each creature in a 10-foot Emanation originating from the solar at its destination space. *Failure:* 11 (2d10) Radiant damage. *Success:* Half damage."
```
