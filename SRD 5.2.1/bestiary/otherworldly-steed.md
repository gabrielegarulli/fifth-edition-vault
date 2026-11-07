---
title: Otherworldly Steed
source: SRD 5.2.1
edition: SRD 5.2.1
statblock: inline
cr: —
xp: 0
type: celestial or fey or fiend
size: Large
speed: 60
moves:
  - fly
tags:
  - monster
  - celestial
  - fey
  - fiend
  - summon
  - srd-5-2-1
aliases:
  - Otherworldly Steed
export_hash: sha256-ce3e671aa8c5
---

```statblock
columns: 2
forceColumns: true
name: Otherworldly Steed
source: SRD 5.2.1
size: Large
type: celestial or fey or fiend
alignment: Neutral
ac: "10 + 1 per spell level"
hp: "5 + 10 per spell level (the steed has a number of Hit Dice [d10s] equal to the spell's level)"
speed: 60 ft., Fly 60 ft. (requires level 4+ spell)
initiative: "+1 (11)"
stats: [18, 12, 14, 6, 12, 8]
passive: 11
languages: telepathy 1 mile (works only with you)
cr: "—"
traits:
  - name: "Life Bond"
    desc: "When you regain Hit Points from a level 1+ spell, the steed regains the same number of Hit Points if you're within 5 feet of it."
actions:
  - name: "Otherworldly Slam"
    desc: "*Melee Attack Roll:* Bonus equals your spell attack modifier, reach 5 ft. *Hit:* 1d8 + the spell's level of Radiant (Celestial), Psychic (Fey), or Necrotic (Fiend) damage."
bonus_actions:
  - name: "Fell Glare (Fiend Only; Recharges after a Long Rest)"
    desc: "*Wisdom Saving Throw:* DC equals your spell save DC, one creature within 60 feet the steed can see. *Failure:* The target has the [[Frightened]] condition until the end of your next turn."
  - name: "Fey Step (Fey Only; Recharges after a Long Rest)"
    desc: "The steed teleports, along with its rider, to an unoccupied space of your choice up to 60 feet away from itself."
  - name: "Healing Touch (Celestial Only; Recharges after a Long Rest)"
    desc: "One creature within 5 feet of the steed regains a number of Hit Points equal to 2d8 + the spell's level."
```
