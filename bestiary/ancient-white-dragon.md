---
title: Ancient White Dragon
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 20
xp: 25000
xp_lair: 33000
type: dragon
subtype: chromatic
size: Gargantuan
ac: 20
hp: 333
speed: 40
moves:
  - fly
  - swim
  - burrow
legendary: true
spellcasting: true
tags:
  - monster
  - dragon
  - chromatic
  - cr20
  - srd-5-2-1
aliases:
  - Ancient White Dragon
export_hash: sha256-a40c5a26c5eb
---

```statblock
columns: 2
forceColumns: true
name: Ancient White Dragon
source: SRD 5.2.1
size: Gargantuan
type: dragon
subtype: chromatic
alignment: Chaotic Evil
ac: 20
hp: 333
hit_dice: 18d20 + 144
speed: 40 ft., Burrow 40 ft., Fly 80 ft., Swim 40 ft.
initiative: "+12 (22)"
stats: [26, 10, 26, 10, 13, 18]
saves:
  - dexterity: 6
  - wisdom: 7
skillsaves:
  - perception: 13
  - stealth: 6
immunities: Cold
senses: Blindsight 60 ft., Darkvision 120 ft.
passive: 23
languages: Common, Draconic
cr: "20"
traits:
  - name: "Ice Walk"
    desc: "The dragon can move across and climb icy surfaces without needing to make an ability check. Additionally, Difficult Terrain composed of ice or snow doesn't cost it extra movement."
  - name: "Legendary Resistance (4/Day, or 5/Day in Lair)"
    desc: "If the dragon fails a saving throw, it can choose to succeed instead."
actions:
  - name: "Multiattack"
    desc: "The dragon makes three Rend attacks."
  - name: "Rend"
    desc: "*Melee Attack Roll:* +14, reach 15 ft. *Hit:* 17 (2d8 + 8) Slashing damage plus 7 (2d6) Cold damage."
  - name: "Cold Breath (Recharge 5–6)"
    desc: "*Constitution Saving Throw:* DC 22, each creature in a 90-foot Cone. *Failure:* 63 (14d8) Cold damage. *Success:* Half damage."
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the dragon can expend a use to take one of the following actions. The dragon regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Freezing Burst"
    desc: "*Constitution Saving Throw:* DC 20, each creature in a 30-foot-radius Sphere centered on a point the dragon can see within 120 feet. *Failure:* 14 (4d6) Cold damage, and the target's Speed is 0 until the end of the target's next turn. The dragon can't take this action again until the start of its next turn."
  - name: "Pounce"
    desc: "The dragon moves up to half its Speed, and it makes one Rend attack."
```
