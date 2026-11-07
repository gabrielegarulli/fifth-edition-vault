---
title: Giant Insect
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: —
xp: 0
type: beast
size: Large
speed: 40
moves:
  - fly
  - climb
tags:
  - monster
  - beast
  - summon
  - srd-5-2-1
aliases:
  - Giant Insect
export_hash: sha256-4b2020c72e03
---

```statblock
columns: 2
forceColumns: true
name: Giant Insect
source: SRD 5.2.1
size: Large
type: beast
alignment: Unaligned
ac: "11 + the spell's level"
hp: "30 + 10 for each spell level above 4"
speed: 40 ft., Climb 40 ft., Fly 40 ft. (Wasp only)
initiative: "+1 (11)"
stats: [17, 13, 15, 4, 14, 3]
senses: Darkvision 60 ft.
passive: 12
languages: understands the languages you know
cr: "—"
traits:
  - name: "Spider Climb"
    desc: "The insect can climb difficult surfaces, including along ceilings, without needing to make an ability check."
actions:
  - name: "Multiattack"
    desc: "The insect makes a number of attacks equal to half this spell's level (round down)."
  - name: "Poison Jab"
    desc: "*Melee Attack Roll:* Bonus equals your spell attack modifier, reach 10 ft. *Hit:* 1d6 + 3 + the spell's level Piercing damage plus 1d4 Poison damage."
  - name: "Web Bolt (Spider Only)"
    desc: "*Ranged Attack Roll:* Bonus equals your spell attack modifier, range 60 ft. *Hit:* 1d10 + 3 + the spell's level Bludgeoning damage, and the target's Speed is reduced to 0 until the start of the insect's next turn."
bonus_actions:
  - name: "Venomous Spew (Centipede Only)"
    desc: "*Constitution Saving Throw:* Your spell save DC, one creature the insect can see within 10 feet. *Failure:* The target has the [[Poisoned]] condition until the start of the insect's next turn."
```
