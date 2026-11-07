---
title: Ice Devil
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 14
xp: 11500
type: fiend
subtype: devil
size: Large
ac: 18
hp: 228
speed: 40
spellcasting: true
tags:
  - monster
  - fiend
  - devil
  - cr14
  - srd-5-2-1
aliases:
  - Ice Devil
export_hash: sha256-35294fb70591
---

```statblock
columns: 2
forceColumns: true
name: Ice Devil
source: SRD 5.2.1
size: Large
type: fiend
subtype: devil
alignment: Lawful Evil
ac: 18
hp: 228
hit_dice: 24d10 + 96
speed: 40 ft.
initiative: "+7 (17)"
stats: [21, 14, 18, 18, 15, 18]
saves:
  - dexterity: 7
  - constitution: 9
  - wisdom: 7
  - charisma: 9
skillsaves:
  - insight: 7
  - perception: 7
  - persuasion: 9
immunities: Cold, Fire, Poison
condition_immunities: Poisoned
senses: Blindsight 120 ft.
passive: 17
languages: Infernal; telepathy 120 ft.
cr: "14"
traits:
  - name: "Diabolical Restoration"
    desc: "If the devil dies outside the Nine Hells, its body disappears in sulfurous smoke, and it gains a new body instantly, reviving with all its Hit Points somewhere in the Nine Hells."
  - name: "Magic Resistance"
    desc: "The devil has Advantage on saving throws against spells and other magical effects."
actions:
  - name: "Multiattack"
    desc: "The devil makes three Ice Spear attacks. It can replace one attack with a Tail attack."
  - name: "Ice Spear"
    desc: "*Melee Attack Roll or Ranged Attack Roll:* +10, reach 5 ft. or range 30/120 ft. *Hit:* 14 (2d8 + 5) Piercing damage plus 10 (3d6) Cold damage. Until the end of its next turn, the target can't take a Bonus Action or Reaction, its Speed decreases by 10 feet, and it can move or take one action on its turn, not both. *Hit or Miss:* The spear magically returns to the devil's hand immediately after a ranged attack."
  - name: "Tail"
    desc: "*Melee Attack Roll:* +10, reach 10 ft. *Hit:* 15 (3d6 + 5) Bludgeoning damage plus 18 (4d8) Cold damage."
  - name: "Ice Wall (Recharge 6)"
    desc: "The devil casts [[Wall of Ice]] (level 8 version), requiring no spell components and using Intelligence as the spellcasting ability (spell save DC 17)."
```
