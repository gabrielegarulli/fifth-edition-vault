---
title: Adult White Dragon
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: 13
xp: 10000
xp_lair: 11500
type: dragon
subtype: chromatic
size: Huge
ac: 18
hp: 200
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
  - cr13
  - srd-5-2-1
aliases:
  - Adult White Dragon
export_hash: sha256-d6fb3ae02f70
---

```statblock
columns: 2
forceColumns: true
name: Adult White Dragon
source: SRD 5.2.1
size: Huge
type: dragon
subtype: chromatic
alignment: Chaotic Evil
ac: 18
hp: 200
hit_dice: 16d12 + 96
speed: 40 ft., Burrow 30 ft., Fly 80 ft., Swim 40 ft.
initiative: "+10 (20)"
stats: [22, 10, 22, 8, 12, 12]
saves:
  - dexterity: 5
  - wisdom: 6
skillsaves:
  - perception: 11
  - stealth: 5
immunities: Cold
senses: Blindsight 60 ft., Darkvision 120 ft.
passive: 21
languages: Common, Draconic
cr: "13"
traits:
  - name: "Ice Walk"
    desc: "The dragon can move across and climb icy surfaces without needing to make an ability check. Additionally, Difficult Terrain composed of ice or snow doesn't cost it extra movement."
  - name: "Legendary Resistance (3/Day, or 4/Day in Lair)"
    desc: "If the dragon fails a saving throw, it can choose to succeed instead."
actions:
  - name: "Multiattack"
    desc: "The dragon makes three Rend attacks."
  - name: "Rend"
    desc: "*Melee Attack Roll:* +11, reach 10 ft. *Hit:* 13 (2d6 + 6) Slashing damage plus 4 (1d8) Cold damage."
  - name: "Cold Breath (Recharge 5–6)"
    desc: "*Constitution Saving Throw:* DC 19, each creature in a 60-foot Cone. *Failure:* 54 (12d8) Cold damage. *Success:* Half damage."
legendary_description: "<span class=\"legendary-uses\">Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the dragon can expend a use to take one of the following actions. The dragon regains all expended uses at the start of each of its turns.</span>"
legendary_actions:
  - name: "Freezing Burst"
    desc: "*Constitution Saving Throw:* DC 14, each creature in a 30-foot-radius Sphere centered on a point the dragon can see within 120 feet. *Failure:* 7 (2d6) Cold damage, and the target's Speed is 0 until the end of the target's next turn. The dragon can't take this action again until the start of its next turn."
  - name: "Pounce"
    desc: "The dragon moves up to half its Speed, and it makes one Rend attack."
```
