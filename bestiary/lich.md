---
title: Lich
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 21
xp: 33000
xp_lair: 41000
type: undead
subtype: wizard
size: Medium
ac: 20
hp: 315
speed: 30
legendary: true
spellcasting: true
tags:
  - monster
  - undead
  - wizard
  - cr21
  - srd-5-2-1
aliases:
  - Lich
export_hash: sha256-a77db6209ba7
---

```statblock
columns: 2
forceColumns: true
name: Lich
source: SRD 5.2.1
size: Medium
type: undead
subtype: wizard
alignment: Neutral Evil
ac: 20
hp: 315
hit_dice: 42d8 + 126
speed: 30 ft.
initiative: "+17 (27)"
stats: [11, 16, 16, 21, 14, 16]
saves:
  - dexterity: 10
  - constitution: 10
  - intelligence: 12
  - wisdom: 9
skillsaves:
  - arcana: 19
  - history: 12
  - insight: 9
  - perception: 9
gear: "Component Pouch"
resistances: Cold, Lightning
immunities: Necrotic, Poison
condition_immunities: Charmed, Exhaustion, Frightened, Paralyzed, Poisoned
senses: Truesight 120 ft.
passive: 19
languages: all
cr: "21"
traits:
  - name: "Legendary Resistance (4/Day, or 5/Day in Lair)"
    desc: "If the lich fails a saving throw, it can choose to succeed instead."
  - name: "Spirit Jar"
    desc: "If destroyed, the lich reforms in 1d10 days if it has a spirit jar, reviving with all its Hit Points. The new body appears in an unoccupied space within the lich's lair."
actions:
  - name: "Multiattack"
    desc: "The lich makes three attacks, using Eldritch Burst or Paralyzing Touch in any combination."
  - name: "Eldritch Burst"
    desc: "*Melee Attack Roll or Ranged Attack Roll:* +12, reach 5 ft. or range 120 ft. *Hit:* 31 (4d12 + 5) Force damage."
  - name: "Paralyzing Touch"
    desc: "*Melee Attack Roll:* +12, reach 5 ft. *Hit:* 15 (3d6 + 5) Cold damage, and the target has the [[Paralyzed]] condition until the start of the lich's next turn."
  - name: "Spellcasting"
    desc: "The lich casts one of the following spells, using Intelligence as the spellcasting ability (spell save DC 20):\n- **At Will:** [[Detect Magic]], [[Detect Thoughts]], [[Dispel Magic]], [[Fireball]] (level 5 version), [[Invisibility]], [[Lightning Bolt]] (level 5 version), [[Mage Hand]], [[Prestidigitation]]\n- **2/Day Each:** [[Animate Dead]], [[Dimension Door]], [[Plane Shift]]\n- **1/Day Each:** [[Chain Lightning]], [[Finger of Death]], [[Power Word Kill]], [[Scrying]]"
reactions:
  - name: "Protective Magic"
    desc: "The lich casts [[Counterspell]] or [[Shield]] in response to the spell's trigger, using the same spellcasting ability as Spellcasting.\n- **At Will:** [[Counterspell]], [[Shield]]"
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the creature can expend a use to take one of the following actions. The creature regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Deathly Teleport"
    desc: "The lich teleports up to 60 feet to an unoccupied space it can see, and each creature within 10 feet of the space it left takes 11 (2d10) Necrotic damage."
  - name: "Disrupt Life"
    desc: "*Constitution Saving Throw:* DC 20, each creature that isn't an Undead in a 20-foot Emanation originating from the lich. *Failure:* 31 (9d6) Necrotic damage. *Success:* Half damage. The lich can't take this action again until the start of its next turn."
```
