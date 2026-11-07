---
title: Night Hag
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 5
xp: 1800
type: fiend
size: Medium
ac: 17
hp: 112
speed: 30
spellcasting: true
tags:
  - monster
  - fiend
  - cr5
  - srd-5-2-1
aliases:
  - Night Hag
export_hash: sha256-f87af5c7f895
---

```statblock
columns: 2
forceColumns: true
name: Night Hag
source: SRD 5.2.1
size: Medium
type: fiend
alignment: Neutral Evil
ac: 17
hp: 112
hit_dice: 15d8 + 45
speed: 30 ft.
initiative: "+5 (15)"
stats: [18, 15, 16, 16, 14, 16]
skillsaves:
  - deception: 6
  - insight: 5
  - perception: 5
  - stealth: 5
resistances: Cold, Fire
condition_immunities: Charmed
senses: Darkvision 120 ft.
passive: 15
languages: Abyssal, Common, Infernal, Primordial
cr: "5"
traits:
  - name: "Magic Resistance"
    desc: "The hag has Advantage on saving throws against spells and other magical effects."
  - name: "Soul Bag"
    desc: "The hag has a soul bag. While holding or carrying the bag, the hag can use its Nightmare Haunting action.\n\nThe bag has AC 15, HP 20, and Resistance to all damage. The bag turns to dust if reduced to 0 Hit Points. If the bag is destroyed, any souls the bag is holding are released. The hag can create a new bag after 7 days."
actions:
  - name: "Multiattack"
    desc: "The hag makes two Claw attacks."
  - name: "Claw"
    desc: "*Melee Attack Roll:* +7, reach 5 ft. *Hit:* 13 (2d8 + 4) Slashing damage."
  - name: "Coven Magic"
    desc: "While within 30 feet of at least two hag allies, the hag can cast one of the following spells, requiring no Material components, using the spell's normal casting time, and using Intelligence as the spellcasting ability (spell save DC 14): [[Augury]], [[Find Familiar]], [[Identify]], [[Locate Object]], [[Scrying]], or [[Unseen Servant]]. The hag must finish a Long Rest before using this trait to cast that spell again."
  - name: "Spellcasting"
    desc: "The hag casts one of the following spells, requiring no Material components and using Intelligence as the spellcasting ability (spell save DC 14):\n- **At Will:** [[Detect Magic]], [[Etherealness]], [[Magic Missile]] (level 4 version)\n- **2/Day Each:** [[Phantasmal Killer]], [[Plane Shift]] (self only)"
  - name: "Nightmare Haunting (1/Day; Requires Soul Bag)"
    desc: "While on the Ethereal Plane, the hag casts [[Dream]], using the same spellcasting ability as Spellcasting. Only the hag can serve as the spell's messenger, and the target must be a creature the hag can see on the Material Plane. The spell fails and is wasted if the target is under the effect of the [[Protection from Evil and Good]] spell or within a [[Magic Circle]] spell.\nIf the target takes damage from the [[Dream]] spell, the target's Hit Point maximum decreases by an amount equal to that damage. If the spell kills the target, its soul is trapped in the hag's soul bag, and the target can't be raised from the dead until its soul is released.\n- **1/Day:** [[Dream]], [[Protection from Evil and Good]], [[Magic Circle]]"
bonus_actions:
  - name: "Shape-Shift"
    desc: "The hag shape-shifts into a Small or Medium Humanoid, or it returns to its true form. Other than its size, its game statistics are the same in each form. Any equipment it is wearing or carrying isn't transformed."
```
